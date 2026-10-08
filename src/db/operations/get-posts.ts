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
        p."recruitmentId",
        p."recruitmentName",
        p."recruitmentSlug",
        p."examType",
        p."examTypeSlug",
        p.description,
        p."isLive",
        p."postedAt",
        p."createdAt",
        p."updatedAt",
        p."officialSourceUrl",
        p."applyPortalUrl",
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
      WHERE p.slug = ${postSlug}
        AND p."recruitmentSlug" = ${recruitmentSlug}
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
      isLive: data.isLive,
      postedAt: new Date(data.postedAt),
      updatedAt: new Date(data.updatedAt),
      officialSourceUrl: data.officialSourceUrl,
      applyPortalUrl: data.applyPortalUrl,
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
        sourceVerificationDate: data.sourceVerificationDate ? new Date(data.sourceVerificationDate) : new Date(),
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
        p."recruitmentId",
        p."recruitmentName",
        p."recruitmentSlug",
        p."examType",
        p."examTypeSlug",
        p.description,
        p."isLive",
        p."postedAt",
        p."createdAt",
        p."updatedAt",
        p."officialSourceUrl",
        p."applyPortalUrl",
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
        isLive: data.isLive,
        postedAt: new Date(data.postedAt),
        updatedAt: new Date(data.updatedAt),
        officialSourceUrl: data.officialSourceUrl,
        applyPortalUrl: data.applyPortalUrl,
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
