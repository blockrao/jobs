/**
 * Full sitemap release audit. Checks every URL in sitemap.xml for HTTP 200,
 * same-origin/self-canonical metadata, noindex directives, and JobPosting JSON-LD
 * on canonical job-detail URLs.
 *
 * Usage:
 *   npm run audit:sitemap -- --base https://www.joboye.com
 *   npm run audit:sitemap -- --base https://<preview-host> --limit 100
 *
 * This is an explicit release check, not part of the production request path.
 */
type AuditResult = {
  url: string;
  status: number | null;
  ok: boolean;
  failures: string[];
};

const args = process.argv.slice(2);
const value = (flag: string, fallback: string) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const base = value("--base", "https://www.joboye.com").replace(/\/$/, "");
const limit = Math.max(0, Number.parseInt(value("--limit", "0"), 10) || 0);
const concurrency = Math.min(8, Math.max(1, Number.parseInt(value("--concurrency", "4"), 10) || 4));
const timeoutMs = Math.max(1000, Number.parseInt(value("--timeout-ms", "15000"), 10) || 15000);

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = tag.match(re);
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : null;
}

function normalizeUrl(raw: string): string {
  const u = new URL(raw);
  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");
  u.hash = "";
  return u.toString();
}

function hasNoindex(html: string, xRobotsTag: string | null): boolean {
  if (xRobotsTag && /noindex/i.test(xRobotsTag)) return true;
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const name = attr(tag, "name");
    const content = attr(tag, "content") ?? "";
    if (name && /^(robots|googlebot)$/i.test(name) && /noindex/i.test(content)) return true;
  }
  return false;
}

function hasJobPostingJsonLd(html: string): boolean {
  const containsType = (node: unknown): boolean => {
    if (Array.isArray(node)) return node.some(containsType);
    if (!node || typeof node !== "object") return false;
    const obj = node as Record<string, unknown>;
    const type = obj["@type"];
    if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) return true;
    return Object.values(obj).some(containsType);
  };
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      if (containsType(JSON.parse(match[1]))) return true;
    } catch {
      // A malformed block is not accepted as valid JobPosting structured data.
    }
  }
  return false;
}

function isJobDetail(url: URL): boolean {
  return /^\/jobs\/[^/]+(?:\/[^/]+)?\/?$/.test(url.pathname) && url.pathname !== "/jobs/";
}

async function fetchText(url: string): Promise<{ status: number; body: string; xRobotsTag: string | null }> {
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": "JobOye-Sitemap-Audit/1.0", accept: "text/html,application/xml;q=0.9,*/*;q=0.8" },
  });
  return {
    status: response.status,
    body: await response.text(),
    xRobotsTag: response.headers.get("x-robots-tag"),
  };
}

async function main() {
  let sitemap: Awaited<ReturnType<typeof fetchText>>;
  try {
    sitemap = await fetchText(`${base}/sitemap.xml`);
  } catch (error) {
    console.error(`Cannot fetch sitemap: ${String(error)}`);
    process.exit(2);
  }
  if (sitemap.status !== 200) {
    console.error(`Sitemap returned HTTP ${sitemap.status}; expected 200`);
    process.exit(2);
  }

  const sitemapUrls = [...sitemap.body.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((m) => m[1].trim().replace(/&amp;/g, "&"))
    .filter(Boolean);
  const duplicateCount = sitemapUrls.length - new Set(sitemapUrls).size;
  const selected = limit > 0 ? sitemapUrls.slice(0, limit) : sitemapUrls;
  const origin = new URL(base).origin;
  const results: AuditResult[] = [];
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= selected.length) return;
      const url = selected[index];
      const failures: string[] = [];
      let status: number | null = null;
      try {
        const parsed = new URL(url);
        if (parsed.origin !== origin) failures.push(`foreign origin ${parsed.origin}`);
        if (parsed.search || parsed.hash) failures.push("query/hash in sitemap URL");
        const page = await fetchText(url);
        status = page.status;
        if (page.status !== 200) {
          failures.push(`HTTP ${page.status} (canonical sitemap URLs must return 200 without redirects)`);
        } else {
          if (hasNoindex(page.body, page.xRobotsTag)) failures.push("noindex page is listed in sitemap");
          const canonicalTag = [...page.body.matchAll(/<link\b[^>]*>/gi)]
            .map((m) => m[0])
            .find((tag) => /canonical/i.test(attr(tag, "rel") ?? ""));
          const canonical = canonicalTag ? attr(canonicalTag, "href") : null;
          if (!canonical) {
            failures.push("missing canonical");
          } else {
            try {
              if (normalizeUrl(new URL(canonical, url).toString()) !== normalizeUrl(url)) {
                failures.push(`non-self canonical: ${canonical}`);
              }
            } catch {
              failures.push(`invalid canonical: ${canonical}`);
            }
          }
          if (isJobDetail(parsed) && !hasJobPostingJsonLd(page.body)) {
            failures.push("job detail missing JobPosting JSON-LD");
          }
        }
      } catch (error) {
        failures.push(`fetch error: ${String(error)}`);
      }
      results.push({ url, status, ok: failures.length === 0, failures });
      if (results.length % 100 === 0) {
        console.error(`Checked ${results.length}/${selected.length} sitemap URLs...`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, selected.length) }, worker));
  results.sort((a, b) => a.url.localeCompare(b.url));
  const failed = results.filter((r) => !r.ok);
  const summary = {
    base,
    sitemapCount: sitemapUrls.length,
    duplicateCount,
    checkedCount: results.length,
    passedCount: results.length - failed.length,
    failedCount: failed.length,
    limitedRun: limit > 0,
    concurrency,
  };
  console.log(JSON.stringify(summary, null, 2));
  for (const result of failed) {
    console.log(`FAIL\t${result.status ?? "ERR"}\t${result.url}\t${result.failures.join("; ")}`);
  }
  if (duplicateCount > 0) console.error(`FAIL: ${duplicateCount} duplicate sitemap URL(s)`);
  process.exit(failed.length > 0 || duplicateCount > 0 ? 1 : 0);
}

void main();
