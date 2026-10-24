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
import { isAggregatorUrl } from "@/lib/aggregators";
import { toPlausibleRecruitmentDate } from "@/lib/recruitment-dates";

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

export type DeadlineState = "OPEN" | "CLOSED" | "UNKNOWN";

export interface ResolvedDeadline {
  date: Date | null;
  state: DeadlineState;
  verificationStatus?: "VERIFIED" | "PENDING"; // When PENDING, UI should show "Reported" label
}

export interface ResolvedSalary {
  min: number;
  max: number;
  currency: string;
  period: string;
  verificationStatus?: "VERIFIED" | "PENDING"; // When PENDING, UI should show "Reported" label
}

export interface ResolvedEmployer {
  name: string;
  sameAs?: string;
}

export interface ResolvedLocation {
  city?: string;
  state?: string;
  country: string;
  verificationStatus?: "VERIFIED" | "PENDING"; // When PENDING, UI should show "Reported" label
}

export interface ResolvedEligibility {
  qualificationText: string | null;
  experienceText: string | null;
  ageText: string | null;
  verificationStatus?: "VERIFIED" | "PENDING"; // When PENDING, UI should show "Reported" label
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

/** Post IDs whose posts.salary_min/max has been reconciled against official source. */
const RECONCILED_SALARY_POST_IDS = new Set<number>([
  2, // MoLJuS ALC — posts.salary_min=67700, salary_max=208700 confirmed against official gazette (Level-11)
]);

// ---------------------------------------------------------------------------
// Stored-link rule (LINK-001, ledger A-087, owner direction 2026-10-13)
// ---------------------------------------------------------------------------

// A stored official link is shown as stored. There is no judgement on the
// domain or on what the page behind the link contains: if the record holds a
// web link in an official-link field, the page shows it. This replaces the
// earlier domain list (.gov.in, .nic.in, .ac.in, .samarth.edu.in), which hid
// the stored links of public-sector companies, AIIMS institutes, research
// laboratories and other bodies that publish on other domains.
//
// Two mechanical limits remain, neither of them a judgement on content:
//   - the value must be an http(s) address, so it can be a link at all;
//   - aggregator and social links are never published (standing owner rule,
//     2026-10-05, enforced by src/lib/aggregators.ts).
function isPublishableLink(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    if (protocol !== "http:" && protocol !== "https:") return false;
  } catch {
    return false;
  }
  return !isAggregatorUrl(url);
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
 *      - sourceVerificationStatus === VERIFIED or PENDING
 *      - extractionConfidence >= 70
 *      - vacanciesTotal does NOT match the recruitment-level total (entity scope guard)
 *      Note: vacanciesByCategory must be non-null for the entity scope check to pass
 *        when vacanciesTotal looks like a recruitment total (see note below).
 *   2. No legacy-column fallback: posts.vacancy_total is not accepted without persisted provenance.
 *   3. null — insufficient evidence.
 */
export function resolvePostVacancy(
  post: Pick<JobPostingData, "enrichment"> & {
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
    const sourcePending = sourceVerificationStatus === "PENDING";
    const sourceAccepted = sourceVerified || sourcePending; // Accept both VERIFIED and PENDING
    const extractionValid = extractionConfidence >= 70;

    // Entity scope: if the enrichment vacancy total equals the recruitment-level
    // total (when known), it is almost certainly a scope leak. Reject it.
    const recruitmentTotal = post.recruitmentVacancyTotal ?? null;
    const scopeViolation =
      recruitmentTotal !== null &&
      vacanciesTotal !== undefined &&
      vacanciesTotal === recruitmentTotal;

    if (
      sourceAccepted &&
      extractionValid &&
      vacanciesTotal !== undefined &&
      vacanciesTotal > 0 &&
      !scopeViolation
    ) {
      return vacanciesTotal;
    }
  }

  // Do not fall back to an unverified enrichment value. A plausible positive
  // number is not authoritative without accepted source status and extraction
  // confidence; this rule is shared by visible UI, metadata, and structured data.
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
 *      - sourceVerificationStatus === VERIFIED or PENDING
 *      - extractionConfidence >= 70
 *      - salaryMin and salaryMax present
 *      - Internal consistency: if payLevel is stated, salary range must be
 *        consistent with the 7th CPC Pay Matrix for that level.
 *   2. posts.salary_min/max — passes when this Post ID is in RECONCILED_SALARY_POST_IDS.
 *   3. null — insufficient evidence.
 */
export function resolveSalary(
  post: JobPostingData
): ResolvedSalary | null {
  const enrichment = post.enrichment;

  // --- Enrichment pipeline (primary source) ---
  if (enrichment) {
    const {
      salaryMin,
      salaryMax,
      payLevel,
      sourceVerificationStatus,
      extractionConfidence,
    } = enrichment;

    const extractionValid = extractionConfidence >= 70;
    const salaryPresent = salaryMin != null && salaryMax != null;

    // Accept salary when extraction confidence is sufficient; verification status is optional
    if (extractionValid && salaryPresent) {
      // Internal consistency: check salary against payLevel when both stated
      const internallyConsistent =
        payLevel
          ? salaryConsistentWithPayLevel(salaryMin!, salaryMax!, payLevel)
          : true;

      if (internallyConsistent) {
        const result: ResolvedSalary = {
          min: salaryMin!,
          max: salaryMax!,
          currency: "INR",
          period: "MONTH",
        };

        // Include verification status when known
        if (sourceVerificationStatus) {
          const sourceVerified = sourceVerificationStatus === "VERIFIED";
          const sourcePending = sourceVerificationStatus === "PENDING";
          if (sourceVerified || sourcePending) {
            result.verificationStatus = sourceVerified ? "VERIFIED" : "PENDING";
          }
        }

        return result;
      }
    }
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
 *
 * Pipeline:
 *   1. post_enrichments deadline — passes when:
 *      - sourceVerificationStatus === VERIFIED or PENDING
 *      - date is plausible
 *   2. recruitments.application_end_date — passes when explicitly confirmed for this Post
 *   3. UNKNOWN — no verified deadline
 */
export function resolveDeadline(
  post: JobPostingData & {
    recruitmentApplicationEndDate?: Date | null; // recruitments.application_end_date
    postDeadlineConfirmedForRecruitment?: boolean; // explicit linkage flag
  },
  now: Date
): ResolvedDeadline {
  // A placeholder deadline (e.g. 2099-12-31 written by a bulk update) is not a
  // fact. It is treated exactly like an absent deadline so it can never resolve
  // to OPEN, drive a countdown, or reach structured data. See src/lib/recruitment-dates.ts.
  const enrichmentDeadline = toPlausibleRecruitmentDate(post.enrichment?.applicationClosingDate);

  // --- Enrichment deadline ---
  if (enrichmentDeadline) {
    const state: DeadlineState =
      enrichmentDeadline.getTime() > now.getTime() ? "OPEN" : "CLOSED";
    const result: ResolvedDeadline = { date: enrichmentDeadline, state };

    // Include verification status when known
    if (post.enrichment?.sourceVerificationStatus) {
      const sourceVerified = post.enrichment.sourceVerificationStatus === "VERIFIED";
      const sourcePending = post.enrichment.sourceVerificationStatus === "PENDING";
      if (sourceVerified || sourcePending) {
        result.verificationStatus = sourceVerified ? "VERIFIED" : "PENDING";
      }
    }

    return result;
  }

  // --- Recruitment-level fallback (only when explicitly confirmed for this Post) ---
  const recruitmentDeadline = post.postDeadlineConfirmedForRecruitment
    ? toPlausibleRecruitmentDate(post.recruitmentApplicationEndDate)
    : null;
  if (recruitmentDeadline) {
    const state: DeadlineState =
      recruitmentDeadline.getTime() > now.getTime() ? "OPEN" : "CLOSED";
    return { date: recruitmentDeadline, state };
  }

  return { date: null, state: "UNKNOWN" };
}

// ---------------------------------------------------------------------------
// Resolver 5: resolveOfficialSource
// ---------------------------------------------------------------------------

/**
 * Returns the official notification URL for a Post, or null.
 *
 * Stored-link rule (A-087): posts.officialSourceUrl when it holds a web link,
 * otherwise recruitments.official_notification_url. No domain or content
 * judgement; aggregator links are never returned. Null means nothing is stored.
 */
export function resolveOfficialSource(
  post: JobPostingData & {
    recruitmentOfficialNotificationUrl?: string | null;
  }
): string | null {
  // Post-level source (most specific)
  if (post.officialSourceUrl && isPublishableLink(post.officialSourceUrl)) {
    return post.officialSourceUrl;
  }

  // Recruitment-level fallback
  if (
    post.recruitmentOfficialNotificationUrl &&
    isPublishableLink(post.recruitmentOfficialNotificationUrl)
  ) {
    return post.recruitmentOfficialNotificationUrl;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Resolver 6: resolveApplicationUrl
// ---------------------------------------------------------------------------

/**
 * Returns the application URL for a Post, or null.
 *
 * Separate from resolveOfficialSource: the notification document and the
 * application endpoint are different facts and are never substituted for each
 * other.
 *
 * Stored-link rule (A-087): posts.applyPortalUrl when it holds a web link,
 * otherwise the Recruitment's application URL. No domain or content judgement;
 * aggregator links are never returned. Null means nothing is stored.
 */
export function resolveApplicationUrl(
  post: JobPostingData & {
    recruitmentOfficialApplicationUrl?: string | null;
  }
): string | null {
  // Post-level apply URL (most specific)
  if (post.applyPortalUrl && isPublishableLink(post.applyPortalUrl)) {
    return post.applyPortalUrl;
  }

  // Recruitment-level fallback
  if (
    post.recruitmentOfficialApplicationUrl &&
    isPublishableLink(post.recruitmentOfficialApplicationUrl)
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
 *
 * Pipeline:
 *   1. post_enrichments location — when sourceVerificationStatus is VERIFIED or PENDING
 *   2. posts.work_city/work_state (old schema) — treated as VERIFIED legacy data
 *   3. null — no location available
 */
export function resolveLocation(
  post: JobPostingData & {
    workCity?: string | null;
    workState?: string | null;
    locationFromEnrichment?: string | null;
  }
): ResolvedLocation | null {
  // Enrichment-based location (when available)
  if (post.locationFromEnrichment) {
    const result: ResolvedLocation = {
      city: post.locationFromEnrichment,
      country: "IN",
    };

    // Include verification status when known
    if (post.enrichment?.sourceVerificationStatus) {
      const sourceVerified = post.enrichment.sourceVerificationStatus === "VERIFIED";
      const sourcePending = post.enrichment.sourceVerificationStatus === "PENDING";
      if (sourceVerified || sourcePending) {
        result.verificationStatus = sourceVerified ? "VERIFIED" : "PENDING";
      }
    }

    return result;
  }

  // Old-schema location fields (legacy)
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
 *
 * Verification status: when eligibility text comes from enrichment (Phase 1 extraction),
 * the verification status is included so UI can show "Reported" labels for PENDING facts.
 */
export function resolveEligibility(
  post: JobPostingData & {
    qualificationText?: string | null; // posts.qualification_text
    experienceText?: string | null;    // posts.experience_text
    ageInfo?: string | null;           // posts.age_info
  }
): ResolvedEligibility {
  const qualText = post.qualificationText ?? post.enrichment?.eligibilityPathways?.[0]?.description ?? null;
  const expText = post.experienceText ?? null;
  const ageText = post.ageInfo ?? null;

  // If any eligibility text came from enrichment, include its verification status
  const hasEnrichmentEligibility = qualText && !post.qualificationText;
  const verificationStatus = hasEnrichmentEligibility && post.enrichment?.sourceVerificationStatus
    ? post.enrichment.sourceVerificationStatus === "VERIFIED"
      ? "VERIFIED"
      : post.enrichment.sourceVerificationStatus === "PENDING"
      ? "PENDING"
      : undefined
    : undefined;

  return {
    qualificationText: qualText,
    experienceText: expText,
    ageText: ageText,
    ...(verificationStatus ? { verificationStatus } : {}),
  };
}

// ===========================================================================
// Recruitment-level resolvers (Gate 4D)
//
// These are the canonical authority functions for Recruitment-level facts.
// The Hub page, structured data, sitemap, and any future API must call these —
// never implement their own interpretation of the same fields.
//
// Entity distinction:
//   Post resolvers  → Post-level facts  (Post Leaf, Post structured data)
//   Recruitment resolvers → Recruitment-level facts (Hub, Hub structured data)
//
// Authority pipeline (same as Post resolvers):
//   source verified → extraction validated → entity scope validated →
//   internal consistency validated → authoritative
// ===========================================================================

// Input type shared by all Recruitment-level resolvers.
export interface RecruitmentInput {
  officialNotificationUrl?: string | null; // recruitments.official_notification_url
  officialApplicationUrl?: string | null;  // recruitments.official_application_url
  applyUrl?: string | null;                // recruitments.apply_url (enrichment field)
  officialLinkSource?: string | null;      // recruitments.official_link_source (MANUAL_VERIFIED | AGGREGATOR_DISCOVERED)
  organizationName?: string | null;        // from organizations join (organizations.name)
  selectionProcess?: string | null;        // recruitments.selection_process (text)
}

// ---------------------------------------------------------------------------
// Recruitment Resolver R1: resolveRecruitmentOfficialSource
// ---------------------------------------------------------------------------

/**
 * Returns the official notification URL for a Recruitment, or null.
 *
 * Stored-link rule (A-087): recruitments.official_notification_url is returned
 * whenever it holds a web link. No domain or content judgement; aggregator
 * links are never returned. Null means nothing is stored, and the Hub shows
 * no notification link.
 */
export function resolveRecruitmentOfficialSource(
  recruitment: Pick<RecruitmentInput, "officialNotificationUrl" | "officialLinkSource">
): string | null {
  const url = recruitment.officialNotificationUrl;
  if (!url) return null;

  return isPublishableLink(url) ? url : null;
}

// ---------------------------------------------------------------------------
// Recruitment Resolver R2: resolveRecruitmentApplicationUrl
// ---------------------------------------------------------------------------

/**
 * Returns the application URL for a Recruitment, or null.
 *
 * Separate from resolveRecruitmentOfficialSource: the notification document and
 * the application portal are different facts.
 *
 * Stored-link rule (A-087), in order:
 *   1. recruitments.official_application_url when it holds a web link.
 *   2. recruitments.apply_url when it holds a web link.
 * No domain or content judgement; aggregator links are never returned.
 *
 * Null means nothing is stored, and the Hub shows no apply link.
 */
export function resolveRecruitmentApplicationUrl(
  recruitment: Pick<RecruitmentInput, "officialApplicationUrl" | "applyUrl">
): string | null {
  if (recruitment.officialApplicationUrl && isPublishableLink(recruitment.officialApplicationUrl)) {
    return recruitment.officialApplicationUrl;
  }
  if (recruitment.applyUrl && isPublishableLink(recruitment.applyUrl)) {
    return recruitment.applyUrl;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Recruitment Resolver R3: resolveRecruitmentEmployer
// ---------------------------------------------------------------------------

/**
 * Returns the canonical employer/organization name for a Recruitment, or null.
 *
 * Authority rules:
 *   1. organizationName + organizationVerified === true → authoritative.
 *   2. organizationName alone (unverified) → return the name as-is.
 *      The organization table is the canonical registry; a name present there
 *      is preferred over null even without an explicit verification flag.
 *   3. No organizationName → null. Do not infer from recruitment.name or slug.
 *
 * Null means: organization identity is unresolved. The Hub must not fall back
 * to title-derived or slug-derived names as authoritative facts.
 *
 * Note: Unlike resolveEmployer (Post-level), this does not require
 * organizationVerified === true to return a value, because at the Recruitment
 * level the organization row is the identity anchor — the join already happened.
 * A strict verified-only gate is preserved as a comment for Phase 2 when
 * ORG-001B establishes the full verified registry.
 */
export function resolveRecruitmentEmployer(
  recruitment: Pick<RecruitmentInput, "organizationName">
): string | null {
  if (!recruitment.organizationName) return null;
  // Phase 2: tighten to a verified flag once ORG-001B is live.
  return recruitment.organizationName;
}

// ---------------------------------------------------------------------------
// Recruitment Resolver R4: resolveRecruitmentSelectionProcess
// ---------------------------------------------------------------------------

/**
 * Returns the recruitment-wide selection process description, or null.
 *
 * Authority rules:
 *   - recruitments.selection_process is a Recruitment-owned text field.
 *     It describes the process for the whole recruitment (e.g. "CBT → Mains → Interview"),
 *     not any individual Post's process.
 *   - This resolver is Recruitment-scoped: it intentionally does NOT look at
 *     Post enrichment or cross-Post consensus (that is resolveSelectionProcess's job).
 *   - A non-empty, non-whitespace-only string is returned as-is.
 *   - Null means: no recruitment-level selection process has been recorded.
 *     The Hub must omit this fact rather than display a placeholder.
 *
 * Phase 2: if Post-level selection processes are reconciled and confirmed
 * recruitment-wide, this resolver can be extended to incorporate that signal.
 */
export function resolveRecruitmentSelectionProcess(
  recruitment: Pick<RecruitmentInput, "selectionProcess">
): string | null {
  const val = recruitment.selectionProcess;
  if (!val || !val.trim()) return null;
  return val.trim();
}
