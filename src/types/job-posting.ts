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
  /** DB position_id — used for position hub linking. */
  positionId?: number | null;
  organizationId: string;
  organizationName: string;
  /** Canonical organization slug; null when the recruitment has no resolved organization. */
  organizationSlug?: string | null;
  /** org_sector of the issuing body; PRIVATE = unresolved (data quality signal). */
  organizationSector?: string | null;
  recruitmentId: string;
  recruitmentName: string;
  recruitmentSlug: string;
  examType: string;
  examTypeSlug: string;
  description?: string;
  employmentType?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  locationCountry?: string | null;
  experienceLevel?: string | null;
  jobCategoryTags?: string[] | null;
  postingStatus?: string | null;
  /** Recruitment-level source authority; aggregator discovery is not official verification. */
  recruitmentVerificationStatus?: string | null;
  recruitmentOfficialLinkSource?: string | null;
  recruitmentMetadata?: Record<string, unknown> | null;
  postSourceName?: string | null;
  sourcePostCode?: string | null;

  // Application contact/method fields
  applicationMethod?: string | null;
  applicationEmail?: string | null;
  applicationUrl?: string | null;
  contactDepartment?: string | null;
  contactPerson?: string | null;

  // Per-post structured data
  vacancyDetails?: Record<string, number> | null;    // jsonb: {category: count}
  payLevel?: { level: string; scheme?: string } | null; // jsonb on posts table
  keyDates?: Record<string, string> | null;           // jsonb: {key: date_string}
  requiredSkills?: string[] | null;
  applicationChecklist?: string[] | null;

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
    sourcePostCodeRaw?: string | null;
    qualificationRaw?: string | null;
    experienceRaw?: string | null;
    ageLimitRaw?: string | null;
    ageReferenceDateRaw?: string | null;
    ageRelaxationRulesRaw?: string | null;
    salaryRaw?: string | null;
    payLevelRaw?: string | null;
    employmentTypeRaw?: string | null;
    tenureRaw?: string | null;
    locationRaw?: string | null;
    dutiesRaw?: string | null;
    eligibilityRaw?: string | null;
    vacancyCountRaw?: string | null;
    milestonesRaw?: unknown;
    applicationSelectionRaw?: unknown;
    otherInfoRaw?: unknown;
    sourcePublishedDate?: Date | string | null;
    sourceApplicationEndDate?: Date | string | null;
    recruitmentDetails?: unknown;
    recruitmentOtherInfoRaw?: unknown;
    advertisementNumber?: string | null;
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
  /** Array of vacancy objects for rendering */
  vacancies?: Array<{ category: string; count: number }>;

  // Application Fee
  feesByCategory: Record<string, number | string>; // Can be "Exempted" etc.
  feeNote?: string;

  // Age Limits
  ageRulesByCategory: Record<string, { min?: number | null; max?: number | null }>;
  ageNote?: string;
  ageRelaxationRules?: string;
  ageReferenceDate?: Date;
  /** Array of age rules for rendering */
  ageRules?: Array<{ category: string; min?: number | null; max?: number | null; maxAge?: number | null; relaxationYears?: number; ruleType?: string; note?: string }>;

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
    scheduledDate?: string;
    duration?: string;
    durationMinutes?: number;
    totalMarks?: number;
    minimumMarks?: number;
    passingMarks?: number;
    isQualifying?: boolean;
    minQualifyingMarks?: Record<string, number>;
    description?: string;
  }>;
  /** Alias for selectionProcess as array of stages */
  selectionProcessStages?: Array<{
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
  /** Array of important dates for rendering */
  importantDates?: Array<{ label: string; date?: Date; dateStr?: string }>;

  /** Array of required documents */
  requiredDocuments?: Array<{ name: string; category?: string; required?: boolean | null }>;

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
  sourceVerificationDate?: Date | null;
  extractionConfidence: number; // 0-100
  dataGaps: string[];

  // Structured Data Fields (always arrays for consistent .map() usage)
  education?: Array<{
    degree: string;
    subject?: string;
    specialization?: string;
    university?: string;
    registration?: string;
    minimumPercentage?: number;
    minimumMarks?: number;
    confidenceScore?: number;
    source?: string | null;
    verifiedAt?: Date;
    sourceRef?: string | null;
    sourceLocator?: string | null;
    factId?: number | string;
  }>;

  experience?: Array<{
    totalYears?: number;
    minYears: number;
    maxYears?: number;
    domains: string[];
    experienceType?: string;
    countedFrom?: string;
    confidenceScore?: number;
    source?: string | null;
    verifiedAt?: Date;
    sourceRef?: string | null;
    sourceLocator?: string | null;
    factId?: number | string;
  }>;

  benefits?: string[];

  // EnrichmentSchema fields (for enriched content tabs)
  documents?: string[];
  howToApply?: {
    method?: string;
    steps?: string[];
    address?: string;
    email?: string;
    portal_url?: string;
    contact?: {
      person?: string;
      department?: string;
      phone?: string;
    };
  };

  // Application Fee and Official Links (Phase 1 P0)
  applicationFees?: Array<{ category?: string; amount?: number | null; currency?: string; isExempted?: boolean; exemptionCategory?: string; note?: string }>;
  officialLinks?: Array<{ type?: string; url?: string; title?: string; source?: string }>;
}
