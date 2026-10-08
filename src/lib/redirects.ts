/**
 * URL Redirect Management
 *
 * Handles redirects from deprecated URL patterns to canonical paths.
 * Used during URL architecture refactoring (2026-10-08).
 */

import { getDb } from "@/db";
import { recruitments, posts, positions } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Check if database is available.
 * Before DATABASE_URL is configured, queries degrade to empty results.
 */
function hasDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Get the canonical role slug that a recruitment should redirect to.
 *
 * Strategy:
 *   1. Find recruitment by slug
 *   2. Get all posts for that recruitment
 *   3. Select the post/role with highest vacancy count
 *   4. Return the role's slug (for /posts/[role-slug] hub)
 *
 * @returns role slug to redirect to, or null if not found/ambiguous
 */
export async function getRedirectTargetForRecruitmentSlug(
  recruitmentSlug: string
): Promise<string | null> {
  if (!hasDb()) return null;

  try {
    const db = getDb();

    // Step 1: Find recruitment by slug
    const recruitment = await db.query.recruitments.findFirst({
      where: eq(recruitments.slug, recruitmentSlug),
      with: {
        posts: {
          with: {
            position: true,
          },
          orderBy: (p, { desc }) => [desc(p.vacancyTotal)],
        },
      },
    });

    if (!recruitment) {
      return null; // Recruitment not found
    }

    // Step 2: Get posts for this recruitment
    const recruitmentPosts = recruitment.posts;
    if (!recruitmentPosts || recruitmentPosts.length === 0) {
      return null; // No posts in this recruitment
    }

    // Step 3: Select primary role (highest vacancy count)
    // If all posts have equal vacancies or null, use first one
    const primaryPost = recruitmentPosts.reduce((a, b) => {
      const aVacancies = a.vacancyTotal ?? 0;
      const bVacancies = b.vacancyTotal ?? 0;
      return bVacancies > aVacancies ? b : a;
    });

    // Step 4: Return role slug
    if (primaryPost.position?.slug) {
      return primaryPost.position.slug;
    }

    return null;
  } catch (error) {
    console.error(`[redirects] Error resolving redirect for "${recruitmentSlug}":`, error);
    return null;
  }
}

/**
 * Alternative: redirect to /jobs/[slug]/[post-slug] for a specific post.
 *
 * Use this when you want to direct users to the individual post page
 * instead of the role hub.
 */
export async function getIndividualPostRedirect(
  recruitmentSlug: string,
  preferPostSlug?: string
): Promise<{ recruitmentSlug: string; postSlug: string } | null> {
  if (!hasDb()) return null;

  try {
    const db = getDb();

    // Find recruitment
    const recruitment = await db.query.recruitments.findFirst({
      where: eq(recruitments.slug, recruitmentSlug),
      with: {
        posts: {
          orderBy: (p, { desc }) => [desc(p.vacancyTotal)],
        },
      },
    });

    if (!recruitment || !recruitment.posts || recruitment.posts.length === 0) {
      return null;
    }

    // If specific post slug requested, use it
    if (preferPostSlug) {
      const targetPost = recruitment.posts.find((p) => p.slug === preferPostSlug);
      if (targetPost) {
        return {
          recruitmentSlug: recruitment.slug,
          postSlug: targetPost.slug,
        };
      }
    }

    // Otherwise use primary (highest vacancy)
    const primaryPost = recruitment.posts[0];
    return {
      recruitmentSlug: recruitment.slug,
      postSlug: primaryPost.slug,
    };
  } catch (error) {
    console.error(`[redirects] Error resolving individual post redirect:`, error);
    return null;
  }
}
