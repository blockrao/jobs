import { getDb } from "../index";
import { recruitments, posts, vacancies, locations, positions, eligibilities } from "../schema-v2";
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
