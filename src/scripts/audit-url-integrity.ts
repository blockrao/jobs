/**
 * JobOye URL integrity audit (read-only).
 *
 * Checks the database's canonical recruitment/post URL inventory and explicit
 * recruitment aliases against the live HTTP application. It records status,
 * redirect chain, final destination, canonical metadata and basic entity hints.
 *
 * Usage:
 *   npm run audit:urls -- --base https://www.joboye.com --scope canonical
 *   npm run audit:urls -- --base https://www.joboye.com --scope all
 *   npm run audit:urls -- --base https://www.joboye.com --scope all --limit 100
 *
 * "canonical" checks canonical hubs + post leaves. "all" additionally checks
 * every recruitment_slug_redirects alias. No database writes are performed.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

type UrlRow = {
  kind: "hub" | "leaf" | "alias";
  expectedUrl: string;
  expectedCanonical: string;
  expectedSlug: string;
  expectedEntityName: string;
  expectedTargetUrl?: string;
};

type Result = UrlRow & {
  requestedUrl: string;
  status: number | null;
  finalUrl: string | null;
  redirectChain: Array<{ status: number; url: string; location: string | null }>;
  elapsedMs: number;
  canonical: string | null;
  title: string | null;
  noindex: boolean;
  checks: string[];
  error?: string;
};

const args = process.argv.slice(2);
const arg = (name: string, fallback: string) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const base = arg("--base", process.env.NEXT_PUBLIC_BASE_URL || "https://www.joboye.com").replace(/\/$/, "");
const scope = arg("--scope", "canonical");
const limit = Math.max(0, Number.parseInt(arg("--limit", "0"), 10) || 0);
const concurrency = Math.min(12, Math.max(1, Number.parseInt(arg("--concurrency", "6"), 10) || 6));
const timeoutMs = Math.max(3000, Number.parseInt(arg("--timeout-ms", "15000"), 10) || 15000);
const maxRedirects = 8;

function decodeHtml(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function attr(tag: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp("(?:^|\\s)" + escaped + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i"));
  return match ? decodeHtml(match[1] ?? match[2] ?? match[3] ?? "") : null;
}
function normalizeUrl(raw: string): string {
  const u = new URL(raw);
  u.hash = "";
  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");
  return u.toString();
}
function canonicalFrom(html: string): string | null {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    if (/\bcanonical\b/i.test(attr(tag, "rel") ?? "")) {
      const href = attr(tag, "href");
      if (href) return href;
    }
  }
  return null;
}
function titleFrom(html: string): string | null {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtml(match[1].replace(/<[^>]+>/g, "").trim()) : null;
}
function normalizeText(value: string): string {
  return decodeHtml(value)
    .normalize("NFKD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\\s+/g, " ");
}
function isNoindex(html: string, xRobots: string | null): boolean {
  if (xRobots && /noindex/i.test(xRobots)) return true;
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const name = attr(tag, "name") ?? "";
    const content = attr(tag, "content") ?? "";
    if (/^(robots|googlebot)$/i.test(name) && /noindex/i.test(content)) return true;
  }
  return false;
}
async function requestWithChain(startUrl: string): Promise<{
  status: number; finalUrl: string; chain: Result["redirectChain"]; body: string;
  xRobots: string | null; elapsedMs: number;
}> {
  const started = Date.now();
  const chain: Result["redirectChain"] = [];
  let current = startUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "JobOye-URL-Integrity-Audit/1.0", accept: "text/html,application/xhtml+xml,*/*;q=0.8" },
    });
    const location = response.headers.get("location");
    chain.push({ status: response.status, url: current, location });
    if ([301, 302, 303, 307, 308].includes(response.status) && location) {
      await response.body?.cancel();
      if (hop === maxRedirects) throw new Error(`redirect limit exceeded (> ${maxRedirects})`);
      current = new URL(location, current).toString();
      continue;
    }
    const contentType = response.headers.get("content-type") ?? "";
    const body = /text\/html|application\/xhtml\+xml/i.test(contentType) ? await response.text() : "";
    return { status: response.status, finalUrl: current, chain, body, xRobots: response.headers.get("x-robots-tag"), elapsedMs: Date.now() - started };
  }
  throw new Error("unreachable redirect handling state");
}
async function fetchRows(): Promise<UrlRow[]> {
  const db = getDb();
  const hubs = await db.execute(sql`
    SELECT r.id, r.slug, r.name
    FROM public.recruitments r
    WHERE r.verification_status IS DISTINCT FROM 'QUARANTINED'
    ORDER BY r.id
  `);
  const leaves = await db.execute(sql`
    SELECT r.slug AS recruitment_slug, p.slug AS post_slug, p.title AS post_title
    FROM public.posts p
    JOIN public.recruitments r ON r.id = p.recruitment_id
    WHERE r.verification_status IS DISTINCT FROM 'QUARANTINED'
    ORDER BY p.id
  `);
  const rows: UrlRow[] = [];
  const hubRows = (hubs as { rows?: Array<{ slug: string; name: string }> }).rows ?? hubs as unknown as Array<{ slug: string; name: string }>;
  for (const row of hubRows) {
    const url = `${base}/jobs/${row.slug}`;
    rows.push({ kind: "hub", expectedUrl: url, expectedCanonical: url, expectedSlug: row.slug, expectedEntityName: row.name ?? "" });
  }
  const leafRows = (leaves as { rows?: Array<{ recruitment_slug: string; post_slug: string; post_title: string }> }).rows ?? leaves as unknown as Array<{ recruitment_slug: string; post_slug: string; post_title: string }>;
  for (const row of leafRows) {
    const url = `${base}/jobs/${row.recruitment_slug}/${row.post_slug}`;
    rows.push({ kind: "leaf", expectedUrl: url, expectedCanonical: url, expectedSlug: row.post_slug, expectedEntityName: row.post_title ?? "" });
  }
  if (scope === "all") {
    const aliases = await db.execute(sql`
      SELECT d.old_slug, d.new_slug, r.name
      FROM public.recruitment_slug_redirects d
      JOIN public.recruitments r ON r.id = d.recruitment_id
      WHERE d.old_slug <> d.new_slug
        AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
      ORDER BY d.id
    `);
    const aliasRows = (aliases as { rows?: Array<{ old_slug: string; new_slug: string; name: string }> }).rows ?? aliases as unknown as Array<{ old_slug: string; new_slug: string; name: string }>;
    for (const row of aliasRows) {
      const url = `${base}/jobs/${row.old_slug}`;
      const target = `${base}/jobs/${row.new_slug}`;
      rows.push({ kind: "alias", expectedUrl: url, expectedCanonical: target, expectedTargetUrl: target, expectedSlug: row.old_slug, expectedEntityName: row.name ?? "" });
    }
  }
  return rows;
}
async function check(row: UrlRow): Promise<Result> {
  const result: Result = {
    ...row, requestedUrl: row.expectedUrl, status: null, finalUrl: null, redirectChain: [],
    elapsedMs: 0, canonical: null, title: null, noindex: false, checks: [],
  };
  try {
    const response = await requestWithChain(row.expectedUrl);
    result.status = response.status;
    result.finalUrl = response.finalUrl;
    result.redirectChain = response.chain;
    result.elapsedMs = response.elapsedMs;
    result.title = titleFrom(response.body);
    result.canonical = canonicalFrom(response.body);
    result.noindex = isNoindex(response.body, response.xRobots);
    if (response.status !== 200) result.checks.push(`final HTTP ${response.status}, expected 200`);
    if (row.kind === "alias") {
      if (response.chain.length < 2) result.checks.push("alias did not redirect");
      const first = response.chain[0];
      if (first && ![301, 308].includes(first.status)) result.checks.push(`alias first response ${first.status}, expected permanent redirect`);
      if (normalizeUrl(response.finalUrl) !== normalizeUrl(row.expectedTargetUrl!)) result.checks.push(`wrong redirect destination: ${response.finalUrl}`);
    } else {
      if (response.chain.length !== 1) result.checks.push(`canonical URL unexpectedly redirects to ${response.finalUrl}`);
      if (result.canonical) {
        const actualCanonical = new URL(result.canonical, response.finalUrl).toString();
        if (normalizeUrl(actualCanonical) !== normalizeUrl(row.expectedCanonical)) result.checks.push(`canonical mismatch: ${result.canonical}`);
      } else {
        result.checks.push("missing canonical tag");
      }
    }
    if (!response.body) result.checks.push("empty/non-HTML response body");
    if (response.body && /Recruitment not found|Job Posting Not Found|404 - Not Found/i.test(result.title ?? "")) result.checks.push("page title indicates not-found page despite HTTP response");
    if (row.expectedEntityName && response.body) {
      const expected = row.expectedEntityName.trim().replace(/\s+/g, " ");
      const htmlText = response.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      if (expected.length > 8 && !htmlText.includes(expected)) result.checks.push("expected entity name not found verbatim in rendered HTML (review; may be text-encoding/formatting difference)");
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    result.checks.push("request failed");
  }
  return result;
}
async function main() {
  if (!/^https?:\/\//i.test(base)) throw new Error("--base must be an absolute HTTP(S) URL");
  if (!["canonical", "all"].includes(scope)) throw new Error("--scope must be canonical or all");
  const inventory = await fetchRows();
  const selected = limit > 0 ? inventory.slice(0, limit) : inventory;
  console.log(`JobOye URL integrity audit: ${selected.length}/${inventory.length} URLs; scope=${scope}; base=${base}; concurrency=${concurrency}`);
  const results: Result[] = new Array(selected.length);
  let next = 0;
  async function worker() {
    while (true) {
      const index = next++;
      if (index >= selected.length) return;
      results[index] = await check(selected[index]);
      if ((index + 1) % 100 === 0) console.error(`Checked ${index + 1}/${selected.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, selected.length) }, worker));
  const failures = results.filter((r) => r.checks.length > 0);
  const summary = {
    generatedAt: new Date().toISOString(), base, scope, inventoryCount: inventory.length,
    checkedCount: results.length, passCount: results.length - failures.length,
    failCount: failures.length, statusCounts: results.reduce((acc, r) => {
      const key = r.status === null ? "REQUEST_ERROR" : String(r.status);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
  await mkdir(join(process.cwd(), "artifacts"), { recursive: true });
  const reportPath = join(process.cwd(), "artifacts", `url-integrity-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(reportPath, JSON.stringify({ summary, failures, results }, null, 2));
  console.log(JSON.stringify({ ...summary, reportPath }, null, 2));
  for (const failure of failures.slice(0, 200)) {
    console.log(`FAIL\t${failure.kind}\t${failure.status ?? "ERR"}\t${failure.expectedUrl}\t${failure.checks.join("; ")}`);
  }
  if (failures.length > 0) process.exitCode = 1;
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
