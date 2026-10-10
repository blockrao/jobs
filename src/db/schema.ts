import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  smallint,
  timestamp,
  date,
  pgEnum,
  jsonb,
  uniqueIndex,
  index,
  boolean,
  bigint,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------- Enums ----------

export const orgSectorEnum = pgEnum("org_sector", [
  "GOVERNMENT_CENTRAL",
  "GOVERNMENT_STATE",
  "PSU",
  "BANKING",
  "DEFENCE",
  "RAILWAY",
  "PRIVATE",
]);

export const postingKindEnum = pgEnum("posting_kind", [
  "GOVERNMENT",
  "PRIVATE",
]);

// Unified lifecycle stage. Government recruitments move through the
// notification->result pipeline; private postings use the ACTIVE/FILLED/
// CLOSED subset. One enum keeps the timeline table and canonical-page
// rendering logic simple across both kinds.
// ── Eligibility rule tree (Layer 2) ─────────────────────────────────────────
// A structured AND/OR rule tree stored in extraContent.eligibilityRules.
// Enables the interactive eligibility checker; cannot be derived from prose.
//
// Leaf node types:
//   qualification: e.g. { qualification: "LLB" }
//   service:       e.g. { service: "state_judicial", min_years: 7 }
//   experience:    e.g. { experience: "law_teaching_or_research", min_years: 5 }
//   practitioner:  e.g. { practitioner: true, min_age: 30, min_years_advocate: 7,
//                          min_years_attorney: 5, combined_min_years: 5 }
//
// Composite node types:
//   all:  all children must be satisfied (AND)
//   any:  at least one child must be satisfied (OR)
export type EligibilityLeaf =
  | { qualification: string }
  | { service: string; min_years: number }
  | { experience: string; min_years: number }
  | { practitioner: true; min_age?: number; min_years_advocate?: number; min_years_attorney?: number; combined_min_years?: number };

export type EligibilityNode =
  | EligibilityLeaf
  | { all: EligibilityNode[] }
  | { any: EligibilityNode[] };

export type EligibilityRules = {
  /** Root of the AND/OR rule tree. */
  rules: EligibilityNode;
  /** Date on which age is computed ("closing_date" or an ISO date string). */
  as_on: "closing_date" | string;
  /** Category-specific age caps: maps category key → max age (years). */
  ageCap?: Record<string, number>;
  /** Overall age cap regardless of relaxation (e.g. 56 for this post). */
  ageCapOverall?: number;
};

// ── Age table (Layer 2) ───────────────────────────────────────────────────────
// Rendered as a category × age-cap matrix. Computed from the notice; values
// that the notice doesn't print explicitly are derived and shown with a note.
export type AgeTableRow = {
  category: string;        // e.g. "UR / EWS", "OBC", "SC"
  baseMax: number;         // base age cap
  pwbdRelaxation?: number; // additional years for PwBD
  pwbdMax?: number;        // base + PwBD (shown in table)
  note?: string;           // e.g. "derived — not printed in notice"
};

// ── Reservation / vacancy matrix (Layer 2) ───────────────────────────────────
export type ReservationMatrix = {
  rows: {
    post?: string;          // omit when the notice covers a single post
    ur: number; ews: number; obc: number; sc: number; st: number;
    total: number;
    pwbdHorizontal?: number;
    pwbdCategory?: string;  // e.g. "B/LV" (blindness / low vision)
  }[];
  sourcePage?: number;
};

// ── PwBD suitability matrix (Layer 2) ────────────────────────────────────────
export type PwbdMatrix = {
  suitable: string[];     // disability codes, e.g. ["B","LV","D","HH","BL","BA"]
  notSuitable: string[];  // e.g. ["BH","MDy","SD"]
  sourcePage?: number;
};

// ── Document checklist (Layer 2) ─────────────────────────────────────────────
export type DocumentChecklistItem = {
  text: string;
  textHi?: string;
  /** Which applicant categories need this document. Omit = all. */
  requiredFor?: string[];  // e.g. ["SC","ST","OBC","EWS","PwBD"]
  required: boolean;       // false = advisory / recommended
};

// ── Exam pattern (Layer 2) ───────────────────────────────────────────────────
export type ExamPattern = {
  stages: {
    name: string;         // e.g. "Recruitment Test", "Interview"
    marks: number;
    duration?: string;    // e.g. "2 hours"
    minMarks?: Record<string, number>; // category → min qualifying marks
    mode?: string;        // e.g. "CBT", "Offline", "In-person"
  }[];
  sourcePage?: number;
};

// ── Important links (Layer 2) ────────────────────────────────────────────────
// Links to official pages only — no aggregators.
export type ImportantLink = {
  label: string;
  labelHi?: string;
  url: string;
  linkType: "apply" | "notification" | "admit_card" | "result" | "answer_key" | "cut_off" | "syllabus" | "other";
};

// ── Evidence clause (Layer 3) ────────────────────────────────────────────────
// Anything unusual that doesn't fit a typed module.
// Stored verbatim; shown on the page as a sourced quote.
export type EvidenceClause = {
  label: string;          // e.g. "Bond service obligation"
  text: string;           // exact wording from the notice
  sourcePage: number;
  sourceTextSpan?: string; // short identifying excerpt
};

// ── Provenance (Layer 3) ─────────────────────────────────────────────────────
// Field-level sourcing shown as "Source: official notice, page X".
export type FieldProvenance = {
  sourcePage: number;
  sourceTextSpan?: string;
  confidence: "high" | "medium" | "low";
  extractedAt?: string;   // ISO date
};

