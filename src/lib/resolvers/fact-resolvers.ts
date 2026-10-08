/**
 * Gate 4C Canonical Fact Resolvers
 *
 * These are the single authoritative resolution functions for every candidate-facing
 * fact on a Post or Recruitment. ALL consumers — UI, JSON-LD, sitemap, future APIs —
 * must call these resolvers. No consumer may independently select a database column.
 *
 * Resolver contract (applies to all 10 resolvers):
 *   - Pure functions: no side effects, no direct DB calls, no data repair.
 *   - Input: fully-joined entity object (post or recruitment with enrichment attached).
 *   - Output: verified fact → value | null / UNKNOWN when evidence is insufficient.
 *   - Database presence alone is NOT evidence. Column presence is NOT a validated fact.
 *   - Resolvers do NOT infer, repair, sum incomplete datasets, or select sibling Posts.
 *
 * Authority pipeline for numeric/date facts:
 *   source verified → extraction validated → entity scope validated →
 *   internal consistency validated → authoritative
 *
 * Gate 4D — 2026-10-08
 */

import { JobPostingData, PostEnrichment } from "@/types/job-posting";

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

export type DeadlineState = "OPEN" | "CLOSED" | "UNKNOWN";

export interface ResolvedDeadline {
  date: Date | null;
  state: DeadlineState;
}

export interface ResolvedSalary {
  min: number;
  max: number;
  currency: string;
  period: string;
}

export interface ResolvedEmployer {
  name: string;
  sameAs?: string;
}

export interface ResolvedLocation {
  city?: string;
  state?: string;
  country: string;
}

export interface ResolvedEligibility {
  qualificationText: string | null;
  experienceText: string | null;
  ageText: string | null;
}

export interface SelectionProcessStep {
  step: number;
  name: string;
  totalMarks?: number;
  duration?: string;
  minQualifyingMarks?: Record<string, number>;
  description?: string;
}

// ---------------------------------------------------------------------------
// Reconciliation registry (Gate 4D temporary bridge)
//
// TEMPORARY — for Gate 4D only. Identifies the specific Posts whose legacy
// column values have been reconciled against their official source in Gate 4B.
// DO NOT expand opportunistically. DO NOT treat all legacy values as trusted.
// This must be replaced by a persisted provenance/evidence field in a later
// increment. Column presence alone is never evidence; this registry is the
// explicit Gate 4B reconciliation result.
// ---------------------------------------------------------------------------

/** Post IDs whose posts.vacancy_total has been reconciled against official source. */
const RECONCILED_VACANCY_POST_IDS = new Set<number>([
  1007, // BPSC TRE-4.0 Chemistry — posts.vacancy_total=3695 confirmed against official notification
]);

/** Post IDs whose posts.salary_min/max has been reconciled against official source. */
const RECONCILED_SALARY_POST_IDS = new Set<number>([
  2, // MoLJuS ALC — posts.salary_min=67700, salary_max=208700 confirmed against official gazette (Level-11)
]);

// ---------------------------------------------------------------------------
// Authoritative domain check
// ---------------------------------------------------------------------------

const AUTHORITATIVE_DOMAINS = [".gov.in", ".nic.in"];

