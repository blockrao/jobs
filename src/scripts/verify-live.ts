/**
 * Live-page release gate for the URL contract (2026-10-20).
 *   npm run verify:live -- <recruitment-slug> [<post-slug>] [--base https://www.joboye.com]
 *
 * Checks, against the live site:
 *   /jobs/<recruitment-slug>              200, indexable, self-canonical, no hreflang, JSON-LD, no aggregators, in sitemap
 *   /jobs/<recruitment-slug>/<post-slug>  same (when a post slug is given)
 *   /en/jobs/<recruitment-slug>           301 → /jobs/<recruitment-slug> (legacy locale prefix)
 *   /recruitments/<recruitment-slug>      301 → /jobs/<recruitment-slug>
 * Exit code 1 on any failure. Pure checks live in verify-live-checks.ts (unit tested).
 */
import { checkPage, checkRedirect, checkSitemap, formatTable, type CheckResult } from "./verify-live-checks";

async function get(url: string) {
  const res = await fetch(url, {
    redirect: "manual",
    headers: { "user-agent": "joboye-verify-live/1.0", "accept-language": "en" },
  });
  return { status: res.status, body: await res.text(), location: res.headers.get("location") };
}

async function main() {
  const args = process.argv.slice(2);
  const bi = args.indexOf("--base");
  const base = (bi >= 0 ? args[bi + 1] : "https://www.joboye.com").replace(/\/$/, "");
  const positional = args.filter((a, i) => !a.startsWith("--") && i !== bi + 1);
  const [recruitmentSlug, postSlug] = positional;
  if (!recruitmentSlug) {
    console.error("usage: npm run verify:live -- <recruitment-slug> [<post-slug>] [--base <url>]");
    process.exit(2);
  }

  const hubUrl = `${base}/jobs/${recruitmentSlug}`;
  const leafUrl = postSlug ? `${hubUrl}/${postSlug}` : null;
  const results: CheckResult[] = [];
  try {
    const [hub, leaf, legacyEn, legacyRec, sm] = await Promise.all([
      get(hubUrl),
      leafUrl ? get(leafUrl) : Promise.resolve(null),
      get(`${base}/en/jobs/${recruitmentSlug}`),
      get(`${base}/recruitments/${recruitmentSlug}`),
      get(`${base}/sitemap.xml`),
    ]);
    results.push(...checkPage({ label: "hub", url: hubUrl, status: hub.status, body: hub.body }, { canonicalUrl: hubUrl }));
    if (leaf && leafUrl) {
      results.push(...checkPage({ label: "leaf", url: leafUrl, status: leaf.status, body: leaf.body }, { canonicalUrl: leafUrl }));
    }
    const redirectResult = (page: string, r: { status: number; location: string | null }) => {
      const [ok, detail] = checkRedirect(r.status, r.location, hubUrl);
      return { page, check: "301 to hub", ok, detail };
    };
    results.push(redirectResult("/en/jobs", legacyEn), redirectResult("/recruitments", legacyRec));
    results.push(...checkSitemap(sm.status, sm.body, leafUrl ? [hubUrl, leafUrl] : [hubUrl]));
  } catch (e) {
    results.push({ page: "-", check: "fetch", ok: false, detail: String(e) });
  }
  console.log(formatTable(results));
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `\nFAIL: ${failed} check(s) failed` : "\nPASS: all checks passed");
  process.exit(failed ? 1 : 0);
}

main();
