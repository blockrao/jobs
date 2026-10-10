/**
 * Job Posting Data Type
 *
 * Combines posts table data with post_enrichments for complete post display.
 * This is what the job posting page component receives.
 */

export interface JobPostingData {
  // Post Basic Info
  id: string;
  title: string;
  slug: string;
  organizationId: string;
  organizationName: string;
  recruitmentId: string;
  recruitmentName: string;
  recruitmentSlug: string;
  examType: string;
  examTypeSlug: string;
  description?: string;
  employmentType?: string | null;
  locationCity?: string | null;
  locationState?: string | null;

  // Live Status
  isLive: boolean;
  postedAt: Date;
  updatedAt: Date;

  // Source Links
  officialSourceUrl?: string;
  applyPortalUrl?: string;

  // Gate 4D bridge: old-schema columns for resolver legacy fallback paths
  vacancyTotal?: number | null;
  legacySalaryMin?: number | null;
  legacySalaryMax?: number | null;

  // Gate 4D bridge: recruitment-level fields for resolvers
  recruitmentVacancyTotal?: number | null;
  recruitmentOfficialNotificationUrl?: string | null;
  recruitmentOfficialApplicationUrl?: string | null;
  recruitmentApplicationStartDate?: Date | null;
  recruitmentApplicationEndDate?: Date | null;
  recruitmentSelectionProcess?: string | null;
  notificationPublicationDate?: Date | null;

  // Raw FreeJobAlert inventory fields; source extraction is not official verification.
  fjaExtract?: {
    inventoryId: number | string;
    externalId?: string | null;
    qualificationRaw?: string | null;
    experienceRaw?: string | null;
    ageLimitRaw?: string | null;
    ageReferenceDateRaw?: string | null;
    salaryRaw?: string | null;
    employmentTypeRaw?: string | null;
    locationRaw?: string | null;
    dutiesRaw?: string | null;
    eligibilityRaw?: string | null;
    vacancyCountRaw?: string | null;
    milestonesRaw?: unknown;
    applicationSelectionRaw?: unknown;
    otherInfoRaw?: unknown;
    extractionStatus?: string | null;
    verificationStatus?: string | null;
  };

  // Enrichment Data (from post_enrichments table)
  enrichment?: PostEnrichment;
}

export interface PostEnrichment {
  // Vacancies
  vacanciesByCategory: Record<string, number>;
  vacanciesTotal: number;

  // Application Fee
  feesByCategory: Record<string, number | string>; // Can be "Exempted" etc.
  feeNote?: string;

  // Age Limits
  ageRulesByCategory: Record<string, { min: number; max: number }>;
  ageNote?: string;
  ageRelaxationRules?: string;
  ageReferenceDate?: Date;

  // Pay & Salary
  payScale?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryNote?: string;
  payLevel?: string;

  // Selection Process
  selectionProcess: Array<{
    step: number;
    name: string;
    totalMarks?: number;
    duration?: string;
    minQualifyingMarks?: Record<string, number>;
    description?: string;
  }>;

  // Important Dates
  notificationDate?: Date;
  applicationOpenDate?: Date;
  applicationClosingDate?: Date;
  examDate?: Date;
  admitCardDate?: Date;
  resultDate?: Date;
  interviewScheduleDate?: Date;
  appointmentDate?: Date;

  // Eligibility Pathways
  eligibilityPathways?: Array<{
    pathway: number;
    description: string;
    qualifications?: string[];
    experienceYears?: number;
  }>;

  // Documents Required
  documentsRequired?: {
    required: string[];
    common: string[];
  };

  // Duties & Responsibilities
  duties?: string[];
  responsibilities?: string[];

  // Verification & Quality
  sourceVerificationStatus: "VERIFIED" | "PENDING" | "UNVERIFIABLE";
  sourceVerificationDate?: Date;
  extractionConfidence: number; // 0-100
  dataGaps: string[];

  // Structured Data Fields
  education?: {
    degree: string;
    university?: string;
    registration?: string;
  };

  experience?: {
    minYears: number;
    domains: string[];
    countedFrom?: string;
  };

  benefits?: string[];
}
