/**
 * Post Query Operations
 * Fetches job posting data from database with enrichment
 */

import { createClient } from "@/lib/supabase/server";
import { JobPostingData } from "@/types/job-posting";

/**
 * Fetch a single post by recruitment and post slugs with enrichment data
 * Joins posts table with post_enrichments JSONB
 */
export async function getPostBySlug(
  recruitmentSlug: string,
  postSlug: string
): Promise<JobPostingData | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      id,
      title,
      slug,
      organizationId,
      organizationName,
      recruitmentId,
      recruitmentName,
      recruitmentSlug,
      examType,
      examTypeSlug,
      description,
      isLive,
      postedAt,
      updated_at,
      officialSourceUrl,
      applyPortalUrl,
      post_enrichments!inner(
        vacanciesByCategory,
        vacanciesTotal,
        feesByCategory,
        feeNote,
        ageRulesByCategory,
        ageNote,
        ageRelaxationRules,
        ageReferenceDate,
        payScale,
        salaryMin,
        salaryMax,
        salaryNote,
        payLevel,
        selectionProcess,
        notificationDate,
        applicationOpenDate,
        applicationClosingDate,
        examDate,
        admitCardDate,
        resultDate,
        interviewScheduleDate,
        appointmentDate,
        eligibilityPathways,
        documentsRequired,
        duties,
        responsibilities,
        sourceVerificationStatus,
        sourceVerificationDate,
        extractionConfidence,
        dataGaps,
        education,
        experience,
        benefits
      )
    `
    )
    .eq("slug", postSlug)
    .eq("recruitmentSlug", recruitmentSlug)
    .eq("isLive", true)
    .single();

  if (error) {
    console.error("Error fetching post:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  // Transform the database response to JobPostingData type
  const enrichment =
    data.post_enrichments && data.post_enrichments.length > 0
      ? data.post_enrichments[0]
      : undefined;

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
    updatedAt: new Date(data.updated_at),
    officialSourceUrl: data.officialSourceUrl,
    applyPortalUrl: data.applyPortalUrl,
    enrichment: enrichment ? {
      vacanciesByCategory: enrichment.vacanciesByCategory,
      vacanciesTotal: enrichment.vacanciesTotal,
      feesByCategory: enrichment.feesByCategory,
      feeNote: enrichment.feeNote,
      ageRulesByCategory: enrichment.ageRulesByCategory,
      ageNote: enrichment.ageNote,
      ageRelaxationRules: enrichment.ageRelaxationRules,
      ageReferenceDate: enrichment.ageReferenceDate ? new Date(enrichment.ageReferenceDate) : undefined,
      payScale: enrichment.payScale,
      salaryMin: enrichment.salaryMin,
      salaryMax: enrichment.salaryMax,
      salaryNote: enrichment.salaryNote,
      payLevel: enrichment.payLevel,
      selectionProcess: enrichment.selectionProcess,
      notificationDate: enrichment.notificationDate ? new Date(enrichment.notificationDate) : undefined,
      applicationOpenDate: enrichment.applicationOpenDate ? new Date(enrichment.applicationOpenDate) : undefined,
      applicationClosingDate: new Date(enrichment.applicationClosingDate),
      examDate: enrichment.examDate ? new Date(enrichment.examDate) : undefined,
      admitCardDate: enrichment.admitCardDate ? new Date(enrichment.admitCardDate) : undefined,
      resultDate: enrichment.resultDate ? new Date(enrichment.resultDate) : undefined,
      interviewScheduleDate: enrichment.interviewScheduleDate ? new Date(enrichment.interviewScheduleDate) : undefined,
      appointmentDate: enrichment.appointmentDate ? new Date(enrichment.appointmentDate) : undefined,
      eligibilityPathways: enrichment.eligibilityPathways,
      documentsRequired: enrichment.documentsRequired,
      duties: enrichment.duties,
      responsibilities: enrichment.responsibilities,
      sourceVerificationStatus: enrichment.sourceVerificationStatus,
      sourceVerificationDate: new Date(enrichment.sourceVerificationDate),
      extractionConfidence: enrichment.extractionConfidence,
      dataGaps: enrichment.dataGaps,
      education: enrichment.education,
      experience: enrichment.experience,
      benefits: enrichment.benefits,
    } : undefined,
  };
}

/**
 * Fetch multiple posts for a recruitment with pagination
 */
export async function getPostsByRecruitment(
  recruitmentSlug: string,
  limit: number = 20,
  offset: number = 0
): Promise<JobPostingData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      id,
      title,
      slug,
      organizationId,
      organizationName,
      recruitmentId,
      recruitmentName,
      recruitmentSlug,
      examType,
      examTypeSlug,
      description,
      isLive,
      postedAt,
      updated_at,
      officialSourceUrl,
      applyPortalUrl,
      post_enrichments(
        vacanciesByCategory,
        vacanciesTotal,
        feesByCategory,
        feeNote,
        ageRulesByCategory,
        ageNote,
        ageRelaxationRules,
        ageReferenceDate,
        payScale,
        salaryMin,
        salaryMax,
        salaryNote,
        payLevel,
        selectionProcess,
        notificationDate,
        applicationOpenDate,
        applicationClosingDate,
        examDate,
        admitCardDate,
        resultDate,
        interviewScheduleDate,
        appointmentDate,
        eligibilityPathways,
        documentsRequired,
        duties,
        responsibilities,
        sourceVerificationStatus,
        sourceVerificationDate,
        extractionConfidence,
        dataGaps,
        education,
        experience,
        benefits
      )
    `
    )
    .eq("recruitmentSlug", recruitmentSlug)
    .eq("isLive", true)
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching recruitment posts:", error);
    return [];
  }

  return (data || []).map((post: any) => {
    const enrichment = post.post_enrichments?.[0];
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      organizationId: post.organizationId,
      organizationName: post.organizationName,
      recruitmentId: post.recruitmentId,
      recruitmentName: post.recruitmentName,
      recruitmentSlug: post.recruitmentSlug,
      examType: post.examType,
      examTypeSlug: post.examTypeSlug,
      description: post.description,
      isLive: post.isLive,
      postedAt: new Date(post.postedAt),
      updatedAt: new Date(post.updated_at),
      officialSourceUrl: post.officialSourceUrl,
      applyPortalUrl: post.applyPortalUrl,
      enrichment: enrichment ? {
        vacanciesByCategory: enrichment.vacanciesByCategory,
        vacanciesTotal: enrichment.vacanciesTotal,
        feesByCategory: enrichment.feesByCategory,
        feeNote: enrichment.feeNote,
        ageRulesByCategory: enrichment.ageRulesByCategory,
        ageNote: enrichment.ageNote,
        ageRelaxationRules: enrichment.ageRelaxationRules,
        ageReferenceDate: enrichment.ageReferenceDate ? new Date(enrichment.ageReferenceDate) : undefined,
        payScale: enrichment.payScale,
        salaryMin: enrichment.salaryMin,
        salaryMax: enrichment.salaryMax,
        salaryNote: enrichment.salaryNote,
        payLevel: enrichment.payLevel,
        selectionProcess: enrichment.selectionProcess,
        notificationDate: enrichment.notificationDate ? new Date(enrichment.notificationDate) : undefined,
        applicationOpenDate: enrichment.applicationOpenDate ? new Date(enrichment.applicationOpenDate) : undefined,
        applicationClosingDate: new Date(enrichment.applicationClosingDate),
        examDate: enrichment.examDate ? new Date(enrichment.examDate) : undefined,
        admitCardDate: enrichment.admitCardDate ? new Date(enrichment.admitCardDate) : undefined,
        resultDate: enrichment.resultDate ? new Date(enrichment.resultDate) : undefined,
        interviewScheduleDate: enrichment.interviewScheduleDate ? new Date(enrichment.interviewScheduleDate) : undefined,
        appointmentDate: enrichment.appointmentDate ? new Date(enrichment.appointmentDate) : undefined,
        eligibilityPathways: enrichment.eligibilityPathways,
        documentsRequired: enrichment.documentsRequired,
        duties: enrichment.duties,
        responsibilities: enrichment.responsibilities,
        sourceVerificationStatus: enrichment.sourceVerificationStatus,
        sourceVerificationDate: new Date(enrichment.sourceVerificationDate),
        extractionConfidence: enrichment.extractionConfidence,
        dataGaps: enrichment.dataGaps,
        education: enrichment.education,
        experience: enrichment.experience,
        benefits: enrichment.benefits,
      } : undefined,
    };
  });
}
