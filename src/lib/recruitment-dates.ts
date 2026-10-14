/**
 * Recruitment date plausibility guard.
 *
 * Production carries placeholder deadlines (e.g. 2099-12-31) written by an
 * out-of-band bulk update and later copied into post_enrichments. A placeholder
 * is not a fact: it must never resolve to an OPEN deadline, a "Closes in N days"
 * countdown, a validThrough in structured data, or a date in a timeline.
 *
 * This guard is the single definition used by the fact resolver and by every
 * candidate-facing date renderer. It is a rendering/resolution safeguard only;
 * the source records are corrected through the governed data-repair process.
 */

export const MIN_PLAUSIBLE_RECRUITMENT_YEAR = 1900;
/** Exclusive upper bound. Anything from this year on is treated as a sentinel. */
export const SENTINEL_RECRUITMENT_YEAR = 2090;

export function isDisplayableRecruitmentDate(value: unknown): boolean {
  if (typeof value !== "string" && !(value instanceof Date)) return false;
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) return false;
  const year = parsed.getUTCFullYear();
  return year >= MIN_PLAUSIBLE_RECRUITMENT_YEAR && year < SENTINEL_RECRUITMENT_YEAR;
}

/** Returns the value as a Date when it is a plausible recruitment date, else null. */
export function toPlausibleRecruitmentDate(value: unknown): Date | null {
  if (!isDisplayableRecruitmentDate(value)) return null;
  return value instanceof Date ? value : new Date(value as string);
}
