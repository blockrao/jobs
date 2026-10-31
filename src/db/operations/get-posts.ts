import { cache } from "react";
/**
 * Post Query Operations
 * Fetches job posting data from database with enrichment
 * Uses DATABASE_URL (Drizzle) instead of Supabase client
 */

import { getDb } from "@/db";
import { sql } from "drizzle-orm";
import { JobPostingData, PostEnrichment } from "@/types/job-posting";
import { transformEnrichment } from "./enrichment-transformer";
import { recruitmentIsLiveSql } from "./recruitment-lifecycle-sql";
import { isVerifiedOfficialUrl } from "@/lib/official-source";

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
 * Phase 2 Architecture: Enrichment consolidation
 * - Enrichment now stored as JSONB in posts table (no separate queries)
 * - Reduces 9 queries → 1 query
 * - Eliminates connection pool exhaustion
 */
async function getPostCoreData(
  recruitmentSlug: string,
  postSlug: string
): Promise<any> {
  try {
    console.log(`[getPostCoreData] Querying post: ${recruitmentSlug}/${postSlug}`);
    const db = getDb();

    // CRITICAL PATH: Fetch core post + recruitment data + enrichment JSONB
    // Enrichment is now a single JSONB column on posts table (was 9 separate tables)
    // This completes in ~100-150ms and fully replaces 10+ queries
    const result = await db.execute<any>(sql`
      SELECT
        p.id,
        p.name AS title,
        p.slug,
        p.position_id AS "positionId",
        r.organization_id AS "organizationId",
        o.name AS "organizationName",
        o.slug AS "organizationSlug",
        p.recruitment_id AS "recruitmentId",
        r.name AS "recruitmentName",
        r.slug AS "recruitmentSlug",
        o.sector AS "organizationSector",
        r.exam_id AS "examId",
        NULL AS "examType",
        NULL AS "examTypeSlug",
        p.description,
        r.employment_type AS "employmentType",
        NULL AS "locationCity",
        r.location_state_code AS "locationState",
        NULL AS "locationCountry",
        NULL AS "experienceLevel",
        NULL AS "jobCategoryTags",
        r.status AS "postingStatus",
        p.source_post_code AS "sourcePostCode",
        NULL AS "applicationMethod",
        NULL AS "applicationEmail",
        NULL AS "applicationUrl",
        NULL AS "contactDepartment",
        NULL AS "contactPerson",
        p.vacancy_details AS "vacancyDetails",
        p.pay_level AS "payLevel",
        NULL AS "keyDates",
        NULL AS "requiredSkills",
        NULL AS "applicationChecklist",
        ${recruitmentIsLiveSql(sql`r.status`, sql`r.application_end_date`)} AS "isLive",
        p.created_at AS "postedAt",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        r.official_notification_url AS "officialSourceUrl",
        r.official_application_url AS "applyPortalUrl",
        (
          SELECT s.url
          FROM public.sources s
          WHERE lower(s.slug) = lower(r.official_link_source)
            AND s.authority = 'OFFICIAL'
            AND s.is_official IS TRUE
          LIMIT 1
        ) AS "officialSourceRegistryUrl",
        EXISTS (
          SELECT 1
          FROM public.source_observations so
          INNER JOIN public.postings legacy_posting ON legacy_posting.id = so.posting_id
          WHERE lower(so.source) = lower(r.official_link_source)
            AND so.outcome = 'ACCEPTED'
            AND (
              legacy_posting.inferred_post_id = p.id
              OR legacy_posting.inferred_recruitment_id = r.id
            )
            AND (
              so.source_url = r.official_notification_url
              OR so.facts ->> 'official_url' = r.official_notification_url
              OR so.facts ->> 'notification_url' = r.official_notification_url
              OR EXISTS (
                SELECT 1
                FROM jsonb_array_elements(
                  CASE WHEN jsonb_typeof(so.links) = 'array' THEN so.links ELSE '[]'::jsonb END
                ) AS observed_link(value)
                WHERE observed_link.value ->> 'url' = r.official_notification_url
              )
            )
        ) AS "officialNotificationEvidenceAccepted",
        EXISTS (
          SELECT 1
          FROM public.source_observations so
          INNER JOIN public.postings legacy_posting ON legacy_posting.id = so.posting_id
          WHERE lower(so.source) = lower(r.official_link_source)
            AND so.outcome = 'ACCEPTED'
            AND (
              legacy_posting.inferred_post_id = p.id
              OR legacy_posting.inferred_recruitment_id = r.id
            )
            AND (
              so.source_url = r.official_application_url
              OR so.facts ->> 'official_application_url' = r.official_application_url
              OR so.facts ->> 'application_url' = r.official_application_url
              OR EXISTS (
                SELECT 1
                FROM jsonb_array_elements(
                  CASE WHEN jsonb_typeof(so.links) = 'array' THEN so.links ELSE '[]'::jsonb END
                ) AS observed_link(value)
                WHERE observed_link.value ->> 'url' = r.official_application_url
              )
            )
        ) AS "officialApplicationEvidenceAccepted",
        p.vacancy_total AS "vacancyTotal",
        p.salary_min AS "legacySalaryMin",
        p.salary_max AS "legacySalaryMax",
        r.total_vacancies AS "recruitmentVacancyTotal",
        r.official_notification_url AS "recruitmentOfficialNotificationUrl",
        r.official_application_url AS "recruitmentOfficialApplicationUrl",
        r.application_end_date AS "recruitmentApplicationEndDate",
        r.application_start_date AS "recruitmentApplicationStartDate",
        r.notification_date AS "notificationPublicationDate",
        NULL AS "recruitmentSelectionProcess",
        p.enrichment
      FROM posts p
      INNER JOIN recruitments r ON p.recruitment_id = r.id
      LEFT JOIN organizations o ON o.id = r.organization_id
      WHERE (
          p.slug = ${postSlug}
          OR p.slug IN (
            SELECT sr.new_slug
            FROM slug_redirects sr
            WHERE sr.old_slug = ${postSlug}
              AND sr.slug_type = 'post'
          )
        )
        AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
        AND (
          r.slug = ${recruitmentSlug}
          OR r.id IN (
            SELECT recruitment_id
            FROM recruitment_slug_redirects
            WHERE old_slug = ${recruitmentSlug}
          )
        )
      LIMIT 1
    `);

    if (result && result.length > 0) {
      console.log("[getPostCoreData] Found canonical post");
      return result[0];
    }

    /*
     * Legacy Google URLs sometimes use the old postings slug tail, whose
     * initials were lost by a legacy slug generator. Resolve only an exact
     * tail match under the already-resolved recruitment, and only when that
     * tail identifies one canonical post. The inferred relationship must
     * agree with posts.recruitment_id; no global or fuzzy fallback is allowed.
     *
     * This runs only after the normal canonical lookup misses, so current
     * canonical URLs do not pay the legacy lookup cost.
     */
    const legacyMatch = await db.execute<any>(sql`
      SELECT p.slug AS "postSlug", r.slug AS "recruitmentSlug"
      FROM posts p
      INNER JOIN recruitments r ON r.id = p.recruitment_id
      WHERE r.verification_status IS DISTINCT FROM 'QUARANTINED'
        AND (
          r.slug = ${recruitmentSlug}
          OR r.id IN (
            SELECT recruitment_id
            FROM recruitment_slug_redirects
            WHERE old_slug = ${recruitmentSlug}
          )
        )
        AND EXISTS (
          SELECT 1
          FROM postings po
          WHERE po.inferred_recruitment_id = r.id
            AND po.inferred_post_id = p.id
            AND po.slug = ${postSlug}
        )
        AND (
          SELECT COUNT(DISTINCT po2.inferred_post_id)
          FROM postings po2
          WHERE po2.inferred_recruitment_id = r.id
            AND po2.inferred_post_id IS NOT NULL
            AND po2.slug = ${postSlug}
        ) = 1
      LIMIT 1
    `);

    if (legacyMatch && legacyMatch.length > 0) {
      const canonicalRecruitmentSlug = String(legacyMatch[0].recruitmentSlug);
      const canonicalPostSlug = String(legacyMatch[0].postSlug);
      if (
        canonicalRecruitmentSlug !== recruitmentSlug ||
        canonicalPostSlug !== postSlug
      ) {
        console.log("[getPostCoreData] Resolving exact legacy post alias to canonical URL");
        return await getPostCoreData(canonicalRecruitmentSlug, canonicalPostSlug);
      }
    }

    console.log("[getPostCoreData] No canonical or safe legacy post match");
    return null;
  } catch (err) {
    console.error(`[getPostCoreData] Error executing query:`, err instanceof Error ? err.message : String(err));
    throw err;
  }
}

