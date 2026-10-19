import { cache } from "react";
/**
 * Post Query Operations
 * Fetches job posting data from database with enrichment
 * Uses DATABASE_URL (Drizzle) instead of Supabase client
 */

import { getDb } from "@/db";
import { sql } from "drizzle-orm";
import { JobPostingData, PostEnrichment } from "@/types/job-posting";

type RawDate = string | Date | null;
type FjaExtract = NonNullable<JobPostingData["fjaExtract"]>;

/** Row shape returned by the raw post + enrichment SELECTs below. */
type PostRow = Omit<
  JobPostingData,
  | "postedAt"
  | "updatedAt"
  | "recruitmentApplicationStartDate"
  | "recruitmentApplicationEndDate"
  | "notificationPublicationDate"
  | "fjaExtract"
  | "payLevel"
> &
  Omit<
    PostEnrichment,
    | "ageReferenceDate"
    | "notificationDate"
    | "applicationOpenDate"
    | "applicationClosingDate"
    | "examDate"
    | "admitCardDate"
    | "resultDate"
    | "interviewScheduleDate"
    | "appointmentDate"
    | "sourceVerificationDate"
    | "payLevel"
  > & {
    postedAt: string | Date;
    updatedAt: string | Date;
    recruitmentApplicationStartDate: RawDate;
    recruitmentApplicationEndDate: RawDate;
    notificationPublicationDate: RawDate;
    // "payLevel" is selected from both posts and post_enrichments; the
    // driver returns whichever column comes last.
    payLevel: JobPostingData["payLevel"] & PostEnrichment["payLevel"];
    enrichmentId: number | string | null;
    ageReferenceDate: RawDate;
    notificationDate: RawDate;
    applicationOpenDate: RawDate;
    applicationClosingDate: RawDate;
    examDate: RawDate;
    admitCardDate: RawDate;
    resultDate: RawDate;
    interviewScheduleDate: RawDate;
    appointmentDate: RawDate;
    sourceVerificationDate: RawDate;
    fjaInventoryPostId: FjaExtract["inventoryId"] | null;
    fjaExternalId: FjaExtract["externalId"];
    fjaSourcePostCodeRaw: FjaExtract["sourcePostCodeRaw"];
    fjaVacancyCountRaw: FjaExtract["vacancyCountRaw"];
    fjaQualificationRaw: FjaExtract["qualificationRaw"];
    fjaExperienceRaw: FjaExtract["experienceRaw"];
    fjaAgeLimitRaw: FjaExtract["ageLimitRaw"];
    fjaAgeReferenceDateRaw: FjaExtract["ageReferenceDateRaw"];
    fjaAgeRelaxationRulesRaw: FjaExtract["ageRelaxationRulesRaw"];
    fjaSalaryRaw: FjaExtract["salaryRaw"];
    fjaPayLevelRaw: FjaExtract["payLevelRaw"];
    fjaEmploymentTypeRaw: FjaExtract["employmentTypeRaw"];
    fjaTenureRaw: FjaExtract["tenureRaw"];
    fjaLocationRaw: FjaExtract["locationRaw"];
    fjaDutiesRaw: FjaExtract["dutiesRaw"];
    fjaEligibilityRaw: FjaExtract["eligibilityRaw"];
    fjaMilestonesRaw: FjaExtract["milestonesRaw"];
    fjaApplicationSelectionRaw: FjaExtract["applicationSelectionRaw"];
    fjaOtherInfoRaw: FjaExtract["otherInfoRaw"];
    fjaSourcePublishedDate: FjaExtract["sourcePublishedDate"];
    fjaSourceApplicationEndDate: FjaExtract["sourceApplicationEndDate"];
    fjaRecruitmentDetails: FjaExtract["recruitmentDetails"];
    fjaRecruitmentOtherInfoRaw: FjaExtract["recruitmentOtherInfoRaw"];
    fjaAdvertisementNumber: FjaExtract["advertisementNumber"];
    fjaExtractionStatus: FjaExtract["extractionStatus"];
    fjaVerificationStatus: FjaExtract["verificationStatus"];
  };

/**
 * PERF-004: Optimized post query for ISR caching (target: <500ms)
 * Splits into fast critical path + lazy FJA extraction
 */
