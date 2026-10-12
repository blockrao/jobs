/**
 * Shared types for recruitment hub section components.
 * All sections receive a HubData object built by the orchestrator.
 */

import type { recruitments, posts, positions } from '@/db/schema';

export type EligibilityRow = {
  id?: number;
  postId?: number;
  qualificationText?: string | null;
  experienceText?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  educationLevel?: string | null;
  qualification_record?: unknown;
  [key: string]: unknown;
};

export type RecruitmentHubRecruitment = typeof recruitments.$inferSelect & {
  organizationName?: string | null;
  exam?: { name?: string | null; title?: string | null } | null;
  officialNotificationNumber?: string | null;
  official_notification_number?: string | null;
  advertisementNumber?: string | null;
  advertisement_number?: string | null;
  recruitmentFees?: unknown;
  feeGeneral?: number | string | null;
  fee_general?: number | string | null;
  feeReserved?: number | string | null;
  fee_reserved?: number | string | null;
  feeNote?: string | null;
  fee_note?: string | null;
  selectionProcesses?: unknown;
  sourceVerificationStatus?: string | null;
  sourceListingPublishedDate?: Date | string | null;
  sourceExtract?: {
    title?: string | null;
    sourceUrl?: string | null;
    applicationStartDate?: Date | string | null;
    applicationEndDate?: Date | string | null;
    vacancyCount?: number | null;
    qualification?: string | null;
    details?: unknown;
    otherInfoRaw?: unknown;
    sourceStatus?: string | null;
    detailStatus?: string | null;
  } | null;
};

export type RecruitmentHubPost = typeof posts.$inferSelect & {
  position?: typeof positions.$inferSelect | null;
  resolvedVacancyCount?: number | null;
  status?: string | null;
  lifecycle_status?: string | null;
  application_email?: string | null;
  applicationEmail?: string | null;
  eligibilities?: EligibilityRow[];
  fjaExtract?: {
    inventoryId?: number | string;
    vacancyCountRaw?: string | null;
    qualificationRaw?: string | null;
    experienceRaw?: string | null;
    salaryRaw?: string | null;
    tenureRaw?: string | null;
    locationRaw?: string | null;
    employmentTypeRaw?: string | null;
    verificationStatus?: string | null;
    otherInfoRaw?: unknown;
  } | null;
};

export interface PostTableRow {
  id: number | string;
  name: string | null;
  slug: string | null;
  vacancies: number | null;
  vacanciesLabel: string | null;
  payDisplay: string | null;
  employmentType: string | null;
}

export interface SelectionRow {
  title: string | null;
  detail: string | null;
}

export interface FeeRow {
  [key: string]: unknown;
}

/** All computed/resolved data the hub sections need — built once by the orchestrator. */
export interface HubData {
  // Raw records
  recruitment: RecruitmentHubRecruitment;
  posts: RecruitmentHubPost[];

  // Resolved props
  resolvedTotalVacancies: number | null;
  resolvedApplicationUrl: string | null;
  resolvedOfficialSource: string | null;
  resolvedEmployer: string | null;
  resolvedSelectionProcess: string | null;
  orgSlug: string | null;
  localePrefix: string;

  // Computed display values
  sourceFactsUnverified: boolean;
  displayOrg: string | null;
  displayTotalVacancies: number | null;
  displayApplicationUrl: string | null;
  displayOfficialSource: string | null;
  displayDescription: string | null;
  descriptionIsInternal: boolean;

  // Dates
  notificationDate: string | null;
  notificationDateLabel: string;
  appStart: string | null;
  appEnd: string | null;
  appEndLabel: string;
  appEndRaw: Date | string | null;

  // Status
  closed: boolean;
  sourceStatusLabel: string | null;

  // Urgency
  daysLeft: number | null;
  isClosingSoon: boolean;
  isLastDay: boolean;

  // Metadata
  examName: string | null;
  notificationNumber: string | null;
  displayEmploymentType: string | null;
  displaySelectionProcess: string | null;

  // Source / extracted details
  sourcePayRange: string | null;
  sourceLocation: string | null;
  sourceApplicationMode: string | null;
  sharedApplicationEmail: string | null;
  sourceDocuments: string[];
  tentativeInterviewDate: string | null;

  // Fee
  feeRows: FeeRow[];
  feeGeneral: number | string | null;
  feeReserved: number | string | null;
  feeNote: string | null;
  hasFeeDetails: boolean;

  // Selection
  selectionDisplayRows: SelectionRow[];

  // Posts
  hasPosts: boolean;
  isSinglePost: boolean;
  hasPostsTable: boolean;
  postsTableRows: PostTableRow[];
  hasEligibilityData: boolean;

  // Timeline
  hasTimeline: boolean;

  // FAQ items
  faqItems: { q: string; a: string }[];
}
