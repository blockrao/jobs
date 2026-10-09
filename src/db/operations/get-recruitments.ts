import { getDb } from "../index";
import { recruitments, posts, vacancies, locations, positions, eligibilities, organizations, recruitment_slug_redirects } from "../schema";
import { eq, inArray } from "drizzle-orm";

/**
 * Get recruitment by slug
 * Returns the full recruitment object with related organization
 * Handles both new semantic slugs and old descriptive slugs (via redirect table)
 */
export async function getRecruitmentBySlug(slug: string) {
  const db = getDb();

  // First, try to find by the current slug
  let result = await db
    .select()
    .from(recruitments)
    .where(eq(recruitments.slug, slug))
    .limit(1);

  // If not found, check if this is an old slug that was redirected
  if (!result || result.length === 0) {
    const redirect_record = await db
      .select()
      .from(recruitment_slug_redirects)
      .where(eq(recruitment_slug_redirects.old_slug, slug))
      .limit(1);

    if (redirect_record && redirect_record.length > 0) {
      const newSlug = redirect_record[0].new_slug;
      result = await db
        .select()
        .from(recruitments)
        .where(eq(recruitments.slug, newSlug))
        .limit(1);
    }
  }

  return result && result.length > 0 ? result[0] : null;
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
 * PERF-001: Optimized to eliminate N+1 queries by fetching all vacancies/eligibilities upfront
 * Used for job posting leaf pages to display recruitment context
 * Returns recruitment metadata + all posts for that recruitment
 * Handles both new semantic slugs and old descriptive slugs (via redirect table)
 */
export async function getRecruitmentWithPosts(slug: string) {
  try {
    const db = getDb();

    // Step 0: Try the requested slug first. Canonical URLs are the common path,
    // so avoid a redirect-table round trip unless the recruitment isn't found.
    let recruitmentResult = await db
      .select({
        recruitment: recruitments,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
      })
      .from(recruitments)
      .innerJoin(organizations, eq(recruitments.organizationId, organizations.id))
      .where(eq(recruitments.slug, slug))
      .limit(1);

    // Legacy slugs still resolve through the redirect table as before.
    if (!recruitmentResult || recruitmentResult.length === 0) {
      const redirectRecord = await db
        .select()
        .from(recruitment_slug_redirects)
        .where(eq(recruitment_slug_redirects.old_slug, slug))
        .limit(1);

      if (redirectRecord && redirectRecord.length > 0) {
        recruitmentResult = await db
          .select({
            recruitment: recruitments,
            organizationName: organizations.name,
            organizationSlug: organizations.slug,
          })
          .from(recruitments)
          .innerJoin(organizations, eq(recruitments.organizationId, organizations.id))
          .where(eq(recruitments.slug, redirectRecord[0].new_slug))
          .limit(1);
      }
    }

    if (!recruitmentResult || recruitmentResult.length === 0) {
      console.warn("No recruitment found with slug:", slug);
      return null;
    }

    const recruitment = {
      ...recruitmentResult[0].recruitment,
      organizationName: recruitmentResult[0].organizationName,
      organizationSlug: recruitmentResult[0].organizationSlug,
    };
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

    if (postsResult.length === 0) {
      return {
        recruitment,
        posts: [],
        totalPosts: 0,
        isSingleJobRecruitment: false,
      };
    }

    const postIds = postsResult.map((r) => r.post.id);

    // Step 3: Fetch ALL vacancies and eligibilities in parallel, not per-post
    // This eliminates N+1 queries: one query for all vacancies, one for all eligibilities
    const [allVacancies, allEligibilities] = await Promise.all([
      db
        .select()
        .from(vacancies)
        .where(inArray(vacancies.postId, postIds)),
      db
        .select()
        .from(eligibilities)
        .where(inArray(eligibilities.postId, postIds)),
    ]);

    // Step 4: Group vacancies and eligibilities by post ID (client-side)
    const vacanciesByPostId = new Map<number, typeof allVacancies>();
    const eligibilitiesByPostId = new Map<number, typeof allEligibilities>();

    for (const vacancy of allVacancies) {
      if (!vacanciesByPostId.has(vacancy.postId)) {
        vacanciesByPostId.set(vacancy.postId, []);
      }
      vacanciesByPostId.get(vacancy.postId)!.push(vacancy);
    }

    for (const eligibility of allEligibilities) {
      if (!eligibilitiesByPostId.has(eligibility.postId)) {
        eligibilitiesByPostId.set(eligibility.postId, []);
      }
      eligibilitiesByPostId.get(eligibility.postId)!.push(eligibility);
    }

    // Step 5: Enrich posts with their vacancies and eligibilities
    const enrichedPosts = postsResult.map((row) => ({
      ...row.post,
      position: row.position,
      vacancies: vacanciesByPostId.get(row.post.id) ?? [],
      eligibilities: eligibilitiesByPostId.get(row.post.id) ?? [],
    }));

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
