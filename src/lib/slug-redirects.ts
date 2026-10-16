/**
 * Slug Redirect Utilities
 *
 * Handles 301 redirects for old malformed slugs to new cleaned versions.
 * Used in route handlers to check if a slug needs redirecting.
 */

import { getDb } from "@/db/client";
import { sql } from "drizzle-orm";

/**
 * Check if a slug has been redirected and return the new slug
 * Returns null if no redirect exists (slug is current)
 */
export async function checkSlugRedirect(
  oldSlug: string,
  slugType: "recruitment" | "post"
): Promise<string | null> {
  try {
    const db = getDb();

    const result = await db.execute(sql`
      SELECT new_slug FROM slug_redirects
      WHERE old_slug = ${oldSlug} AND slug_type = ${slugType}
      LIMIT 1
    `);

    if (result.rows && result.rows.length > 0) {
      return (result.rows[0] as any).new_slug;
    }

    return null;
  } catch (error) {
    console.error("Error checking slug redirect:", error);
    return null;
  }
}

/**
 * Get all redirect pairs for a slug type
 * Useful for sitemap generation or bulk redirect checking
 */
export async function getAllSlugRedirects(
  slugType: "recruitment" | "post"
): Promise<Array<{ old_slug: string; new_slug: string }>> {
  try {
    const db = getDb();

    const results = await db.execute(sql`
      SELECT old_slug, new_slug FROM slug_redirects
      WHERE slug_type = ${slugType}
      ORDER BY created_at DESC
    `);

    return (results.rows || []).map((row: any) => ({
      old_slug: row.old_slug,
      new_slug: row.new_slug,
    }));
  } catch (error) {
    console.error("Error getting slug redirects:", error);
    return [];
  }
}
