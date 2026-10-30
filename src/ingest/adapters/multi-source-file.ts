/**
 * Multi-source file adapter.
 *
 * Reads a JSONL file produced by the Python scraper (`scrape_to_jsonl.py`) and
 * emits the same `RawPosting` shape every other adapter emits, so all sources
 * (SarkariResult, SarkariNaukri, EmploymentNews, etc.) go through the real
 * ingestion path: dedupe → normalize → write-postings-v2.
 *
 * The JSONL file contains FileRecord-compatible rows (same shape as
 * freejobalert-file.ts expects), so field extraction reuses the same helpers.
 * Each record carries a "Source Site" row that indicates its origin.
 *
 * Source keys:
 *   FreeJobAlert   → ext-1  (same as live freejobalert adapter)
 *   SarkariResult  → ext-2
 *   SarkariNaukri  → ext-3
 *   EmploymentNews → ext-5  (new; ext-4 is IndiaSarkariNaukri)
 *
 * Usage:
 *   INGEST_SOURCE_FILE=./sr.jsonl DRY_RUN=false npx tsx src/ingest/run-file.ts
 *
 * Or via the multi-source runner:
 *   npx tsx src/ingest/run-multi-source.ts --file ./sr.jsonl
 */

import { readFileSync } from "node:fs";
import { isDateLabel } from "../../lib/semantic-fields";
import type { RawPosting } from "../types";
import { FACTS_ONLY_DESCRIPTION_MARKER } from "../../lib/content-quality/gate";
import { collapse, parseIndianDate, parseIndianDeadline, scoreConfidence, extractVacancies } from "./util";

/** Source key map: label from Python scraper → stable source code */
const SOURCE_KEY: Record<string, string> = {
  FreeJobAlert: "ext-1",
  SarkariResult: "ext-2",
  SarkariNaukri: "ext-3",
  EmploymentNews: "ext-5",
  // Fallback for unknown sources
  default: "ext-99",
};

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
  source_site?: string;
  _extra?: Record<string, unknown>;
}

const SOCIAL = /freejobalert|whatsapp|t\.me|facebook|twitter|x\.com|reddit|instagram|youtube|play\.google|google\.com|arattai|linkedin/i;
const AGGREGATOR = /sarkariresult|sarkari-naukri|sarkarinaukri|employmentnews\.gov/i;

