/**
 * URL Redirect Management
 *
 * PHASE 2: Redirect logic removed.
 * 
 * Previous architecture used position hubs at /jobs/{position-slug} with redirects
 * from recruitment URLs. This is now removed.
 * 
 * Current canonical structure:
 * - /jobs/{recruitment-slug} - Recruitment hub (shows all posts in recruitment)
 * - /jobs/{recruitment-slug}/{post-slug} - Individual post detail page
 * 
 * No position hubs, no redirects.
 */

import { getDb } from "@/db";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Check if database is available.
 * Before DATABASE_URL is configured, queries degrade to empty results.
 */
function hasDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Alternative: redirect to /jobs/{recruitment-slug}/{post-slug} for a specific post.
 *
 * Use this when you want to direct users to the individual post page.
 * NOTE: This function is kept for backward compatibility but is not actively used.
 */
export async function getIndividualPostRedirect(
  recruitmentSlug: string,
  preferPostSlug?: string
): Promise<{ recruitmentSlug: string; postSlug: string } | null> {
  if (!hasDb()) return null;

  try {
    const db = getDb();

    // This would need to query both recruitments and posts
    // Left as a stub for future use if needed
    return null;
  } catch (error) {
    console.error(`[redirects] Error resolving individual post redirect:`, error);
    return null;
  }
}