async function getPostCoreData(
  recruitmentSlug: string,
  postSlug: string
): Promise<any> {
  try {
    console.log(`[getPostCoreData] Querying post: ${recruitmentSlug}/${postSlug}`);
    const db = getDb();

    // CRITICAL PATH: Fetch only core post + recruitment data (no enrichment, no FJA)
    // This subset completes in <100ms and allows ISR caching to work
    const result = await db.execute<any>(sql`
      SELECT
        p.id,
        p.title,
        p.slug,
        p.position_id AS "positionId",
        p."organizationId",
        p."organizationName",
        COALESCE(p."recruitmentId"::integer, p.recruitment_id) AS "recruitmentId",
        p."recruitmentName",
        r.slug AS "recruitmentSlug",
        o.sector AS "organizationSector",
        p."examType",
        p."examTypeSlug",
        p.description,
        p.employment_type AS "employmentType",
        p.location_city AS "locationCity",
        p.location_state AS "locationState",
        p.location_country AS "locationCountry",
        p.experience_level AS "experienceLevel",
        p.job_category_tags AS "jobCategoryTags",
        p.posting_status AS "postingStatus",
        p.source_post_code AS "sourcePostCode",
        p.application_method AS "applicationMethod",
        p.application_email AS "applicationEmail",
        p.application_url AS "applicationUrl",
        p.contact_department AS "contactDepartment",
        p.contact_person AS "contactPerson",
        p.vacancy_details AS "vacancyDetails",
        p.pay_level AS "payLevel",
        p.key_dates AS "keyDates",
        p.required_skills AS "requiredSkills",
        p.application_checklist AS "applicationChecklist",
        p."isLive",
        p."postedAt",
        p."createdAt",
        p."updatedAt",
        p."officialSourceUrl",
        p."applyPortalUrl",
        p.vacancy_total AS "vacancyTotal",
        p.salary_min AS "legacySalaryMin",
        p.salary_max AS "legacySalaryMax",
        r.total_vacancies AS "recruitmentVacancyTotal",
        r.official_notification_url AS "recruitmentOfficialNotificationUrl",
        r.official_application_url AS "recruitmentOfficialApplicationUrl",
        r.application_end_date AS "recruitmentApplicationEndDate",
        r.application_start_date AS "recruitmentApplicationStartDate",
        r.notification_date AS "notificationPublicationDate",
        r.selection_process AS "recruitmentSelectionProcess"
      FROM posts p
      LEFT JOIN recruitments r ON COALESCE(p."recruitmentId"::integer, p.recruitment_id) = r.id
      LEFT JOIN organizations o ON o.id = r.organization_id
      WHERE p.slug = ${postSlug}
        AND (
          r.slug = ${recruitmentSlug}
          OR r.id IN (
            SELECT recruitment_id
            FROM recruitment_slug_redirects
            WHERE old_slug = ${recruitmentSlug}
          )
        )
        AND p."isLive" = true
      LIMIT 1
    `);

    console.log(`[getPostCoreData] Query result: ${result?.length ? `Found row` : 'No rows'}`);
    return result && result.length > 0 ? result[0] : null;
  } catch (err) {
    console.error(`[getPostCoreData] Error executing query:`, err instanceof Error ? err.message : String(err));
    throw err;
  }
}

/**
 * Fetch FJA extraction data separately (can be lazy-loaded)
 */
async function getFjaExtractForPost(postId: number): Promise<any> {
  const db = getDb();

  const result = await db.execute<any>(sql`
    SELECT
      fi.id AS "fjaInventoryPostId",
      fi.external_id AS "fjaExternalId",
      fi.source_post_code_raw AS "fjaSourcePostCodeRaw",
      fi.vacancy_count_raw AS "fjaVacancyCountRaw",
      fi.qualification_raw AS "fjaQualificationRaw",
      fi.experience_raw AS "fjaExperienceRaw",
      fi.age_limit_raw AS "fjaAgeLimitRaw",
      fi.age_reference_date_raw AS "fjaAgeReferenceDateRaw",
      fi.age_relaxation_rules_raw AS "fjaAgeRelaxationRulesRaw",
      fi.salary_raw AS "fjaSalaryRaw",
      fi.pay_level_raw AS "fjaPayLevelRaw",
      fi.employment_type_raw AS "fjaEmploymentTypeRaw",
      fi.tenure_raw AS "fjaTenureRaw",
      fi.location_raw AS "fjaLocationRaw",
      fi.duties_responsibilities_raw AS "fjaDutiesRaw",
      fi.eligibility_conditions_raw AS "fjaEligibilityRaw",
      fi.milestones_raw AS "fjaMilestonesRaw",
      fi.application_selection_raw AS "fjaApplicationSelectionRaw",
      fi.other_info_raw AS "fjaOtherInfoRaw",
      fi.extraction_status AS "fjaExtractionStatus",
      fi.official_verification_status AS "fjaVerificationStatus",
      ji.published_date AS "fjaSourcePublishedDate",
      ji.application_end_date AS "fjaSourceApplicationEndDate",
      ji.details AS "fjaRecruitmentDetails",
      ji.other_info_raw AS "fjaRecruitmentOtherInfoRaw",
      ji.advertisement_number AS "fjaAdvertisementNumber"
    FROM fja_post_inventory fi
    LEFT JOIN fja_job_inventory ji ON ji.id = fi.recruitment_inventory_id
    WHERE fi.other_info_raw->>'canonical_post_id' = ${postId}::text
    ORDER BY fi.last_seen_at DESC, fi.id DESC
    LIMIT 1
  `);

  return result && result.length > 0 ? result[0] : null;
}