/**
 * REMOVED: Fetch FJA extraction data separately (can be lazy-loaded)
 * FJA inventory tables were dropped as part of Step 3 cleanup.
 * FJA data should be sourced from official recruiter APIs only.
 */
async function getFjaExtractForPost(postId: number): Promise<any> {
  // FJA extraction tables no longer exist in production schema.
  // Return null to prevent breaking any remaining code paths.
  console.warn(`[getFjaExtractForPost] FJA tables removed; returning null for post ${postId}`);
  return null;
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
    console.log(`[getPostDetailEnrichment] Starting detail enrichment fetch for post ${postId}`);

    // Use Promise.allSettled to prevent one failing query from blocking others
    const results = await Promise.allSettled([
      (async () => {
        console.log(`[getPostDetailEnrichment] Executing vacancies query`);
        return await db.execute<any>(sql`
          SELECT id, total_vacancies AS "count", category, location, location_count AS "locationCount", category_count AS "categoryCount", source
          FROM posts_vacancies
          WHERE post_id = ${postId}
          ORDER BY category
        `);
      })(),
      (async () => {
        console.log(`[getPostDetailEnrichment] Executing education query`);
        return await db.execute<any>(sql`
          SELECT id, degree, subject, specialization, source
          FROM posts_education
          WHERE post_id = ${postId}
          ORDER BY degree
        `);
      })(),
      (async () => {
        console.log(`[getPostDetailEnrichment] Executing experience query`);
        return await db.execute<any>(sql`
          SELECT id, experience_type AS "experienceType", source, description
          FROM posts_experience
          WHERE post_id = ${postId}
          ORDER BY experience_type
        `);
      })(),
      (async () => {
        console.log(`[getPostDetailEnrichment] Executing selectionProcess query`);
        return await db.execute<any>(sql`
          SELECT id, stage_name AS "name", description, marks, duration, mode
          FROM posts_selection_process
          WHERE post_id = ${postId}
          ORDER BY stage_name
        `);
      })(),
      (async () => {
        console.log(`[getPostDetailEnrichment] Executing documents query`);
        return await db.execute<any>(sql`
          SELECT id, document_name AS "name", document_category AS "category", is_required AS "required", required_for_categories AS "requiredForCategories"
          FROM posts_documents
          WHERE post_id = ${postId}
          ORDER BY document_category, document_name
        `);
      })(),
      (async () => {
        console.log(`[getPostDetailEnrichment] Executing importantDates query`);
        return await db.execute<any>(sql`
          SELECT id, date_type AS "label", description
          FROM posts_important_dates
          WHERE post_id = ${postId}
          ORDER BY date_type
        `);
      })(),
      (async () => {
        console.log(`[getPostDetailEnrichment] Executing ageRules query`);
        return await db.execute<any>(sql`
          SELECT id, category, max_age AS "max", relaxation_years AS "relaxationYears", rule_type AS "ruleType", condition_text AS "conditionText"
          FROM post_age_rules
          WHERE post_id = ${postId}
          ORDER BY category
        `);
      })(),
      (async () => {
        console.log(`[getPostDetailEnrichment] Executing applicationFees query`);
        return await db.execute<any>(sql`
          SELECT id, category, amount, currency_code AS "currencyCode", note, payment_mode AS "paymentMode"
          FROM posts_application_fee
          WHERE post_id = ${postId}
        `);
      })(),
      (async () => {
        console.log(`[getPostDetailEnrichment] Executing officialLinks query`);
        return await db.execute<any>(sql`
          SELECT id, link_type AS "type", label, url, is_official AS "isOfficial"
          FROM posts_official_links
          WHERE post_id = ${postId}
          ORDER BY link_type
        `);
      })(),
    ]);

    console.log(`[getPostDetailEnrichment] All queries completed for post ${postId}`);

    // Extract results, handling rejections gracefully
    const extractResult = (result: PromiseSettledResult<any>, label: string): any => {
      if (result.status === 'rejected') {
        const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        console.error(`[getPostDetailEnrichment] ❌ ${label} query FAILED:`, errorMsg);
        return null;
      }
      console.log(`[getPostDetailEnrichment] ✅ ${label} query succeeded`);
      return result.value;
    };

    const [vacancies, education, experience, selectionProcess, documents, importantDates, ageRules, applicationFees, officialLinks] = [
      extractResult(results[0], 'vacancies'),
      extractResult(results[1], 'education'),
      extractResult(results[2], 'experience'),
      extractResult(results[3], 'selectionProcess'),
      extractResult(results[4], 'documents'),
      extractResult(results[5], 'importantDates'),
      extractResult(results[6], 'ageRules'),
      extractResult(results[7], 'applicationFees'),
      extractResult(results[8], 'officialLinks'),
    ];

    // CRITICAL FIX: db.execute() may return { rows: [...] } or an array directly
    // Extract rows safely to ensure Array.isArray() checks in component pass
    const extractRows = (result: any, label: string): any[] => {
      if (Array.isArray(result)) {
        console.log(`[getPostDetailEnrichment] ${label}: Array with ${result.length} items`);
        return result;
      }
      if (result && typeof result === 'object' && Array.isArray(result.rows)) {
        console.log(`[getPostDetailEnrichment] ${label}: Object.rows with ${result.rows.length} items`);
        return result.rows;
      }
      console.log(`[getPostDetailEnrichment] ${label}: Neither array nor object.rows, returning empty`);
      return [];
    };

    const vacanciesList = extractRows(vacancies, 'vacancies');
    const educationList = extractRows(education, 'education');
    const experienceList = extractRows(experience, 'experience');
    const selectionProcessList = extractRows(selectionProcess, 'selectionProcess');
    const documentsList = extractRows(documents, 'documents');
    const importantDatesList = extractRows(importantDates, 'importantDates');
    const ageRulesList = extractRows(ageRules, 'ageRules');
    const applicationFeesList = extractRows(applicationFees, 'applicationFees');
    const officialLinksList = extractRows(officialLinks, 'officialLinks');

    console.log(`[getPostDetailEnrichment] Post ${postId} enrichment counts:`, {
      vacancies: vacanciesList.length,
      education: educationList.length,
      experience: experienceList.length,
      selectionProcess: selectionProcessList.length,
      documents: documentsList.length,
      importantDates: importantDatesList.length,
      ageRules: ageRulesList.length,
      applicationFees: applicationFeesList.length,
      officialLinks: officialLinksList.length,
    });

    return {
      vacancies: vacanciesList,
      education: educationList,
      experience: experienceList,
      selectionProcess: selectionProcessList,
      documents: documentsList,
      importantDates: importantDatesList,
      ageRules: ageRulesList,
      applicationFees: applicationFeesList,
      officialLinks: officialLinksList,
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
 * Resolve retired duplicate aggregate post URLs to their recruitment hub.
 * This is intentionally limited to rows explicitly marked DUPLICATE; it does
 * not guess a destination for normal missing or ambiguous post slugs.
 */
export async function getDuplicatePostRecruitmentSlug(
  recruitmentSlug: string,
  postSlug: string
): Promise<string | null> {
  const db = getDb();
  const result = await db.execute<any>(sql`
    SELECT r.slug AS "recruitmentSlug"
    FROM posts p
    INNER JOIN recruitments r ON r.id = p.recruitment_id
    WHERE p.slug = ${postSlug}
      AND p.posting_status = 'DUPLICATE'
      AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
      AND (
        r.slug = ${recruitmentSlug}
        OR r.id IN (
          SELECT recruitment_id
          FROM recruitment_slug_redirects
          WHERE old_slug = ${recruitmentSlug}
        )
      )
    LIMIT 1
  `);
  return result?.length ? String(result[0].recruitmentSlug) : null;
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

    // ENRICHMENT: Now stored as JSONB in posts table (included in coreData)
    // Extract enrichment from posts.enrichment column
    const enrichmentJsonb = coreData.enrichment || {};

    // SECONDARY PATH: Fetch only FJA data in parallel
    // Detail enrichment tables have been consolidated into posts.enrichment JSONB
    const results = await Promise.allSettled([
      getFjaExtractForPost(postId),
      getPostEnrichmentData(postId),
    ]);

    const fjaData = results[0].status === 'fulfilled' ? results[0].value : null;
    const enrichmentData = results[1].status === 'fulfilled' ? results[1].value : null;

    // Merge results, handling null values safely
    const data = {
      ...coreData,
      ...(fjaData || {}),
      ...(enrichmentData || {}),
    } as PostRow;

    // An external URL is not an official issuer link merely because an
    // aggregator discovered it or it is hosted on a government-looking domain.
    // Require a registered OFFICIAL source and an exact/subdomain HTTPS host match.
    const officialSourceRegistryUrl = data.officialSourceRegistryUrl ?? null;
    const officialSourceVerified =
      data.officialNotificationEvidenceAccepted === true
      && isVerifiedOfficialUrl(data.officialSourceUrl, officialSourceRegistryUrl);
    const officialApplicationVerified =
      data.officialApplicationEvidenceAccepted === true
      && isVerifiedOfficialUrl(data.applyPortalUrl, officialSourceRegistryUrl);

    // Transform raw JSONB enrichment to canonical EnrichmentSchema. Any
    // additional officialLinks must independently match the same registered
    // issuer host before they can reach the public page.
    const transformed = transformEnrichment(enrichmentJsonb);
    const transformedEnrichment = transformed
      ? {
          ...transformed,
          officialLinks: (transformed.officialLinks ?? []).filter((link) =>
            isVerifiedOfficialUrl(link.url, officialSourceRegistryUrl)
          ),
        }
      : transformed;

    return {
      id: data.id,
      title: data.title,
      slug: data.slug,
      positionId: (data as any).positionId ?? null,
      organizationId: data.organizationId,
      organizationName: data.organizationName,
      organizationSlug: data.organizationSlug ?? null,
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
      officialSourceUrl: officialSourceVerified ? data.officialSourceUrl : null,
      applyPortalUrl: officialApplicationVerified ? data.applyPortalUrl : null,
      officialSourceRegistryUrl,
      officialSourceVerified,
      officialApplicationVerified,
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
      recruitmentOfficialNotificationUrl: officialSourceVerified ? data.recruitmentOfficialNotificationUrl ?? null : null,
      recruitmentOfficialApplicationUrl: officialApplicationVerified ? data.recruitmentOfficialApplicationUrl ?? null : null,
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
      // PHASE 2: Enrichment is now consolidated in posts.enrichment JSONB column
      // Raw JSONB is transformed to canonical EnrichmentSchema structure by enrichment-transformer
      enrichment: transformedEnrichment,
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
        AND ${recruitmentIsLiveSql(sql`r.status`, sql`r.application_end_date`)}
        AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
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
        AND ${recruitmentIsLiveSql(sql`r.status`, sql`r.application_end_date`)}
        AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
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
        AND ${recruitmentIsLiveSql(sql`r.status`, sql`r.application_end_date`)}
        AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
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
        AND ${recruitmentIsLiveSql(sql`r.status`, sql`r.application_end_date`)}
        AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
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
// Debug export to test slug lookups
export async function debugPostLookup(recruitmentSlug: string, postSlug: string) {
  console.log(`\n=== DEBUG: Post Lookup ===`);
  console.log(`Recruitment Slug: "${recruitmentSlug}" (length: ${recruitmentSlug.length})`);
  console.log(`Post Slug: "${postSlug}" (length: ${postSlug.length})`);
  
  try {
    const result = await getPostCoreData(recruitmentSlug, postSlug);
    if (result) {
      console.log(`✓ FOUND: Post ID ${result.id}, Title: ${result.title}`);
    } else {
      console.log(`✗ NOT FOUND`);
    }
    return result;
  } catch (err) {
    console.error(`✗ ERROR:`, err instanceof Error ? err.message : String(err));
    throw err;
  }
}