export type ExtraContent = {
  /**
   * Qualitative differentiators shown as chip pills below the title.
   * Use for things like "PhD required", "Research experience", "5 departments".
   * Do NOT duplicate numeric facts already in the stats grid (vacancies, salary, deadline).
   */
  highlights?: { icon: string; text: string; textHi?: string }[];
  /** Eligibility as grouped checklist — renders instead of prose `eligibility` field when present. */
  checklist?: {
    heading: string;
    headingHi?: string;
    /** Criteria items — never includes a met/unmet flag; this system describes criteria only. */
    items: { text: string; textHi?: string }[];
  }[];
  /** Numbered application steps (How to Apply). */
  steps?: { step: number; title: string; titleHi?: string; body: string; bodyHi?: string }[];
  /** Selection process stages shown as a numbered list. */
  selectionProcess?: { step: number; title: string; titleHi?: string; body?: string; bodyHi?: string }[];
  /** Payment / bank details shown as a copy-friendly card. */
  bankDetails?: { label: string; labelHi?: string; value: string; valueHi?: string }[];
  tables?: {
    title: string;
    titleHi?: string;
    headers: string[];
    headersHi?: string[];
    rows: string[][];
    rowsHi?: string[][];
  }[];
  notices?: { title: string; titleHi?: string; body: string; bodyHi?: string }[];
  faqs?: { q: string; a: string; qHi?: string; aHi?: string }[];
  /**
   * Source and verification metadata for transparency.
   * sourceName: e.g. "FreeJobAlert", "Official Notification"
   * sourceType: "aggregator" | "official" — drives the verification label
   * advertisementNo: the official advertisement/notification number
   * lastChecked: ISO date string
   */
  sourceVerification?: {
    sourceName?: string;
    sourceType?: "aggregator" | "official";
    advertisementNo?: string;
    lastChecked?: string;
  };
  /**
   * Per-posting SEO overrides. When present, these replace the auto-generated
   * meta title / description for this posting only. Useful for postings where
   * the computed title is too long or missing key facts (vacancy count, deadline).
   */
  seo?: {
    title?: string;
    description?: string;
    /** Compact age display for the stats grid, e.g. "40 (UR/EWS) · 43 (OBC) · 45 (SC)" */
    ageDisplay?: string;
  };

  // ── Layer 2: typed optional modules ─────────────────────────────────────────
  // Add a module only when the notice contains that kind of data.

  /**
   * Structured AND/OR eligibility rule tree.
   * Powers the interactive eligibility checker.
   * When present, replaces the prose `eligibility` field and the `checklist` groups
   * for the machine-readable path; `checklist` may still be set for the readable display.
   */
  eligibilityRules?: EligibilityRules;

  /**
   * Category-wise age cap table, including PwBD relaxation.
   * Rendered as a compact matrix in the Q3 section.
   * Values not stated explicitly in the notice are derived and flagged with a note.
   */
  ageTable?: AgeTableRow[];

  /**
   * Reservation / vacancy matrix broken down by category.
   * Must sum to the total vacancy count (validated at ingest).
   */
  reservationMatrix?: ReservationMatrix;

  /**
   * PwBD disability codes — suitable and not-suitable.
   * Shown as a two-column list under "Eligibility Criteria".
   */
  pwbdMatrix?: PwbdMatrix;

  /**
   * Category-aware document checklist.
   * Shown in Q3 with required-for filters so each applicant sees their own list.
   */
  documentChecklist?: DocumentChecklistItem[];

  /**
   * Exam pattern: stages, marks, duration, and minimum qualifying marks by category.
   * Shown in Q4 alongside the selection-process steps.
   */
  examPattern?: ExamPattern;

  /**
   * Interview minimum marks by category (shorthand when only the interview info is known).
   * Superseded by examPattern.stages[n].minMarks when both are present.
   */
  interviewMinMarks?: Record<string, number>; // e.g. { UR: 50, OBC: 45, "SC/ST/PH": 40 }

  /**
   * Official links only (apply portal, notification PDF, admit card, result).
   * No aggregator URLs. Shown in Q5 / "Important Links" section.
   */
  importantLinks?: ImportantLink[];

  // ── Layer 3: evidence-backed clauses ─────────────────────────────────────────
  // For unusual or one-off rules that don't fit any typed module.
  // Stored verbatim; shown on the page as a sourced quote with page reference.

  /** Unusual rules, conditions, and obligations verbatim from the notice. */
  evidenceClauses?: EvidenceClause[];

  /**
   * Field-level provenance for core Layer-1 facts.
   * Keys match column names on the posting or well-known extraContent keys.
   * Shown as "Source: official notice, page N" next to the relevant field.
   */
  provenance?: Record<string, FieldProvenance>;
};

export const postingStageEnum = pgEnum("posting_stage", [
  "NOTIFICATION_OUT",
  "APPLICATION_OPEN",
  "APPLICATION_CLOSED",
  "ADMIT_CARD_RELEASED",
  "EXAM_SCHEDULED",
  "EXAM_CONDUCTED",
  "ANSWER_KEY_OUT",
  "OBJECTION_WINDOW",
  "RESULT_OUT",
  "MERIT_LIST_OUT",
  "INTERVIEW_SCHEDULED",
  "FINAL_RESULT_OUT",
  "ACTIVE",
  "FILLED",
  "CLOSED",
]);

// Moderation state for ingested postings. Manually-created rows default to
// APPROVED; auto-ingested rows land as PENDING (or APPROVED above a confidence
// threshold). Public pages only show APPROVED.
export const reviewStatusEnum = pgEnum("review_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const employmentTypeEnum = pgEnum("employment_type", [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACTOR",
  "INTERN",
  "TEMPORARY",
  "OTHER",
  // Extended values — added in migration add_employment_type_values (2026-10-06).
  // These already exist in the DB enum; declared here so Drizzle types are accurate.
  "APPRENTICESHIP",
  "DEPUTATION",
  "FELLOWSHIP",
  "INTERNSHIP",
  "PERMANENT",
]);

export const workplaceTypeEnum = pgEnum("workplace_type", [
  "REMOTE",
  "HYBRID",
  "ONSITE",
]);

export const salaryPeriodEnum = pgEnum("salary_period", [
  "HOUR",
  "DAY",
  "WEEK",
  "MONTH",
  "YEAR",
]);

export const articleTypeEnum = pgEnum("article_type", [
  "GUIDE",
  "SYLLABUS",
  "EXAM_PATTERN",
  "PREVIOUS_PAPERS",
  "ADMIT_CARD_GUIDE",
  "RESULT_GUIDE",
  "CUTOFF",
  "SALARY_REPORT",
  "INTERVIEW_PREP",
  "COMPARISON",
  "NEWS",
  "COMPANY_REVIEW",
]);

export const articleStatusEnum = pgEnum("article_status", [
  "DRAFT",
  "PUBLISHED",
]);

// ---------- Organizations (govt bodies + private companies) ----------

