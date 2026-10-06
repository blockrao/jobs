/**
 * Article facts -> posting fields (pure, no DB, no network).
 *
 * parseFreeJobAlertArticle() returns what a source article states (age, fee,
 * salary, dates, links, fact tables). This module decides what of that may be
 * written at creation time:
 *
 *  - fill-only: a value is used only when the extractor returned it; nothing is
 *    guessed, and a value the adapter already has is never replaced by one that
 *    is absent (an adapter value that is an aggregator link is replaced by a
 *    clean extractor value, never kept);
 *  - values the extractor flagged in review[] (age-over-60, age-inconsistent,
 *    fee-over-20000) are held, i.e. not written, while the rest still flows;
 *  - aggregator hygiene on everything persisted: links go through publicLink,
 *    text through stripAggregatorTag + containsAggregatorReference, table rows
 *    that still reference an aggregator are dropped;
 *  - the source article URL is never part of the output.
 */
import type { ExtraContent } from "@/db/schema";
import type { ArticleFacts } from "@/enrich/freejobalert-article";
import { containsAggregatorReference, publicLink, stripAggregatorTag } from "@/lib/aggregators";
import { validateEligibility } from "@/lib/semantic-fields";
import type { RawPosting } from "./types";

/** The RawPosting fields the article extractor can supply. */
export type EnrichedFields = Pick<
  RawPosting,
  | "ageLimitMin" | "ageLimitMax" | "ageRelaxationNotes"
  | "applicationFeeGeneral" | "applicationFeeReserved"
  | "salaryMin" | "salaryMax"
  | "validThrough" | "examDate"
  | "applyUrl" | "officialNotificationUrl" | "websiteUrl"
  | "extraContent"
>;

export interface EnrichmentOutcome {
  /** Fields the extractor supplied and that passed every check. */
  fields: Partial<EnrichedFields>;
  /** Field groups deliberately not written (flagged or unsafe). */
  held: string[];
}

const MAX_TABLE_ROWS = 60;
const MAX_CELL = 300;

function cleanText(text: string): string | null {
  const t = stripAggregatorTag(text).replace(/\s+/g, " ").trim();
  if (!t || containsAggregatorReference(t)) return null;
  return t.slice(0, MAX_CELL);
}

/** Tables with aggregator references removed: a bad title/header drops the table, a bad row drops the row. */
export function sanitizeExtraContent(ec: ExtraContent | null | undefined): ExtraContent | undefined {
  if (!ec) return undefined;
  const out: ExtraContent = {};
  const tables: NonNullable<ExtraContent["tables"]> = [];
  for (const t of ec.tables ?? []) {
    const title = cleanText(t.title);
    const headers = t.headers.map(cleanText);
    if (!title || t.headers.length === 0 || headers.some((h) => h == null)) continue;
    const rows: string[][] = [];
    for (const r of t.rows.slice(0, MAX_TABLE_ROWS)) {
      if (r.some((c) => containsAggregatorReference(c))) continue;
      rows.push(r.map((c) => cleanText(c) ?? ""));
    }
    if (rows.length === 0) continue;
    tables.push({ title, headers: headers as string[], rows });
  }
  if (tables.length) out.tables = tables;
  const notices = (ec.notices ?? []).flatMap((n) => {
    const title = cleanText(n.title), body = cleanText(n.body);
    return title && body ? [{ title, body }] : [];
  });
  if (notices.length) out.notices = notices;
  const faqs = (ec.faqs ?? []).flatMap((f) => {
    const q = cleanText(f.q), a = cleanText(f.a);
    return q && a ? [{ q, a }] : [];
  });
  if (faqs.length) out.faqs = faqs;
  return out.tables || out.notices || out.faqs ? out : undefined;
}

const validDate = (d: Date | undefined) => (d instanceof Date && !isNaN(d.getTime()) ? d : undefined);

/** Decide which extracted facts may be written. Pure; never invents a value. */
export function factsToFields(facts: ArticleFacts): EnrichmentOutcome {
  const fields: Partial<EnrichedFields> = {};
  const held: string[] = [];
  const flagged = (prefix: string) => facts.review.some((r) => r.startsWith(prefix));

  // Age: a flagged age (over 60 / inconsistent) holds the upper bound.
  if (facts.ageLimitMin != null && !facts.review.includes("age-inconsistent")) fields.ageLimitMin = facts.ageLimitMin;
  if (facts.ageLimitMax != null) {
    if (flagged("age-")) held.push("ageLimitMax");
    else fields.ageLimitMax = facts.ageLimitMax;
  }
  if (fields.ageLimitMin != null && fields.ageLimitMax != null && fields.ageLimitMin >= fields.ageLimitMax) {
    delete fields.ageLimitMin;
    delete fields.ageLimitMax;
    held.push("age-inconsistent");
  }
  if (facts.ageRelaxationNotes) {
    const n = cleanText(facts.ageRelaxationNotes);
    if (n) fields.ageRelaxationNotes = n;
    else held.push("ageRelaxationNotes");
  }

  // Fee: flagged (e.g. over 20000) holds both fee fields.
  if (facts.applicationFeeGeneral != null || facts.applicationFeeReserved != null) {
    if (flagged("fee-")) held.push("applicationFee");
    else {
      if (facts.applicationFeeGeneral != null && facts.applicationFeeGeneral >= 0) fields.applicationFeeGeneral = facts.applicationFeeGeneral;
      if (facts.applicationFeeReserved != null && facts.applicationFeeReserved >= 0) fields.applicationFeeReserved = facts.applicationFeeReserved;
    }
  }

  // Salary: only a coherent range; a lone minimum is fine.
  if (facts.salaryMin != null) {
    if (facts.salaryMax != null && facts.salaryMax < facts.salaryMin) held.push("salary-inconsistent");
    else {
      fields.salaryMin = facts.salaryMin;
      if (facts.salaryMax != null) fields.salaryMax = facts.salaryMax;
    }
  }

  const vt = validDate(facts.validThrough);
  if (vt) fields.validThrough = vt;
  const ed = validDate(facts.examDate);
  if (ed) fields.examDate = ed;

  // Links: aggregator and unparseable links are dropped, never stored.
  const apply = publicLink(facts.applyUrl);
  if (apply) fields.applyUrl = apply;
  else if (facts.applyUrl) held.push("applyUrl");
  const notif = publicLink(facts.officialNotificationUrl);
  if (notif) fields.officialNotificationUrl = notif;
  else if (facts.officialNotificationUrl) held.push("officialNotificationUrl");
  const site = publicLink(facts.officialWebsiteUrl);
  if (site) fields.websiteUrl = site;

  const ec = sanitizeExtraContent(facts.extraContent);
  if (ec) fields.extraContent = ec;
  else if (facts.extraContent) held.push("extraContent");

  return { fields, held };
}

