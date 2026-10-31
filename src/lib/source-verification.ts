/**
 * Source verification and discovery-origin helpers.
 *
 * Discovery origin is not issuer verification. Aggregator-derived records remain
 * untrusted until a guarded human issuer + fact review has been recorded.
 */
export type SourceTrustInput = {
  sourceDiscoveryOrigin?: unknown;
  officialLinkSource?: unknown;
  verificationStatus?: unknown;
  sourceName?: unknown;
  sourceReference?: unknown;
  originalRecruitmentUrl?: unknown;
  recruitmentSourceUrl?: unknown;
  enrichmentData?: unknown;
  metadata?: unknown;
  legacyPostingSource?: unknown;
  legacyPostingSourceType?: unknown;
  legacyPostingEnrichmentSource?: unknown;
  legacyPostingSourceUrl?: unknown;
  legacyPostingSourcePortals?: unknown;
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

function isFjaUrl(value: unknown): boolean {
  if (!nonEmpty(value)) return false;
  try {
    const normalized = value.startsWith("//") ? `https:${value}`
      : /^https?:\/\//i.test(value) ? value
      : `https://${value}`;
    const url = new URL(normalized);
    return (url.protocol === "https:" || url.protocol === "http:")
      && (url.hostname === "freejobalert.com" || url.hostname.endsWith(".freejobalert.com"));
  } catch {
    return false;
  }
}

const AGGREGATOR_SOURCE_VALUES = new Set([
  "fja", "freejobalert", "ext-1", "ext-2", "ext-3", "ext-4", "ext-5",
  "aggregator", "aggregator_extracted", "pilot_preliminary",
  "institutional_aggregation", "institution_aggregation", "fja_html",
  "aggregator_discovered", "fja_official_link_extracted", "official_link_extracted",
]);

function isAggregatorSourceValue(value: unknown): boolean {
  return typeof value === "string"
    && AGGREGATOR_SOURCE_VALUES.has(value.trim().toLowerCase());
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
  if (!evidence || !facts.reviewed_fields.includes("hub:notification_date")) return false;

  return facts.reviewed_fields.every((field) => {
    if (!nonEmpty(field)) return false;
    const item = asRecord(evidence[field]);
    return Boolean(item && nonEmpty(item.evidence_ref) && nonEmpty(item.excerpt));
  });
}

/**
 * True if ANY persisted Recruitment, Post, or legacy Posting signal says
 * discovery originated from an aggregator/preliminary source. A populated
 * HTTPS URL or a generic VERIFIED label is not proof of issuer authority.
 */
export function isAggregatorDiscoveredSource(input: SourceTrustInput): boolean {
  const metadata = asRecord(input.metadata);
  const provenance = asRecord(metadata?.source_provenance);
  const enrichment = asRecord(input.enrichmentData);
  const enrichmentMeta = asRecord(enrichment?.meta);
  const portals = Array.isArray(input.legacyPostingSourcePortals)
    ? input.legacyPostingSourcePortals
    : [];

  return input.sourceDiscoveryOrigin === "AGGREGATOR_DISCOVERED" ||
    (typeof provenance?.discovery_origin === "string"
      && provenance.discovery_origin.toUpperCase() === "AGGREGATOR_DISCOVERED") ||
    isAggregatorSourceValue(input.officialLinkSource) ||
    isAggregatorSourceValue(enrichmentMeta?.source) ||
    isAggregatorSourceValue(input.sourceName) ||
    isAggregatorSourceValue(input.legacyPostingSource) ||
    isAggregatorSourceValue(input.legacyPostingEnrichmentSource) ||
    isFjaUrl(input.legacyPostingSourceUrl) ||
    (typeof input.legacyPostingSourceType === "string"
      && input.legacyPostingSourceType.trim().toUpperCase() === "AGGREGATOR") ||
    portals.some(isAggregatorSourceValue) ||
    isFjaUrl(input.sourceReference) ||
    isFjaUrl(input.originalRecruitmentUrl) ||
    isFjaUrl(input.recruitmentSourceUrl);
}

export function isRecruitmentSourceTrusted(input: SourceTrustInput): boolean {
  if (!isAggregatorDiscoveredSource(input)) return true;

  const status = typeof input.verificationStatus === "string"
    ? input.verificationStatus.toUpperCase()
    : "";
  const linkSource = typeof input.officialLinkSource === "string"
    ? input.officialLinkSource.toUpperCase()
    : "";

  return status === "VERIFIED"
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