// Row-level security is on for every table (SEC-001, ledger A-022): the
// public database roles have no access at all, and the application connects
// as the owning role, which is exempt. `.enableRLS()` below states that
// contract in the application schema; the migration that enforces it is in
// supabase/migrations/.
export const organizations = pgTable(
  "organizations",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    sector: orgSectorEnum("sector").notNull().default("PRIVATE"),
    // Indian state name, for GOVERNMENT_STATE orgs (drives state hub pages).
    state: varchar("state", { length: 80 }),
    logoUrl: text("logo_url"),
    websiteUrl: text("website_url"),
    description: text("description"),
    // Hindi translations
    nameHi: varchar("name_hi", { length: 200 }),
    descriptionHi: text("description_hi"),
    headquarters: varchar("headquarters", { length: 160 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("organizations_slug_idx").on(table.slug)],
).enableRLS();

// ---------- Commissions (SSC, UPSC, Banking, Railways, etc.) ----------

export const commissions = pgTable(
  "commissions",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    // Hindi translations
    nameHi: varchar("name_hi", { length: 160 }),
    description: text("description"),
    descriptionHi: text("description_hi"),
    color: varchar("color", { length: 7 }).default("#000000"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("commissions_slug_idx").on(table.slug)],
).enableRLS();

// ---------- Exams (CGL, CHSL, MTS under SSC; IAS, IPS under UPSC; etc.) ----------

export const exams = pgTable(
  "exams",
  {
    id: serial("id").primaryKey(),
    commissionId: integer("commission_id")
      .notNull()
      .references(() => commissions.id),
    slug: varchar("slug", { length: 80 }).notNull(),
    label: varchar("label", { length: 160 }).notNull(),
    // Hindi translations
    labelHi: varchar("label_hi", { length: 160 }),
    description: text("description"),
    descriptionHi: text("description_hi"),
    eligibility: text("eligibility"),
    eligibilityHi: text("eligibility_hi"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("exams_slug_idx").on(table.slug),
    index("exams_commission_idx").on(table.commissionId),
  ],
).enableRLS();

// ---------- Categories (role / sector / state taxonomy for hub pages) ----------

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    // Hindi translations
    nameHi: varchar("name_hi", { length: 160 }),
    description: text("description"),
    descriptionHi: text("description_hi"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("categories_slug_idx").on(table.slug)],
).enableRLS();

// ---------- Locations (flat state/UT/national reference list) ----------
//
// Verified against live information_schema: the table is a flat list keyed
// by (name, slug, type) — not the state/district/city hierarchy with
// stateCode/stateName/latitude/longitude/hierarchyPath/updatedAt columns
// this file used to declare. Those columns don't exist in the live DB; the
// declaration had drifted (same class of bug as the pre-rewrite postings
// writer), it just happened not to break a build until something tried to
// insert against the real columns. Hindi name columns exist per level
// (state/district/city) for when the table grows district/city rows; today
// only state/UT/national rows exist, so only stateNameHi is populated.
// `type` is plain varchar at the DB level (not a Postgres enum) — verified
// against information_schema — so it's typed here as a TS string union
// instead of pgEnum, which would assert a DB-level enum that doesn't exist.
export const locations = pgTable(
  "locations",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    type: varchar("type", { length: 60 })
      .notNull()
      .$type<"state" | "union_territory" | "national">(),
    stateNameHi: varchar("state_name_hi", { length: 80 }),
    districtNameHi: varchar("district_name_hi", { length: 100 }),
    cityNameHi: varchar("city_name_hi", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("locations_slug_idx").on(table.slug),
    index("locations_type_idx").on(table.type),
  ],
).enableRLS();

// ---------- Postings (the permanent canonical entity) ----------

export const postings = pgTable(
  "postings",
  {
    id: serial("id").primaryKey(),
    // Permanent, never reused, never mutated once published.
    slug: varchar("slug", { length: 220 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    kind: postingKindEnum("kind").notNull().default("GOVERNMENT"),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    // Link to specific exam (e.g. SSC CGL, SSC CHSL). Replaces regex inference.
    // Nullable to support existing postings and gradual migration.
    examId: integer("exam_id").references(() => exams.id),
    // Multiple post/role names under one recruitment notification
    // (e.g. ["Assistant Section Officer", "Inspector"]).
    postNames: jsonb("post_names").$type<string[]>().default([]),
    description: text("description").notNull(),
    eligibility: text("eligibility"),
    responsibilities: text("responsibilities"),
    requirements: text("requirements"),

    // Hindi translations (nullable, populated via background job or Claude API)
    titleHi: varchar("title_hi", { length: 220 }),
    descriptionHi: text("description_hi"),
    eligibilityHi: text("eligibility_hi"),
    responsibilitiesHi: text("responsibilities_hi"),
    requirementsHi: text("requirements_hi"),
    ageRelaxationNotesHi: text("age_relaxation_notes_hi"),
    locationCityHi: varchar("location_city_hi", { length: 120 }),

    // Language default for this posting (en or hi)
    languageDefault: varchar("language_default", { length: 10 }).default("en"),

    totalVacancies: integer("total_vacancies"),
    ageLimitMin: integer("age_limit_min"),
    ageLimitMax: integer("age_limit_max"),
    ageRelaxationNotes: text("age_relaxation_notes"),
    // A-076: optional structured page content (tables, notices, FAQs); see ExtraContent.
    extraContent: jsonb("extra_content").$type<ExtraContent | null>(),
    applicationFeeGeneral: integer("application_fee_general"),
    applicationFeeReserved: integer("application_fee_reserved"),

    employmentType: employmentTypeEnum("employment_type")
      .notNull()
      .default("FULL_TIME"),
    workplaceType: workplaceTypeEnum("workplace_type")
      .notNull()
      .default("ONSITE"),
    locationCity: varchar("location_city", { length: 120 }),
    locationRegion: varchar("location_region", { length: 120 }),
    // State hub pages: slug from src/lib/states/states.ts; NULL = national or unresolved.
    stateSlug: varchar("state_slug", { length: 120 }),
    locationCountry: varchar("location_country", { length: 120 }).default(
      "India",
    ),

    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryCurrency: varchar("salary_currency", { length: 8 }).default("INR"),
    salaryPeriod: salaryPeriodEnum("salary_period").default("MONTH"),

    seniorityLevel: varchar("seniority_level", { length: 60 }),
    skills: jsonb("skills").$type<string[]>().default([]),

    officialNotificationUrl: text("official_notification_url"),
    applyUrl: text("apply_url"),

    currentStage: postingStageEnum("current_stage")
      .notNull()
      .default("NOTIFICATION_OUT"),

    // First publish date — immutable, used as JobPosting.datePosted.
    datePosted: timestamp("date_posted", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Application deadline / validThrough for JobPosting schema.
    validThrough: timestamp("valid_through", { withTimezone: true }),
    examDate: timestamp("exam_date", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),

    viewCount: integer("view_count").notNull().default(0),

    // --- Provenance & moderation (ingestion pipeline) ---
    // Manual admin entries: source = 'manual', review_status = 'APPROVED'.
    // Ingested entries carry their source + stable external id for dedup.
    source: varchar("source", { length: 60 }).notNull().default("manual"),
    externalId: varchar("external_id", { length: 200 }),
    sourceUrl: text("source_url"),
    // Every portal this posting was seen on (multi-portal provenance).
    sourcePortals: jsonb("source_portals").$type<string[]>().notNull().default([]),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }),
    confidence: integer("confidence"),
    reviewStatus: reviewStatusEnum("review_status")
      .notNull()
      .default("APPROVED"),

    // Real FKs onto the provenance layer (sources/sourceDocuments, declared
    // further down this file) — these existed on the live table before this
    // pass but were never declared here, so write-postings-v2.ts's attempt
    // to persist them was silently a no-op (Drizzle only writes columns it
    // knows about). Verified against live information_schema.
    sourceId: integer("source_id").references(() => sources.id),
    sourceDocumentId: integer("source_document_id").references(
      () => sourceDocuments.id,
    ),

    // --- Editorial/publishing workflow (pre-existing, not driven by the
    // ingestion pipeline rewritten this session — restored here after being
    // found live on information_schema; see publishing-queries.ts) ---
    dataCompletenessStatus: varchar("data_completeness_status", {
      length: 40,
    }),
    publishingStatus: varchar("publishing_status", { length: 40 }),
    verificationStatus: varchar("verification_status", { length: 40 }),
    flaggedForReview: boolean("flagged_for_review"),
    reviewNotes: text("review_notes"),
    // Live column (default false) maintained by refresh_recruitment_lifecycle(); declared here so the
    // public listing queries can honour it (WP-001 readiness R8).
    isExpired: boolean("is_expired").default(false),
    sourceConfidence: smallint("source_confidence"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),

    // Resolution onto the canonical entity layer (recruitments/posts,
    // declared further down this file). Set by the resolver in
    // src/ingest/resolve.ts using a real identity key, not kept here as a
    // bare unvalidated integer the way it was before this file was unified.
    inferredRecruitmentId: integer("inferred_recruitment_id").references(
      () => recruitments.id,
    ),
    inferredPostId: integer("inferred_post_id").references(() => posts.id),
    confidenceScore: integer("confidence_score"),
    isCanonical: boolean("is_canonical").default(false),
    canonicalSlug: varchar("canonical_slug", { length: 220 }),
    status: varchar("status", { length: 20 }).default("ACTIVE"),

    // --- Content Quality Gate (SEO/indexability) ---
    // Computed by src/lib/content-quality/gate.ts. 'A' = indexable (sitemap +
    // JobPosting markup eligible), 'B' = public but not indexed (incomplete,
    // enrichment candidate), 'C' = not published as a standalone page
    // (non-job content, duplicate, or stale/expired-while-marked-open).
    indexTier: varchar("index_tier", { length: 1 }).notNull().default("C"),
    qualityMissing: jsonb("quality_missing").$type<string[]>().notNull().default([]),
    qualityEvaluatedAt: timestamp("quality_evaluated_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // PQ-004: last meaningful change to reader-visible facts; sitemap lastmod =
    // coalesce(contentChangedAt, updatedAt). Nullable, additive. Migration first, then code.
    contentChangedAt: timestamp("content_changed_at", { withTimezone: true }),

    // Deliberately NOT declared here, though they're real live columns
    // (verified against information_schema): official_application_url,
    // source_type, is_expired, expiration_reason, expired_at, search_text
    // (tsvector — not a plain Drizzle column type), announcement_state,
    // closing_state, urgency_score, days_to_closing. Nothing in this
    // session's pipeline or restored code reads/writes them, and guessing
    // their intended semantics wrong would be worse than leaving them out —
    // add them with real usage when something actually needs them.
  },
  (table) => [
    uniqueIndex("postings_slug_idx").on(table.slug),
    index("postings_org_idx").on(table.organizationId),
    index("postings_exam_idx").on(table.examId),
    index("postings_stage_idx").on(table.currentStage),
    index("postings_kind_idx").on(table.kind),
    index("postings_review_idx").on(table.reviewStatus),
    // Phase 3: v2 linkage indexes
    index("postings_inferred_recruitment_idx").on(table.inferredRecruitmentId),
    index("postings_inferred_post_idx").on(table.inferredPostId),
    index("postings_status_idx").on(table.status),
    index("postings_confidence_idx").on(table.confidenceScore),
    // Dedup key for ingestion upserts. Partial unique (external_id can be
    // null for manual rows, which are excluded from the constraint).
    uniqueIndex("postings_source_external_idx")
      .on(table.source, table.externalId)
      .where(sql`${table.externalId} is not null`),
    // Read-path + search indexes.
    index("postings_date_posted_idx").on(table.datePosted),
    index("postings_valid_through_idx").on(table.validThrough),
    index("postings_fts_idx").using(
      "gin",
      sql`to_tsvector('english', coalesce(${table.title}, '') || ' ' || coalesce(${table.description}, ''))`,
    ),
  ],
).enableRLS();

// Timeline of lifecycle events on a posting's canonical page. Each row is
// both a UI timeline entry and a fresh-content signal on an otherwise
// permanent URL (notification -> admit card -> result, etc.)
export const postingUpdates = pgTable(
  "posting_updates",
  {
    id: serial("id").primaryKey(),
    postingId: integer("posting_id")
      .notNull()
      .references(() => postings.id, { onDelete: "cascade" }),
    stage: postingStageEnum("stage").notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    // Hindi translations
    titleHi: varchar("title_hi", { length: 220 }),
    description: text("description"),
    descriptionHi: text("description_hi"),
    eventDate: timestamp("event_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    linkUrl: text("link_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("posting_updates_posting_idx").on(table.postingId)],
).enableRLS();

export const postingCategories = pgTable(
  "posting_categories",
  {
    postingId: integer("posting_id")
      .notNull()
      .references(() => postings.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("posting_categories_pk").on(
      table.postingId,
      table.categoryId,
    ),
  ],
).enableRLS();

// ---------- Articles ----------

export const articles = pgTable(
  "articles",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 220 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    // Hindi translations
    titleHi: varchar("title_hi", { length: 220 }),
    dek: text("dek"),
    dekHi: text("dek_hi"),
    body: text("body").notNull(),
    bodyHi: text("body_hi"),
    type: articleTypeEnum("type").notNull().default("GUIDE"),
    authorName: varchar("author_name", { length: 120 }),
    coverImageUrl: text("cover_image_url"),
    status: articleStatusEnum("status").notNull().default("DRAFT"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("articles_slug_idx").on(table.slug)],
).enableRLS();

export const postingArticles = pgTable(
  "posting_articles",
  {
    postingId: integer("posting_id")
      .notNull()
      .references(() => postings.id, { onDelete: "cascade" }),
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    relationType: varchar("relation_type", { length: 60 })
      .notNull()
      .default("RELATED"),
  },
  (table) => [
    uniqueIndex("posting_articles_pk").on(table.postingId, table.articleId),
  ],
).enableRLS();

export const articleCategories = pgTable(
  "article_categories",
  {
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("article_categories_pk").on(
      table.articleId,
      table.categoryId,
    ),
  ],
).enableRLS();

// ---------- Relations ----------

export const commissionsRelations = relations(commissions, ({ many }) => ({
  exams: many(exams),
}));

export const examsRelations = relations(exams, ({ one, many }) => ({
  commission: one(commissions, {
    fields: [exams.commissionId],
    references: [commissions.id],
  }),
  postings: many(postings),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  postings: many(postings),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  postingCategories: many(postingCategories),
  articleCategories: many(articleCategories),
}));

// `locations` has no postings relation: postings store location as free-text
// (locationCity/locationRegion/locationCountry), not a locations FK — that
// column never existed on the live table (see the comment above `postings`
// for how this was found). `locations` is only referenced by `vacancies`,
// in the canonical layer below.
export const locationsRelations = relations(locations, ({ many }) => ({
  vacancies: many(vacancies),
}));

// Note: no `source`/`sourceDocument` entries here even though
// postings.sourceId/sourceDocumentId are real FKs — `sources` and
// `sourceDocuments` are declared later in this file (the canonical entity
// layer, below), and relations() callbacks run eagerly at module-eval time,
// so referencing them here would hit a temporal-dead-zone ReferenceError.
// The FK columns themselves (declared with a lazy `.references(() => ...)`
// arrow, safe regardless of declaration order) are enough for querying via
// `eq(postings.sourceId, ...)`; a relational `with: { source: true }`
// accessor can be added once this file's declaration order is cleaned up.
export const postingsRelations = relations(postings, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [postings.organizationId],
    references: [organizations.id],
  }),
  exam: one(exams, {
    fields: [postings.examId],
    references: [exams.id],
  }),
  updates: many(postingUpdates),
  postingCategories: many(postingCategories),
  postingArticles: many(postingArticles),
}));

export const postingUpdatesRelations = relations(postingUpdates, ({ one }) => ({
  posting: one(postings, {
    fields: [postingUpdates.postingId],
    references: [postings.id],
  }),
}));

export const postingCategoriesRelations = relations(
  postingCategories,
  ({ one }) => ({
    posting: one(postings, {
      fields: [postingCategories.postingId],
      references: [postings.id],
    }),
    category: one(categories, {
      fields: [postingCategories.categoryId],
      references: [categories.id],
    }),
  }),
);

export const articlesRelations = relations(articles, ({ many }) => ({
  postingArticles: many(postingArticles),
  articleCategories: many(articleCategories),
}));

export const postingArticlesRelations = relations(
  postingArticles,
  ({ one }) => ({
    posting: one(postings, {
      fields: [postingArticles.postingId],
      references: [postings.id],
    }),
    article: one(articles, {
      fields: [postingArticles.articleId],
      references: [articles.id],
    }),
  }),
);

export const articleCategoriesRelations = relations(
  articleCategories,
  ({ one }) => ({
    article: one(articles, {
      fields: [articleCategories.articleId],
      references: [articles.id],
    }),
    category: one(categories, {
      fields: [articleCategories.categoryId],
      references: [categories.id],
    }),
  }),
);

// =====================================================================
// Canonical entity layer: Organization -> Recruitment -> Post -> Vacancy/
// Eligibility, plus the provenance tables (sources/sourceDocuments) and
// reference tables (qualifications/positions) feeding it.
//
// This used to live in a separate schema-v2.ts, maintained by hand
// alongside this file as a second, independent description of the same
// Postgres database. The two drifted: column names didn't match (this
// file's `organizations.websiteUrl` vs. the old file's `website`),
// `recruitments.organizationId`/`examId` were foreign-keyed to orphaned
// `organizations_new`/`exams_new` tables (16/15 rows, dead since an
// earlier migration was never finished) instead of the real tables below,
// and several enum value sets didn't match what Postgres actually had
// (domicile_type in particular — live values are ANY/STATE/DISTRICT/
// UNION_TERRITORY/SPECIFIC, not the ANY/STATE_SPECIFIC/
// UNION_TERRITORY_SPECIFIC/NATIONAL_ONLY the old file declared).
//
// Every table and enum below was checked against live
// information_schema/pg_enum, not copied from either prior file. See
// ARCHITECTURE-REDESIGN.md for the full audit. recruitments/posts/
// positions/eligibilities/vacancies/selection_processes were truncated as
// part of this change — they were populated by a one-off backfill script
// that bulk-matched postings onto hand-authored generic "position family"
// templates (keyword substring matching, not extraction), producing
// cross-organization catch-all buckets. The table shapes were sound; the
// data in them wasn't.
// =====================================================================

export const sourceAuthorityEnum = pgEnum("source_authority", [
  "OFFICIAL", // SSC/UPSC/state-PSC site, etc. — primary source
  "TRUSTED_SECONDARY", // Employment News, a portal republishing an official notice
  "AGGREGATED", // Multiple sources combined, no single authoritative one
]);

export const qualificationLevelEnum = pgEnum("qualification_level", [
  // Extended in ELIG-001 (2026-10-07). Order matches DB enum sort order.
  "BELOW_10TH",
  "SECONDARY",
  "ITI",
  "DIPLOMA",
  "SENIOR_SECONDARY",
  "BACHELOR",
  "MASTER",
  "PROFESSIONAL",
  "PHD",
]);

export const positionCategoryEnum = pgEnum("position_category", [
  "POLICE",
  "ADMINISTRATIVE",
  "BANKING",
  "TEACHING",
  "ENGINEERING",
  "MEDICAL",
  "DEFENCE",
  "RAILWAY",
  "POSTAL",
  "CUSTOMS",
  "TAX",
  "JUDICIAL",
  "LEGAL",
  "PSU",
  "OTHER",
]);

// Live values only — do not add APPLICATION_CLOSED/EXAM_HELD etc. without
// an ALTER TYPE migration first; the old schema-v2.ts declared those and
// they were never applied to the live enum.
export const recruitmentStatusEnum = pgEnum("recruitment_status", [
  "UPCOMING",
  "ACTIVE",
  "RESULTS",
  "ARCHIVED",
]);

// Live values only — EX_SERVICEMAN/PH were declared in the old file but
// never applied live.
export const vacancyCategoryTypeEnum = pgEnum("vacancy_category_type", [
  "GENERAL",
  "SC",
  "ST",
  "OBC",
  "EWS",
]);

// Live values only — OTHERS was declared in the old file but never applied.
export const genderEnum = pgEnum("gender", ["ANY", "MALE", "FEMALE"]);

export const citizenshipEnum = pgEnum("citizenship", ["INDIAN", "ANY"]);

// Live values only — materially different from the old file's declaration
// (ANY/STATE_SPECIFIC/UNION_TERRITORY_SPECIFIC/NATIONAL_ONLY, none of
// which match what's actually in Postgres).
export const domicileTypeEnum = pgEnum("domicile_type", [
  "ANY",
  "STATE",
  "DISTRICT",
  "UNION_TERRITORY",
  "SPECIFIC",
]);

export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  url: text("url").notNull(),
  authority: sourceAuthorityEnum("authority").notNull(),
  isOfficial: boolean("is_official").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const sourceDocuments = pgTable("source_documents", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull().references(() => sources.id),
  sourceUrl: text("source_url"),
  documentType: varchar("document_type", { length: 80 }),
  externalId: varchar("external_id", { length: 200 }),
  contentHash: varchar("content_hash", { length: 64 }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Added alongside this rewrite — the raw capture every extraction step
  // depends on. Declared in the old schema-v2.ts but never actually
  // migrated onto the live table, so nothing was ever persisted here.
  rawContent: text("raw_content"),
  extractedAt: timestamp("extracted_at", { withTimezone: true }),
  extractionMethod: varchar("extraction_method", { length: 80 }),
}).enableRLS();

// ---------- WP-001: observation / candidate boundary ----------
// Added by supabase/migrations/20261004060000_wp_001_observation_candidate_boundary.sql

/** Known aliases of canonical organizations (normalized form is unique). */
export const organizationAliases = pgTable(
  "organization_aliases",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    aliasNormalized: varchar("alias_normalized", { length: 200 }).notNull(),
    aliasRaw: varchar("alias_raw", { length: 300 }),
    source: varchar("source", { length: 80 }).notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("organization_aliases_alias_idx").on(t.aliasNormalized),
    index("organization_aliases_org_idx").on(t.organizationId),
  ],
).enableRLS();

