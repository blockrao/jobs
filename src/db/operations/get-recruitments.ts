import { cache } from "react";
import { getDb } from "../index";
import { recruitments, posts, vacancies, locations, positions, eligibilities, organizations, recruitment_slug_redirects } from "../schema";
import { eq, inArray, sql } from "drizzle-orm";

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
        organizationSector: organizations.sector,
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
            organizationSector: organizations.sector,
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
      organizationSector: recruitmentResult[0].organizationSector as string,
      sourceVerificationStatus: null as string | null,
      sourceListingPublishedDate: null as Date | string | null,
      sourceExtract: null as null | {
        title: string | null;
        sourceUrl: string | null;
        applicationStartDate: Date | string | null;
        applicationEndDate: Date | string | null;
        vacancyCount: number | null;
        qualification: string | null;
        details: unknown;
        otherInfoRaw: unknown;
        sourceStatus: string | null;
        detailStatus: string | null;
      },
    };
    const recruitmentId = recruitment.id;

    // Load complete linked entities for the recruitment hub's database coverage view.
    const [organizationResult, examResult, sourceInventoryResult] = await Promise.all([
      db.execute(sql`SELECT * FROM organizations WHERE id = ${recruitment.organizationId} LIMIT 1`),
      recruitment.examId
        ? db.execute(sql`SELECT * FROM exams WHERE id = ${recruitment.examId} LIMIT 1`)
        : Promise.resolve([]),
      db.execute(sql`
        SELECT
          other_info_raw->>'canonical_verification_status' AS source_verification_status,
          published_date AS source_listing_published_date,
          title AS source_title,
          source_url,
          application_start_date AS source_application_start_date,
          application_end_date AS source_application_end_date,
          vacancy_count AS source_vacancy_count,
          qualification AS source_qualification,
          details AS source_details,
          other_info_raw AS source_other_info_raw,
          source_status,
          detail_status
        FROM fja_job_inventory
        WHERE other_info_raw->>'canonical_recruitment_id' = ${String(recruitmentId)}
        ORDER BY id DESC
        LIMIT 1
      `),
    ]);
    const rowsOf = (result: unknown): Array<Record<string, unknown>> => {
      const value = result as { rows?: unknown[] };
      const rows = value?.rows ?? result;
      return Array.isArray(rows) ? rows as Array<Record<string, unknown>> : [];
    };
    const sourceInventory = rowsOf(sourceInventoryResult)[0] ?? null;
    Object.assign(recruitment, {
      organization: rowsOf(organizationResult)[0] ?? null,
      exam: rowsOf(examResult)[0] ?? null,
      sourceVerificationStatus:
        typeof sourceInventory?.source_verification_status === "string"
          ? sourceInventory.source_verification_status
          : null,
      sourceListingPublishedDate:
        typeof sourceInventory?.source_listing_published_date === "string" ||
        sourceInventory?.source_listing_published_date instanceof Date
          ? sourceInventory.source_listing_published_date as Date | string
          : null,
      sourceExtract: sourceInventory ? {
        title: typeof sourceInventory.source_title === "string" ? sourceInventory.source_title : null,
        sourceUrl: typeof sourceInventory.source_url === "string" ? sourceInventory.source_url : null,
        applicationStartDate:
          typeof sourceInventory.source_application_start_date === "string" ||
          sourceInventory.source_application_start_date instanceof Date
            ? sourceInventory.source_application_start_date as Date | string
            : null,
        applicationEndDate:
          typeof sourceInventory.source_application_end_date === "string" ||
          sourceInventory.source_application_end_date instanceof Date
            ? sourceInventory.source_application_end_date as Date | string
            : null,
        vacancyCount: typeof sourceInventory.source_vacancy_count === "number"
          ? sourceInventory.source_vacancy_count
          : null,
        qualification: typeof sourceInventory.source_qualification === "string"
          ? sourceInventory.source_qualification
          : null,
        details: sourceInventory.source_details ?? null,
        otherInfoRaw: sourceInventory.source_other_info_raw ?? null,
        sourceStatus: typeof sourceInventory.source_status === "string" ? sourceInventory.source_status : null,
        detailStatus: typeof sourceInventory.detail_status === "string" ? sourceInventory.detail_status : null,
      } : null,
    });

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
    const [allVacancies, allEligibilities, sourcePostInventoryResult] = await Promise.all([
      db
        .select()
        .from(vacancies)
        .where(inArray(vacancies.postId, postIds)),
      db
        .select()
        .from(eligibilities)
        .where(inArray(eligibilities.postId, postIds)),
      db.execute(sql`
        SELECT *
        FROM fja_post_inventory
        WHERE other_info_raw->>'canonical_post_id' IN (${sql.join(postIds.map((id) => sql`${String(id)}`), sql`,`)})
        ORDER BY last_seen_at DESC, id DESC
      `),
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

    // Project extracted source facts separately so the hub can show reported
    // listing values without treating them as canonical/verified Post facts.
    const sourcePostRows = rowsOf(sourcePostInventoryResult);
    const sourcePostByCanonicalId = new Map<string, Record<string, unknown>>();
    for (const sourcePost of sourcePostRows) {
      const rawInfo = sourcePost.other_info_raw;
      const info = rawInfo && typeof rawInfo === "object" && !Array.isArray(rawInfo)
        ? rawInfo as Record<string, unknown>
        : {};
      const canonicalPostId = typeof info.canonical_post_id === "string"
        ? info.canonical_post_id
        : null;
      if (canonicalPostId && !sourcePostByCanonicalId.has(canonicalPostId)) {
        sourcePostByCanonicalId.set(canonicalPostId, sourcePost);
      }
    }

    const enrichedPosts = postsResult.map((row) => {
      const sourcePost = sourcePostByCanonicalId.get(String(row.post.id));
      const rawInfo = sourcePost?.other_info_raw;
      const sourceOtherInfo = rawInfo && typeof rawInfo === "object" && !Array.isArray(rawInfo)
        ? rawInfo as Record<string, unknown>
        : null;
      return {
        ...row.post,
        // The Drizzle Post entity stores its display name as `name`, while leaf UI expects `title`.
        title: row.post.name,
        position: row.position,
        vacancies: vacanciesByPostId.get(row.post.id) ?? [],
        eligibilities: eligibilitiesByPostId.get(row.post.id) ?? [],
        fjaExtract: sourcePost ? {
          inventoryId: sourcePost.id as number | string,
          vacancyCountRaw: typeof sourcePost.vacancy_count_raw === "string" ? sourcePost.vacancy_count_raw : null,
          qualificationRaw: typeof sourcePost.qualification_raw === "string" ? sourcePost.qualification_raw : null,
          experienceRaw: typeof sourcePost.experience_raw === "string" ? sourcePost.experience_raw : null,
          salaryRaw: typeof sourcePost.salary_raw === "string" ? sourcePost.salary_raw : null,
          tenureRaw: typeof sourcePost.tenure_raw === "string" ? sourcePost.tenure_raw : null,
          locationRaw: typeof sourcePost.location_raw === "string" ? sourcePost.location_raw : null,
          employmentTypeRaw: typeof sourcePost.employment_type_raw === "string" ? sourcePost.employment_type_raw : null,
          verificationStatus: typeof sourcePost.official_verification_status === "string" ? sourcePost.official_verification_status : null,
          otherInfoRaw: sourceOtherInfo,
        } : null,
      };
    });

    const [enrichmentResult, vacancyDetailResult, eligibilityQualificationResult] = await Promise.all([
      db.execute(sql`
        SELECT *
        FROM post_enrichments
        WHERE post_id IN (${sql.join(postIds.map((id) => sql`${id}`), sql`,`)})
        ORDER BY post_id
      `),
      db.execute(sql`
        SELECT v.*, to_jsonb(l) AS location_record
        FROM vacancies v
        LEFT JOIN locations l ON l.id = v.location_id
        WHERE v.post_id IN (${sql.join(postIds.map((id) => sql`${id}`), sql`,`)})
        ORDER BY v.post_id, v.id
      `),
      db.execute(sql`
        SELECT e.*, to_jsonb(q) AS qualification_record
        FROM eligibilities e
        LEFT JOIN qualifications q ON q.id = e.qualification_id
        WHERE e.post_id IN (${sql.join(postIds.map((id) => sql`${id}`), sql`,`)})
        ORDER BY e.post_id, e.id
      `)
    ]);
    const enrichmentRows = (
      (enrichmentResult as unknown as { rows?: unknown[] }).rows ?? enrichmentResult
    ) as Array<Record<string, unknown>>;
    const enrichmentByPostId = new Map<number, Record<string, unknown>>();
    for (const item of enrichmentRows) {
      const postId = Number(item.post_id);
      if (Number.isFinite(postId)) enrichmentByPostId.set(postId, item);
    }
    const vacancyDetailRows = rowsOf(vacancyDetailResult);
    const vacancyDetailsByPostId = new Map<number, Array<Record<string, unknown>>>();
    for (const row of vacancyDetailRows) {
      const postId = Number(row.post_id);
      if (!vacancyDetailsByPostId.has(postId)) vacancyDetailsByPostId.set(postId, []);
      vacancyDetailsByPostId.get(postId)!.push(row);
    }
    const eligibilityDetailRows = rowsOf(eligibilityQualificationResult);
    const eligibilityDetailsByPostId = new Map<number, Array<Record<string, unknown>>>();
    for (const row of eligibilityDetailRows) {
      const postId = Number(row.post_id);
      if (!eligibilityDetailsByPostId.has(postId)) eligibilityDetailsByPostId.set(postId, []);
      eligibilityDetailsByPostId.get(postId)!.push(row);
    }
    const postsWithDetails = enrichedPosts.map((post) => ({
      ...post,
      vacancies: vacancyDetailsByPostId.get(post.id) ?? vacanciesByPostId.get(post.id) ?? [],
      eligibilities: eligibilityDetailsByPostId.get(post.id) ?? eligibilitiesByPostId.get(post.id) ?? [],
      postEnrichment: enrichmentByPostId.get(post.id) ?? null,
    }));

    return {
      recruitment,
      posts: postsWithDetails,
      totalPosts: enrichedPosts.length,
      isSingleJobRecruitment: enrichedPosts.length === 1,
    };
  } catch (err) {
    console.error("Error fetching recruitment with posts:", err);
    return null;
  }
}