function hostOf(u: string): string {
  try {
    return new URL(u).hostname.toLowerCase();
  } catch {
    return "";
  }
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

function pickQualification(d: Map<string, string>): { label: string; value: string } | null {
  for (const [k, v] of d) {
    if (/qualif|eligib/.test(k) && !isDateLabel(k) && v) return { label: k, value: v };
  }
  return null;
}

/** Extract notification/apply links from the FileRecord, filtering aggregator links. */
function extractLinks(rec: FileRecord): {
  notification?: string;
  apply?: string;
  all: Array<{ label: string; url: string }>;
} {
  const ext = rec.links.filter(([, h]) => !SOCIAL.test(hostOf(h)) && !AGGREGATOR.test(hostOf(h)));
  let notification: string | undefined;
  let apply: string | undefined;

  for (const [label, href] of ext) {
    const l = label.toLowerCase();
    if (/notif|advert|notice|detail|pdf/.test(l) && !notification) notification = href;
    else if (/apply|registr|online form/.test(l) && !apply) apply = href;
  }

  // Fallback: PDF links look like notification PDFs
  if (!notification) {
    const pdfLink = ext.find(([, h]) => h.toLowerCase().endsWith(".pdf"));
    if (pdfLink) notification = pdfLink[1];
  }

  return {
    notification,
    apply,
    all: ext.map(([label, url]) => ({ label: collapse(label), url })).slice(0, 40),
  };
}

const NOT_JOB =
  /result|admit card|hall ticket|answer key|syllabus|time ?table|merit list|counsel|cut ?off|date sheet|score/i;
const JOB =
  /recruit|vacanc|apply|online form|walk|notification|apprentice|rally|application/i;

function looksLikeRecruitment(title: string): boolean {
  return JOB.test(title) && !NOT_JOB.test(title);
}

export function recordToRaw(rec: FileRecord): RawPosting {
  const d = kv(rec.rows);
  const org = pick(
    d,
    /^company name$/,
    /^organi[sz]ation( name)?$/,
    /^recruiting (organi[sz]ation|body|authority)$/,
    /^recruitment body$/,
    /^departments?$/,
  );
  const last = pick(d, /^last date/, /last date/, /closing/, /end date/);
  const start = pick(d, /start|begin/);
  const examDate = pick(d, /exam date/, /date of exam/);
  const vac = pick(d, /^no\.? of posts?$/, /total (vacanc|post)/, /vacanc/);
  const loc = pick(d, /job location/, /^location$/, /place of posting/);
  const qual = pickQualification(d);
  const links = extractLinks(rec);

  const title = collapse(rec.title || rec.listTitle || "");
  const totalVacancies = vac ? (extractVacancies(vac.value) ?? undefined) : undefined;
  const deadline = last ? parseIndianDeadline(last.value, { defaultTimezone: "Asia/Kolkata", defaultTimezoneBasis: "INDIA_SOURCE_DEFAULT" }) : undefined;
  const validThrough = deadline?.date ?? undefined;
  const applicationStartDate = start ? parseIndianDate(start.value) : undefined;
  const published = rec.published ? new Date(rec.published) : undefined;

  const sourceLabel = rec.source_site || d.get("source site") || "Unknown";
  const source = SOURCE_KEY[sourceLabel] ?? SOURCE_KEY.default;

  const factsSummary: string[] = [];
  if (org) factsSummary.push(`${org.value} has notified`);
  if (totalVacancies) factsSummary.push(`${totalVacancies} vacancies`);
  if (validThrough) factsSummary.push(`last date ${validThrough.toISOString().slice(0, 10)}`);
  const description =
    factsSummary.length > 1
      ? `${title}. ${factsSummary.join(", ")}. ${FACTS_ONLY_DESCRIPTION_MARKER} eligibility, fees and dates.`
      : `${title}. ${FACTS_ONLY_DESCRIPTION_MARKER} details.`;

  const p: RawPosting = {
    source,
    externalId: rec.id,
    sourceUrl: rec.url,
    title,
    kind: "GOVERNMENT",
    organizationName: org?.value ?? "",
    organizationFromLabel: Boolean(org),
    description,
    eligibility: qual?.value,
    totalVacancies,
    applicationStartDate,
    validThrough,
    validThroughPrecision: deadline?.precision,
    validThroughSourceText: deadline?.sourceText,
    validThroughTimezone: deadline?.timezone,
    validThroughTimezoneBasis: deadline?.timezoneBasis,
    validThroughSourceLabel: last?.label,
    examDate: examDate ? parseIndianDate(examDate.value) : undefined,
    datePosted: published && !isNaN(published.getTime()) ? published : undefined,
    locationRegion: loc?.value,
    locationCountry: "India",
    officialNotificationUrl: links.notification,
    applyUrl: links.apply,
    stageHintText: title,
    observedAt: rec.fetchedAt ? new Date(rec.fetchedAt) : undefined,
    observationLinks: links.all,
    observationFacts: {
      organization: org?.value ?? null,
      lastDate: last?.value ?? null,
      startDate: start?.value ?? null,
      examDate: examDate?.value ?? null,
      vacancies: vac?.value ?? null,
      location: loc?.value ?? null,
      qualification: qual?.value ?? null,
      published: rec.published ?? null,
      sourceLabel,
    },
  };

  p.confidence = scoreConfidence(p);
  return p;
}

export interface MultiSourceFileStats {
  records: number;
  recruitments: number;
  notRecruitment: number;
  bySite: Record<string, number>;
}

export function loadMultiSourceFile(filePath: string): {
  postings: RawPosting[];
  stats: MultiSourceFileStats;
} {
  const lines = readFileSync(filePath, "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  const postings: RawPosting[] = [];
  let notRecruitment = 0;
  const bySite: Record<string, number> = {};

  for (const line of lines) {
    let rec: FileRecord;
    try {
      rec = JSON.parse(line) as FileRecord;
    } catch {
      continue;
    }

    const title = collapse(rec.title || rec.listTitle || "");
    if (!looksLikeRecruitment(title)) {
      notRecruitment++;
      continue;
    }

    const raw = recordToRaw(rec);
    postings.push(raw);

    const site = rec.source_site || "Unknown";
    bySite[site] = (bySite[site] ?? 0) + 1;
  }

  return {
    postings,
    stats: {
      records: lines.length,
      recruitments: postings.length,
      notRecruitment,
      bySite,
    },
  };
}
