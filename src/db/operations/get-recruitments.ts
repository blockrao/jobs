import { cache } from "react";
import { stripAggregatorData } from "@/lib/aggregators";
import { getDb } from "../index";
import { MAX_TRUSTED_RECRUITMENT_VACANCIES } from "@/lib/vacancy-integrity";
import { recruitments, posts, vacancies, locations, positions, eligibilities, organizations, recruitment_slug_redirects, postAgeRules, postsVacancies, postingLocations, recruitmentCutoffs } from "../schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { plausibleRecruitmentDeadlineSql, recruitmentIsLiveSql, recruitmentIsOpenSql } from "./recruitment-lifecycle-sql";

// Recruitments quarantined by the data-integrity process are not public pages.
// (verification_status is a live DB column not yet mirrored in the Drizzle schema.)
const notQuarantined = sql`${recruitments}.verification_status IS DISTINCT FROM 'QUARANTINED' AND private.is_recruitment_publicly_trusted(${recruitments}.id)`;

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
    .where(and(eq(recruitments.slug, slug), notQuarantined))
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
        .where(and(eq(recruitments.slug, newSlug), notQuarantined))
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
        ...stripAggregatorData(row.post),
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
 *
 * FIX (2026-10-20): Track resolution method so page knows whether to redirect.
 * - Exact match or smart slug resolution: render as-is (no redirect)
 * - Legacy slug from recruitment_slug_redirects: should redirect to canonical
 */
