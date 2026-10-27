/**
 * Capture a fixed, reviewed FreeJobAlert pilot set for offline parser testing.
 *
 * Usage:
 *   npx tsx scripts/capture-fja-pilot.ts --out /tmp/fja-pilot.jsonl
 *
 * This script only downloads public FJA article pages and writes local evidence
 * files. It does not connect to Supabase or write canonical JobOye records.
 * Re-check the allowlisted URLs and site access rules before each run.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const PILOT_URLS = [
  "https://www.freejobalert.com/articles/nlc-india-apprentice-recruitment-2026-1067-posts-3075682",
  "https://www.freejobalert.com/articles/ksrtc-swift-recruitment-2026-apply-online-for-5-front-office-manager-housekeeping-staff-and-more-posts-3075672",
  "https://www.freejobalert.com/articles/army-public-school-happy-valley-driver-cum-mts-recruitment-2026-apply-offline-3075670",
  "https://www.freejobalert.com/articles/usac-recruitment-2026-walkin-for-5-junior-project-fellow-field-assistant-posts-3075668",
  "https://www.freejobalert.com/articles/ircon-manager-recruitment-2026-walkin-for-37-posts-3075665",
  "https://www.freejobalert.com/articles/aiims-kalyani-senior-resident-recruitment-2026-apply-online-for-12-posts-3075663",
  "https://www.freejobalert.com/articles/wb-police-driver-recruitment-2026-3075661",
  "https://www.freejobalert.com/articles/asmc-bahraich-non-pg-junior-resident-recruitment-2026-walkin-3075659",
  "https://www.freejobalert.com/articles/burari-hospital-senior-resident-recruitment-2026-walkin-for-16-posts-3075657",
  "https://www.freejobalert.com/articles/epi-consultant-expert-recruitment-2026-apply-offline-3075655",
  "https://www.freejobalert.com/articles/tiss-recruitment-2026-apply-online-for-senior-research-officer-senior-documentation-and-communication-officer-posts-3075653",
  "https://www.freejobalert.com/articles/isro-ursc-to-recruit-61-technician-b-driver-posts-3075553",
] as const;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

function recordFromHtml(url: string, html: string, fetchedAt: string, responseMeta: { status: number; finalUrl: string; contentType: string }) {
  const $ = cheerio.load(html);
  const match = new URL(url).pathname.match(/\/articles\/[a-z0-9-]+-(\d{4,})\/?$/i);
  if (!match) throw new Error("URL does not contain a stable FJA numeric article ID");
  const id = match[1];
  const title = collapse($("h1").first().text()) || collapse($("title").text());
  const rows: string[][] = [];
  $("article table tr, main table tr, .entry-content table tr").each((_, tr) => {
    const cells = $(tr).find("th,td").map((__, cell) => collapse($(cell).text())).get();
    if (cells.length) rows.push(cells);
  });
  const links: Array<[string, string]> = [];
  $("article a[href], main a[href], .entry-content a[href]").each((_, a) => {
    const label = collapse($(a).text());
    const href = $(a).attr("href");
    if (!href) return;
    try {
      const absolute = new URL(href, url).toString();
      if (absolute.startsWith("http://") || absolute.startsWith("https://")) links.push([label, absolute]);
    } catch {
      // Keep only parseable HTTP(S) links.
    }
  });
  return {
    id, url, finalUrl: responseMeta.finalUrl, httpStatus: responseMeta.status, contentType: responseMeta.contentType, listTitle: title, title, fetchedAt,
    metaDescription: collapse($('meta[name="description"]').attr("content") ?? ""),
    rows, links, html,
    htmlSha256: createHash("sha256").update(html).digest("hex"),
  };
}

async function assertRobotsAllowsPilot() {
  const robotsUrl = "https://www.freejobalert.com/robots.txt";
  const response = await fetch(robotsUrl, {
    headers: {
      "user-agent": "JobOyeResearchPilot/1.0 (bounded public-source capture; no database writes)",
      accept: "text/plain,*/*",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Cannot verify robots.txt (HTTP ${response.status}); refusing to crawl`);
  const body = await response.text();
  const groups: Array<{ agents: string[]; disallow: string[] }> = [];
  let agents: string[] = [];
  let disallow: string[] = [];
  let hasDirective = false;
  const flush = () => {
    if (agents.length) groups.push({ agents, disallow });
    agents = [];
    disallow = [];
    hasDirective = false;
  };
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (hasDirective) flush();
      agents.push(value.toLowerCase());
    } else if (key === "disallow" && value) {
      disallow.push(value);
      hasDirective = true;
    } else if (key === "allow" || key === "crawl-delay") {
      hasDirective = true;
    } else if (agents.length === 0) {
      // Ignore directives outside a user-agent group.
    }
  }
  flush();
  const relevant = groups.filter((g) => g.agents.includes("*") || g.agents.some((a) => a === "joboyeresearchpilot"));
  const paths = PILOT_URLS.map((url) => new URL(url).pathname);
  for (const group of relevant) {
    for (const rule of group.disallow) {
      // Conservative prefix check. If a wildcard rule is present, honor its fixed prefix.
      const prefix = rule.split("*")[0].replace(/\$$/, "");
      if (prefix && paths.some((p) => p.startsWith(prefix))) {
        throw new Error(`robots.txt disallows pilot article path via rule "${rule}"; refusing to crawl`);
      }
    }
  }
}
async function main() {
  const out = arg("out");
  if (!out) throw new Error("--out is required; choose a local scratch path");
  const resolvedOut = path.resolve(out);
  mkdirSync(path.dirname(resolvedOut), { recursive: true });
  const reportPath = `${resolvedOut}.report.json`;
  await assertRobotsAllowsPilot();
  const records: unknown[] = [];
  const failures: Array<{ url: string; error: string }> = [];
  let haltedByAccessControl = false;

  for (const url of PILOT_URLS) {
    const parsed = new URL(url);
    if (parsed.hostname !== "www.freejobalert.com" || !parsed.pathname.match(/\/articles\/[a-z0-9-]+-\d{4,}\/?$/i)) {
      failures.push({ url, error: "URL failed the fixed FJA host/path allowlist" });
      continue;
    }
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "JobOyeResearchPilot/1.0 (bounded public-source capture; no database writes)",
          accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(20000),
      });
      if ([401, 403, 429].includes(response.status)) {
        const error = new Error(`HTTP ${response.status}; access denied or rate-limited, stopping the pilot immediately`);
        failures.push({ url, error: error.message });
        haltedByAccessControl = true;
        console.error(`capture stopped: ${url} — ${error.message}`);
        break;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const type = response.headers.get("content-type") ?? "";
      if (!/text\/html|application\/xhtml\+xml/i.test(type)) throw new Error(`Unexpected content-type: ${type}`);
      const html = await response.text();
      if (!html || html.length < 1000) throw new Error("Response body was empty or unexpectedly small");
      const fetchedAt = new Date().toISOString();
      const record = recordFromHtml(url, html, fetchedAt, { status: response.status, finalUrl: response.url || url, contentType: type });
      records.push(record);
      console.log(`captured ${record.id} — ${record.title}`);
    } catch (error) {
      failures.push({ url, error: error instanceof Error ? error.message : String(error) });
      console.error(`capture failed: ${url}`);
    }
    await sleep(1500);
  }

  if (haltedByAccessControl) {
    const attempted = new Set([...records.map((r) => (r as { url: string }).url), ...failures.map((r) => r.url)]);
    for (const url of PILOT_URLS) {
      if (!attempted.has(url)) failures.push({ url, error: "Not attempted because capture stopped after access denial/rate limit" });
    }
  }

  writeFileSync(resolvedOut, records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : ""), "utf8");
  writeFileSync(reportPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    intended: PILOT_URLS.length,
    captured: records.length,
    failed: failures.length,
    records: records.map((r) => {
      const v = r as { id: string; url: string; finalUrl: string; httpStatus: number; contentType: string; title: string; fetchedAt: string; htmlSha256: string; html: string };
      return { id: v.id, url: v.url, finalUrl: v.finalUrl, httpStatus: v.httpStatus, contentType: v.contentType, title: v.title, fetchedAt: v.fetchedAt, htmlSha256: v.htmlSha256, htmlBytes: Buffer.byteLength(v.html, "utf8") };
    }),
    failures,
    databaseWrites: 0,
  }, null, 2), "utf8");

  console.log(JSON.stringify({ intended: PILOT_URLS.length, captured: records.length, failed: failures.length, out: resolvedOut, report: reportPath, databaseWrites: 0 }, null, 2));
  if (failures.length) process.exitCode = 2;
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
