/**
 * FreeJobAlert file adapter (WP-001).
 *
 * Reads a captured dataset (`fja_listings.jsonl`, one JSON record per article,
 * produced by the one-off collector) instead of scraping live pages, and emits
 * the same `RawPosting` shape every other adapter emits, so the pilot goes
 * through the real ingestion path (dedupe -> normalize -> write) and not a
 * special importer.
 *
 * Same source key ("ext-1") and external id (the article id) as the live
 * adapter, so records already in JobOye are matched by identity and updated in
 * place, never duplicated.
 *
 * The organization is taken from the source's labelled "Company Name" field,
 * never guessed from the headline. Aggregator-internal links are dropped; an
 * unresolved official link stays empty.
 */

import { readFileSync } from "node:fs";
import type { RawPosting } from "../types";
import { FACTS_ONLY_DESCRIPTION_MARKER } from "../../lib/content-quality/gate";
import { collapse, parseIndianDate, scoreConfidence, extractVacancies } from "./util";

const SOURCE = "ext-1";

interface FileRecord {
  id: string;
  url: string;
  listTitle?: string;
  title?: string;
  published?: string;
  fetchedAt?: string;
  metaDescription?: string;
  rows: string[][];
  links: Array<[string, string]>;
}

const NOT_JOB = /result|admit card|hall ticket|answer key|syllabus|time ?table|merit list|counsel|cut ?off|date sheet|score/i;
const JOB = /recruit|vacanc|apply|online form|walk|notification|apprentice|rally|application/i;
const SOCIAL = /freejobalert|whatsapp|t\.me|facebook|twitter|x\.com|reddit|instagram|youtube|play\.google|google\.com|arattai|linkedin/i;

export function looksLikeRecruitment(title: string): boolean {
  return JOB.test(title) && !NOT_JOB.test(title);
}

function kv(rows: string[][]): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows) {
    if (r.length === 2) {
      const k = collapse(r[0]).toLowerCase();
      if (k && !m.has(k)) m.set(k, collapse(r[1]));
    }
  }
  return m;
}

function pick(d: Map<string, string>, ...pats: RegExp[]): { label: string; value: string } | null {
  for (const [k, v] of d) {
    if (pats.some((p) => p.test(k)) && v) return { label: k, value: v };
  }
  return null;
}