/**
 * Fetch post enrichment data from post_enrichments table
 * Returns all columns as-is from the database
 */
async function getPostEnrichmentData(postId: number | string): Promise<any> {
  const db = getDb();

  try {
    const result = await db.execute<any>(sql`
      SELECT
        *,
        id AS "enrichmentId"
      FROM post_enrichments
      WHERE post_id = ${postId}
      LIMIT 1
    `);

    if (result && result.length > 0) {
      const enrichment = result[0];
      // Convert date strings to Date objects for fields we know are dates
      const dateFields = [
        'ageReferenceDate',
        'notificationDate',
        'applicationOpenDate',
        'applicationClosingDate',
        'examDate',
        'admitCardDate',
        'resultDate',
        'interviewScheduleDate',
        'appointmentDate',
        'sourceVerificationDate',
        'created_at',
        'updated_at'
      ];

      for (const field of dateFields) {
        if (enrichment[field] && typeof enrichment[field] === 'string') {
          try {
            enrichment[field] = new Date(enrichment[field]);
          } catch (e) {
            // Leave as-is if date parsing fails
          }
        }
      }

      return enrichment;
    }

    return null;
  } catch (err) {
    console.warn("Error fetching enrichment data for post", postId, ":", err);
    return null;
  }
}

/**
 * Fetch enrichment detail tables for a post (vacancies, education, experience, etc.)
 * These are fetched in parallel with FJA data for Phase 1 P0 data unification
 */
async function getPostDetailEnrichment(postId: number | string): Promise<any> {
  const db = getDb();

  try {
    const [vacancies, education, experience, selectionProcess, documents, importantDates, ageRules, applicationFees, officialLinks] = await Promise.all([
      // Vacancies by category
      db.execute<any>(sql`
        SELECT id, total_vacancies, category, location, location_count, category_count, source
        FROM posts_vacancies
        WHERE post_id = ${postId}
        ORDER BY category
      `),
      // Education requirements
      db.execute<any>(sql`
        SELECT id, degree, subject, specialization, minimum_percentage, minimum_marks, source, confidence_score
        FROM posts_education
        WHERE post_id = ${postId}
        ORDER BY degree
      `),
      // Experience requirements
      db.execute<any>(sql`
        SELECT id, total_years, min_years, experience_type, source, confidence_score
        FROM posts_experience
        WHERE post_id = ${postId}
        ORDER BY experience_type
      `),
      // Selection process stages
      db.execute<any>(sql`
        SELECT id, stage_order, stage_name, scheduled_date, duration_minutes, total_marks, minimum_marks, passing_marks, mode, is_qualifying
        FROM posts_selection_process
        WHERE post_id = ${postId}
        ORDER BY stage_order
      `),
      // Required documents
      db.execute<any>(sql`
        SELECT id, document_name, document_category, is_required, required_for_categories
        FROM posts_documents
        WHERE post_id = ${postId}
        ORDER BY document_category, document_name
      `),
      // Important dates
      db.execute<any>(sql`
        SELECT id, date_type, date_value
        FROM posts_important_dates
        WHERE post_id = ${postId}
        ORDER BY date_type
      `),
      // Age rules and relaxations
      db.execute<any>(sql`
        SELECT id, category, max_age, relaxation_years, note, rule_type, condition_text
        FROM post_age_rules
        WHERE post_id = ${postId}
        ORDER BY category
      `),
      // Application fees by category
      db.execute<any>(sql`
        SELECT id, category, fee_amount, fee_currency, is_exempted, exemption_category
        FROM posts_application_fee
        WHERE post_id = ${postId}
        ORDER BY category
      `),
      // Official links (notification, apply, admit card, result, etc.)
      db.execute<any>(sql`
        SELECT id, link_type, link_url, link_title, source
        FROM posts_official_links
        WHERE post_id = ${postId}
        ORDER BY link_type
      `),
    ]);

    return {
      vacancies: vacancies || [],
      education: education || [],
      experience: experience || [],
      selectionProcess: selectionProcess || [],
      documents: documents || [],
      importantDates: importantDates || [],
      ageRules: ageRules || [],
      applicationFees: applicationFees || [],
      officialLinks: officialLinks || [],
    };
  } catch (err) {
    console.warn("Error fetching detail enrichment for post", postId, ":", err);
    return {
      vacancies: [],
      education: [],
      experience: [],
      selectionProcess: [],
      documents: [],
      importantDates: [],
      ageRules: [],
      applicationFees: [],
      officialLinks: [],
    };
  }
}

