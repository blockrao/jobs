import type { postings, ExtraContent } from "@/db/schema";

type PostingStage = (typeof postings.$inferSelect)["currentStage"];
type PostingKind = (typeof postings.$inferSelect)["kind"];
type OrgSector = "GOVERNMENT_CENTRAL" | "GOVERNMENT_STATE" | "PSU" | "BANKING" | "DEFENCE" | "RAILWAY" | "PRIVATE";

// Source-agnostic normalized shape every adapter returns. The normalizer maps
// this into DB rows (posting + organization + categories + timeline).
export interface RawPosting {
  // Source portal key (e.g. "sarkariresult", "ssc-portal"). Combined with
  // externalId, this forms the dedup key for upserts.
  source?: string;
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
  /** Short factual relaxation line, only when the source states one. Never aggregator text. */
  ageRelaxationNotes?: string;
  /** Fact tables (age, fee, selection, dates...) from the article, scrubbed of aggregator references. */
  extraContent?: ExtraContent;
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

  // Detected exam slug if job posting matches a known exam (e.g. "ssc-cgl", "upsc-ias")
  // Used for auto-linking jobs to exam pages. Detected from title/description.
  examSlug?: string;

  // 0–100. Confidence is a data-quality signal only. It never publishes: ingestion
  // always lands rows as PENDING (WP-001, "ingestion is not publication").
  confidence?: number;

  // ---- WP-001 additions (all optional; existing adapters are unaffected) ----
  /** True when organizationName came from the source's labelled organization field, not a headline guess. */
  organizationFromLabel?: boolean;
  /** Notification / advertisement number as stated by the source. */
  advertisementNumber?: string;
  /** Application start date as stated by the source. */
  applicationStartDate?: Date;
  /** Posts with per-post vacancy counts, as parsed from the source's post table. */
  postTable?: Array<{ name: string; vacancies?: number }>;
  /** Issuing body's own website, if the source lists one (never an aggregator link). */
  websiteUrl?: string;
  /** Facts the source stated, verbatim, for the raw observation. */
  observationFacts?: Record<string, unknown>;
  /** Raw reference/payload for the observation (kept lightweight). */
  observationRaw?: unknown;
  /** Links as listed on the source page, aggregator-internal links removed. */
  observationLinks?: Array<{ label: string; url: string }>;
  /** When the source page was retrieved. */
  observedAt?: Date;
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