/**
 * Minimal recruitment context for a Post Leaf.
 *
 * Unlike getRecruitmentWithPosts(), this deliberately avoids loading every
 * sibling Post's vacancies, eligibility rows, FJA inventory and enrichment
 * details. The leaf only needs Recruitment facts plus sibling link summaries.
 */
export async function getRecruitmentLeafContext(slug: string) {
  try {
    const db = getDb();

    let result = await db
      .select({
        recruitment: recruitments,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        organizationSector: organizations.sector,
      })
      .from(recruitments)
      .innerJoin(organizations, eq(recruitments.organizationId, organizations.id))
      .where(eq(recruitments.slug, slug))
      .limit(1);

    if (result.length === 0) {
      const redirectRecord = await db
        .select()
        .from(recruitment_slug_redirects)
        .where(eq(recruitment_slug_redirects.old_slug, slug))
        .limit(1);

      if (redirectRecord.length > 0) {
        result = await db
          .select({
            recruitment: recruitments,
            organizationName: organizations.name,
            organizationSlug: organizations.slug,
            organizationSector: organizations.sector,
          })
          .from(recruitments)
          .innerJoin(organizations, eq(recruitments.organizationId, organizations.id))
          .where(eq(recruitments.slug, redirectRecord[0].new_slug))
          .limit(1);
      }
    }

    if (result.length === 0) return null;

    const row = result[0];
    const recruitment = {
      ...row.recruitment,
      organizationName: row.organizationName,
      organizationSlug: row.organizationSlug,
      organizationSector: row.organizationSector as string,
      sourceVerificationStatus: null as string | null,
      sourceListingPublishedDate: null as Date | string | null,
      sourceExtract: null as null | {
        title: string | null;
        sourceUrl: string | null;
        applicationStartDate: Date | string | null;
        applicationEndDate: Date | string | null;
        vacancyCount: number | null;
        qualification: string | null;
        details: unknown;
        otherInfoRaw: unknown;
        sourceStatus: string | null;
        detailStatus: string | null;
      },
    };

    const [sourceResult, siblingPosts] = await Promise.all([
      db.execute(sql`
        SELECT
          other_info_raw->>'canonical_verification_status' AS source_verification_status,
          published_date AS source_listing_published_date,
          title AS source_title,
          source_url,
          application_start_date AS source_application_start_date,
          application_end_date AS source_application_end_date,
          vacancy_count AS source_vacancy_count,
          qualification AS source_qualification,
          details AS source_details,
          other_info_raw AS source_other_info_raw,
          source_status,
          detail_status
        FROM fja_job_inventory
        WHERE other_info_raw->>'canonical_recruitment_id' = ${String(recruitment.id)}
        ORDER BY id DESC
        LIMIT 1
      `),
      db
        .select({
          id: posts.id,
          slug: posts.slug,
          title: posts.name,
        })
        .from(posts)
        .where(eq(posts.recruitmentId, recruitment.id)),
    ]);

    const sourceRows = (sourceResult as unknown as { rows?: unknown[] }).rows ?? sourceResult;
    const source = Array.isArray(sourceRows)
      ? sourceRows[0] as Record<string, unknown> | undefined
      : undefined;

    if (source) {
      Object.assign(recruitment, {
        sourceVerificationStatus:
          typeof source.source_verification_status === "string" ? source.source_verification_status : null,
        sourceListingPublishedDate:
          typeof source.source_listing_published_date === "string" ||
          source.source_listing_published_date instanceof Date
            ? source.source_listing_published_date as Date | string
            : null,
        sourceExtract: {
          title: typeof source.source_title === "string" ? source.source_title : null,
          sourceUrl: typeof source.source_url === "string" ? source.source_url : null,
          applicationStartDate:
            typeof source.source_application_start_date === "string" ||
            source.source_application_start_date instanceof Date
              ? source.source_application_start_date as Date | string
              : null,
          applicationEndDate:
            typeof source.source_application_end_date === "string" ||
            source.source_application_end_date instanceof Date
              ? source.source_application_end_date as Date | string
              : null,
          vacancyCount: typeof source.source_vacancy_count === "number" ? source.source_vacancy_count : null,
          qualification: typeof source.source_qualification === "string" ? source.source_qualification : null,
          details: source.source_details ?? null,
          otherInfoRaw: source.source_other_info_raw ?? null,
          sourceStatus: typeof source.source_status === "string" ? source.source_status : null,
          detailStatus: typeof source.detail_status === "string" ? source.detail_status : null,
        },
      });
    }

    const postsList = siblingPosts.map((post) => ({
      ...post,
      title: post.title,
    }));

    return {
      recruitment,
      posts: postsList,
      totalPosts: postsList.length,
      isSingleJobRecruitment: postsList.length === 1,
    };
  } catch (err) {
    console.error("Error fetching lightweight recruitment leaf context:", err);
    return null;
  }
}

/** Request-scoped memoization shared by generateMetadata and page rendering. */
export const getRecruitmentWithPostsCached = cache(getRecruitmentWithPosts);