export async function getRecruitmentWithPosts(slug: string) {
  try {
    console.log(`[getRecruitmentWithPosts] Starting for slug: ${slug}`);
    const db = getDb();
    let resolutionMethod: "exact" | "legacy-redirect" | "smart-resolution" = "exact";

    // Step 0: Try the requested slug first. Canonical URLs are the common path,
    // so avoid a redirect-table round trip unless the recruitment isn't found.
    console.log(`[getRecruitmentWithPosts] Querying recruitments table...`);
    let recruitmentResult = await db
      .select({
        recruitment: recruitments,
        enrichmentData: recruitments.enrichmentData,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        organizationSector: organizations.sector,
      })
      .from(recruitments)
      .innerJoin(organizations, eq(recruitments.organizationId, organizations.id))
      .where(and(eq(recruitments.slug, slug), notQuarantined))
      .limit(1);
    console.log(`[getRecruitmentWithPosts] Query result:`, recruitmentResult?.length ? `Found ${recruitmentResult.length} record(s)` : "No records");
    console.log(`[getRecruitmentWithPosts] About to process recruitment result...`);

    // Legacy slugs still resolve through the redirect table as before.
    // CRITICAL FIX (2026-10-24): Removed "smart slug resolution" fallback that was
    // matching partial slugs like 'org1121-2026' to the most recent recruitment,
    // causing wrong jobs to be shown when URLs were malformed or truncated by the
    // next.config.ts regex rule. Now ONLY the recruitment_slug_redirects table
    // can map old slugs to new ones. Everything else returns 404.
    if (!recruitmentResult || recruitmentResult.length === 0) {
      const redirectRecord = await db
        .select()
        .from(recruitment_slug_redirects)
        .where(eq(recruitment_slug_redirects.old_slug, slug))
        .limit(1);

      if (redirectRecord && redirectRecord.length > 0) {
        resolutionMethod = "legacy-redirect";
        console.log(`[getRecruitmentWithPosts] Found legacy slug redirect: ${slug} → ${redirectRecord[0].new_slug}`);
        recruitmentResult = await db
          .select({
            recruitment: recruitments,
            enrichmentData: recruitments.enrichmentData,
            organizationName: organizations.name,
            organizationSlug: organizations.slug,
            organizationSector: organizations.sector,
          })
          .from(recruitments)
          .innerJoin(organizations, eq(recruitments.organizationId, organizations.id))
          .where(and(eq(recruitments.slug, redirectRecord[0].new_slug), notQuarantined))
          .limit(1);
      }
    }

    if (!recruitmentResult || recruitmentResult.length === 0) {
      console.warn("No recruitment found with slug:", slug);
      return null;
    }

    const recruitment = {
      ...stripAggregatorData(recruitmentResult[0].recruitment),
      // Aggregator provenance never reaches the page payload.
      enrichmentData: stripAggregatorData(recruitmentResult[0].enrichmentData),
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
      // fja_job_inventory was dropped (aggregator data removed 2026-10-24).
      Promise.resolve([] as Array<Record<string, unknown>>),
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
    console.log(`[getRecruitmentWithPosts] About to fetch posts for recruitment ID: ${recruitmentId}`);
    const postsResult = await db
      .select({
        post: posts,
        position: positions,
      })
      .from(posts)
      .innerJoin(positions, eq(posts.positionId, positions.id))
      .where(and(
        eq(posts.recruitmentId, recruitmentId),
        // Duplicate legacy aggregator rows are retained for URL redirects/audit but must not render in canonical hub listings.
        sql`posts.posting_status IS DISTINCT FROM 'DUPLICATE'`,
      ));

    console.log(`[getRecruitmentWithPosts] Got ${postsResult.length} posts`);

    if (postsResult.length === 0) {
      return {
        recruitment,
        posts: [],
        totalPosts: 0,
        isSingleJobRecruitment: false,
        resolutionMethod,
      };
    }

    const postIds = postsResult.map((r) => r.post.id);
    console.log(`[getRecruitmentWithPosts] Extracted ${postIds.length} post IDs: ${postIds.join(", ")}`);

    // Step 3: Fetch ALL vacancies, eligibilities, and age rules in parallel, not per-post
    // This eliminates N+1 queries: one query for all vacancies, one for all eligibilities, one for all age rules, one for posts vacancies
    console.log(`[getRecruitmentWithPosts] About to fetch related data (vacancies, eligibilities, age rules) for ${postIds.length} posts`);
    console.log(`[getRecruitmentWithPosts] Starting Promise.all for: vacancies, eligibilities, age rules, posts_vacancies, source_inventory...`);
    const [allVacancies, allEligibilities, allAgeRules, allPostsVacancies, sourcePostInventoryResult] = await Promise.all([
      (async () => {
        console.log(`[getRecruitmentWithPosts] Fetching vacancies...`);
        const result = await db
          .select()
          .from(vacancies)
          .where(inArray(vacancies.postId, postIds));
        console.log(`[getRecruitmentWithPosts] Vacancies fetch complete: ${result.length} records`);
        return result;
      })(),
      (async () => {
        console.log(`[getRecruitmentWithPosts] Fetching eligibilities...`);
        const result = await db
          .select()
          .from(eligibilities)
          .where(inArray(eligibilities.postId, postIds));
        console.log(`[getRecruitmentWithPosts] Eligibilities fetch complete: ${result.length} records`);
        return result;
      })(),
      (async () => {
        console.log(`[getRecruitmentWithPosts] Fetching age rules...`);
        const result = await db
          .select()
          .from(postAgeRules)
          .where(inArray(postAgeRules.postId, postIds));
        console.log(`[getRecruitmentWithPosts] Age rules fetch complete: ${result.length} records`);
        return result;
      })(),
      (async () => {
        console.log(`[getRecruitmentWithPosts] Fetching posts_vacancies...`);
        const result = await db
          .select()
          .from(postsVacancies)
          .where(inArray(postsVacancies.postId, postIds));
        console.log(`[getRecruitmentWithPosts] Posts_vacancies fetch complete: ${result.length} records`);
        return result;
      })(),
      // fja_post_inventory was dropped (aggregator data removed 2026-10-24).
      Promise.resolve([] as Array<Record<string, unknown>>),
    ]);

    console.log(`[getRecruitmentWithPosts] Successfully fetched: ${allVacancies.length} vacancies, ${allEligibilities.length} eligibilities, ${allAgeRules.length} age rules`);

    // Step 4: Group vacancies, eligibilities, age rules, and posts vacancies by post ID (client-side)
    const vacanciesByPostId = new Map<number, typeof allVacancies>();
    const eligibilitiesByPostId = new Map<number, typeof allEligibilities>();
    const ageRulesByPostId = new Map<number, typeof allAgeRules>();
    const postsVacanciesByPostId = new Map<number, typeof allPostsVacancies>();

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

    for (const ageRule of allAgeRules) {
      if (!ageRulesByPostId.has(ageRule.postId)) {
        ageRulesByPostId.set(ageRule.postId, []);
      }
      ageRulesByPostId.get(ageRule.postId)!.push(ageRule);
    }

    for (const postsVacancy of allPostsVacancies) {
      if (!postsVacanciesByPostId.has(postsVacancy.postId)) {
        postsVacanciesByPostId.set(postsVacancy.postId, []);
      }
      postsVacanciesByPostId.get(postsVacancy.postId)!.push(postsVacancy);
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
        ...stripAggregatorData(row.post),
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
      vacancies: postsVacanciesByPostId.get(post.id) ?? vacancyDetailsByPostId.get(post.id) ?? vacanciesByPostId.get(post.id) ?? [],
      eligibilities: eligibilityDetailsByPostId.get(post.id) ?? eligibilitiesByPostId.get(post.id) ?? [],
      ageRules: ageRulesByPostId.get(post.id) ?? [],
      postEnrichment: enrichmentByPostId.get(post.id) ?? null,
    }));

    return {
      recruitment,
      posts: postsWithDetails,
      totalPosts: enrichedPosts.length,
      isSingleJobRecruitment: enrichedPosts.length === 1,
      resolutionMethod,
    };
  } catch (err) {
    // Rethrow: a database failure must surface as an error (500, retried, never
    // cached), not masquerade as "not found". Swallowing it here is what turned
    // the 24 Oct dropped-table incident into 5,412 silent 404s.
    console.error("Error fetching recruitment with posts:", err);
    throw err;
  }
}


