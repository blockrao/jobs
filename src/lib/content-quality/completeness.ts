/**
 * Page Completeness Standard (PQ-002).
 *
 * The indexability gate (gate.ts) decides whether a page may be indexed. It does
 * not say whether the page is *good*: a posting can pass it with no pay, no age,
 * no fee and no Hindi. This standard is the second, separate measure ("complete
 * page"), reported next to the tier. It changes no indexing decision.
 *
 * One list of checks is the single definition. Each check carries a TypeScript
 * predicate (for one posting) and the equivalent SQL condition (for the weekly
 * whole-site report), so the report cannot drift from the definition:
 * `completenessReportSql()` is generated from the same list.
 *
 * Nothing here invents a value. A check passes only when the stored field is
 * present; absent facts stay absent.
 */

export type CompletenessGroup = "facts" | "trust" | "depth" | "hindi";

export interface CompletenessInput {
  totalVacancies: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  ageLimitMin: number | null;
  ageLimitMax: number | null;
  applicationFeeGeneral: number | null;
  applicationFeeReserved: number | null;
  eligibility: string | null;
  requirements: string | null;
  locationRegion: string | null;
  locationCity: string | null;
  validThrough: Date | null;
  officialNotificationUrl: string | null;
  applyUrl: string | null;
  lastVerifiedAt: Date | null;
  description: string | null;
  extraContent: { faqs?: unknown[] } | null;
  titleHi: string | null;
  descriptionHi: string | null;
  eligibilityHi: string | null;
}

/** Minimum notice-specific FAQs stored in extra_content (the template FAQs are not counted). */
export const MIN_NOTICE_FAQS = 3;
/** Minimum plain-text characters of description for a page to count as having depth. */
export const MIN_DESCRIPTION_CHARS = 800;

interface Check {
  key: string;
  group: CompletenessGroup;
  label: string;
  test: (p: CompletenessInput) => boolean;
  /** Same condition in SQL against `public.postings p`. */
  sql: string;
}

