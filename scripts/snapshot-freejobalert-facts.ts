#!/usr/bin/env node
/**
 * Research-only snapshot of publicly displayed FreeJobAlert recruitment facts.
 *
 * This does not write to Supabase, JobOye tables, or published content.
 * Output is a separate JSONL file plus an optional raw-text evidence file.
 *
 * Usage:
 *   npx tsx scripts/snapshot-freejobalert-facts.ts
 *   MAX_PAGES=500 DELAY_MS=1200 npx tsx scripts/snapshot-freejobalert-facts.ts
 *
 * Respect the site's robots.txt and applicable terms. Stop if access is denied.
 */
import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://www.freejobalert.com";
const USER_AGENT = "JobOyeResearchFactSnapshot/1.0 (public-facts comparison; contact: admin@joboye.com)";
const MAX_PAGES = positiveInt(process.env.MAX_PAGES, 1000);
const DELAY_MS = positiveInt(process.env.DELAY_MS, 1200);
const OUT_DIR = process.env.OUT_DIR || path.resolve("data/research/freejobalert");
const ARTICLE_PATH = /\/articles\/[a-z0-9-]+-\d{4,}\/??$/i;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
function absoluteHttpUrl(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}
async function fetchText(url: string): Promise<{ text: string; status: number; finalUrl: string }> {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "text/html,application/xml,text/plain,*/*" },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  const text = await response.text();
  if (response.status === 401 || response.status === 403 || response.status === 429) {
    throw new Error(`Access denied/rate limited (HTTP ${response.status}) at ${url}; stopping rather than bypassing`);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return { text, status: response.status, finalUrl: response.url || url };
}
async function robotsAllows(url: string): Promise<boolean> {
  const { text } = await fetchText(`${BASE}/robots.txt`);
  // Conservative check for explicit disallow of article paths in any user-agent group.
  // We do not attempt to override restrictions; if robots cannot be interpreted, stop.
  const lines = text.split(/\r?\n/).map((line) => line.split("#")[0].trim()).filter(Boolean);
  let applies = false;
  let groupHasAgent = false;
  const disallowed: string[] = [];
  for (const line of lines) {
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      if (groupHasAgent && value === "*") applies = true;
      else if (groupHasAgent && value !== "*") applies = false;
      groupHasAgent = true;
      if (value === "*" || /joboyeresearchfactsnapshot|claudebot|anthropic-ai/i.test(value)) applies = true;
      continue;
    }
    if (key === "disallow" && applies && value) disallowed.push(value);
  }
  return !disallowed.some((rule) => rule === "/" || (rule !== "" && "/articles/example-1234/".startsWith(rule)));
}
async function collectArticleUrls(): Promise<string[]> {
  const queue = [`${BASE}/sitemap.xml`, `${BASE}/sitemap_index.xml`];
  const seenSitemaps = new Set<string>();
  const articles = new Set<string>();
  while (queue.length && articles.size < MAX_PAGES) {
    const sitemap = queue.shift()!;
    if (seenSitemaps.has(sitemap)) continue;
    seenSitemaps.add(sitemap);
    try {
      const { text } = await fetchText(sitemap);
      const $ = cheerio.load(text, { xmlMode: true });
      const locs = $("loc").map((_, el) => $(el).text().trim()).get();
      for (const loc of locs) {
        const url = absoluteHttpUrl(loc, sitemap);
        if (!url || new URL(url).hostname !== new URL(BASE).hostname) continue;
        if (ARTICLE_PATH.test(new URL(url).pathname)) articles.add(url);
        else if (/sitemap.*\.xml(?:\.gz)?$/i.test(new URL(url).pathname) && !seenSitemaps.has(url)) queue.push(url);
        if (articles.size >= MAX_PAGES) break;
      }
      await sleep(DELAY_MS);
    } catch (error) {
      console.warn(`Skipping sitemap ${sitemap}: ${(error as Error).message}`);
    }
  }
  if (articles.size === 0) {
    throw new Error("No article URLs found in public sitemaps. Check sitemap URLs manually; no broad crawl fallback is attempted.");
  }
  return [...articles].slice(0, MAX_PAGES);
}
function normalizedText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
function extractFacts(html: string, sourceUrl: string, retrievedAt: string) {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, nav, footer").remove();
  const title = normalizedText($("h1").first().text() || $("meta[property='og:title']").attr("content") || $("title").text());
  const facts: Record<string, string | string[] | null> = {};
  const aliases: Record<string, RegExp> = {
    recruiting_body: /^(recruiting body|organization|organisation|department)$/i,
    post_name: /^(name of post|post name|name of posts?)$/i,
    vacancies: /^(total vacancies|no\.? of vacancies|number of vacancies|vacancies)$/i,
    qualification: /^(qualification|educational qualification|eligibility|education qualification)$/i,
    age_limit: /^(age limit|age criteria|age limit as on.*)$/i,
    salary_pay: /^(salary|pay scale|pay level|remuneration|pay matrix)$/i,
    application_fee: /^(application fee|fee details|exam fee)$/i,
    application_start_date: /^(starting date|application start date|start date|online application start date)$/i,
    application_end_date: /^(last date|last date to apply|closing date|application end date|last date for submission)$/i,
    notification_date: /^(notification date|published date|post date)$/i,
    selection_process: /^(selection process|mode of selection)$/i,
    job_location: /^(job location|location|place of posting)$/i,
    application_mode: /^(application mode|how to apply|apply mode)$/i,
  };
  $("table tr").each((_, tr) => {
    const cells = $(tr).find("th,td").toArray().map((cell) => normalizedText($(cell).text()));
    if (cells.length < 2 || !cells[0] || !cells.slice(1).join(" ")) return;
    for (const [key, pattern] of Object.entries(aliases)) {
      if (pattern.test(cells[0]) && facts[key] == null) facts[key] = cells.slice(1).join(" | ");
    }
  });
  // Preserve useful labelled sections and paragraphs as evidence, not as verified canonical facts.
  const sections: { heading: string; text: string }[] = [];
  $("h2, h3").each((_, heading) => {
    const label = normalizedText($(heading).text());
    if (!label) return;
    const parts: string[] = [];
    let next = $(heading).next();
    for (let i = 0; i < 8 && next.length && !/^h[1-6]$/i.test(next[0].tagName); i++, next = next.next()) {
      const value = normalizedText(next.text());
      if (value) parts.push(value);
    }
    if (parts.length) sections.push({ heading: label, text: parts.join("\n").slice(0, 5000) });
  });
  const links = $("a[href]").toArray().map((a) => ({
    text: normalizedText($(a).text()).slice(0, 200),
    url: absoluteHttpUrl($(a).attr("href"), sourceUrl),
  })).filter((link) => link.url);
  const officialCandidates = links.filter((link) =>
    /notification|advertisement|official website|apply online|apply now|download.*pdf|official notice/i.test(link.text)
  );
  const bodyText = normalizedText($("main").text() || $("article").text() || $("body").text()).slice(0, 30000);
  return {
    source: "freejobalert",
    source_url: sourceUrl,
    source_article_id: new URL(sourceUrl).pathname.match(/-(\d{4,})\/?$/)?.[1] ?? null,
    retrieved_at: retrievedAt,
    page_title: title || null,
    page_sha256: sha256(html),
    extraction_status: title ? "extracted" : "weak_page_structure",
    facts,
    official_link_candidates: officialCandidates,
    section_evidence: sections,
    visible_text: bodyText,
  };
}
async function main() {
  if (!(await robotsAllows(BASE))) {
    throw new Error("robots.txt appears to disallow article crawling; stopping.");
  }
  await mkdir(OUT_DIR, { recursive: true });
  const urls = await collectArticleUrls();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(OUT_DIR, `recruitment-facts-${stamp}.jsonl`);
  const errorsPath = path.join(OUT_DIR, `errors-${stamp}.jsonl`);
  const rows: string[] = [];
  const errors: string[] = [];
  console.log(`Found ${urls.length} public article URLs. Saving a separate research snapshot; no database writes.`);
  for (let index = 0; index < urls.length; index++) {
    const url = urls[index];
    try {
      const { text, finalUrl } = await fetchText(url);
      rows.push(JSON.stringify(extractFacts(text, finalUrl, new Date().toISOString())));
      if ((index + 1) % 25 === 0 || index + 1 === urls.length) {
        console.log(`Fetched ${index + 1}/${urls.length}`);
        await writeFile(outPath, rows.join("\n") + "\n", "utf8");
        await writeFile(errorsPath, errors.join("\n") + (errors.length ? "\n" : ""), "utf8");
      }
    } catch (error) {
      errors.push(JSON.stringify({ source_url: url, at: new Date().toISOString(), error: (error as Error).message }));
      console.warn(`Failed ${url}: ${(error as Error).message}`);
      if (/Access denied\/rate limited/i.test((error as Error).message)) break;
    }
    await sleep(DELAY_MS);
  }
  await writeFile(outPath, rows.join("\n") + (rows.length ? "\n" : ""), "utf8");
  await writeFile(errorsPath, errors.join("\n") + (errors.length ? "\n" : ""), "utf8");
  console.log(`Saved ${rows.length} records to ${outPath}`);
  console.log(`Saved ${errors.length} crawl errors to ${errorsPath}`);
  console.log("Treat extracted values as unverified leads only; reconcile every accepted fact to the official notification before JobOye use.");
}
main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
