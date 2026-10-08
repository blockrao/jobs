import { getDb } from "../index";
import { recruitments, posts, vacancies, locations, positions, eligibilities } from "../schema";
import { eq } from "drizzle-orm";

/**
 * Get recruitment by slug
 * Returns the full recruitment object with related organization
 */
export async function getRecruitmentBySlug(slug: string) {
  const db = getDb();
  const result = await db
    .select()
    .from(recruitments)
    .where(eq(recruitments.slug, slug))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get all posts for a recruitment
 * Includes position details and eligibility info
 */
export async function getRecruitmentPosts(recruitmentId: number) {
  const db = getDb();

  const result = await db
    .select({
      post: posts,
      position: positions,
      eligibility: eligibilities,
    })
    .from(posts)
    .innerJoin(positions, eq(posts.positionId, positions.id))
    .leftJoin(eligibilities, eq(posts.id, eligibilities.postId))
    .where(eq(posts.recruitmentId, recruitmentId));

  // Group by post ID since there can be multiple eligibilities per post
  const postsMap = new Map();
  for (const row of result) {
    if (!postsMap.has(row.post.id)) {
      postsMap.set(row.post.id, {
        ...row.post,
        position: row.position,
        eligibilities: [],
      });
    }
    if (row.eligibility) {
      postsMap.get(row.post.id).eligibilities.push(row.eligibility);
    }
  }

  return Array.from(postsMap.values());
}

/**
 * Get vacancy breakdown for a recruitment
 * Groups by location, category, and gender
 */
export async function getRecruitmentVacancies(recruitmentId: number) {
  const db = getDb();

  const result = await db
    .select({
      vacancy: vacancies,
      location: locations,
    })
    .from(vacancies)
    .leftJoin(locations, eq(vacancies.locationId, locations.id))
    .innerJoin(posts, eq(vacancies.postId, posts.id))
    .where(eq(posts.recruitmentId, recruitmentId));

  return result;
}

/**
 * Get total vacancies for a recruitment across all posts
 */
export async function getRecruitmentVacancyCount(recruitmentId: number) {
  const db = getDb();

  const result = await db
    .select({
      total: vacancies.count,
    })
    .from(vacancies)
    .innerJoin(posts, eq(vacancies.postId, posts.id))
    .where(eq(posts.recruitmentId, recruitmentId));

  const total = result.reduce((sum, row) => sum + (row.total || 0), 0);
  return total;
}

/**
 * Get recruitment with all posts and enrichment data
 * Used for job posting leaf pages to display recruitment context
 * Returns recruitment metadata + all posts for that recruitment
 */
export async function getRecruitmentWithPosts(slug: string) {
  try {
    const db = getDb();

    // Step 1: Get the recruitment by slug
    const recruitmentResult = await db
      .select()
      .from(recruitments)
      .where(eq(recruitments.slug, slug))
      .limit(1);

    if (!recruitmentResult || recruitmentResult.length === 0) {
      console.warn("No recruitment found with slug:", slug);
      return null;
    }

    const recruitment = recruitmentResult[0];
    const recruitmentId = recruitment.id;

    // Step 2: Get all posts for this recruitment with positions
    const postsResult = await db
      .select({
        post: posts,
        position: positions,
      })
      .from(posts)
      .innerJoin(positions, eq(posts.positionId, positions.id))
      .where(eq(posts.recruitmentId, recruitmentId));

    // Step 3: For each post, get vacancies and eligibilities
    const enrichedPosts = await Promise.all(
      postsResult.map(async (row) => {
        const postId = row.post.id;

        // Get vacancies for this post
        const vacanciesResult = await db
          .select()
          .from(vacancies)
          .where(eq(vacancies.postId, postId));

        // Get eligibilities for this post
        const eligibilitiesResult = await db
          .select()
          .from(eligibilities)
          .where(eq(eligibilities.postId, postId));

        return {
          ...row.post,
          position: row.position,
          vacancies: vacanciesResult,
          eligibilities: eligibilitiesResult,
        };
      })
    );

    return {
      recruitment,
      posts: enrichedPosts,
      totalPosts: enrichedPosts.length,
      isSingleJobRecruitment: enrichedPosts.length === 1,
    };
  } catch (err) {
    console.error("Error fetching recruitment with posts:", err);
    return null;
  }
}