/** "Recognizable but not sufficiently resolved". Not a canonical organization. */
export const organizationCandidates = pgTable(
  "organization_candidates",
  {
    id: serial("id").primaryKey(),
    rawName: varchar("raw_name", { length: 300 }).notNull(),
    normalizedName: varchar("normalized_name", { length: 200 }).notNull(),
    source: varchar("source", { length: 80 }).notNull(),
    sourceUrl: text("source_url"),
    evidence: jsonb("evidence"),
    confidence: smallint("confidence"),
    reason: varchar("reason", { length: 60 }).notNull(),
    proposedOrganizationId: integer("proposed_organization_id").references(() => organizations.id, { onDelete: "set null" }),
    status: varchar("status", { length: 20 }).notNull().default("OPEN"),
    observationCount: integer("observation_count").notNull().default(1),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("organization_candidates_name_source_idx").on(t.normalizedName, t.source)],
).enableRLS();

/** What the source told us at ingestion time. Append-only, one row per distinct content. */
/** Current structured inventory of FreeJobAlert listings; distinct from canonical JobOye postings. */
export const fjaJobInventory = pgTable(
  "fja_job_inventory",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    sourceSlug: text("source_slug").notNull().default("freejobalert"),
    externalId: text("external_id").notNull(),
    sourceUrl: text("source_url").notNull(),
    title: text("title").notNull(),
    organizationName: text("organization_name"),
    listingCategory: text("listing_category"),
    publishedDate: date("published_date"),
    applicationStartDate: date("application_start_date"),
    applicationEndDate: date("application_end_date"),
    advertisementNumber: text("advertisement_number"),
    qualification: text("qualification"),
    vacancyCount: integer("vacancy_count"),
    detailStatus: text("detail_status").notNull().default("PENDING"),
    sourceStatus: text("source_status").notNull().default("UNKNOWN"),
    details: jsonb("details").notNull().default({}),
    rawText: text("raw_text"),
    contentHash: text("content_hash").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastCrawlRunId: text("last_crawl_run_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("fja_job_inventory_source_external_unique").on(t.sourceSlug, t.externalId),
    index("fja_job_inventory_published_date_idx").on(t.publishedDate),
    index("fja_job_inventory_application_end_idx").on(t.applicationEndDate),
    index("fja_job_inventory_category_idx").on(t.listingCategory),
  ],
).enableRLS();

