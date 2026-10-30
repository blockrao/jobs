/**
 * Canonical recruitment deadlines are authoritative facts, not merely parsed dates.
 *
 * Aggregators and trusted secondary sources may contribute observations/candidates,
 * but they must not create or extend recruitments.application_end_date. The source
 * registry is the authority boundary: missing/unknown registry rows fail closed.
 */
export function canonicalApplicationDeadline(
  authority: string | null | undefined,
  isOfficial: boolean | null | undefined,
  candidate: Date | null | undefined,
): Date | null {
  return authority === "OFFICIAL" && isOfficial === true ? candidate ?? null : null;
}
