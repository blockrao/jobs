/**
 * Small helpers for source-verification provenance.
 * Metadata states are advisory provenance; they never upgrade a record to verified.
 */
export function isPreliminaryUnverifiedSourceMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  return (metadata as Record<string, unknown>).verification_state === "preliminary_unverified";
}

/**
 * A-070: only an explicit MANUAL_VERIFIED state permits a link to be described
 * as an official notification or application link, or used as a verified citation.
 */
export function isManuallyVerifiedOfficialLink(source: unknown): boolean {
  return typeof source === "string" && source.trim().toUpperCase() === "MANUAL_VERIFIED";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasCompleteFactReviewEvidence(factReview: any): boolean {
  const reviewedFields = factReview?.reviewed_fields;
  const evidence = factReview?.evidence;
  if (!Array.isArray(reviewedFields) || reviewedFields.length === 0) return false;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return false;

  return reviewedFields.every((field: unknown) => {
    if (!isNonEmptyString(field)) return false;
    const item = evidence[field];
    return item && typeof item === "object" &&
      isNonEmptyString(item.evidence_ref) &&
      isNonEmptyString(item.excerpt);
  });
}

/**
 * Aggregator-discovered recruitment records are not safe to publish as
 * verified facts until issuer-source and fact reviews have both been recorded
 * with complete, field-addressable evidence.
 */
export function isUnverifiedAggregatorSource(
  sourceDiscoveryOrigin: unknown,
  verificationStatus: unknown,
  metadata?: unknown,
  postSourceName?: unknown,
  officialLinkVerificationStatus?: unknown,
): boolean {
  const aggregatorOrigin =
    sourceDiscoveryOrigin === "AGGREGATOR_DISCOVERED" ||
    (typeof postSourceName === "string" && postSourceName.trim().toLowerCase() === "aggregator");
  if (!aggregatorOrigin) return false;
  if (verificationStatus !== "VERIFIED") return true;
  if (!isManuallyVerifiedOfficialLink(officialLinkVerificationStatus)) return true;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return true;

  const provenance = (metadata as Record<string, any>).source_provenance;
  const authority = provenance?.authority_review;
  const factReview = provenance?.fact_review;
  return authority?.status !== "VERIFIED" ||
    !isNonEmptyString(authority.evidence_url) ||
    !authority.evidence_url.startsWith("https://") ||
    !isNonEmptyString(authority.reviewed_by) ||
    !isNonEmptyString(authority.reviewed_at) ||
    !isNonEmptyString(authority.notes) ||
    factReview?.status !== "VERIFIED" ||
    !isNonEmptyString(factReview.reviewed_by) ||
    !isNonEmptyString(factReview.reviewed_at) ||
    !isNonEmptyString(factReview.notes) ||
    !hasCompleteFactReviewEvidence(factReview);
}