export const fjaPostInventory = pgTable(
  "fja_post_inventory",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    recruitmentInventoryId: bigint("recruitment_inventory_id", { mode: "number" }).notNull().references(() => fjaJobInventory.id, { onDelete: "cascade" }),
    sourceSlug: text("source_slug").notNull().default("freejobalert"),
    externalId: text("external_id").notNull(),
    sourcePostKey: text("source_post_key").notNull(),
    postNameRaw: text("post_name_raw"),
    postNameNormalizedCandidate: text("post_name_normalized_candidate"),
    sourcePostCodeRaw: text("source_post_code_raw"),
    vacancyCountRaw: text("vacancy_count_raw"),
    vacancyCountCandidate: integer("vacancy_count_candidate"),
    qualificationRaw: text("qualification_raw"),
    experienceRaw: text("experience_raw"),
    ageLimitRaw: text("age_limit_raw"),
    ageReferenceDateRaw: text("age_reference_date_raw"),
    ageRelaxationRulesRaw: text("age_relaxation_rules_raw"),
    salaryRaw: text("salary_raw"),
    payLevelRaw: text("pay_level_raw"),
    employmentTypeRaw: text("employment_type_raw"),
    tenureRaw: text("tenure_raw"),
    locationRaw: text("location_raw"),
    dutiesResponsibilitiesRaw: text("duties_responsibilities_raw"),
    eligibilityConditionsRaw: text("eligibility_conditions_raw"),
    milestonesRaw: jsonb("milestones_raw").$type<Array<Record<string, unknown>>>().notNull().default([]),
    applicationSelectionRaw: jsonb("application_selection_raw").$type<Array<Record<string, unknown>>>().notNull().default([]),
    otherInfoRaw: jsonb("other_info_raw").$type<Record<string, unknown>>().notNull().default({}),
    sourceTableRowRaw: jsonb("source_table_row_raw").$type<Record<string, unknown>>(),
    extractionStatus: text("extraction_status").notNull().default("PENDING"),
    officialVerificationStatus: text("official_verification_status").notNull().default("PENDING"),
    contentHash: text("content_hash").notNull(),
    lastCrawlRunId: text("last_crawl_run_id"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("fja_post_inventory_identity_unique").on(t.sourceSlug, t.externalId, t.sourcePostKey),
    index("fja_post_inventory_parent_idx").on(t.recruitmentInventoryId),
    index("fja_post_inventory_name_idx").on(t.postNameRaw),
  ],
).enableRLS();