function hostOf(u: string): string {
  try {
    return new URL(u).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** Classify the "Link Description | Link" table into notification / apply / website. Never returns an aggregator link. */
export function extractLinks(rec: FileRecord): {
  notification?: string;
  apply?: string;
  website?: string;
  all: Array<{ label: string; url: string }>;
} {
  const rows = rec.rows;
  const i = rows.findIndex((r) => r.length === 2 && collapse(r[0]).toLowerCase() === "link description");
  const labels: string[] = [];
  if (i >= 0) {
    for (const r of rows.slice(i + 1)) {
      if (r.length === 2 && collapse(r[1]).toLowerCase().startsWith("click")) labels.push(collapse(r[0]));
      else break;
    }
  }
  const ext = rec.links.filter(([, h]) => !SOCIAL.test(hostOf(h)));
  const clicks = ext.filter(([t]) => collapse(t).toLowerCase().startsWith("click")).map(([, h]) => h);
  let notification: string | undefined;
  let apply: string | undefined;
  let website: string | undefined;
  if (labels.length > 0 && labels.length === clicks.length) {
    labels.forEach((lab, idx) => {
      const l = lab.toLowerCase();
      const h = clicks[idx];
      if (/notif|advert|notice|detail/.test(l) && !notification) notification = h;
      else if (/apply|registr/.test(l) && !apply) apply = h;
      else if (/website|portal/.test(l) && !website) website = h;
    });
  }
  if (!notification) {
    const hit = ext.find(([, h]) => h.toLowerCase().split("?")[0].endsWith(".pdf") || /advert|advt|notif|viewfile|viewpdf|readpdf|recruit|career/i.test(h));
    if (hit) notification = hit[1];
  }
  if (!website) {
    const hit = ext.find(([, h]) => {
      try {
        return new URL(h).pathname.replace(/\//g, "").length === 0;
      } catch {
        return false;
      }
    });
    if (hit) website = hit[1];
  }
  return {
    notification,
    apply,
    website,
    all: ext.map(([label, url]) => ({ label: collapse(label), url })).slice(0, 40),
  };
}

/** First table that looks like "post name | vacancies": per-post vacancy counts and any stated total. */
export function extractPostTable(rows: string[][]): { posts: Array<{ name: string; vacancies?: number }>; statedTotal?: number } {
  let i = 0;
  while (i < rows.length) {
    const r = rows[i];
    if (r.length >= 2 && /post|trade|discipline|subject|department|name of/i.test(r[0]) && !/categor/i.test(r[0]) && /vacanc|total|no\.? of|posts|seats/i.test(r.slice(1).join(" "))) {
      const posts: Array<{ name: string; vacancies?: number }> = [];
      let statedTotal: number | undefined;
      let j = i + 1;
      while (j < rows.length && rows[j].length >= 2) {
        const last = rows[j][rows[j].length - 1];
        const m = /^\s*(\d[\d,]*)\s*$/.exec(last || "");
        if (!m) break;
        const v = parseInt(m[1].replace(/,/g, ""), 10);
        const name = collapse(rows[j][0]);
        if (/^(grand )?total/i.test(name) || name === "") statedTotal = v;
        else posts.push({ name, vacancies: v });
        j++;
      }
      if (posts.length >= 1) return { posts, statedTotal };
      i = j;
    } else {
      i++;
    }
  }
  return { posts: [] };
}

export function recordToRaw(rec: FileRecord, nowForObservation?: Date): RawPosting {
  const d = kv(rec.rows);
  const org = pick(d, /^company name$/, /^organi[sz]ation( name)?$/, /^recruiting (organi[sz]ation|body|authority)$/, /^recruitment body$/, /^departments?$/, /^controlling department$/);
  const advt = pick(d, /advt|advertisement|notification no/);
  const last = pick(d, /^last date/, /last date/, /closing/, /end date/);
  const start = pick(d, /start|begin/);
  const examDate = pick(d, /exam date/, /date of exam/);
  const vac = pick(d, /^no\.? of posts?$/, /total (vacanc|post)/, /vacanc/);
  const loc = pick(d, /job location/, /^location$/, /place of posting/);
  const qual = pick(d, /qualif|eligib/);
  const links = extractLinks(rec);
  const table = extractPostTable(rec.rows);

  const title = collapse(rec.title || rec.listTitle || "");
  const totalVacancies = vac ? extractVacancies(vac.value) ?? undefined : undefined;
  const validThrough = last ? parseIndianDate(last.value) : undefined;
  const applicationStartDate = start ? parseIndianDate(start.value) : undefined;
  const published = rec.published ? new Date(rec.published) : undefined;

  const postNames = table.posts.length > 0 ? table.posts.map((p) => p.name) : undefined;

  const factsSummary: string[] = [];
  if (org) factsSummary.push(`${org.value} has notified`);
  if (totalVacancies) factsSummary.push(`${totalVacancies} vacancies`);
  if (validThrough) factsSummary.push(`last date ${validThrough.toISOString().slice(0, 10)}`);
  const description = factsSummary.length > 1
    ? `${title}. ${factsSummary.join(", ")}. ${FACTS_ONLY_DESCRIPTION_MARKER} eligibility, fees and dates.`
    : `${title}. ${FACTS_ONLY_DESCRIPTION_MARKER} details.`;

  const p: RawPosting = {
    source: SOURCE,
    externalId: rec.id,
    sourceUrl: rec.url,
    title,
    kind: "GOVERNMENT",
    organizationName: org?.value ?? "",
    organizationFromLabel: Boolean(org),
    description,
    eligibility: qual?.value,
    postNames,
    postTable: table.posts,
    totalVacancies,
    advertisementNumber: advt?.value,
    applicationStartDate,
    validThrough,
    examDate: examDate ? parseIndianDate(examDate.value) : undefined,
    datePosted: published && !isNaN(published.getTime()) ? published : undefined,
    locationRegion: loc?.value,
    locationCountry: "India",
    officialNotificationUrl: links.notification,
    applyUrl: links.apply,
    websiteUrl: links.website,
    stageHintText: title,
    observedAt: rec.fetchedAt ? new Date(rec.fetchedAt) : nowForObservation,
    observationLinks: links.all,
    observationFacts: {
      organization: org?.value ?? null,
      advertisementNumber: advt?.value ?? null,
      lastDate: last?.value ?? null,
      startDate: start?.value ?? null,
      examDate: examDate?.value ?? null,
      vacancies: vac?.value ?? null,
      postTable: table.posts,
      postTableStatedTotal: table.statedTotal ?? null,
      location: loc?.value ?? null,
      qualification: qual?.value ?? null,
      published: rec.published ?? null,
    },
    observationRaw: { articleId: rec.id, url: rec.url, rows: rec.rows },
  };
  p.confidence = scoreConfidence(p);
  return p;
}

export interface FileLoadStats {
  records: number;
  recruitments: number;
  notRecruitment: number;
}

export function loadFjaFile(path: string): { postings: RawPosting[]; stats: FileLoadStats } {
  const lines = readFileSync(path, "utf8").split("\n").filter((l) => l.trim().length > 0);
  const postings: RawPosting[] = [];
  let notRecruitment = 0;
  for (const line of lines) {
    const rec = JSON.parse(line) as FileRecord;
    const title = collapse(rec.title || rec.listTitle || "");
    if (!looksLikeRecruitment(title)) {
      notRecruitment++;
      continue;
    }
    postings.push(recordToRaw(rec));
  }
  return { postings, stats: { records: lines.length, recruitments: postings.length, notRecruitment } };
}