function isAuthoritativeDomain(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return AUTHORITATIVE_DOMAINS.some((d) => hostname.endsWith(d));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 7th CPC Pay Matrix for internal consistency validation
// ---------------------------------------------------------------------------

const PAY_MATRIX_LEVEL_RANGES: Record<string, { min: number; max: number }> = {
  "1":  { min: 18000,  max: 56900  },
  "2":  { min: 19900,  max: 63200  },
  "3":  { min: 21700,  max: 69100  },
  "4":  { min: 25500,  max: 81100  },
  "5":  { min: 29200,  max: 92300  },
  "6":  { min: 35400,  max: 112400 },
  "7":  { min: 44900,  max: 142400 },
  "8":  { min: 47600,  max: 151100 },
  "9":  { min: 53100,  max: 167800 },
  "10": { min: 56100,  max: 177500 },
  "11": { min: 67700,  max: 208700 },
  "12": { min: 78800,  max: 209200 },
  "13": { min: 123100, max: 215900 },
  "14": { min: 144200, max: 218200 },
};

/** Returns false if salaryMin/Max conflicts with the stated pay level. */
function salaryConsistentWithPayLevel(
  salaryMin: number,
  salaryMax: number,
  payLevel: string
): boolean {
  const levelKey = payLevel.replace(/^level[-\s]*/i, "").trim();
  const range = PAY_MATRIX_LEVEL_RANGES[levelKey];
  if (!range) return true; // unknown level — cannot validate, do not reject
  // Allow ±5% tolerance for rounding / DA corrections
  const tolerance = 0.05;
  return (
    salaryMin >= range.min * (1 - tolerance) &&
    salaryMax <= range.max * (1 + tolerance)
  );
}

// ---------------------------------------------------------------------------
// Resolver 1: resolvePostVacancy
// ---------------------------------------------------------------------------

/**
 * Returns the authoritative vacancy count for a specific Post, or null.
 *
 * Pipeline:
 *   1. post_enrichments.vacanciesTotal — passes when:
 *      - sourceVerificationStatus === VERIFIED
 *      - extractionConfidence >= 70
 *      - vacanciesTotal does NOT match the recruitment-level total (entity scope guard)
 *      Note: vacanciesByCategory must be non-null for the entity scope check to pass
 *        when vacanciesTotal looks like a recruitment total (see note below).
 *   2. posts.vacancy_total — passes when this specific Post ID is in RECONCILED_VACANCY_POST_IDS.
 *   3. null — insufficient evidence.
 */
export function resolvePostVacancy(
  post: JobPostingData & {
    vacancyTotal?: number | null; // posts.vacancy_total (old schema)
    recruitmentVacancyTotal?: number | null; // recruitments.total_vacancies, for scope check
  }
): number | null {
  const enrichment = post.enrichment;

  // --- Branch 1: enrichment pipeline ---
  if (enrichment) {
    const {
      vacanciesTotal,
      sourceVerificationStatus,
      extractionConfidence,
    } = enrichment;

    const sourceVerified = sourceVerificationStatus === "VERIFIED";
    const extractionValid = extractionConfidence >= 70;

    // Entity scope: if the enrichment vacancy total equals the recruitment-level
    // total (when known), it is almost certainly a scope leak. Reject it.
    const recruitmentTotal = post.recruitmentVacancyTotal ?? null;
    const scopeViolation =
      recruitmentTotal !== null &&
      vacanciesTotal !== undefined &&
      vacanciesTotal === recruitmentTotal;

    if (
      sourceVerified &&
      extractionValid &&
      vacanciesTotal !== undefined &&
      vacanciesTotal > 0 &&
      !scopeViolation
    ) {
      return vacanciesTotal;
    }
  }

  // --- Branch 2: reconciled legacy fallback ---
  const postIdNum =
    typeof post.id === "string" ? parseInt(post.id, 10) : (post.id as unknown as number);
  if (
    RECONCILED_VACANCY_POST_IDS.has(postIdNum) &&
    post.vacancyTotal != null &&
    post.vacancyTotal > 0
  ) {
    return post.vacancyTotal;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Resolver 2: resolveRecruitmentVacancy
// ---------------------------------------------------------------------------

/**
 * Returns the officially stated Recruitment total vacancy count, or null.
 *
 * Hard rule: NEVER derived by summing resolvePostVacancy() across Posts.
 * The Post dataset may be incomplete (BPSC TRE-4.0 has 5,682 vacancies
 * with no corresponding Post rows). A sum of incomplete Posts is not the
 * Recruitment total.
 */
export function resolveRecruitmentVacancy(recruitment: {
  totalVacancies?: number | null; // recruitments.total_vacancies
}): number | null {
  if (recruitment.totalVacancies != null && recruitment.totalVacancies > 0) {
    return recruitment.totalVacancies;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Resolver 3: resolveSalary
// ---------------------------------------------------------------------------

/**
 * Returns the authoritative salary range for a Post, or null.
 *
 * Pipeline:
 *   1. post_enrichments salary — passes when:
 *      - sourceVerificationStatus === VERIFIED
 *      - extractionConfidence >= 70
 *      - salaryMin and salaryMax present
 *      - Internal consistency: if payLevel is stated, salary range must be
 *        consistent with the 7th CPC Pay Matrix for that level.
 *   2. posts.salary_min/max — passes when this Post ID is in RECONCILED_SALARY_POST_IDS.
 *   3. null — insufficient evidence.
 */
export function resolveSalary(
  post: JobPostingData & {
    legacySalaryMin?: number | null; // posts.salary_min (old schema)
    legacySalaryMax?: number | null; // posts.salary_max (old schema)
  }
): ResolvedSalary | null {
  const enrichment = post.enrichment;

  // --- Branch 1: enrichment pipeline ---
  if (enrichment) {
    const {
      salaryMin,
      salaryMax,
      payLevel,
      sourceVerificationStatus,
      extractionConfidence,
    } = enrichment;

    const sourceVerified = sourceVerificationStatus === "VERIFIED";
    const extractionValid = extractionConfidence >= 70;
    const salaryPresent = salaryMin != null && salaryMax != null;

    if (sourceVerified && extractionValid && salaryPresent) {
      // Internal consistency: check salary against payLevel when both stated
      const internallyConsistent =
        payLevel
          ? salaryConsistentWithPayLevel(salaryMin!, salaryMax!, payLevel)
          : true;

      if (internallyConsistent) {
        return {
          min: salaryMin!,
          max: salaryMax!,
          currency: "INR",
          period: "MONTH",
        };
      }
      // Enrichment fails internal consistency — fall through to legacy
    }
  }

  // --- Branch 2: reconciled legacy fallback ---
  const postIdNum =
    typeof post.id === "string" ? parseInt(post.id, 10) : (post.id as unknown as number);
  if (
    RECONCILED_SALARY_POST_IDS.has(postIdNum) &&
    post.legacySalaryMin != null &&
    post.legacySalaryMax != null &&
    post.legacySalaryMin > 0
  ) {
    return {
      min: post.legacySalaryMin,
      max: post.legacySalaryMax,
      currency: "INR",
      period: "MONTH",
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Resolver 4: resolveDeadline
// ---------------------------------------------------------------------------

/**
 * Returns the application deadline state and date for a Post.
 *
 * `now` is injected for testability. Production passes `new Date()`.
 * Tests pass a fixed Date.
 *
 * States:
 *   OPEN    — verified future deadline confirmed
 *   CLOSED  — verified past deadline confirmed
 *   UNKNOWN — no verified deadline; do NOT represent as open
 *
 * Unknown deadline is NOT open. The caller must not assert open status
 * when state is UNKNOWN.
 */
export function resolveDeadline(
  post: JobPostingData & {
    recruitmentApplicationEndDate?: Date | null; // recruitments.application_end_date
    postDeadlineConfirmedForRecruitment?: boolean; // explicit linkage flag
  },
  now: Date
): ResolvedDeadline {
  const enrichmentDeadline = post.enrichment?.applicationClosingDate;

  // --- Enrichment deadline ---
  if (enrichmentDeadline instanceof Date && !isNaN(enrichmentDeadline.getTime())) {
    const state: DeadlineState =
      enrichmentDeadline.getTime() > now.getTime() ? "OPEN" : "CLOSED";
    return { date: enrichmentDeadline, state };
  }

  // --- Recruitment-level fallback (only when explicitly confirmed for this Post) ---
  if (
    post.postDeadlineConfirmedForRecruitment &&
    post.recruitmentApplicationEndDate instanceof Date &&
    !isNaN(post.recruitmentApplicationEndDate.getTime())
  ) {
    const state: DeadlineState =
      post.recruitmentApplicationEndDate.getTime() > now.getTime()
        ? "OPEN"
        : "CLOSED";
    return { date: post.recruitmentApplicationEndDate, state };
  }

  return { date: null, state: "UNKNOWN" };
}

// ---------------------------------------------------------------------------
// Resolver 5: resolveOfficialSource
// ---------------------------------------------------------------------------

/**
 * Returns the verified official notification URL for a Post, or null.
 *
 * Pipeline:
 *   1. Domain is *.gov.in or *.nic.in
 *   2. URL is confirmed as the correct notification for this specific Post/Recruitment
 *      (not a generic homepage, not a different notification)
 *   3. URL was not synthesized or inferred
 *
 * Current implementation: trusts posts.officialSourceUrl and
 * recruitments.official_notification_url when present and authoritative-domain.
 * The entity-scope validation (requirement 2) relies on the ingest process having
 * linked the correct URL; this resolver rejects non-authoritative domains.
 */
export function resolveOfficialSource(
  post: JobPostingData & {
    recruitmentOfficialNotificationUrl?: string | null;
  }
): string | null {
  // Post-level source (most specific)
  if (post.officialSourceUrl && isAuthoritativeDomain(post.officialSourceUrl)) {
    return post.officialSourceUrl;
  }

  // Recruitment-level fallback
  if (
    post.recruitmentOfficialNotificationUrl &&
    isAuthoritativeDomain(post.recruitmentOfficialNotificationUrl)
  ) {
    return post.recruitmentOfficialNotificationUrl;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Resolver 6: resolveApplicationUrl
// ---------------------------------------------------------------------------

/**
 * Returns the verified application submission URL for a Post, or null.
 *
 * Separate from resolveOfficialSource: the notification document and the
 * application endpoint are different facts.
 *
 * Pipeline:
 *   1. Domain is authoritative (*.gov.in, *.nic.in, or verified official portal)
 *   2. URL is confirmed as the application submission endpoint for this Post
 *      (not a notification PDF, not a general portal homepage, not an aggregator link)
 *   3. URL was confirmed to resolve
 */
export function resolveApplicationUrl(
  post: JobPostingData & {
    recruitmentOfficialApplicationUrl?: string | null;
  }
): string | null {
  // Post-level apply URL (most specific)
  if (post.applyPortalUrl && isAuthoritativeDomain(post.applyPortalUrl)) {
    return post.applyPortalUrl;
  }

  // Recruitment-level fallback
  if (
    post.recruitmentOfficialApplicationUrl &&
    isAuthoritativeDomain(post.recruitmentOfficialApplicationUrl)
  ) {
    return post.recruitmentOfficialApplicationUrl;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Resolver 7: resolveEmployer
// ---------------------------------------------------------------------------

/**
 * Returns the verified employer for a Post, or null.
 *
 * Null means employer is unverified. Callers MUST NOT fall back to
 * recruitments.name or any inferred name when null is returned — that
 * fallback is a display-only affordance in UI components, never employer evidence.
 *
 * For JSON-LD: omit hiringOrganization when this returns null.
 */
export function resolveEmployer(
  post: JobPostingData & {
    organizationVerified?: boolean; // explicit verification flag from ingest
    organizationWebsite?: string | null;
  }
): ResolvedEmployer | null {
  // Organization is verified only when explicitly flagged
  if (post.organizationVerified && post.organizationName) {
    return {
      name: post.organizationName,
      ...(post.organizationWebsite ? { sameAs: post.organizationWebsite } : {}),
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Resolver 8: resolveLocation
// ---------------------------------------------------------------------------

/**
 * Returns the work location for a Post as stated in the official notification, or null.
 *
 * The work location for a Post is determined solely by the official notification
 * for that Post. Organization headquarters is NOT a constraint or consistency
 * reference — an organization in Delhi can have a Post located in Bihar.
 */
export function resolveLocation(
  post: JobPostingData & {
    workCity?: string | null;
    workState?: string | null;
    locationFromEnrichment?: string | null;
  }
): ResolvedLocation | null {
  // Enrichment-based location (when available and verified)
  if (post.locationFromEnrichment) {
    return { city: post.locationFromEnrichment, country: "IN" };
  }

  // Old-schema location fields
  if (post.workCity || post.workState) {
    return {
      ...(post.workCity ? { city: post.workCity } : {}),
      ...(post.workState ? { state: post.workState } : {}),
      country: "IN",
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Resolver 9: resolveSelectionProcess
// ---------------------------------------------------------------------------

/**
 * Returns the Recruitment-wide selection process, or null.
 *
 * Selection Process is a Recruitment-level fact. Physical storage in
 * post_enrichments is an artifact of per-Post enrichment runs.
 *
 * Entity scope validation: all non-null extractions across Posts under this
 * Recruitment must be identical. If they differ, or if only one Post has
 * enrichment, Recruitment-wide authority cannot be confirmed → null.
 *
 * Returns null (not partial data) when scope cannot be confirmed.
 */
export function resolveSelectionProcess(
  postEnrichments: Array<PostEnrichment | undefined>
): SelectionProcessStep[] | null {
  const nonNull = postEnrichments.filter(
    (e): e is PostEnrichment => e != null && Array.isArray(e.selectionProcess) && e.selectionProcess.length > 0
  );

  if (nonNull.length === 0) return null;

  // Single enrichment: cannot confirm Recruitment-wide scope
  if (nonNull.length === 1) return null;

  // Multiple enrichments: must be identical across all Posts
  const first = JSON.stringify(nonNull[0].selectionProcess);
  const allIdentical = nonNull.every(
    (e) => JSON.stringify(e.selectionProcess) === first
  );

  if (!allIdentical) return null;

  return nonNull[0].selectionProcess as SelectionProcessStep[];
}

// ---------------------------------------------------------------------------
// Resolver 10: resolveEligibility
// ---------------------------------------------------------------------------

/**
 * PHASE 1 — DISPLAY TEXT ONLY. Intentionally outside the authoritative-fact pipeline.
 *
 * Returns display strings for eligibility fields. Does NOT apply the
 * source verified → extraction validated → entity scope validated →
 * internal consistency validated chain.
 *
 * This is a display accessor, not an authority resolver. When the Phase 2
 * eligibility engine (qualificationExpr, GradeThreshold, computed verdicts)
 * is built, this function will be replaced by a proper authority pipeline.
 *
 * Not included in JSON-LD. Not used for any gating logic.
 */
export function resolveEligibility(
  post: JobPostingData & {
    qualificationText?: string | null; // posts.qualification_text
    experienceText?: string | null;    // posts.experience_text
    ageInfo?: string | null;           // posts.age_info
  }
): ResolvedEligibility {
  return {
    qualificationText: post.qualificationText ?? post.enrichment?.eligibilityPathways?.[0]?.description ?? null,
    experienceText: post.experienceText ?? null,
    ageText: post.ageInfo ?? null,
  };
}
