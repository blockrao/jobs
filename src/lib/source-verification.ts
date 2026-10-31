/**
 * Small helpers for source-verification provenance.
 * Metadata states are advisory provenance; they never upgrade a record to verified.
 */
export function isPreliminaryUnverifiedSourceMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  return (metadata as Record<string, unknown>).verification_state === "preliminary_unverified";
}

/**
 * Aggregator-discovered recruitment records are not safe to publish as
 * verified facts until an issuer-source review has explicitly upgraded them.
 */
export function isUnverifiedAggregatorSource(
  officialLinkSource: unknown,
  verificationStatus: unknown,
  metadata?: unknown,
  postSourceName?: unknown,
): boolean {
  const aggregatorOrigin =
    officialLinkSource === "AGGREGATOR_DISCOVERED" ||
    (typeof postSourceName === "string" && postSourceName.trim().toLowerCase() === "aggregator");
  if (!aggregatorOrigin) return false;
  if (verificationStatus !== "VERIFIED") return true;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return true;

  const provenance = (metadata as Record<string, any>).source_provenance;
  const authority = provenance?.authority_review;
  const factReview = provenance?.fact_review;
  const evidence = factReview?.evidence;
  return authority?.status !== "VERIFIED" ||
    typeof authority.evidence_url !== "string" ||
    !authority.evidence_url.startsWith("https://") ||
    typeof authority.reviewed_by !== "string" ||
    !authority.reviewed_by.trim() ||
    !authority.reviewed_at ||
    factReview?.status !== "VERIFIED" ||
    typeof factReview.reviewed_by !== "string" ||
    !factReview.reviewed_by.trim() ||
    !factReview.reviewed_at ||
    !Array.isArray(factReview.reviewed_fields) ||
    factReview.reviewed_fields.length === 0 ||
    !evidence ||
    typeof evidence !== "object" ||
    Array.isArray(evidence) ||
    Object.keys(evidence).length === 0;
}
