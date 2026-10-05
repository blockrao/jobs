/**
 * Live page check (PQ-003): `npm run verify:live -- <slug> [<slug> ...] [--base https://www.joboye.com]`
 *
 * Fetches each job page in English and Hindi plus the sitemap and prints
 * PASS / FAIL / INFO per check (rules in src/lib/verify-live.ts). Exit code 1 if
 * any check FAILs. Run it from a machine that can reach the site and attach the
 * output to the increment's RESULT: a page-affecting increment is not done until
 * this has passed on the page as served.
 */
import { analyzePage, sitemapLocs, type CheckResult } from "@/lib/verify-live";

async function get(url: string): Promise<{ status: number; text: string }> {
  const res = await fetch(url, { headers: { "user-agent": "joboye-verify-live/1.0" }, redirect: "follow" });
  return { status: res.status, text: await res.text() };
}

async function main() {
  const args = process.argv.slice(2);
  const baseIdx = args.indexOf("--base");
  const base = (baseIdx >= 0 ? args[baseIdx + 1] : "https://www.joboye.com").replace(/\/$/, "");
  const slugs = args.filter((a, i) => !a.startsWith("--") && i !== baseIdx + 1);
  if (slugs.length === 0) {
    console.error("usage: npm run verify:live -- <slug> [<slug> ...] [--base https://www.joboye.com]");
    process.exit(2);
  }

  let sitemapUrls: Set<string> | null = null;
  try {
    const sm = await get(`${base}/sitemap.xml`);
    if (sm.status === 200) sitemapUrls = sitemapLocs(sm.text);
  } catch {
    sitemapUrls = null;
  }
  console.log(`Base ${base}; sitemap ${sitemapUrls ? `${sitemapUrls.size} URLs` : "unreadable"}\n`);

  let failures = 0;
  for (const slug of slugs) {
    for (const locale of ["en", "hi"] as const) {
      const enPath = `/jobs/${slug}`;
      const url = `${base}${locale === "hi" ? "/hi" : ""}${enPath}`;
      let results: CheckResult[];
      try {
        const page = await get(url);
        results = analyzePage({ base, enPath, locale, status: page.status, html: page.text, sitemapUrls });
      } catch (e) {
        results = [{ check: "fetch", verdict: "FAIL", detail: String(e) }];
      }
      console.log(url);
      for (const r of results) {
        if (r.verdict === "FAIL") failures++;
        console.log(`  ${r.verdict.padEnd(4)}  ${r.check.padEnd(20)} ${r.detail}`);
      }
      console.log();
    }
  }
  console.log(failures === 0 ? "RESULT: all checks passed" : `RESULT: ${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
