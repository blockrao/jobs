/**
 * The placeholder organisation that holds recruitments whose real issuing body
 * has not been identified yet (bulk-imported titles with no matching
 * organisation). These recruitments stay reachable for visitors, but:
 *   - their pages are noindex and left out of the sitemap,
 *   - the placeholder name is never shown or published as the employer
 *     (no JobPosting hiringOrganization, no "Unclassified" org link).
 * Re-mapping a recruitment to its real organisation lifts all of this.
 */
export const UNRESOLVED_ORG_SLUG = "unclassified-government-jobs";
export const UNRESOLVED_ORG_NAME = "Unclassified Government Jobs";

export function isUnresolvedOrganization(slugOrName: string | null | undefined): boolean {
  if (!slugOrName) return false;
  const v = slugOrName.trim().toLowerCase();
  return v === UNRESOLVED_ORG_SLUG || v === UNRESOLVED_ORG_NAME.toLowerCase();
}
