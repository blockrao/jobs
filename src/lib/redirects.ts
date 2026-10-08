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
 * Resolve the role hub for a recruitment URL.
 *
 * Recruitment is a supporting, non-indexable aggregation layer (see ARCHITECTURE_LEDGER.md).
 * When a recruitment contains multiple posts, we consolidate its traffic to the relevant
 * role hub for SEO and user navigation (one canonical path per role).
 *
 * Strategy:
 *   1. Find recruitment by slug
 *   2. Get all posts in that recruitment
 *   3. Select the role with highest vacancy count (heuristic for most relevant role)
 *   4. Return the role's slug for /posts/[role-slug] hub
 *
 * NOTE: Selecting by vacancy count is a routing heuristic only. It does NOT establish
 * an ontological relationship (e.g., "this position is primary to the recruitment").
 * It is purely a UX decision: if a recruitment has 50 Clerk vacancies and 1 Steno vacancy,
 * the user landing on the recruitment page likely wants the Clerk role hub.
 *
 * @returns role slug for the role hub, or null if recruitment not found or has no posts
 */
export async function getRoleHubForRecruitmentSlug(
  recruitmentSlug: string
): Promise<string | null> {
  if (!hasDb()) {
    console.warn(`[redirects.getRoleHub] DATABASE_URL not configured`);
    return null;
  }

  try {
    const db = getDb();
    console.log(`[redirects.getRoleHub.start] Resolving recruitment: "${recruitmentSlug}"`);

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
      console.warn(`[redirects.getRoleHub.fail] Recruitment not found: "${recruitmentSlug}"`);
      return null;
    }

    console.log(`[redirects.getRoleHub.found] Recruitment exists: id=${recruitment.id}, posts=${recruitment.posts?.length || 0}`);

    // Step 2: Get posts for this recruitment
    const recruitmentPosts = recruitment.posts;
    if (!recruitmentPosts || recruitmentPosts.length === 0) {
      console.warn(`[redirects.getRoleHub.fail] No posts in recruitment: "${recruitmentSlug}"`);
      return null;
    }

    // Step 3: Select the role with highest vacancy count (navigation heuristic)
    // If all posts have equal vacancies or null, use first one
    const selectedPost = recruitmentPosts.reduce((a, b) => {
      const aVacancies = a.vacancyTotal ?? 0;
      const bVacancies = b.vacancyTotal ?? 0;
      return bVacancies > aVacancies ? b : a;
    });

    console.log(`[redirects.getRoleHub.selected] Post selected: slug="${selectedPost.slug}", vacancy=${selectedPost.vacancyTotal}, positionId=${selectedPost.positionId}`);

    // Step 4: Return role slug for the hub
    if (!selectedPost.position) {
      console.warn(`[redirects.getRoleHub.fail] Position not loaded for post: "${selectedPost.slug}"`);
      return null;
    }

    if (!selectedPost.position.slug) {
      console.warn(`[redirects.getRoleHub.fail] Position has no slug: post="${selectedPost.slug}", positionId=${selectedPost.positionId}`);
      return null;
    }

    console.log(`[redirects.getRoleHub.success] Role hub resolved: "${selectedPost.position.slug}"`);
    return selectedPost.position.slug;
  } catch (error) {
    console.error(`[redirects.getRoleHub.exception] Error resolving role hub for "${recruitmentSlug}":`, error instanceof Error ? error.message : String(error));
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
