/**
 * Semantic field validators (P0 remediation, increment SEM-001).
 *
 * A field may only hold a value that means what the field means. These are
 * pure, dependency-free checks used at three points: when an adapter picks a
 * value by label, when a posting is prepared for storage, and when a page
 * builds FAQs. A failing value is dropped (null); it is never replaced by
 * another field's value.
 *
 * Origin: the eligibility column was filled with application closing dates
 * because a loose /eligib/ label match picked up "Eligibility Cut-off Date".
 */

export type Checked<T> = { ok: true; value: T } | { ok: false; reason: string };

/**
 * A label that names a date, deadline or cut-off. Such a label never holds a
 * qualification, even when it also contains the word "eligibility".
 */
export function isDateLabel(key: string): boolean {
  return /\b(dates?|cut-?\s?off|deadline)\b/i.test(key);
}

const DATE_AT_START =
  /^\s*(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}\.?,?\s+\d{4})/;

const PLACEHOLDER =
  /^\s*(?:click here|here|n\/?a|nil|none|tbd|as per schedule|as per (?:the )?(?:notification|advertisement|advt|rules)|not (?:specified|available|mentioned|stated)|see (?:the )?(?:notification|advertisement|details)|refer (?:to )?(?:the )?(?:notification|advertisement)|check (?:the )?official)\b/i;

const DATE_LABEL_START =
  /^\s*(?:date of\b|(?:last|closing|cut-?\s?off|starting|opening|start|end)\s+date\b|closing\b|last date\b)/i;

/**
 * Eligibility (qualification) text. Rejects dates, date labels and
 * placeholders; anything else that is non-trivial text is accepted.
 */
export function validateEligibility(raw: string | null | undefined): Checked<string> {
  const t = (raw ?? "").replace(/\s+/g, " ").trim();
  if (t.length < 3) return { ok: false, reason: "empty" };
  if (/^(?:qualifications?|eligibility)$/i.test(t)) return { ok: false, reason: "label-only" };
  if (t.length < 60 && PLACEHOLDER.test(t)) return { ok: false, reason: "placeholder" };
  if (DATE_LABEL_START.test(t)) return { ok: false, reason: "date-label" };
  if (DATE_AT_START.test(t)) {
    const rest = t.replace(DATE_AT_START, "").replace(/\([^)]*\)/g, "").replace(/[\s,.;:-]+/g, " ").trim();
    if (rest.length < 15) return { ok: false, reason: "date-value" };
  }
  return { ok: true, value: t };
}

export function validateAge(
  min: number | null | undefined,
  max: number | null | undefined,
): { min: number | null; max: number | null } {
  const lo = min != null && Number.isFinite(min) && min >= 14 && min <= 60 ? min : null;
  const hi = max != null && Number.isFinite(max) && max >= 14 && max <= 70 ? max : null;
  if (lo != null && hi != null && lo > hi) return { min: null, max: null };
  return { min: lo, max: hi };
}

/**
 * Application fee in rupees. A reserved-category fee above the general fee is
 * treated as a probable swap and neither value is trusted.
 */
export function validateFee(
  general: number | null | undefined,
  reserved: number | null | undefined,
): { general: number | null; reserved: number | null } {
  const ok = (n: number | null | undefined) => (n != null && Number.isFinite(n) && n >= 0 && n <= 5000 ? n : null);
  const g = ok(general);
  const r = ok(reserved);
  if (g != null && r != null && r > g) return { general: null, reserved: null };
  return { general: g, reserved: r };
}

/** Monthly pay. Figures outside a plausible monthly range (e.g. annual amounts) are dropped. */
export function validateMonthlyPay(
  min: number | null | undefined,
  max: number | null | undefined,
): { min: number | null; max: number | null } {
  const ok = (n: number | null | undefined) => (n != null && Number.isFinite(n) && n >= 1000 && n <= 500000 ? n : null);
  const lo = ok(min);
  const hi = ok(max);
  if (lo != null && hi != null && lo > hi) return { min: null, max: null };
  // One implausible bound means the pair cannot be trusted as a range.
  if ((min != null && lo == null) || (max != null && hi == null)) return { min: null, max: null };
  return { min: lo, max: hi };
}

export function validateVacancies(n: number | null | undefined): number | null {
  if (n == null || !Number.isInteger(n) || n < 1 || n > 100000) return null;
  // Reject values that look like a calendar year scraped from the notice title
  // (e.g. "Recruitment 2026" → 2026). Only the current year ±1 is suspicious;
  // older years like 2008 or 2015 are plausible vacancy counts and are kept.
  const currentYear = new Date().getFullYear();
  if (n >= currentYear - 1 && n <= currentYear + 1) return null;
  return n;
}

/**
 * Last date to apply. For a posting that is open for applications the last
 * date cannot precede the posted date; otherwise the pair is not trusted.
 * (Result and admit-card posts legitimately carry an older last date.)
 */
export function validateLastDate(opts: {
  posted: Date | string | null | undefined;
  last: Date | string | null | undefined;
  applicationOpen: boolean;
}): Date | null {
  if (!opts.last) return null;
  const last = new Date(opts.last);
  if (!Number.isFinite(last.getTime())) return null;
  if (opts.applicationOpen && opts.posted) {
    const posted = new Date(opts.posted);
    if (Number.isFinite(posted.getTime()) && last.getTime() < posted.getTime() - 24 * 3600_000) return null;
  }
  return last;
}

export interface GateablePosting {
  eligibility?: string | null;
  ageLimitMin?: number | null;
  ageLimitMax?: number | null;
  applicationFeeGeneral?: number | null;
  applicationFeeReserved?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryPeriod?: string | null;
  totalVacancies?: number | null;
  currentStage?: string | null;
  datePosted?: Date | string | null;
  validThrough?: Date | string | null;
}

/**
 * Read-path gate: returns a copy of the posting in which every value that does
 * not mean what its field means is null. Nothing is substituted. Applied where
 * a posting is loaded for display, so the page, metadata, FAQs and JSON-LD all
 * see the same validated facts.
 */
export function applySemanticGate<T extends GateablePosting>(p: T): T {
  const out: GateablePosting = { ...p };

  if (p.eligibility != null) {
    const e = validateEligibility(p.eligibility);
    out.eligibility = e.ok ? e.value : null;
  }

  const age = validateAge(p.ageLimitMin, p.ageLimitMax);
  if (p.ageLimitMin != null) out.ageLimitMin = age.min;
  if (p.ageLimitMax != null) out.ageLimitMax = age.max;

  const fee = validateFee(p.applicationFeeGeneral, p.applicationFeeReserved);
  if (p.applicationFeeGeneral != null) out.applicationFeeGeneral = fee.general;
  if (p.applicationFeeReserved != null) out.applicationFeeReserved = fee.reserved;

  // The range check is for monthly pay; a stored yearly or other period is not judged here.
  if (!p.salaryPeriod || p.salaryPeriod === "MONTH") {
    const pay = validateMonthlyPay(p.salaryMin, p.salaryMax);
    if (p.salaryMin != null) out.salaryMin = pay.min;
    if (p.salaryMax != null) out.salaryMax = pay.max;
  }

  if (p.totalVacancies != null) out.totalVacancies = validateVacancies(p.totalVacancies);

  if (p.validThrough != null) {
    const last = validateLastDate({
      posted: p.datePosted,
      last: p.validThrough,
      applicationOpen: p.currentStage === "APPLICATION_OPEN" || p.currentStage === "NOTIFICATION_OUT",
    });
    out.validThrough = last ? p.validThrough : null;
  }

  return out as T;
}