/** Request-scoped memoization shared by generateMetadata and page rendering. */
export const getRecruitmentWithPostsCached = cache(getRecruitmentWithPosts);

// ---------------------------------------------------------------------------
// Discovery listing (/jobs) — canonical recruitments only.
// Replaces the legacy `postings`-table listing whose one-segment slugs did not
// resolve to any route (audit 2026-10-20, P0 #2).
// ---------------------------------------------------------------------------

export interface ListRecruitmentsOptions {
  /** GOVERNMENT = every sector except PRIVATE. */
  kind?: "GOVERNMENT" | "PRIVATE";
  /** `open` = applications open now; `newly-added` = notified in the last 30 days. */
  filter?: "newly-added" | "open";
  /** Free-text search on recruitment name and organisation name. */
  search?: string;
  limit: number;
  offset: number;
}

export interface RecruitmentListRow {
  id: number;
  name: string;
  slug: string;
  status: string;
  organizationName: string | null;
  organizationNameHi: string | null;
  organizationSlug: string | null;
  organizationSector: string | null;
  locationStateCode: string | null;
  totalVacancies: number | null;
  postCount: number;
  notificationDate: Date | null;
  applicationStartDate: Date | null;
  applicationEndDate: Date | null;
  examDate: Date | null;
  lastVerifiedAt: Date | null;
  updatedAt: Date | null;
}

/** Recruitments whose organisation/identity could not be established are hidden everywhere. */
export const NOT_QUARANTINED_SQL = sql`r.verification_status IS DISTINCT FROM 'QUARANTINED' AND private.is_recruitment_publicly_trusted(r.id)`;

const LIVE_RECRUITMENT_SQL = recruitmentIsLiveSql(sql`r.status`, sql`r.application_end_date`);
const OPEN_RECRUITMENT_SQL = recruitmentIsOpenSql(sql`r.status`, sql`r.application_end_date`);

