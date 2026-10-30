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

/**
 * The canonical recruitment deadline and the legacy posting candidate must
 * share the same authority decision. This keeps the writer from accidentally
 * allowing an aggregator date through one persistence path but not the other.
 */
export function canonicalDeadlineWriteValues(
  authority: string | null | undefined,
  isOfficial: boolean | null | undefined,
  candidate: Date | null | undefined,
): {
  recruitmentApplicationEndDate: Date | null;
  postingValidThrough: Date | null;
} {
  const allowed = canonicalApplicationDeadline(authority, isOfficial, candidate);
  return {
    recruitmentApplicationEndDate: allowed,
    postingValidThrough: allowed,
  };
}