export const sourceObservations = pgTable(
  "source_observations",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    source: varchar("source", { length: 80 }).notNull(),
    externalId: varchar("external_id", { length: 200 }).notNull(),
    sourceUrl: text("source_url"),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    facts: jsonb("facts").notNull(),
    links: jsonb("links"),
    raw: jsonb("raw"),
    runId: varchar("run_id", { length: 80 }),
    outcome: varchar("outcome", { length: 30 }).notNull().default("RECEIVED"),
    outcomeReason: text("outcome_reason"),
    postingId: integer("posting_id").references(() => postings.id, { onDelete: "set null" }),
    candidateId: integer("candidate_id").references(() => organizationCandidates.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("source_observations_content_idx").on(t.source, t.externalId, t.contentHash),
    index("source_observations_identity_idx").on(t.source, t.externalId, t.observedAt),
    index("source_observations_posting_idx").on(t.postingId),
  ],
).enableRLS();

export const qualifications = pgTable("qualifications", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  level: qualificationLevelEnum("level").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  category: positionCategoryEnum("category").notNull(),
  description: text("description"),
  typicalQualificationId: integer("typical_qualification_id").references(() => qualifications.id),
  typicalAgeMin: smallint("typical_age_min"),
  typicalAgeMax: smallint("typical_age_max"),
  typicalSalaryMin: integer("typical_salary_min"),
  typicalSalaryMax: integer("typical_salary_max"),
  careerPath: jsonb("career_path").$type<Array<{ level: number; title: string }>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

// THE canonical hiring-round entity — one row per actual announced
// recruitment. Identity key for resolution (see src/ingest/resolve.ts):
// (organizationId, officialNotificationNumber) when available, falling
// back to (organizationId, examId, year) + title similarity. Never
// "nearest existing recruitment by substring match" — that's what
// produced the corrupted data this replaces.
export const recruitments = pgTable(
  "recruitments",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").notNull().references(() => organizations.id),
    examId: integer("exam_id").references(() => exams.id),
    year: smallint("year").notNull(),
    name: varchar("name", { length: 220 }).notNull(),
    // Unique at the DB level (recruitments_slug_unique) — confirmed live
    // when resolve.ts hit it on a retried ingestion run; declared here now
    // too so Drizzle's types and any future migration stay honest about it.
    slug: varchar("slug", { length: 220 }).notNull().unique(),
    status: recruitmentStatusEnum("status").notNull().default("UPCOMING"),
    notificationDate: timestamp("notification_date", { withTimezone: true }),
    applicationStartDate: timestamp("application_start_date", { withTimezone: true }),
    applicationEndDate: timestamp("application_end_date", { withTimezone: true }),
    examDate: timestamp("exam_date", { withTimezone: true }),
    resultDate: timestamp("result_date", { withTimezone: true }),
    totalVacancies: integer("total_vacancies"),
    description: text("description"),
    notificationUrl: text("notification_url"),
    // Official notification PDF/page URL from the issuing body's own website.
    // Populated from postings.official_notification_url during ingestion (A-082).
    // 699 of 774 live recruitments have this column populated in the DB.
    officialNotificationUrl: text("official_notification_url"),
    // Official online application portal URL from the issuing body's website.
    // Populated from postings.official_application_url during ingestion (A-082).
    officialApplicationUrl: text("official_application_url"),
    // Employment classification for this recruitment (A-042).
    // FULL_TIME for most permanent Indian govt positions; APPRENTICESHIP,
    // DEPUTATION etc. for the extended enum values added in the same migration.
    employmentType: employmentTypeEnum("employment_type").notNull().default("FULL_TIME"),
    // The real identity-key field. Government recruitments are published
    // with a reference number (e.g. "No. 22/2026-RC") that's far more
    // reliable than matching on year+title. Nullable because not every
    // source captures it, but it's preferred whenever present.
    officialNotificationNumber: varchar("official_notification_number", { length: 200 }),
    // ISO 3166-2:IN state code for JobPosting addressRegion (e.g. IN-RJ).
    // NULL for national-level recruitments (UPSC, SSC, Railway Board etc.)
    // that have no single state. Populated during enrichment. (A-082)
    locationStateCode: varchar("location_state_code", { length: 10 }),
    // Provenance of the official notification/apply link on this recruitment:
    // MANUAL_VERIFIED | AGGREGATOR_DISCOVERED. Null = no link. (A-070)
    officialLinkSource: varchar("official_link_source", { length: 40 }),
    // Official advertisement/notification number as printed in the notice,
    // e.g. "12/2026" for UPSC Advt. No. 12/2026. Used to build the hub-page
    // URL slug and breadcrumb. Nullable — not all sources capture it.
    advertisementNumber: varchar("advertisement_number", { length: 80 }),
    // Enrichment fields from FreeJobAlert source (A-082) - Phase 1 display-text only
    // Format: "SC/ST/PwBD: NIL; All Others: Rs. 500"
    feeNote: text("fee_note"),
    // Application URL from official source (e.g. https://upsc.gov.in/)
    applyUrl: text("apply_url"),
    // Selection process stages (e.g. "CBT → Mains → Interview")
    selectionProcess: text("selection_process"),
    // Age limits and relaxation rules (e.g. "Age limit: 20-28 years; Relaxation for SC/ST...")
    ageNote: text("age_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Mirrors the DB-level partial unique index added in this migration —
    // enforced in Postgres, not just in application code.
    uniqueIndex("recruitments_org_notification_idx")
      .on(table.organizationId, table.officialNotificationNumber)
      .where(sql`${table.officialNotificationNumber} is not null`),
  ],
).enableRLS();

// Mapping of old recruitment slugs to new ones for SEO-preserving 301 redirects.
// Used during slug format migrations (e.g. from long descriptive to enterprise-grade sequential).
// The middleware.ts checks this table to redirect old URLs to new ones.
export const recruitment_slug_redirects = pgTable(
  "recruitment_slug_redirects",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    old_slug: varchar("old_slug", { length: 220 }).notNull().unique(),
    new_slug: varchar("new_slug", { length: 220 }).notNull(),
    recruitment_id: integer("recruitment_id").notNull().references(() => recruitments.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_old_slug").on(table.old_slug),
    index("idx_recruitment_id").on(table.recruitment_id),
  ],
).enableRLS();

// One specific role inside a recruitment — this is where the real job
// title lives (e.g. "Research Associate III"), never the scraped headline.
// Identity key: (recruitmentId, lower(name)), enforced at the DB level.
export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    recruitmentId: integer("recruitment_id").notNull().references(() => recruitments.id, { onDelete: "cascade" }),
    positionId: integer("position_id").notNull().references(() => positions.id),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    description: text("description"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    payLevel: jsonb("pay_level").$type<Record<string, unknown>>(),
    vacancyTotal: integer("vacancy_total"),
    /** FK to the employing organization when it differs from the issuing body (A-080). */
    employingOrganizationId: integer("employing_organization_id").references(() => organizations.id, { onDelete: "set null" }),
    /** Code or serial from the official notification, e.g. "Post Code A", "Sl. No. 3". */
    sourcePostCode: varchar("source_post_code", { length: 100 }),
    // Denormalised vacancy breakdown for the advertisement hub comparison table.
    // Shape mirrors ReservationMatrix.rows[0] from the ExtraContent type.
    // Computed from the vacancies child rows; kept in sync by the ingestion pipeline.
    vacancyDetails: jsonb("vacancy_details").$type<{
      ur: number; ews: number; obc: number; sc: number; st: number;
      total: number;
      pwbdHorizontal?: number; pwbdCategory?: string;
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("posts_recruitment_name_idx").on(table.recruitmentId, sql`lower(${table.name})`),
  ],
).enableRLS();

// Structured eligibility, child of Post — NOT a prose blob. Live FK is
// post_id (the old schema-v2.ts declared positionId, which doesn't exist
// on this table).
export const eligibilities = pgTable("eligibilities", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  qualificationId: integer("qualification_id").references(() => qualifications.id),
  ageMin: smallint("age_min"),
  ageMax: smallint("age_max"),
  experienceYearsMin: smallint("experience_years_min"),
  experienceYearsMax: smallint("experience_years_max"),
  domicileType: domicileTypeEnum("domicile_type"),
  domicileValue: jsonb("domicile_value"),
  physicalRequirements: text("physical_requirements"),
  skillsRequired: jsonb("skills_required").$type<string[]>(),
  citizenship: citizenshipEnum("citizenship"),
  otherConditions: jsonb("other_conditions"),
  // PQ-006 additions (A-080) — structured fields for leaf pages
  ageAsOnDate: date("age_as_on_date"),
  qualificationText: text("qualification_text"),
  qualificationExpr: jsonb("qualification_expr"),
  /** Google's educationRequirements credentialCategory — one of five values or null. */
  educationCategory: varchar("education_category", { length: 50 }),
  experienceText: text("experience_text"),
  /** PENDING (extracted, awaiting review) or VERIFIED (checked against official notice). */
  status: varchar("status", { length: 20 }).notNull().default("PENDING"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),

  // ELIG-001 additions (2026-10-07) — normalized eligibility model.
  // Architectural invariant: qualificationExpr is canonical; flat columns
  // below are query/index projections that must never contradict it.

  /** Typed education level — normalized projection from qualificationExpr. */
  educationLevel: qualificationLevelEnum("education_level"),
  /** Discipline strings from qualificationExpr; implicit OR between elements. ["Any"] = no restriction. */
  disciplines: text("disciplines").array(),
  /** Role of this requirement: MINIMUM (must meet) or PREFERRED (scored higher). */
  qualificationStatus: varchar("qualification_status", { length: 20 }),
  /** Minimum percentage marks threshold (e.g. 70.0 for "70% or above"). */
  minMarksPct: text("min_marks_pct"), // stored as numeric(5,2) in DB
  /** Minimum CGPA threshold (e.g. 7.5 for "CGPA 7.5 or above"). */
  minCgpa: text("min_cgpa"), // stored as numeric(4,2) in DB
  /** Earliest passing year accepted (from qualificationExpr.passingYears). */
  passingYearMin: smallint("passing_year_min"),
  /** Latest passing year accepted (from qualificationExpr.passingYears). */
  passingYearMax: smallint("passing_year_max"),

  // Provenance: where the eligibility fact came from and how it was derived.
  /** OFFICIAL_NOTIFICATION | AGGREGATOR | INFERRED */
  sourceType: varchar("source_type", { length: 30 }),
  /** URL or document ID of the source. */
  sourceRef: text("source_ref"),
  /** Section/page/paragraph within the source document. */
  sourceLocator: text("source_locator"),
  /** DIRECT (verbatim) | NORMALIZED (structured from text) | INFERRED (context only). */
  derivation: varchar("derivation", { length: 20 }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const selectionProcessTypeEnum = pgEnum("selection_process_type", [
  "EXAM",
  "DIRECT",
  "INTERVIEW",
  "PHYSICAL_TEST",
  "SKILL_TEST",
  "MERIT",
  "MEDICAL",
  "DOCUMENT_VERIFICATION",
  "HYBRID",
]);

export const selectionProcesses = pgTable("selection_processes", {
  id: serial("id").primaryKey(),
  recruitmentId: integer("recruitment_id").notNull().references(() => recruitments.id, { onDelete: "cascade" }),
  processType: selectionProcessTypeEnum("process_type").notNull(),
  stages: jsonb("stages").$type<string[]>(),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const vacancies = pgTable("vacancies", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  locationId: integer("location_id").references(() => locations.id),
  categoryType: vacancyCategoryTypeEnum("category_type").notNull(),
  gender: genderEnum("gender"),
  count: integer("count").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

// ── PQ-006 new tables (A-080) ─────────────────────────────────────────────────

/** Per-category age caps for a Post (UR, OBC, SC, ST, EWS, PwBD, ExSM, Govt). */
export const postAgeRules = pgTable("post_age_rules", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 50 }).notNull(),
  maxAge: smallint("max_age"),
  relaxationYears: smallint("relaxation_years"),
  note: text("note"),
  // ELIG-001 additions (2026-10-07).
  /**
   * Machine-readable classification of this age rule.
   * ARITHMETIC     = base + relaxation_years = effective max
   * GOVT_ORDER     = "as per Govt. rules" — no arithmetic; requires external lookup
   * NO_UPPER_LIMIT = explicitly no upper age limit
   * ABSOLUTE_CEILING = maximum that cannot be exceeded even with relaxation
   */
  ruleType: varchar("rule_type", { length: 30 }),
  /** Human-readable condition for this rule (e.g. "Ex-serviceman with min 6 years service"). */
  conditionText: text("condition_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

/** Category-wise application fee for a Recruitment (General, OBC, SC/ST, EWS, PwBD, All). */
export const recruitmentFees = pgTable("recruitment_fees", {
  id: serial("id").primaryKey(),
  recruitmentId: integer("recruitment_id").notNull().references(() => recruitments.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 50 }).notNull(),
  amount: integer("amount"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

/** Normalised alias → Position mapping for the title-match resolver. */
export const positionAliases = pgTable("position_aliases", {
  id: serial("id").primaryKey(),
  positionId: integer("position_id").notNull().references(() => positions.id, { onDelete: "cascade" }),
  alias: varchar("alias", { length: 300 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

/** Provenance evidence linking a VERIFIED field value to a source document excerpt. */
export const evidence = pgTable("evidence", {
  id: serial("id").primaryKey(),
  sourceDocumentId: integer("source_document_id"),
  subjectType: varchar("subject_type", { length: 50 }).notNull(),
  subjectId: integer("subject_id").notNull(),
  field: varchar("field", { length: 100 }).notNull(),
  excerpt: text("excerpt").notNull(),
  pageRef: varchar("page_ref", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

// ── Relations for PQ-006 tables ───────────────────────────────────────────────

export const postAgeRulesRelations = relations(postAgeRules, ({ one }) => ({
  post: one(posts, { fields: [postAgeRules.postId], references: [posts.id] }),
}));

export const recruitmentFeesRelations = relations(recruitmentFees, ({ one }) => ({
  recruitment: one(recruitments, { fields: [recruitmentFees.recruitmentId], references: [recruitments.id] }),
}));

export const positionAliasesRelations = relations(positionAliases, ({ one }) => ({
  position: one(positions, { fields: [positionAliases.positionId], references: [positions.id] }),
}));

export const sourcesRelations = relations(sources, ({ many }) => ({
  documents: many(sourceDocuments),
}));

export const sourceDocumentsRelations = relations(sourceDocuments, ({ one }) => ({
  source: one(sources, { fields: [sourceDocuments.sourceId], references: [sources.id] }),
}));

export const positionsRelations = relations(positions, ({ one, many }) => ({
  typicalQualification: one(qualifications, {
    fields: [positions.typicalQualificationId],
    references: [qualifications.id],
  }),
  posts: many(posts),
}));

export const recruitmentsRelations = relations(recruitments, ({ one, many }) => ({
  organization: one(organizations, { fields: [recruitments.organizationId], references: [organizations.id] }),
  exam: one(exams, { fields: [recruitments.examId], references: [exams.id] }),
  posts: many(posts),
  selectionProcesses: many(selectionProcesses),
  fees: many(recruitmentFees),
  slugRedirects: many(recruitment_slug_redirects),
}));

export const selectionProcessesRelations = relations(selectionProcesses, ({ one }) => ({
  recruitment: one(recruitments, { fields: [selectionProcesses.recruitmentId], references: [recruitments.id] }),
}));

export const recruitment_slug_redirectsRelations = relations(recruitment_slug_redirects, ({ one }) => ({
  recruitment: one(recruitments, { fields: [recruitment_slug_redirects.recruitment_id], references: [recruitments.id] }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  recruitment: one(recruitments, { fields: [posts.recruitmentId], references: [recruitments.id] }),
  position: one(positions, { fields: [posts.positionId], references: [positions.id] }),
  employingOrganization: one(organizations, { fields: [posts.employingOrganizationId], references: [organizations.id] }),
  eligibilities: many(eligibilities),
  vacancies: many(vacancies),
  ageRules: many(postAgeRules),
}));

export const eligibilitiesRelations = relations(eligibilities, ({ one }) => ({
  post: one(posts, { fields: [eligibilities.postId], references: [posts.id] }),
  qualification: one(qualifications, { fields: [eligibilities.qualificationId], references: [qualifications.id] }),
}));

export const vacanciesRelations = relations(vacancies, ({ one }) => ({
  post: one(posts, { fields: [vacancies.postId], references: [posts.id] }),
  location: one(locations, { fields: [vacancies.locationId], references: [locations.id] }),
}));