export async function listRecruitments(opts: ListRecruitmentsOptions): Promise<RecruitmentListRow[]> {
  const db = getDb();
  // Quarantined recruitments (identity not established — see
  // claude/DATA_QUARANTINE_2026_10_20.md) are never public.
  const conditions = [NOT_QUARANTINED_SQL];

  if (opts.kind === "PRIVATE") conditions.push(sql`o.sector = 'PRIVATE'`);
  else if (opts.kind === "GOVERNMENT") conditions.push(sql`o.sector IS DISTINCT FROM 'PRIVATE'`);

  const search = opts.search?.trim();
  if (search) {
    const pattern = `%${search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    conditions.push(sql`(r.name ILIKE ${pattern} OR o.name ILIKE ${pattern})`);
  }

  if (opts.filter === "open") {
    conditions.push(OPEN_RECRUITMENT_SQL);
  } else if (opts.filter === "newly-added") {
    conditions.push(LIVE_RECRUITMENT_SQL);
    conditions.push(sql`r.notification_date IS NOT NULL AND r.notification_date >= now() - interval '30 days' AND r.notification_date <= now()`);
    // A recent-notification claim requires field-level evidence for this date,
    // not only a global VERIFIED flag or a syntactically valid URL.
    conditions.push(sql`
      r.verification_status IN ('VERIFIED', 'MANUALLY_VERIFIED')
      AND r.official_link_source = 'MANUAL_VERIFIED'
      AND r.official_notification_url ~* '^https?://'
      AND r.metadata -> 'source_provenance' -> 'authority_review' ->> 'status' = 'VERIFIED'
      AND r.metadata -> 'source_provenance' -> 'authority_review' ->> 'evidence_url' ~* '^https://'
      AND nullif(r.metadata -> 'source_provenance' -> 'authority_review' ->> 'reviewed_by', '') IS NOT NULL
      AND nullif(r.metadata -> 'source_provenance' -> 'authority_review' ->> 'reviewed_at', '') IS NOT NULL
      AND nullif(r.metadata -> 'source_provenance' -> 'authority_review' ->> 'notes', '') IS NOT NULL
      AND r.metadata -> 'source_provenance' -> 'fact_review' ->> 'status' = 'VERIFIED'
      AND nullif(r.metadata -> 'source_provenance' -> 'fact_review' ->> 'reviewed_by', '') IS NOT NULL
      AND nullif(r.metadata -> 'source_provenance' -> 'fact_review' ->> 'reviewed_at', '') IS NOT NULL
      AND nullif(r.metadata -> 'source_provenance' -> 'fact_review' ->> 'notes', '') IS NOT NULL
      AND (r.metadata -> 'source_provenance' -> 'fact_review' -> 'reviewed_fields') ? 'hub:notification_date'
      AND (r.metadata -> 'source_provenance' -> 'fact_review' -> 'evidence') ? 'hub:notification_date'
      AND nullif(r.metadata -> 'source_provenance' -> 'fact_review' -> 'evidence' -> 'hub:notification_date' ->> 'evidence_ref', '') IS NOT NULL
      AND nullif(r.metadata -> 'source_provenance' -> 'fact_review' -> 'evidence' -> 'hub:notification_date' ->> 'excerpt', '') IS NOT NULL
    `);
  } else if (!search) {
    // Browsing without a query shows current recruitments only. A text search
    // also matches closed ones, ordered after the open ones and labelled Closed.
    conditions.push(LIVE_RECRUITMENT_SQL);
  }

  const where = conditions.length
    ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
    : sql``;

  const orderBy = opts.filter === "newly-added"
    ? sql`r.notification_date DESC, r.id DESC`
    : sql`
        (CASE WHEN ${OPEN_RECRUITMENT_SQL} THEN 0
              WHEN ${LIVE_RECRUITMENT_SQL} THEN 1
              ELSE 2 END),
        ${plausibleRecruitmentDeadlineSql(sql`r.application_end_date`)} ASC NULLS LAST,
        r.notification_date DESC NULLS LAST,
        r.created_at DESC,
        r.id DESC`;

  const rows = await db.execute<Record<string, unknown>>(sql`
    SELECT
      r.id,
      r.name,
      r.slug,
      r.status::text AS status,
      o.name AS "organizationName",
      o.name_hi AS "organizationNameHi",
      o.slug AS "organizationSlug",
      o.sector::text AS "organizationSector",
      r.location_state_code AS "locationStateCode",
      CASE
        WHEN r.verification_status IN ('VERIFIED', 'MANUALLY_VERIFIED')
          AND r.official_notification_url ~ '^https?://'
          AND r.total_vacancies BETWEEN 1 AND ${MAX_TRUSTED_RECRUITMENT_VACANCIES}
        THEN r.total_vacancies
        ELSE NULL
      END AS "totalVacancies",
      COALESCE(pc.post_count, 0)::int AS "postCount",
      r.notification_date AS "notificationDate",
      r.application_start_date AS "applicationStartDate",
      r.application_end_date AS "applicationEndDate",
      r.exam_date AS "examDate",
      r.last_verified_at AS "lastVerifiedAt",
      r.updated_at AS "updatedAt"
    FROM recruitments r
    LEFT JOIN organizations o ON o.id = r.organization_id
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS post_count
      FROM posts p WHERE p.recruitment_id = r.id
    ) pc ON true
    ${where}
    ORDER BY ${orderBy}
    LIMIT ${opts.limit} OFFSET ${opts.offset}
  `);

  const list = Array.isArray(rows) ? rows : ((rows as unknown as { rows?: unknown[] }).rows ?? []);
  return list as unknown as RecruitmentListRow[];
}

/**
 * Get posting locations for a recruitment
 * Returns unique cities where positions are posted
 */
export async function getRecruitmentPostingLocations(recruitmentId: number) {
  const db = getDb();

  const result = await db
    .select({
      city: postingLocations.city,
      state: postingLocations.state,
    })
    .from(postingLocations)
    .innerJoin(posts, eq(postingLocations.postId, posts.id))
    .where(eq(posts.recruitmentId, recruitmentId));

  // Get unique cities and states
  const uniqueLocations = Array.from(
    new Map(result.map((r) => [`${r.city}-${r.state}`, r])).values()
  );

  return uniqueLocations;
}

/**
 * Get cutoff marks for a recruitment
 * Returns latest year cutoff marks by category
 */
export async function getRecruitmentCutoffMarks(recruitmentId: number) {
  const db = getDb();

  // Get the latest year
  const latestYearResult = await db
    .select({ year: sql<number>`MAX(${recruitmentCutoffs.year})` })
    .from(recruitmentCutoffs)
    .where(eq(recruitmentCutoffs.recruitmentId, recruitmentId));

  if (!latestYearResult || latestYearResult.length === 0 || latestYearResult[0].year === null) {
    return [];
  }

  const latestYear = latestYearResult[0].year;

  // Get cutoffs for the latest year
  const result = await db
    .select()
    .from(recruitmentCutoffs)
    .where(
      and(
        eq(recruitmentCutoffs.recruitmentId, recruitmentId),
        eq(recruitmentCutoffs.year, latestYear)
      )
    )
    .orderBy(recruitmentCutoffs.category);

  return result;
}
