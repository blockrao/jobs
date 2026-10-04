/**
 * Content Quality Gate
 *
 * Deterministic, rule-based indexability decision for a posting — the
 * operating standard is: "we found a recruitment → normalize it → establish
 * sufficient facts → THEN decide whether it deserves an indexable canonical
 * page." Never the reverse ("we found a job → create an indexable page").
 *
 * This is intentionally NOT an AI call. AI may extract/normalize/classify
 * upstream of this; it must never fill in a missing field with a plausible
 * guess, and it never decides the tier. The rules here are everything the
 * standard treats as a hard requirement — nothing is invented, nothing is
 * scored subjectively.
 *
 * Three tiers:
 *   A — indexable: sitemap, JobPosting markup (if still hiring), full SEO.
 *   B — public, not indexed: visible on-site and in search, but noindex and
 *       excluded from the sitemap until enrichment fills the gaps.
 *   C — not published as a standalone page at all: non-job content (admit
 *       card / result / answer key / scholarship notices, which belong on a
 *       recruitment timeline, not as their own job page), a duplicate that
 *       points at a canonical elsewhere, or a posting whose stage claims
 *       "open" while its deadline has already passed (a data-integrity
 *       failure, not a content gap — fix the stage, don't index it).
 *
 * One function, used everywhere a page/schema/sitemap decision is made, so
 * there is never a second, hand-maintained copy of "is this good enough."
 */

import { orgNameVerdict } from "../org-name";

const OPEN_STAGES = new Set(["NOTIFICATION_OUT", "APPLICATION_OPEN", "ACTIVE"]);

// Content types that belong on a recruitment's update timeline, not as a
// standalone "job" page — publishing them as JobPosting-shaped pages is
// exactly the "scaled, minimally-transformed pages" pattern the standard
// warns about. If ingestion is capturing these as their own postings, the
// fix is to route them into posting_updates instead of generating a gate
// exemption here.
const NON_JOB_TITLE_PATTERN =
  /\b(admit card|hall ticket|answer key|city intimation|intimation slip|result|scholarship|admission(?:s)?|syllabus)\b/i;

export type IndexTier = "A" | "B" | "C";

export interface GateInput {
  title: string;
  totalVacancies: number | null;
  eligibility: string | null;
  description: string | null;
  locationCity: string | null;
  locationRegion: string | null;
  applyUrl: string | null;
  officialNotificationUrl: string | null;
  currentStage: string;
  validThrough: Date | null;
  postNames: string[] | null;
  isCanonical: boolean | null;
  canonicalSlug: string | null;
  slug: string;
}

export interface GateResult {
  tier: IndexTier;
  missing: string[];
  /** Tier C only: which hard disqualifier fired. */
  disqualified?: "non_job_content" | "duplicate" | "stale_open_stage";
}

function isStaleOpen(stage: string, validThrough: Date | null): boolean {
  return OPEN_STAGES.has(stage) && validThrough != null && validThrough.getTime() < Date.now();
}

export function evaluateContentQuality(p: GateInput): GateResult {
  // --- Hard disqualifiers: Tier C regardless of how complete the rest is ---
  if (NON_JOB_TITLE_PATTERN.test(p.title)) {
    return { tier: "C", missing: [], disqualified: "non_job_content" };
  }
  if (p.isCanonical === false && p.canonicalSlug && p.canonicalSlug !== p.slug) {
    return { tier: "C", missing: [], disqualified: "duplicate" };
  }
  if (isStaleOpen(p.currentStage, p.validThrough)) {
    // Stage says "still open" but the deadline has passed — a lifecycle
    // bug, not a content gap. Fix the stage transition upstream; until
    // then this must not be indexed as a live opportunity.
    return { tier: "C", missing: [], disqualified: "stale_open_stage" };
  }

  // --- Required facts for Tier A (section 4 of the standard) ---
  const missing: string[] = [];

  const hasRealTitle = Boolean(p.postNames && p.postNames.length > 0 && p.postNames[0]?.trim());
  if (!hasRealTitle) missing.push("extracted_job_title"); // headline ≠ job title

  if (p.totalVacancies == null) missing.push("vacancies");

  if (!p.eligibility || p.eligibility.trim().length < 30) missing.push("eligibility");

  if (!p.locationCity && !p.locationRegion) missing.push("location");

  if (!p.applyUrl && !p.officialNotificationUrl) missing.push("application_mechanism");

  if (!p.description || p.description.replace(/<[^>]+>/g, "").trim().length < 150) {
    missing.push("description");
  }

  return { tier: missing.length === 0 ? "A" : "B", missing };
}


/**
 * Marker of the facts-only description the file/aggregator loaders write when
 * the source gave no real prose. A page carrying it may exist; it is never a
 * complete representation of the job, so it is not JobPosting eligible (G3).
 */
export const FACTS_ONLY_DESCRIPTION_MARKER = "Check the official notification for";

export interface JobPostingEligibilityInput extends GateInput {
  reviewStatus: string;
  isExpired?: boolean | null;
}

export type JobPostingIneligibleReason =
  | "NOT_APPROVED"
  | "EXPIRED"
  | "NOT_OPEN"
  | "NOT_TIER_A"
  | "ORGANIZATION_UNRESOLVED"
  | "MULTI_POST_UNRESOLVED"
  | "DESCRIPTION_FACTS_ONLY";

/**
 * JobPosting eligibility (SEO-001 freeze, G1 and G3). A page may exist, even
 * be indexable, without being JobPosting eligible. One rule, used by the
 * builder and by measurement scripts.
 *
 * One JobPosting = one sufficiently resolved Post. A notice with several
 * posts and no resolved Post rows is not eligible: no generic JobPosting for
 * materially different jobs. The hiring organization is the posting's
 * organization only when it is a real issuing body (not a bucket or a
 * title-derived name); an employing organization per Post does not exist yet.
 */
export function evaluateJobPostingEligibility(
  p: JobPostingEligibilityInput,
  org: { name: string } | null,
): { eligible: boolean; reasons: JobPostingIneligibleReason[]; missing: string[] } {
  const reasons: JobPostingIneligibleReason[] = [];
  if (p.reviewStatus !== "APPROVED") reasons.push("NOT_APPROVED");
  if (p.isExpired === true) reasons.push("EXPIRED");
  if (!OPEN_STAGES.has(p.currentStage) || (p.validThrough != null && p.validThrough.getTime() < Date.now())) {
    reasons.push("NOT_OPEN");
  }
  const gate = evaluateContentQuality(p);
  if (gate.tier !== "A") reasons.push("NOT_TIER_A");
  if (!org || !orgNameVerdict(org.name).ok) reasons.push("ORGANIZATION_UNRESOLVED");
  if ((p.postNames?.length ?? 0) > 1) reasons.push("MULTI_POST_UNRESOLVED");
  if (p.description && p.description.includes(FACTS_ONLY_DESCRIPTION_MARKER)) reasons.push("DESCRIPTION_FACTS_ONLY");
  return { eligible: reasons.length === 0, reasons, missing: gate.missing };
}
