/**
 * Post Query Operations
 * Fetches job posting data from database with enrichment
 * Uses DATABASE_URL (Drizzle) instead of Supabase client
 */

import { getDb } from "@/db";
import { sql } from "drizzle-orm";
import { JobPostingData } from "@/types/job-posting";

/**
 * Fetch a single post by recruitment and post slugs with enrichment data
 * Joins posts table with post_enrichments using raw SQL
 */
export async function getPostBySlug(
  recruitmentSlug: string,
  postSlug: string
): Promise<JobPostingData | null> {
  try {
    const db = getDb();

    // Raw SQL query to join posts with post_enrichments
    const result = await db.execute<any>(sql`
      SELECT
        p.id,
        p.title,
        p.slug,
        p."organizationId",
        p."organizationName",
        COALESCE(p."recruitmentId"::integer, p.recruitment_id) AS "recruitmentId",
        p."recruitmentName",
        COALESCE(p."recruitmentSlug", r.slug) AS "recruitmentSlug",
        p."examType",
        p."examTypeSlug",
        p.description,
        p.employment_type AS "employmentType",
        p.location_city AS "locationCity",
        p.location_state AS "locationState",
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
        r.selection_process AS "recruitmentSelectionProcess",
        e.id AS "enrichmentId",
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
        e."benefits"
      FROM posts p
      LEFT JOIN post_enrichments e ON p.id = e.post_id
      LEFT JOIN recruitments r ON COALESCE(p."recruitmentId"::integer, p.recruitment_id) = r.id
      WHERE p.slug = ${postSlug}
        AND COALESCE(p."recruitmentSlug", r.slug) = ${recruitmentSlug}
        AND p."isLive" = true
      LIMIT 1
    `);

    if (!result || result.length === 0) {
      console.warn("No post found for:", { recruitmentSlug, postSlug });
      return null;
    }

    const data = result[0];

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
      // Do not gate the entire enrichment object on vacanciesTotal: other
      // valid enrichment fields (dates, fees, eligibility, salary) can exist
      // independently of a vacancy count.
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
  } catch (err) {
    console.error("Exception in getPostBySlug:", err);
    return null;
  }
}

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
    const results = await db.execute<any>(sql`
      SELECT
        p.id,
        p.title,
        p.slug,
        p."organizationId",
        p."organizationName",
        COALESCE(p."recruitmentId"::integer, p.recruitment_id) AS "recruitmentId",
        p."recruitmentName",
        COALESCE(p."recruitmentSlug", r.slug) AS "recruitmentSlug",
        p."examType",
        p."examTypeSlug",
        p.description,
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
        e."benefits"
      FROM posts p
      LEFT JOIN post_enrichments e ON p.id = e.post_id
      LEFT JOIN recruitments r ON COALESCE(p."recruitmentId"::integer, p.recruitment_id) = r.id
      WHERE p."recruitmentSlug" = ${recruitmentSlug}
        AND p."isLive" = true
      ORDER BY p."postedAt" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    return (results || []).map((data: any) => {
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
        enrichment: data.vacanciesTotal !== null ? {
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