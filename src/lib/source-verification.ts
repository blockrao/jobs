/**
 * Small helpers for source-verification provenance.
 * Metadata states are advisory provenance; they never upgrade a record to verified.
 */
export function isPreliminaryUnverifiedSourceMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  return (metadata as Record<string, unknown>).verification_state === "preliminary_unverified";
}
