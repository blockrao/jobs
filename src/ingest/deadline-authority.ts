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

export interface DeadlineObservationInput {
  validThrough?: Date | null;
  validThroughPrecision?: "DATE_ONLY" | "DATE_TIME" | "UNKNOWN";
  validThroughSourceText?: string;
  validThroughTimezone?: string;
  validThroughTimezoneBasis?: "EXPLICIT_SOURCE" | "INDIA_SOURCE_DEFAULT" | "UNKNOWN";
  validThroughSourceLabel?: string;
  officialNotificationUrl?: string;
}

/** True only when the candidate has an effective instant and complete source precision/timezone evidence. */
export function hasResolvedDeadlineEvidence(input: DeadlineObservationInput): boolean {
  return input.validThrough instanceof Date
    && !Number.isNaN(input.validThrough.getTime())
    && (input.validThroughPrecision === "DATE_ONLY" || input.validThroughPrecision === "DATE_TIME")
    && Boolean(input.validThroughSourceText?.trim())
    && Boolean(input.validThroughTimezone?.trim())
    && (input.validThroughTimezoneBasis === "EXPLICIT_SOURCE" || input.validThroughTimezoneBasis === "INDIA_SOURCE_DEFAULT");
}

/** Stable observation payload for deadline evidence, including unresolved candidates. */
export function deadlineObservationFacts(input: DeadlineObservationInput) {
  return {
    lastDate: hasResolvedDeadlineEvidence(input) ? input.validThrough!.toISOString() : null,
    deadlinePrecision: input.validThroughPrecision ?? "UNKNOWN",
    deadlineSourceText: input.validThroughSourceText ?? null,
    deadlineTimezone: input.validThroughTimezone ?? null,
    deadlineTimezoneBasis: input.validThroughTimezoneBasis ?? "UNKNOWN",
    deadlineSourceLabel: input.validThroughSourceLabel ?? null,
    // This is a candidate issuing-body notification locator, never the aggregator page URL.
    deadlineSourceUrl: input.validThroughSourceText ? input.officialNotificationUrl ?? null : null,
  };
}


/**
 * Fill-only helper for genuinely missing canonical deadlines. Populated
 * deadlines are handled by decideOfficialDeadlineReconciliation(), which
 * requires traceable official evidence and rejects precision degradation.
 */
export function canFillMissingCanonicalDeadline(
  existing: Date | null | undefined,
  candidate: Date | null | undefined,
): boolean {
  return !existing && candidate instanceof Date && !Number.isNaN(candidate.getTime());
}


export interface DeadlineEvidence {
  precision: "DATE_ONLY" | "DATE_TIME" | "UNKNOWN";
  sourceText: string | null;
  timezone: string | null;
  timezoneBasis: "EXPLICIT_SOURCE" | "INDIA_SOURCE_DEFAULT" | "UNKNOWN";
}

export type DeadlineReconciliationDecision =
  | { action: "FILL" | "EXTEND" | "KEEP"; reason: string }
  | { action: "REVIEW"; reason: string };

/**
 * Decide whether an official observation may change a canonical deadline.
 * Existing evidence must exactly explain the currently stored canonical instant.
 * Only later candidates with equal-or-better precision may extend automatically;
 * corrections, untraceable legacy values and precision degradation require review.
 */
export function decideOfficialDeadlineReconciliation(
  existing: Date | null | undefined,
  candidate: Date | null | undefined,
  existingEvidence: DeadlineEvidence | null,
  candidateEvidence: DeadlineEvidence | null,
): DeadlineReconciliationDecision {
  if (!candidate || Number.isNaN(candidate.getTime())) {
    return { action: "KEEP", reason: "NO_RESOLVED_OFFICIAL_DEADLINE" };
  }
  if (!existing) return { action: "FILL", reason: "CANONICAL_DEADLINE_MISSING" };
  if (Number.isNaN(existing.getTime())) {
    return { action: "REVIEW", reason: "EXISTING_CANONICAL_DEADLINE_INVALID" };
  }
  if (candidate.getTime() === existing.getTime()) {
    return { action: "KEEP", reason: "DEADLINE_UNCHANGED" };
  }
  if (!existingEvidence) {
    return { action: "REVIEW", reason: "EXISTING_DEADLINE_EVIDENCE_NOT_FOUND" };
  }
  if (
    !candidateEvidence ||
    candidateEvidence.precision === "UNKNOWN" ||
    candidateEvidence.timezoneBasis === "UNKNOWN" ||
    !candidateEvidence.timezone ||
    !candidateEvidence.sourceText
  ) {
    return { action: "REVIEW", reason: "CANDIDATE_DEADLINE_PROVENANCE_INCOMPLETE" };
  }
  if (
    existingEvidence.precision === "UNKNOWN" ||
    existingEvidence.timezoneBasis === "UNKNOWN" ||
    !existingEvidence.timezone ||
    !existingEvidence.sourceText
  ) {
    return { action: "REVIEW", reason: "EXISTING_DEADLINE_PROVENANCE_INCOMPLETE" };
  }
  if (candidate.getTime() < existing.getTime()) {
    return { action: "REVIEW", reason: "EARLIER_OFFICIAL_DEADLINE_REQUIRES_CORRECTION_REVIEW" };
  }

  const precisionRank = (precision: DeadlineEvidence["precision"]) =>
    precision === "DATE_TIME" ? 2 : precision === "DATE_ONLY" ? 1 : 0;
  if (precisionRank(candidateEvidence.precision) < precisionRank(existingEvidence.precision)) {
    return { action: "REVIEW", reason: "LOWER_PRECISION_CANDIDATE_REQUIRES_REVIEW" };
  }
  return { action: "EXTEND", reason: "TRACEABLE_OFFICIAL_EXTENSION" };
}
