/**
 * Small helpers for source-verification provenance.
 * Metadata states are advisory provenance; they never upgrade a record to verified.
 */
/**
 * A-070: only an explicit MANUAL_VERIFIED provenance allows a discovered URL
 * to be represented to users or structured data as an official source.
 * AGGREGATOR_DISCOVERED and unknown legacy values are not affirmative proof.
 */
export function isManuallyVerifiedOfficialLink(source: unknown): boolean {
  return typeof source === "string" && source.trim().toUpperCase() === "MANUAL_VERIFIED";
}

export function isPreliminaryUnverifiedSourceMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  return (metadata as Record<string, unknown>).verification_state === "preliminary_unverified";
}
