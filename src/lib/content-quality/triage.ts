/**
 * Pending-posting triage (pure, no database).
 *
 * Decides, from a snapshot of the non-approved postings, which can be
 * published now. It mirrors the content-quality gate (gate.ts) for the tier and
 * adds a publication floor that is deliberately stricter than "Tier B":
 *
 *   APPROVE_READY needs: a genuine open recruitment (not non-job content, not a
 *   duplicate, deadline known and not passed, open stage), a real issuing
 *   organization, an application link, vacancies, eligibility and a full
 *   description. Tier is then A (all gate facts) or B (only location and/or
 *   an extracted post title missing).
 *
 * Anything else that is a real job but short of that floor is HOLD_DATA.
 * Nothing here writes data; buildApprovalSql() only returns text for review.
 */

import { orgNameVerdict, normalizeOrgName } from "../org-name";

export type Decision = "APPROVE_READY" | "HOLD_DATA" | "TIMELINE_ONLY" | "DUPLICATE" | "REJECT_STALE";

export interface PendingRow {
  id: number;
  title: string;
  org: string | null;
  review_status: string;
  vac: number | null;
  has_elig: boolean;
  desc_len: number;
  official: boolean;
  apply: boolean;
  stage: string;
  valid_through: string | null;
  canonical: boolean | null;
  canonical_slug: string | null;
  post_names: string[] | null;
  location_region: string | null;
  flagged: boolean | null;
}

export interface ApprovedRow {
  id: number;
  slug?: string;
  title: string;
  org: string | null;
  vac: number | null;
  valid_through: string | null;
}

export interface TriageResult {
  id: number;
  title: string;
  org: string;
  decision: Decision;
  reason: string;
  refId?: number;
}

/** Same pattern as gate.ts NON_JOB_TITLE_PATTERN (kept in sync by a test), plus stage-update words the gate does not know. */
export const NON_JOB_TITLE_PATTERN =
  /\b(admit card|hall ticket|answer key|city intimation|intimation slip|result|scholarship|admission(?:s)?|syllabus)\b/i;
const EXTRA_NON_JOB =
  /\b(cut ?off|typing test|skill test|merit list|score ?card|interview (?:schedule|date)|document verification|counselling|new date|exam date)\b/i;
const NON_OPEN_STAGES = new Set(["ADMIT_CARD_RELEASED", "RESULT_OUT", "ANSWER_KEY_OUT", "FINAL_RESULT_OUT", "EXAM_SCHEDULED"]);
const OPEN_STAGES = new Set(["NOTIFICATION_OUT", "APPLICATION_OPEN", "ACTIVE"]);

const STOP = new Set(
  "recruitment 2026 2025 2024 2023 apply online offline notification out for posts post vacancy vacancies walkin walk in and more the of at form result admit card hall ticket answer key city intimation slip".split(" "),
);