/**
 * Fetch a single post by recruitment and post slugs with enrichment data
 * PERF-004: Optimized for ISR caching - core post query <500ms,
 * enrichment/FJA extracted lazily
 */
export async function getPostBySlug(
  recruitmentSlug: string,
  postSlug: string
): Promise<JobPostingData | null> {
  try {
    console.log(`[getPostBySlug] Starting query for ${recruitmentSlug}/${postSlug}`);
    const db = getDb();

    // CRITICAL PATH: Get core post data (fast, cacheable)
    const coreData = await getPostCoreData(recruitmentSlug, postSlug);

    if (!coreData) {
      console.warn("No post found for:", { recruitmentSlug, postSlug });
      return null;
    }
    console.log(`[getPostBySlug] Core data found: post id=${coreData.id}`);

    const postId = coreData.id;

    // SECONDARY PATH: Fetch FJA, enrichment, and detail tables in parallel
    const [fjaData, enrichmentData, detailEnrichment] = await Promise.all([
      getFjaExtractForPost(postId),
      getPostEnrichmentData(postId),
      getPostDetailEnrichment(postId),
    ]);

    // Merge results
    const data = {
      ...coreData,
      ...fjaData,
      ...enrichmentData,
    } as PostRow;

    return {
      id: data.id,
      title: data.title,
      slug: data.slug,
      positionId: (data as any).positionId ?? null,
      organizationId: data.organizationId,
      organizationName: data.organizationName,
      // org_sector; PRIVATE indicates unresolved organization (data quality signal).
      organizationSector: (data.organizationSector ?? null) as string | null,
      recruitmentId: data.recruitmentId,
      recruitmentName: data.recruitmentName,
      recruitmentSlug: data.recruitmentSlug,
      examType: data.examType,
      examTypeSlug: data.examTypeSlug,
      description: data.description,
      employmentType: data.employmentType ?? null,
      locationCity: data.locationCity ?? null,
      locationState: data.locationState ?? null,
      locationCountry: data.locationCountry ?? null,
      experienceLevel: data.experienceLevel ?? null,
      jobCategoryTags: data.jobCategoryTags ?? null,
      postingStatus: data.postingStatus ?? null,
      sourcePostCode: data.sourcePostCode ?? null,
      applicationMethod: data.applicationMethod ?? null,
      applicationEmail: data.applicationEmail ?? null,
      applicationUrl: data.applicationUrl ?? null,
      contactDepartment: data.contactDepartment ?? null,
      contactPerson: data.contactPerson ?? null,
      vacancyDetails: data.vacancyDetails ?? null,
      payLevel: data.payLevel ?? null,
      keyDates: data.keyDates ?? null,
      requiredSkills: data.requiredSkills ?? null,
      applicationChecklist: data.applicationChecklist ?? null,
      isLive: data.isLive,
      postedAt: new Date(data.postedAt),
      updatedAt: new Date(data.updatedAt),
      officialSourceUrl: data.officialSourceUrl,
      applyPortalUrl: data.applyPortalUrl,
      // Preserve extracted source facts as a distinct, explicitly unverified projection.
      // Never pass these fields into canonical fact resolvers or official-link CTAs.
      fjaExtract: data.fjaInventoryPostId != null ? {
        inventoryId: data.fjaInventoryPostId,
        externalId: data.fjaExternalId ?? null,
        sourcePostCodeRaw: data.fjaSourcePostCodeRaw ?? null,
        vacancyCountRaw: data.fjaVacancyCountRaw ?? null,
        qualificationRaw: data.fjaQualificationRaw ?? null,
        experienceRaw: data.fjaExperienceRaw ?? null,
        ageLimitRaw: data.fjaAgeLimitRaw ?? null,
        ageReferenceDateRaw: data.fjaAgeReferenceDateRaw ?? null,
        ageRelaxationRulesRaw: data.fjaAgeRelaxationRulesRaw ?? null,
        salaryRaw: data.fjaSalaryRaw ?? null,
        payLevelRaw: data.fjaPayLevelRaw ?? null,
        employmentTypeRaw: data.fjaEmploymentTypeRaw ?? null,
        tenureRaw: data.fjaTenureRaw ?? null,
        locationRaw: data.fjaLocationRaw ?? null,
        dutiesRaw: data.fjaDutiesRaw ?? null,
        eligibilityRaw: data.fjaEligibilityRaw ?? null,
        milestonesRaw: data.fjaMilestonesRaw ?? null,
        applicationSelectionRaw: data.fjaApplicationSelectionRaw ?? null,
        otherInfoRaw: data.fjaOtherInfoRaw ?? null,
        sourcePublishedDate: data.fjaSourcePublishedDate ?? null,
        sourceApplicationEndDate: data.fjaSourceApplicationEndDate ?? null,
        recruitmentDetails: data.fjaRecruitmentDetails ?? null,
        recruitmentOtherInfoRaw: data.fjaRecruitmentOtherInfoRaw ?? null,
        advertisementNumber: data.fjaAdvertisementNumber ?? null,
        extractionStatus: data.fjaExtractionStatus ?? null,
        verificationStatus: data.fjaVerificationStatus ?? null,
      } : undefined,
      // Old-schema columns for resolver legacy fallback paths (Gate 4D bridge)
      vacancyTotal: data.vacancyTotal ?? null,
      legacySalaryMin: data.legacySalaryMin ?? null,
      legacySalaryMax: data.legacySalaryMax ?? null,
      // Recruitment-level fields for resolvers
      recruitmentVacancyTotal: data.recruitmentVacancyTotal ?? null,
      recruitmentOfficialNotificationUrl: data.recruitmentOfficialNotificationUrl ?? null,
      recruitmentOfficialApplicationUrl: data.recruitmentOfficialApplicationUrl ?? null,
      recruitmentApplicationEndDate: data.recruitmentApplicationEndDate
        ? new Date(data.recruitmentApplicationEndDate)
        : null,
      recruitmentApplicationStartDate: data.recruitmentApplicationStartDate
        ? new Date(data.recruitmentApplicationStartDate)
        : null,
      recruitmentSelectionProcess: data.recruitmentSelectionProcess ?? null,
      notificationPublicationDate: data.notificationPublicationDate
        ? new Date(data.notificationPublicationDate)
        : null,
      // Do not gate the entire enrichment object on vacanciesTotal: other
      // valid enrichment fields (dates, fees, eligibility, salary) can exist
      // independently of a vacancy count.
      enrichment: enrichmentData ? {
        ...enrichmentData,
        // Include detail enrichment tables
        vacancies: detailEnrichment.vacancies,
        education: detailEnrichment.education,
        experience: detailEnrichment.experience,
        selectionProcess: detailEnrichment.selectionProcess,
        documents: detailEnrichment.documents,
        importantDates: detailEnrichment.importantDates,
        ageRules: detailEnrichment.ageRules,
      } : {
        vacancies: detailEnrichment.vacancies,
        education: detailEnrichment.education,
        experience: detailEnrichment.experience,
        selectionProcess: detailEnrichment.selectionProcess,
        documents: detailEnrichment.documents,
        importantDates: detailEnrichment.importantDates,
        ageRules: detailEnrichment.ageRules,
      },
    };
  } catch (err) {
    console.error("Exception in getPostBySlug:", {
      recruitmentSlug,
      postSlug,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return null;
  }
}

/** Request-scoped memoization so metadata and page rendering share one DB read.
 * NOTE: Temporarily not using cache() due to 500 errors in production.
 * This may need investigation into cache() behavior in Vercel serverless environment.
 */
// export const getPostBySlugCached = cache(getPostBySlug);
export const getPostBySlugCached = getPostBySlug;

// ─────────────────────────────────────────────────────────────────────────────
// Related posts for post leaf page (internal linking / SEO)
// ─────────────────────────────────────────────────────────────────────────────

export interface RelatedPost {
  id: number;
  title: string;
  slug: string;
  recruitmentSlug: string;
  organizationName: string | null;
  locationState: string | null;
  postedAt: Date | null;
}

export interface RelatedPostsForLeaf {
  /** Other live posts for the same position role (position hub). */
  samePosition: RelatedPost[];
  /** Other live posts in the same organization (excluding current post). */
  sameOrg: RelatedPost[];
  /** Other live posts in the same state (excluding same-org and same-position already shown). */
  sameState: RelatedPost[];
  /** Position info for the hub link. */
  positionSlug: string | null;
  positionName: string | null;
}

export async function getRelatedPostsForLeaf(
  postId: number,
  positionId: number | null,
  organizationId: number | null,
  locationState: string | null,
  recruitmentId: number | null
): Promise<RelatedPostsForLeaf> {
  const db = getDb();
  const empty: RelatedPostsForLeaf = {
    samePosition: [],
    sameOrg: [],
    sameState: [],
    positionSlug: null,
    positionName: null,
  };

  if (!positionId && !organizationId && !locationState) return empty;

  // Position info
  let positionSlug: string | null = null;
  let positionName: string | null = null;
  if (positionId) {
    const posResult = await db.execute<{ slug: string; name: string }>(sql`
      SELECT slug, name FROM positions WHERE id = ${positionId} LIMIT 1
    `);
    if (posResult.length > 0) {
      positionSlug = posResult[0].slug;
      positionName = posResult[0].name;
    }
  }

  // Same position posts (max 6, excluding current)
  const samePosition: RelatedPost[] = [];
  if (positionId) {
    const rows = await db.execute<any>(sql`
      SELECT p.id, p.title, p.slug, r.slug AS "recruitmentSlug",
             p."organizationName", p.location_state AS "locationState", p."postedAt"
      FROM posts p
      JOIN recruitments r ON COALESCE(p."recruitmentId"::integer, p.recruitment_id) = r.id
      WHERE p.position_id = ${positionId}
        AND p.id != ${postId}
        AND p."isLive" = true
      ORDER BY p."postedAt" DESC NULLS LAST
      LIMIT 6
    `);
    for (const r of rows) {
      samePosition.push({
        id: r.id,
        title: r.title,
        slug: r.slug,
        recruitmentSlug: r.recruitmentSlug,
        organizationName: r.organizationName ?? null,
        locationState: r.locationState ?? null,
        postedAt: r.postedAt ? new Date(r.postedAt) : null,
      });
    }
  }

  // Same org posts (max 5, excluding current recruitment and those already in samePosition)
  const sameOrg: RelatedPost[] = [];
  if (organizationId) {
    const excludeIds = [postId, ...samePosition.map((p) => p.id)];
    const rows = await db.execute<any>(sql`
      SELECT p.id, p.title, p.slug, r.slug AS "recruitmentSlug",
             p."organizationName", p.location_state AS "locationState", p."postedAt"
      FROM posts p
      JOIN recruitments r ON COALESCE(p."recruitmentId"::integer, p.recruitment_id) = r.id
      WHERE p."organizationId" = ${organizationId}
        AND p.id != ALL(${excludeIds})
        AND p."isLive" = true
      ORDER BY p."postedAt" DESC NULLS LAST
      LIMIT 5
    `);
    for (const r of rows) {
      sameOrg.push({
        id: r.id,
        title: r.title,
        slug: r.slug,
        recruitmentSlug: r.recruitmentSlug,
        organizationName: r.organizationName ?? null,
        locationState: r.locationState ?? null,
        postedAt: r.postedAt ? new Date(r.postedAt) : null,
      });
    }
  }

  // Same state posts (max 4, excluding those already shown)
  const sameState: RelatedPost[] = [];
  if (locationState) {
    const excludeIds = [postId, ...samePosition.map((p) => p.id), ...sameOrg.map((p) => p.id)];
    const rows = await db.execute<any>(sql`
      SELECT p.id, p.title, p.slug, r.slug AS "recruitmentSlug",
             p."organizationName", p.location_state AS "locationState", p."postedAt"
      FROM posts p
      JOIN recruitments r ON COALESCE(p."recruitmentId"::integer, p.recruitment_id) = r.id
      WHERE p.location_state = ${locationState}
        AND p.id != ALL(${excludeIds})
        AND p."isLive" = true
      ORDER BY p."postedAt" DESC NULLS LAST
      LIMIT 4
    `);
    for (const r of rows) {
      sameState.push({
        id: r.id,
        title: r.title,
        slug: r.slug,
        recruitmentSlug: r.recruitmentSlug,
        organizationName: r.organizationName ?? null,
        locationState: r.locationState ?? null,
        postedAt: r.postedAt ? new Date(r.postedAt) : null,
      });
    }
  }

  return { samePosition, sameOrg, sameState, positionSlug, positionName };
}

/** Request-scoped cache for related posts */
export const getRelatedPostsForLeafCached = cache(getRelatedPostsForLeaf);

/**
 * Fetch multiple posts for a recruitment with pagination
 */
export async function getPostsByRecruitment(
  recruitmentSlug: string,
  limit: number = 20,
  offset: number = 0
): Promise<JobPostingData[]> {
  try {
    const db = getDb();

    // Raw SQL query to fetch multiple posts with pagination
    const results = await db.execute<PostRow>(sql`
      SELECT
        p.id,
        p.title,
        p.slug,
        p."organizationId",
        p."organizationName",
        COALESCE(p."recruitmentId"::integer, p.recruitment_id) AS "recruitmentId",
        p."recruitmentName",
        r.slug AS "recruitmentSlug",
        p."examType",
        p."examTypeSlug",
        p.description,
        p.employment_type AS "employmentType",
        p.location_city AS "locationCity",
        p.location_state AS "locationState",
        p.location_country AS "locationCountry",
        p.experience_level AS "experienceLevel",
        p.job_category_tags AS "jobCategoryTags",
        p.posting_status AS "postingStatus",
        p.source_post_code AS "sourcePostCode",
        p.application_method AS "applicationMethod",
        p.application_email AS "applicationEmail",
        p.application_url AS "applicationUrl",
        p.contact_department AS "contactDepartment",
        p.contact_person AS "contactPerson",
        p.vacancy_details AS "vacancyDetails",
        p.pay_level AS "payLevel",
        p.key_dates AS "keyDates",
        p.required_skills AS "requiredSkills",
        p.application_checklist AS "applicationChecklist",
        p."isLive",
        p."postedAt",
        p."createdAt",
        p."updatedAt",
        p."officialSourceUrl",
        p."applyPortalUrl",
        -- Old-schema columns required by resolver legacy fallback paths
        p.vacancy_total AS "vacancyTotal",
        p.salary_min AS "legacySalaryMin",
        p.salary_max AS "legacySalaryMax",
        -- Recruitment-level fields required by resolvers
        r.total_vacancies AS "recruitmentVacancyTotal",
        r.official_notification_url AS "recruitmentOfficialNotificationUrl",
        r.official_application_url AS "recruitmentOfficialApplicationUrl",
        r.application_end_date AS "recruitmentApplicationEndDate",
        r.application_start_date AS "recruitmentApplicationStartDate",
        r.notification_date AS "notificationPublicationDate",
        e."vacanciesByCategory",
        e."vacanciesTotal",
        e."feesByCategory",
        e."feeNote",
        e."ageRulesByCategory",
        e."ageNote",
        e."ageRelaxationRules",
        e."ageReferenceDate",
        e."payScale",
        e."salaryMin",
        e."salaryMax",
        e."salaryNote",
        e."payLevel",
        e."selectionProcess",
        e."notificationDate",
        e."applicationOpenDate",
        e."applicationClosingDate",
        e."examDate",
        e."admitCardDate",
        e."resultDate",
        e."interviewScheduleDate",
        e."appointmentDate",
        e."eligibilityPathways",
        e."documentsRequired",
        e."duties",
        e."responsibilities",
        e."sourceVerificationStatus",
        e."sourceVerificationDate",
        e."extractionConfidence",
        e."dataGaps",
        e."education",
        e."experience",
        e."benefits",
        e.id AS "enrichmentId"
      FROM posts p
      LEFT JOIN post_enrichments e ON p.id = e.post_id
      LEFT JOIN recruitments r ON COALESCE(p."recruitmentId"::integer, p.recruitment_id) = r.id
      WHERE (
          r.slug = ${recruitmentSlug}
          OR r.id IN (
            SELECT recruitment_id
            FROM recruitment_slug_redirects
            WHERE old_slug = ${recruitmentSlug}
          )
        )
        AND p."isLive" = true
      ORDER BY p."postedAt" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    return (results || []).map((data) => {
      return {
        id: data.id,
        title: data.title,
        slug: data.slug,
        organizationId: data.organizationId,
        organizationName: data.organizationName,
        recruitmentId: data.recruitmentId,
        recruitmentName: data.recruitmentName,
        recruitmentSlug: data.recruitmentSlug,
        examType: data.examType,
        examTypeSlug: data.examTypeSlug,
        description: data.description,
        employmentType: data.employmentType ?? null,
        locationCity: data.locationCity ?? null,
        locationState: data.locationState ?? null,
        locationCountry: data.locationCountry ?? null,
        experienceLevel: data.experienceLevel ?? null,
        jobCategoryTags: data.jobCategoryTags ?? null,
        postingStatus: data.postingStatus ?? null,
        sourcePostCode: data.sourcePostCode ?? null,
        applicationMethod: data.applicationMethod ?? null,
        applicationEmail: data.applicationEmail ?? null,
        applicationUrl: data.applicationUrl ?? null,
        contactDepartment: data.contactDepartment ?? null,
        contactPerson: data.contactPerson ?? null,
        vacancyDetails: data.vacancyDetails ?? null,
        payLevel: data.payLevel ?? null,
        keyDates: data.keyDates ?? null,
        requiredSkills: data.requiredSkills ?? null,
        applicationChecklist: data.applicationChecklist ?? null,
        isLive: data.isLive,
        postedAt: new Date(data.postedAt),
        updatedAt: new Date(data.updatedAt),
        officialSourceUrl: data.officialSourceUrl,
        applyPortalUrl: data.applyPortalUrl,
        // Old-schema columns for resolver legacy fallback paths (Gate 4D bridge)
        vacancyTotal: data.vacancyTotal ?? null,
        legacySalaryMin: data.legacySalaryMin ?? null,
        legacySalaryMax: data.legacySalaryMax ?? null,
        // Recruitment-level fields for resolvers
        recruitmentVacancyTotal: data.recruitmentVacancyTotal ?? null,
        recruitmentOfficialNotificationUrl: data.recruitmentOfficialNotificationUrl ?? null,
        recruitmentOfficialApplicationUrl: data.recruitmentOfficialApplicationUrl ?? null,
        recruitmentApplicationEndDate: data.recruitmentApplicationEndDate
          ? new Date(data.recruitmentApplicationEndDate)
          : null,
        recruitmentApplicationStartDate: data.recruitmentApplicationStartDate
          ? new Date(data.recruitmentApplicationStartDate)
          : null,
        recruitmentSelectionProcess: data.recruitmentSelectionProcess ?? null,
        notificationPublicationDate: data.notificationPublicationDate
          ? new Date(data.notificationPublicationDate)
          : null,
        enrichment: data.enrichmentId != null ? {
          vacanciesByCategory: data.vacanciesByCategory,
          vacanciesTotal: data.vacanciesTotal,
          feesByCategory: data.feesByCategory,
          feeNote: data.feeNote,
          ageRulesByCategory: data.ageRulesByCategory,
          ageNote: data.ageNote,
          ageRelaxationRules: data.ageRelaxationRules,
          ageReferenceDate: data.ageReferenceDate ? new Date(data.ageReferenceDate) : undefined,
          payScale: data.payScale,
          salaryMin: data.salaryMin,
          salaryMax: data.salaryMax,
          salaryNote: data.salaryNote,
          payLevel: data.payLevel,
          selectionProcess: data.selectionProcess,
          notificationDate: data.notificationDate ? new Date(data.notificationDate) : undefined,
          applicationOpenDate: data.applicationOpenDate ? new Date(data.applicationOpenDate) : undefined,
          applicationClosingDate: data.applicationClosingDate ? new Date(data.applicationClosingDate) : undefined,
          examDate: data.examDate ? new Date(data.examDate) : undefined,
          admitCardDate: data.admitCardDate ? new Date(data.admitCardDate) : undefined,
          resultDate: data.resultDate ? new Date(data.resultDate) : undefined,
          interviewScheduleDate: data.interviewScheduleDate ? new Date(data.interviewScheduleDate) : undefined,
          appointmentDate: data.appointmentDate ? new Date(data.appointmentDate) : undefined,
          eligibilityPathways: data.eligibilityPathways,
          documentsRequired: data.documentsRequired,
          duties: data.duties,
          responsibilities: data.responsibilities,
          sourceVerificationStatus: data.sourceVerificationStatus,
          sourceVerificationDate: data.sourceVerificationDate ? new Date(data.sourceVerificationDate) : undefined,
          extractionConfidence: data.extractionConfidence,
          dataGaps: data.dataGaps,
          education: data.education,
          experience: data.experience,
          benefits: data.benefits,
        } : undefined,
      };
    });
  } catch (err) {
    console.error("Error fetching recruitment posts:", err);
    return [];
  }
}