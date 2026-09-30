import type { postings } from "@/db/schema";

type PostingStage = (typeof postings.$inferSelect)["currentStage"];
type PostingKind = (typeof postings.$inferSelect)["kind"];
type OrgSector = "GOVERNMENT_CENTRAL" | "GOVERNMENT_STATE" | "PSU" | "BANKING" | "DEFENCE" | "RAILWAY" | "PRIVATE";

// Source-agnostic normalized shape every adapter returns. The normalizer maps
// this into DB rows (posting + organization + categories + timeline).
export interface RawPosting {
  // Stable identifier from the source, unique within that source. Combined
  // with `source` this is the dedup key — re-ingesting the same notification
  // must yield the same externalId so it updates in place, not duplicates.
  externalId: string;
  sourceUrl: string;

  title: string;
  kind: PostingKind;

  organizationName: string;
  organizationSlug?: string;
  organizationSector?: OrgSector;
  organizationState?: string;

  description: string;
  eligibility?: string;
  postNames?: string[];

  totalVacancies?: number;
  ageLimitMin?: number;
  ageLimitMax?: number;
  applicationFeeGeneral?: number;
  applicationFeeReserved?: number;

  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR";

  locationCity?: string;
  locationRegion?: string;
  locationCountry?: string;

  officialNotificationUrl?: string;
  applyUrl?: string;

  // Explicit stage if the source states it; otherwise the normalizer infers
  // from title/description via `stageHintText`.
  stage?: PostingStage;
  stageHintText?: string;

  datePosted?: Date;
  validThrough?: Date;
  examDate?: Date;

  // Category slugs or names to attach (created if missing).
  categories?: string[];

  // 0–100. Below the publish threshold the row lands as PENDING for review.
  confidence?: number;
}

export interface SourceAdapter {
  /** Stable source key, stored on each posting (e.g. "ssc-feed"). */
  readonly source: string;
  /** Human-readable name for logs/admin. */
  readonly label: string;
  fetchRaw(): Promise<RawPosting[]>;
}

export interface IngestResult {
  source: string;
  fetched: number;
  inserted: number;
  updated: number;
  advanced: number; // stage-progression events appended to timelines
  skipped: number;
  errors: { externalId: string; error: string }[];
}
