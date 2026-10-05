/**
 * PQ-003 live-page release gate.
 *   npm run verify:live -- <slug> [--base https://www.joboye.com]
 * Checks /jobs/<slug> and /hi/jobs/<slug>. Exit code 1 on any failure.
 * Pure checks are in verify-live-checks.ts (unit tested, no network).
 */
import { checkPage, checkSitemap, formatTable, type CheckResult } from "./verify-live-checks";

async function get(url: string) {
  const res = await fetch(url, {
    redirect: "manual",
    headers: { "user-agent": "joboye-verify-live/1.0", "accept-language": "en" },
  });
  return { status: res.status, body: await res.text() };
}

async function main() {
  const args = process.argv.slice(2);
  const bi = args.indexOf("--base");
  const base = (bi >= 0 ? args[bi + 1] : "https://www.joboye.com").replace(/\/$/, "");
  const slug = args.find((a, i) => !a.startsWith("--") && i !== bi + 1);
  if (!slug) {
    console.error("usage: npm run verify:live -- <slug> [--base <url>]");
    process.exit(2);
  }
  const enUrl = `${base}/jobs/${slug}`;
  const hiUrl = `${base}/hi/jobs/${slug}`;
  const results: CheckResult[] = [];
  try {
    const [en, hi, sm] = await Promise.all([get(enUrl), get(hiUrl), get(`${base}/sitemap.xml`)]);
    results.push(...checkPage({ label: "en", url: enUrl, ...en }, { enUrl, hiUrl }));
    results.push(...checkPage({ label: "hi", url: hiUrl, ...hi }, { enUrl, hiUrl }));
    results.push(...checkSitemap(sm.status, sm.body, [enUrl, hiUrl]));
  } catch (e) {
    results.push({ page: "-", check: "fetch", ok: false, detail: String(e) });
  }
  console.log(formatTable(results));
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `\nFAIL: ${failed} check(s) failed` : "\nPASS: all checks passed");
  process.exit(failed ? 1 : 0);
}

main();