const text = (v: string | null | undefined) => (v ?? "").trim().length > 0;
const plainChars = (html: string | null | undefined) =>
  (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;

const present = (col: string) => `nullif(btrim(coalesce(p.${col}, '')), '') is not null`;

export const COMPLETENESS_CHECKS: readonly Check[] = [
  { key: "vacancies", group: "facts", label: "Vacancy count", test: (p) => (p.totalVacancies ?? 0) > 0, sql: "coalesce(p.total_vacancies, 0) > 0" },
  { key: "pay", group: "facts", label: "Pay or salary", test: (p) => (p.salaryMin ?? 0) > 0 || (p.salaryMax ?? 0) > 0, sql: "(coalesce(p.salary_min, 0) > 0 or coalesce(p.salary_max, 0) > 0)" },
  { key: "age", group: "facts", label: "Age limit", test: (p) => p.ageLimitMin != null || p.ageLimitMax != null, sql: "(p.age_limit_min is not null or p.age_limit_max is not null)" },
  { key: "fee", group: "facts", label: "Application fee", test: (p) => p.applicationFeeGeneral != null || p.applicationFeeReserved != null, sql: "(p.application_fee_general is not null or p.application_fee_reserved is not null)" },
  { key: "qualification", group: "facts", label: "Qualification", test: (p) => text(p.eligibility), sql: present("eligibility") },
  { key: "requirements", group: "facts", label: "Requirements", test: (p) => text(p.requirements), sql: present("requirements") },
  { key: "location", group: "facts", label: "Location", test: (p) => text(p.locationRegion) || text(p.locationCity), sql: `(${present("location_region")} or ${present("location_city")})` },
  { key: "last_date", group: "facts", label: "Last date", test: (p) => p.validThrough != null, sql: "p.valid_through is not null" },
  { key: "official_notice", group: "trust", label: "Official notice link", test: (p) => text(p.officialNotificationUrl), sql: present("official_notification_url") },
  { key: "apply_link", group: "trust", label: "Apply link", test: (p) => text(p.applyUrl), sql: present("apply_url") },
  { key: "verified_date", group: "trust", label: "Verified date", test: (p) => p.lastVerifiedAt != null, sql: "p.last_verified_at is not null" },
  {
    key: "notice_faqs",
    group: "depth",
    label: `At least ${MIN_NOTICE_FAQS} notice-specific FAQs`,
    test: (p) => Array.isArray(p.extraContent?.faqs) && p.extraContent!.faqs!.length >= MIN_NOTICE_FAQS,
    sql: `jsonb_array_length(case when jsonb_typeof(p.extra_content->'faqs') = 'array' then p.extra_content->'faqs' else '[]'::jsonb end) >= ${MIN_NOTICE_FAQS}`,
  },
  {
    key: "description_depth",
    group: "depth",
    label: `Description of at least ${MIN_DESCRIPTION_CHARS} characters`,
    test: (p) => plainChars(p.description) >= MIN_DESCRIPTION_CHARS,
    sql: `length(btrim(regexp_replace(regexp_replace(coalesce(p.description, ''), '<[^>]+>', ' ', 'g'), '\\s+', ' ', 'g'))) >= ${MIN_DESCRIPTION_CHARS}`,
  },
  { key: "hi_title", group: "hindi", label: "Hindi title", test: (p) => text(p.titleHi), sql: present("title_hi") },
  { key: "hi_description", group: "hindi", label: "Hindi description", test: (p) => text(p.descriptionHi), sql: present("description_hi") },
  { key: "hi_eligibility", group: "hindi", label: "Hindi qualification", test: (p) => text(p.eligibilityHi), sql: present("eligibility_hi") },
];

export interface CompletenessResult {
  passed: number;
  total: number;
  /** Whole-number percentage, passed / total. */
  score: number;
  missing: string[];
  byGroup: Record<CompletenessGroup, { passed: number; total: number }>;
}

export function evaluateCompleteness(p: CompletenessInput): CompletenessResult {
  const byGroup: CompletenessResult["byGroup"] = {
    facts: { passed: 0, total: 0 },
    trust: { passed: 0, total: 0 },
    depth: { passed: 0, total: 0 },
    hindi: { passed: 0, total: 0 },
  };
  const missing: string[] = [];
  let passed = 0;
  for (const c of COMPLETENESS_CHECKS) {
    byGroup[c.group].total++;
    if (c.test(p)) {
      passed++;
      byGroup[c.group].passed++;
    } else {
      missing.push(c.key);
    }
  }
  const total = COMPLETENESS_CHECKS.length;
  return { passed, total, score: Math.round((passed / total) * 100), missing, byGroup };
}

/** Live population: approved, publishable, not expired (the pages the public can reach). */
export const LIVE_WHERE_SQL = `p.review_status = 'APPROVED'
    and p.publishing_status in ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED')
    and coalesce(p.is_expired, false) = false`;

/**
 * One row per check: how many live pages (all, and Tier A) pass it. Read-only.
 * Generated from COMPLETENESS_CHECKS so it is the same definition as the code.
 * Each condition is evaluated once per page in the CTE, then counted.
 */
export function completenessReportSql(): string {
  const flags = COMPLETENESS_CHECKS.map((c) => `(${c.sql}) as c_${c.key}`).join(",\n    ");
  const rows = COMPLETENESS_CHECKS.map(
    (c) => `select '${c.key}' as key, '${c.group}' as grp,
      count(*) filter (where c_${c.key})::int as pass_all, count(*)::int as total_all,
      count(*) filter (where c_${c.key} and tier = 'A')::int as pass_tier_a,
      count(*) filter (where tier = 'A')::int as total_tier_a
    from live`
  );
  return `with live as (
  select p.index_tier as tier,
    ${flags}
  from public.postings p
  where ${LIVE_WHERE_SQL}
)
${rows.join("\nunion all\n")}`;
}