export function titleTokens(title: string): Set<string> {
  const t = title.toLowerCase().replace(/[^a-z0-9 ]/g, " ");
  return new Set(t.split(/\s+/).filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function firstToken(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim().split(/\s+/)[0] ?? "";
}

function startOfUtcDay(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

const GENERIC_ORGS = new Set([
  "district program office",
  "district programme office",
  "railway recruitment cell",
  "indian institute of technology",
  "army public school",
  "educational institution",
]);

const GARBAGE_POST_NAME = /^(no\.? of posts?|\d+|teaching post|post name)$/i;

/** Gate-equivalent tier from the snapshot facts (location city is not in the snapshot; region only). */
export function estimateTier(r: PendingRow): { tier: "A" | "B"; missing: string[] } {
  const missing: string[] = [];
  if (!(r.post_names && r.post_names.length > 0 && r.post_names[0]?.trim())) missing.push("extracted_job_title");
  if (r.vac == null) missing.push("vacancies");
  if (!r.has_elig) missing.push("eligibility");
  if (!r.location_region) missing.push("location");
  if (!r.official && !r.apply) missing.push("application_mechanism");
  if (r.desc_len < 150) missing.push("description");
  return { tier: missing.length === 0 ? "A" : "B", missing };
}

function isNonJob(r: PendingRow): string | null {
  if (NON_JOB_TITLE_PATTERN.test(r.title)) return "title is non-job content (result, admit card, answer key, scholarship, admission or syllabus)";
  if (NON_OPEN_STAGES.has(r.stage)) return `stage ${r.stage} is a post-application update, not an open recruitment`;
  if (EXTRA_NON_JOB.test(r.title)) return "title is an exam-process update (cutoff, test, schedule or date change)";
  return null;
}

/** Best approved recruitment this update belongs to: same first token and at least two shared words (overlap relative to the shorter title). */
function findParent(r: PendingRow, approved: ApprovedRow[]): ApprovedRow | null {
  const tok = titleTokens(r.title);
  const ft = firstToken(r.title);
  let best: { score: number; a: ApprovedRow } | null = null;
  for (const a of approved) {
    if (firstToken(a.title) !== ft) continue;
    const at = titleTokens(a.title);
    let inter = 0;
    for (const x of tok) if (at.has(x)) inter++;
    const score = inter / Math.min(tok.size, at.size || 1);
    if (inter >= 2 && score >= 0.6 && (!best || score > best.score)) best = { score, a };
  }
  return best?.a ?? null;
}

type Dup = { of: number; strong: boolean };

function sameDeadlineOrUnknown(a: string | null, b: string | null): boolean {
  return !a || !b || a.slice(0, 10) === b.slice(0, 10);
}

function dupCheck(
  r: { id: number; title: string; vac: number | null; valid_through: string | null },
  other: { id: number; title: string; vac: number | null; valid_through: string | null },
): Dup | null {
  if (firstToken(r.title) !== firstToken(other.title)) return null;
  const j = jaccard(titleTokens(r.title), titleTokens(other.title));
  const vacMatch = r.vac != null && r.vac === other.vac;
  if (j >= 0.8 && (vacMatch || r.vac == null || other.vac == null) && sameDeadlineOrUnknown(r.valid_through, other.valid_through)) {
    return { of: other.id, strong: true };
  }
  if (j >= 0.6 && vacMatch && sameDeadlineOrUnknown(r.valid_through, other.valid_through)) return { of: other.id, strong: true };
  // Same issuer prefix, same count of two or more, same known deadline: possibly one notice under two headlines (not certain enough to call a duplicate).
  if (j >= 0.3 && vacMatch && (r.vac ?? 0) >= 2 && r.valid_through && other.valid_through && sameDeadlineOrUnknown(r.valid_through, other.valid_through)) {
    return { of: other.id, strong: false };
  }
  if (j >= 0.75) return { of: other.id, strong: false };
  return null;
}

/** Completeness for choosing which of two pending duplicates survives: more known facts first, then lower id. */
function richness(r: PendingRow): number {
  return (r.valid_through ? 4 : 0) + (r.vac != null ? 2 : 0) + (r.official || r.apply ? 1 : 0);
}

export function triage(pending: PendingRow[], approved: ApprovedRow[], now: Date = new Date()): TriageResult[] {
  const dayStart = startOfUtcDay(now);
  const out = new Map<number, TriageResult>();
  const org = (r: PendingRow) => r.org ?? "";
  const set = (r: PendingRow, decision: Decision, reason: string, refId?: number) =>
    out.set(r.id, { id: r.id, title: r.title, org: org(r), decision, reason, refId });

  const approvedBySlug = new Map(approved.filter((a) => a.slug).map((a) => [a.slug as string, a]));
  const live: PendingRow[] = []; // rows that reach the duplicate and data checks

  for (const r of pending) {
    const prior = r.review_status === "REJECTED" ? "previously REJECTED by a reviewer; " : "";
    const nj = isNonJob(r);
    if (nj) {
      const parent = findParent(r, approved);
      set(
        r,
        "TIMELINE_ONLY",
        prior + nj + (parent ? `; belongs on approved recruitment ${parent.id}` : "; no matching approved recruitment found"),
        parent?.id,
      );
      continue;
    }
    if (r.canonical === false) {
      const parent = r.canonical_slug ? approvedBySlug.get(r.canonical_slug) : undefined;
      set(r, "DUPLICATE", prior + "marked non-canonical" + (parent ? ` (canonical is approved ${parent.id})` : r.canonical_slug ? " (canonical slug is not an approved posting)" : ""), parent?.id);
      continue;
    }
    const vt = r.valid_through ? Date.parse(r.valid_through) : null;
    if (vt != null && vt < dayStart) {
      set(r, "REJECT_STALE", prior + `deadline ${r.valid_through!.slice(0, 10)} has passed`);
      continue;
    }
    if (vt == null) {
      const years = [...r.title.matchAll(/\b(20\d\d)\b/g)].map((m) => Number(m[1]));
      const maxYear = years.length ? Math.max(...years) : null;
      if (maxYear != null && maxYear < now.getUTCFullYear()) {
        set(r, "REJECT_STALE", prior + `no deadline and the title year is ${maxYear}; an old cycle`);
        continue;
      }
    }
    live.push(r);
  }

  // Duplicates against approved postings, then among the remaining pending rows.
  const survivors: PendingRow[] = [];
  const weak = new Map<number, number>();
  for (const r of live) {
    let dup: Dup | null = null;
    for (const a of approved) {
      const d = dupCheck(r, a);
      if (d && (!dup || (d.strong && !dup.strong))) dup = d;
      if (dup?.strong) break;
    }
    if (dup?.strong) {
      set(r, "DUPLICATE", `same recruitment as approved ${dup.of} (title, vacancies, deadline)`, dup.of);
      continue;
    }
    if (dup) weak.set(r.id, dup.of);
    survivors.push(r);
  }
  const dropped = new Set<number>();
  for (let i = 0; i < survivors.length; i++) {
    for (let j = i + 1; j < survivors.length; j++) {
      const a = survivors[i];
      const b = survivors[j];
      if (dropped.has(a.id) || dropped.has(b.id)) continue;
      const d = dupCheck(a, b);
      if (!d) continue;
      const keep = richness(a) > richness(b) || (richness(a) === richness(b) && a.id < b.id) ? a : b;
      const lose = keep === a ? b : a;
      if (!d.strong) {
        if (!weak.has(lose.id)) weak.set(lose.id, keep.id);
        continue;
      }
      dropped.add(lose.id);
      set(lose, "DUPLICATE", `same recruitment as pending ${keep.id} (kept: more complete or lower id)`, keep.id);
    }
  }

  for (const r of survivors) {
    if (dropped.has(r.id)) continue;
    const holds: string[] = [];
    if (r.review_status === "REJECTED") holds.push("previously REJECTED by a reviewer, not re-approved");
    if (r.flagged) holds.push("flagged: missing critical structured data");
    const verdict = orgNameVerdict(r.org);
    if (!verdict.ok) holds.push(`organization problem (${verdict.reason}): "${r.org ?? ""}"`);
    else if (GENERIC_ORGS.has(normalizeOrgName(r.org ?? ""))) holds.push(`organization too generic: "${r.org}"`);
    else if (normalizeOrgName(r.org ?? "") === normalizeOrgName(r.title)) holds.push("organization is the posting title (title-derived)");
    const w = weak.get(r.id);
    if (w) holds.push(`possible overlap with posting ${w} (similar notice; confirm it is a separate recruitment)`);
    if (!r.valid_through) holds.push("no deadline; cannot confirm it is open");
    if (!OPEN_STAGES.has(r.stage)) holds.push(`stage ${r.stage} not open`);
    if (!r.official && !r.apply) holds.push("no official or apply link");
    if (r.vac == null) holds.push(/\b\d[\d,]*\s+(?:posts?|vacanc)/i.test(r.title) ? "vacancies missing though the title states a count" : "vacancies missing");
    else if (r.vac <= 0) holds.push("vacancies not positive");
    else if (r.vac >= 2020 && r.vac <= 2030 && !new RegExp(`\\b${r.vac}\\s+(?:posts?|vacanc)`, "i").test(r.title)) holds.push(`vacancies ${r.vac} looks like a year, not a count`);
    if (!r.has_elig) holds.push("eligibility missing");
    if (r.desc_len < 150) holds.push("description under 150 characters");
    if (r.post_names?.[0] && GARBAGE_POST_NAME.test(r.post_names[0].trim())) holds.push(`post name extraction is garbage: "${r.post_names[0]}"`);

    if (holds.length > 0) {
      set(r, "HOLD_DATA", holds.join("; "));
      continue;
    }
    const { tier, missing } = estimateTier(r);
    set(r, "APPROVE_READY", `genuine open recruitment, closes ${r.valid_through!.slice(0, 10)}; expected Tier ${tier}` + (missing.length ? ` (missing: ${missing.join(", ")})` : ""));
  }
  return pending.map((r) => out.get(r.id)!);
}

export function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(rows: TriageResult[]): string {
  const lines = ["id,title,org,decision,reason"];
  for (const r of rows) lines.push([String(r.id), csvEscape(r.title), csvEscape(r.org), r.decision, csvEscape(r.reason)].join(","));
  return lines.join("\n") + "\n";
}

/**
 * The reviewed approval script for exactly the given ids.
 *
 * What approval changes (verified in code): the admin action only sets
 * review_status=APPROVED and updated_at; the promotion step also sets
 * publishing_status=AUTOMATED_VALIDATION_PASS, which every public query,
 * search and the lifecycle job require. index_tier, quality_missing and
 * quality_evaluated_at are written by the write path, not by approval, so the
 * script recomputes them with a SQL mirror of evaluateContentQuality().
 */
export function buildApprovalSql(ids: number[], opts: { generatedOn: string }): string {
  const list = [...new Set(ids)].sort((a, b) => a - b).join(", ");
  const nonJob = NON_JOB_TITLE_PATTERN.source.replace(/\\b/g, "\\y").replace(/\(\?:s\)\?/g, "s?");
  return `-- Approve ${ids.length} reviewed pending postings (generated ${opts.generatedOn}). Do not edit by hand; regenerate from the triage.
-- Semantics: see "What approval changes" at the end of this header.
--   review_status      PENDING -> APPROVED            (admin approve action, promotePending)
--   publishing_status  -> AUTOMATED_VALIDATION_PASS   (promotePending; required by search, listings, lifecycle)
--   index_tier, quality_missing, quality_evaluated_at recomputed with a SQL mirror of
--     src/lib/content-quality/gate.ts evaluateContentQuality() (same six facts, same hard disqualifiers).
--   updated_at = now()
--   Not done: the admin action's auto-generated news article (promotion does not create one either).
-- Rollback: UPDATE public.postings p SET review_status=b.review_status, publishing_status=b.publishing_status,
--   index_tier=b.index_tier, quality_missing=b.quality_missing, updated_at=now()
--   FROM backup_20261005.pending_approval_backup b WHERE p.id=b.id;  then run refresh_posting_urgency_states().
-- Preconditions: run the aggregator description cleanup first (its verification query returns 0).
-- Every statement is guarded by review_status='PENDING'; a row that no longer qualifies is skipped, not forced.

CREATE SCHEMA IF NOT EXISTS backup_20261005;
CREATE TABLE IF NOT EXISTS backup_20261005.pending_approval_backup AS
  SELECT id, review_status, publishing_status, index_tier, quality_missing
  FROM public.postings WHERE id IN (${list});

WITH cand AS (
  SELECT p.id,
    (p.title ~* '${nonJob}') AS nonjob,
    (p.is_canonical IS FALSE AND p.canonical_slug IS NOT NULL AND p.canonical_slug <> p.slug) AS dup,
    (p.current_stage IN ('NOTIFICATION_OUT','APPLICATION_OPEN','ACTIVE') AND p.valid_through IS NOT NULL AND p.valid_through < now()) AS stale,
    array_remove(ARRAY[
      CASE WHEN NOT (jsonb_typeof(p.post_names) = 'array' AND jsonb_array_length(p.post_names) > 0 AND btrim(coalesce(p.post_names->>0, '')) <> '') THEN 'extracted_job_title' END,
      CASE WHEN p.total_vacancies IS NULL THEN 'vacancies' END,
      CASE WHEN p.eligibility IS NULL OR length(btrim(p.eligibility)) < 30 THEN 'eligibility' END,
      CASE WHEN nullif(p.location_city, '') IS NULL AND nullif(p.location_region, '') IS NULL THEN 'location' END,
      CASE WHEN nullif(p.apply_url, '') IS NULL AND nullif(p.official_notification_url, '') IS NULL THEN 'application_mechanism' END,
      CASE WHEN p.description IS NULL OR length(btrim(regexp_replace(p.description, '<[^>]+>', '', 'g'))) < 150 THEN 'description' END
    ], NULL) AS missing
  FROM public.postings p
  WHERE p.id IN (${list}) AND p.review_status = 'PENDING'
), scored AS (
  SELECT id,
    CASE WHEN nonjob OR dup OR stale THEN 'C' WHEN cardinality(missing) = 0 THEN 'A' ELSE 'B' END AS tier,
    CASE WHEN nonjob OR dup OR stale THEN '[]'::jsonb ELSE to_jsonb(missing) END AS missing
  FROM cand
)
UPDATE public.postings p SET
  review_status = 'APPROVED',
  publishing_status = 'AUTOMATED_VALIDATION_PASS',
  index_tier = s.tier,
  quality_missing = s.missing,
  quality_evaluated_at = now(),
  updated_at = now()
FROM scored s
WHERE p.id = s.id
  AND p.review_status = 'PENDING'
  AND s.tier <> 'C'
  AND coalesce(p.publishing_status, 'DRAFT') IN ('DRAFT', 'PENDING_REVIEW')
  AND p.is_expired IS NOT TRUE
  -- publication floor (same as the triage; protects against drift since the snapshot)
  AND p.current_stage IN ('NOTIFICATION_OUT', 'APPLICATION_OPEN')
  AND p.valid_through >= (date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
  AND p.total_vacancies > 0
  AND (nullif(p.apply_url, '') IS NOT NULL OR nullif(p.official_notification_url, '') IS NOT NULL)
  AND p.eligibility IS NOT NULL AND length(btrim(p.eligibility)) >= 30
  AND p.description IS NOT NULL AND length(btrim(regexp_replace(p.description, '<[^>]+>', '', 'g'))) >= 150
  -- no provenance tags left in public text (names are checked by the cleanup precondition)
  AND p.description !~* '<small>\\s*Source\\s*:'
  AND p.description !~* '\\(via [^)]*\\)'
  AND p.description !~* '[—–-]\\s*(recruitment )?(notification )?via ';

-- Verification 1: ids from the list that are still PENDING (expected: none, or only rows that failed a guard above).
SELECT id, title, current_stage, valid_through, total_vacancies FROM public.postings
WHERE id IN (${list}) AND review_status = 'PENDING' ORDER BY id;

-- Verification 2: result of the approval, by tier.
SELECT index_tier, count(*) FROM public.postings
WHERE id IN (${list}) AND review_status = 'APPROVED' GROUP BY 1 ORDER BY 1;

-- Refresh search text and urgency (what promotePending does after publishing).
SELECT * FROM refresh_posting_urgency_states();
`;
}