const ENRICHED_KEYS: Array<keyof EnrichedFields> = [
  "ageLimitMin", "ageLimitMax", "ageRelaxationNotes", "applicationFeeGeneral", "applicationFeeReserved",
  "salaryMin", "salaryMax", "validThrough", "examDate", "applyUrl", "officialNotificationUrl", "websiteUrl", "extraContent",
];

const URL_KEYS = new Set<keyof EnrichedFields>(["applyUrl", "officialNotificationUrl", "websiteUrl"]);

/**
 * Fill-only merge of extractor facts into a posting-in-progress. A value the
 * adapter already holds wins, except an aggregator link, which is removed and
 * replaced by the extractor's clean link when there is one.
 */
export function mergeArticleFacts<T extends Partial<RawPosting>>(
  base: T,
  facts: ArticleFacts,
): { posting: T; held: string[]; filled: string[] } {
  const { fields, held } = factsToFields(facts);
  const posting = { ...base } as Record<string, unknown>;
  const filled: string[] = [];
  for (const k of ENRICHED_KEYS) {
    if (URL_KEYS.has(k)) posting[k] = publicLink(posting[k] as string | undefined) ?? undefined;
    const have = posting[k];
    const empty = have == null || have === "";
    if (empty && fields[k] !== undefined) {
      posting[k] = fields[k];
      filled.push(k);
    }
  }
  return { posting: posting as T, held, filled };
}

// ---------------------------------------------------------------------------
// Storage-time hygiene (defence in depth, applied by the writer to every posting)
// ---------------------------------------------------------------------------

export interface StorageHygiene {
  /** Cleaned values to persist in place of the raw ones. */
  clean: {
    title: string;
    description: string;
    eligibility: string | null;
    ageRelaxationNotes: string | null;
    locationCity: string | null;
    locationRegion: string | null;
    applyUrl: string | null;
    officialNotificationUrl: string | null;
    extraContent: ExtraContent | null;
  };
  /** Fields removed because they referenced an aggregator. */
  dropped: string[];
  /** Fields removed because the value did not mean what the field means, as "field:reason". */
  invalid: string[];
  /** Set when the record itself must not be stored (aggregator in the title). */
  rejectReason?: "AGGREGATOR_IN_TITLE";
}

function textOrNull(v: string | null | undefined, name: string, dropped: string[]): string | null {
  if (v == null || v === "") return null;
  const t = stripAggregatorTag(v);
  if (containsAggregatorReference(t)) {
    dropped.push(name);
    return null;
  }
  return t || null;
}

/** Semantic gate: a value that is a date, label or placeholder is not an eligibility. */
function validEligibility(v: string | null, invalid: string[]): string | null {
  if (v == null) return null;
  const r = validateEligibility(v);
  if (r.ok) return r.value;
  invalid.push(`eligibility:${r.reason}`);
  return null;
}

type HygieneInput = Pick<
  RawPosting,
  "title" | "description" | "eligibility" | "ageRelaxationNotes" | "locationCity" | "locationRegion" | "applyUrl" | "officialNotificationUrl" | "extraContent"
>;

export function sanitizeForStorage(p: HygieneInput): StorageHygiene {
  const dropped: string[] = [];
  const invalid: string[] = [];
  const title = stripAggregatorTag(p.title);
  const rejectReason = containsAggregatorReference(title) ? "AGGREGATOR_IN_TITLE" : undefined;
  const ec = sanitizeExtraContent(p.extraContent);
  if (p.extraContent && !ec) dropped.push("extraContent");
  const applyUrl = publicLink(p.applyUrl);
  if (p.applyUrl && !applyUrl) dropped.push("applyUrl");
  const notif = publicLink(p.officialNotificationUrl);
  if (p.officialNotificationUrl && !notif) dropped.push("officialNotificationUrl");
  return {
    clean: {
      title,
      description: textOrNull(p.description, "description", dropped) ?? "",
      eligibility: validEligibility(textOrNull(p.eligibility, "eligibility", dropped), invalid),
      ageRelaxationNotes: textOrNull(p.ageRelaxationNotes, "ageRelaxationNotes", dropped),
      locationCity: textOrNull(p.locationCity, "locationCity", dropped),
      locationRegion: textOrNull(p.locationRegion, "locationRegion", dropped),
      applyUrl,
      officialNotificationUrl: notif,
      extraContent: ec ?? null,
    },
    dropped,
    invalid,
    rejectReason,
  };
}
