/**
 * Source verification and discovery-origin helpers.
 *
 * Discovery origin is not the same as issuer verification. Aggregator-derived
 * records remain untrusted until a guarded human issuer + fact review has been
 * recorded in Recruitment.metadata.source_provenance.
 */
export type SourceTrustInput = {
  sourceDiscoveryOrigin?: unknown;
  officialLinkSource?: unknown;
  verificationStatus?: unknown;
  sourceName?: unknown;
  metadata?: unknown;
};

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as RecordValue
    : null;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validPastTimestamp(value: unknown): boolean {
  if (!nonEmpty(value)) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time <= Date.now();
}

function isHttpsUrl(value: unknown): boolean {
  if (!nonEmpty(value)) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function hasIssuerAndFactReview(metadata: unknown): boolean {
  const root = asRecord(metadata);
  const provenance = asRecord(root?.source_provenance);
  const authority = asRecord(provenance?.authority_review);
  const facts = asRecord(provenance?.fact_review);
  if (!authority || !facts) return false;

  if (
    authority.status !== "VERIFIED" ||
    !isHttpsUrl(authority.evidence_url) ||
    !nonEmpty(authority.reviewed_by) ||
    !validPastTimestamp(authority.reviewed_at) ||
    !nonEmpty(authority.notes)
  ) return false;

  if (
    facts.status !== "VERIFIED" ||
    !nonEmpty(facts.reviewed_by) ||
    !validPastTimestamp(facts.reviewed_at) ||
    !nonEmpty(facts.notes) ||
    !Array.isArray(facts.reviewed_fields) ||
    facts.reviewed_fields.length === 0
  ) return false;

  const evidence = asRecord(facts.evidence);
  if (!evidence) return false;

  return facts.reviewed_fields.every((field) => {
    if (!nonEmpty(field)) return false;
    const item = asRecord(evidence[field]);
    return Boolean(item && nonEmpty(item.evidence_ref) && nonEmpty(item.excerpt));
  });
}

export function isAggregatorDiscoveredSource(input: SourceTrustInput): boolean {
  const origin = typeof input.sourceDiscoveryOrigin === "string"
    ? input.sourceDiscoveryOrigin.toUpperCase()
    : "";
  const linkSource = typeof input.officialLinkSource === "string"
    ? input.officialLinkSource.toLowerCase()
    : "";
  const postSource = typeof input.sourceName === "string"
    ? input.sourceName.toLowerCase()
    : "";
  const metadata = asRecord(input.metadata);
  const provenance = asRecord(metadata?.source_provenance);
  const reviewedOrigin = typeof provenance?.discovery_origin === "string"
    ? provenance.discovery_origin.toUpperCase()
    : "";

  return origin === "AGGREGATOR_DISCOVERED"
    || reviewedOrigin === "AGGREGATOR_DISCOVERED"
    || ["aggregator_discovered", "fja_official_link_extracted", "official_link_extracted"].includes(linkSource)
    || ["aggregator", "freejobalert", "aggregator_extracted"].includes(postSource);
}

export function isRecruitmentSourceTrusted(input: SourceTrustInput): boolean {
  if (!isAggregatorDiscoveredSource(input)) return true;
  const status = typeof input.verificationStatus === "string"
    ? input.verificationStatus.toUpperCase()
    : "";
  const linkSource = typeof input.officialLinkSource === "string"
    ? input.officialLinkSource.toUpperCase()
    : "";

  return ["VERIFIED", "MANUALLY_VERIFIED"].includes(status)
    && linkSource === "MANUAL_VERIFIED"
    && hasIssuerAndFactReview(input.metadata);
}

export function isUnverifiedAggregatorSource(input: SourceTrustInput): boolean {
  return isAggregatorDiscoveredSource(input) && !isRecruitmentSourceTrusted(input);
}

export function isManuallyVerifiedOfficialLink(value: unknown): boolean {
  return typeof value === "string" && value.trim().toUpperCase() === "MANUAL_VERIFIED";
}

/** Metadata states are advisory provenance; they never upgrade a record to verified. */
export function isPreliminaryUnverifiedSourceMetadata(metadata: unknown): boolean {
  const value = asRecord(metadata);
  return value?.verification_state === "preliminary_unverified";
}
