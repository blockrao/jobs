/**
 * Generic Slug Resolution Utility
 *
 * Provides a sustainable pattern for resolving short/variant slugs to canonical slugs.
 * Eliminates the need for hardcoded alias maps (which are unmaintainable at scale).
 *
 * Pattern:
 *   1. Try exact slug match (primary path)
 *   2. Try redirect table if available (legacy support)
 *   3. Try prefix match: find entities where slug starts with {requested-slug}-*
 *   4. Return most recent by year/ID
 *
 * Usage:
 *   const resolved = await smartResolveSlug(
 *     requestedSlug,
 *     (slug) => db.select().from(table).where(eq(table.slug, slug)),
 *     (prefix) => db.select().from(table).where(sql`slug LIKE ${prefix + "-%"}`)
 *   );
 */

export interface SlugResolverOptions<T> {
  /** Find exact slug match */
  findExact: (slug: string) => Promise<T | null>;

  /** Find all entities matching prefix pattern (slug starts with prefix-*) */
  findByPrefix?: (prefix: string) => Promise<T[]>;

  /** Extract year from entity (for sorting recent first) */
  getYear?: (entity: T) => number | null;

  /** Extract ID from entity (for secondary sort) */
  getId?: (entity: T) => number;

  /** Find entity by redirect (if redirect table exists) */
  findByRedirect?: (oldSlug: string) => Promise<{ newSlug: string } | null>;
}

/**
 * Smartly resolve a slug with multiple fallback strategies.
 *
 * Returns the entity if found; null if not found after all strategies exhausted.
 *
 * Strategy order:
 *   1. Exact match (fastest, common case)
 *   2. Redirect table (backward compatibility)
 *   3. Prefix match → sort by year DESC, then ID DESC → most recent
 */
export async function smartResolveSlug<T>(
  requestedSlug: string,
  options: SlugResolverOptions<T>
): Promise<T | null> {
  // 1. Try exact match (common path)
  let result = await options.findExact(requestedSlug);
  if (result) return result;

  // 2. Try redirect table (backward compatibility)
  if (options.findByRedirect) {
    const redirect = await options.findByRedirect(requestedSlug);
    if (redirect) {
      result = await options.findExact(redirect.newSlug);
      if (result) return result;
    }
  }

  // 3. Try prefix match: find entities where slug starts with {requested-slug}-*
  if (options.findByPrefix) {
    const candidates = await options.findByPrefix(requestedSlug);
    if (candidates.length > 0) {
      // Sort by year DESC (most recent first), then by ID DESC
      const getYear = options.getYear || (() => null);
      const getId = options.getId || (() => 0);

      const sorted = candidates.sort((a, b) => {
        const yearA = getYear(a);
        const yearB = getYear(b);

        // Sort by year DESC (both must be numbers to use this sort)
        if (typeof yearA === "number" && typeof yearB === "number") {
          if (yearA !== yearB) return yearB - yearA;
        }

        // Fallback: sort by ID DESC
        return getId(b) - getId(a);
      });

      return sorted[0] || null;
    }
  }

  return null;
}
