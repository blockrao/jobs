import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  timestamp,
  pgEnum,
  jsonb,
  uniqueIndex,
  index,
  boolean,
  smallint,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ========== ENUMS ==========

// Organization roles in the employment ecosystem
export const organizationRoleEnum = pgEnum("organization_role", [
  "EXAM_AUTHORITY",     // SSC, UPSC, RRB, IBPS, State PSCs (conduct exams)
  "RECRUITING_BODY",    // CRPF, BSF, CISF, ITBP (manage recruitment)
  "EMPLOYER",           // Departments, agencies (actually employ)
]);

// Selection process types (how candidates are selected)
export const selectionProcessTypeEnum = pgEnum("selection_process_type", [
  "EXAM",                      // Written examination
  "DIRECT",                    // Direct recruitment (merit-based)
  "INTERVIEW",                 // Interview only
  "PHYSICAL_TEST",             // Physical fitness test
  "SKILL_TEST",                // Skill-based assessment
  "MERIT",                     // Merit list/marks based
  "MEDICAL",                   // Medical examination
  "DOCUMENT_VERIFICATION",     // Document verification
  "HYBRID",                    // Multiple stages (mixed types)
]);

// Recruitment lifecycle states
export const recruitmentStatusEnum = pgEnum("recruitment_status", [
  "UPCOMING",                  // Notification expected/announced
  "ACTIVE",                    // Application window open
  "APPLICATION_CLOSED",        // Applications closed, processing underway
  "EXAM_HELD",                 // Exam has been conducted
  "RESULTS",                   // Results announced
  "ARCHIVED",                  // Historical record
]);

// Vacancy segmentation dimensions
export const vacancyCategoryTypeEnum = pgEnum("vacancy_category_type", [
  "GENERAL",
  "SC",                        // Scheduled Caste
  "ST",                        // Scheduled Tribe
  "OBC",                       // Other Backward Class
  "EWS",                       // Economically Weaker Section
  "EX_SERVICEMAN",
  "PH",                        // Person with Disability
]);

export const genderEnum = pgEnum("gender", [
  "ANY",
  "MALE",
  "FEMALE",
  "OTHERS",
]);

// Citizenship eligibility
export const citizenshipEnum = pgEnum("citizenship", [
  "INDIAN",
  "ANY",
]);

// Domicile types
export const domicileTypeEnum = pgEnum("domicile_type", [
  "ANY",
  "STATE_SPECIFIC",
  "UNION_TERRITORY_SPECIFIC",
  "NATIONAL_ONLY",
]);

// Position categories
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

// Source authority levels
export const sourceAuthorityEnum = pgEnum("source_authority", [
  "OFFICIAL",              // SSC website, UPSC website, etc. — primary source
  "TRUSTED_SECONDARY",     // Employment News, recruitment portal republishing official
  "AGGREGATED",            // Multiple sources combined
]);

// Recruitment event types (lifecycle events)
export const recruitmentEventTypeEnum = pgEnum("recruitment_event_type", [
  "NOTIFICATION_PUBLISHED",
  "APPLICATION_OPENED",
  "APPLICATION_DEADLINE_EXTENDED",
  "CORRIGENDUM",
  "VACANCY_REVISED",
  "EXAM_DATE_CHANGED",
  "EXAM_HELD",
  "ADMIT_CARD_RELEASED",
  "ANSWER_KEY_RELEASED",
  "RESULT_DECLARED",
  "FINAL_RESULT",
  "OTHER",
]);

// Qualification levels
export const qualificationLevelEnum = pgEnum("qualification_level", [
  "SECONDARY",                 // 10th
  "SENIOR_SECONDARY",          // 12th
  "BACHELOR",
  "MASTER",
  "PHD",
]);

// Posting status (from scraped sources)
export const postingStatusEnum = pgEnum("posting_status", [
  "ACTIVE",
  "EXPIRED",
  "DUPLICATE",
  "ARCHIVED",
  "LOW_CONFIDENCE_PENDING",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

// ========== REFERENCE TABLES (Evergreen) ==========

export const locations = pgTable(
  "locations",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    type: varchar("type", { length: 60 }).notNull(), // state, union_territory, national, region
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("locations_slug_idx").on(table.slug)],
);

export const qualifications = pgTable(
  "qualifications",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    level: qualificationLevelEnum("level").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("qualifications_slug_idx").on(table.slug)],
);

// ========== PERSISTENT ENTITIES ==========

export const organizations = pgTable(
  "organizations",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    roles: organizationRoleEnum("roles").array().default(sql`'{}'::organization_role[]`),
    website: text("website"),
    logoUrl: text("logo_url"),
    description: text("description"),
    nameHi: varchar("name_hi", { length: 200 }), // Hindi translation
    descriptionHi: text("description_hi"), // Hindi translation
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("organizations_slug_idx").on(table.slug)],
);

// ========== DATA SOURCES (Provenance Layer) ==========

export const sources = pgTable(
  "sources",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    type: varchar("type", { length: 80 }).notNull(), // "official_portal", "employment_news", "aggregator", "scraper"
    baseUrl: text("base_url"),
    authority: sourceAuthorityEnum("authority").notNull().default("AGGREGATED"),
    isOfficial: boolean("is_official").default(false),
    active: boolean("active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("sources_authority_idx").on(table.authority)],
);

export const sourceDocuments = pgTable(
  "source_documents",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    documentType: varchar("document_type", { length: 80 }), // "notification", "corrigendum", "result", etc.
    externalId: varchar("external_id", { length: 200 }), // official reference number
    publishedAt: timestamp("published_at", { withTimezone: true }),
    discoveredAt: timestamp("discovered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    contentHash: varchar("content_hash", { length: 64 }), // SHA-256 of content for dedup
    rawContent: text("raw_content"),
    extractedAt: timestamp("extracted_at", { withTimezone: true }),
    extractionMethod: varchar("extraction_method", { length: 80 }), // "pdf_parser", "html_scraper", "api", etc.
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("source_documents_source_idx").on(table.sourceId),
    index("source_documents_url_idx").on(table.url),
    index("source_documents_content_hash_idx").on(table.contentHash),
  ],
);

export const exams = pgTable(
  "exams",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    shortName: varchar("short_name", { length: 80 }),
    category: varchar("category", { length: 80 }), // e.g., "Phase 1", "Phase 2", "Prelims/Mains"
    frequency: varchar("frequency", { length: 60 }).default("ANNUAL"), // annual, biennial, ad_hoc
    description: text("description"),
    labelHi: varchar("label_hi", { length: 160 }), // Hindi translation of exam name
    descriptionHi: text("description_hi"), // Hindi translation
    eligibilityHi: text("eligibility_hi"), // Hindi translation
    syllabus: text("syllabus"),
    examPattern: text("exam_pattern"),
    stages: jsonb("stages").$type<Array<{ stage: string; type: string }>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("exams_slug_idx").on(table.slug),
    index("exams_organization_idx").on(table.organizationId),
  ],
);

export const positions = pgTable(
  "positions",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    category: positionCategoryEnum("category").notNull(),
    description: text("description"),
    typicalQualificationId: integer("typical_qualification_id").references(
      () => qualifications.id,
    ),
    typicalAgeMin: smallint("typical_age_min"),
    typicalAgeMax: smallint("typical_age_max"),
    typicalSalaryMin: integer("typical_salary_min"),
    typicalSalaryMax: integer("typical_salary_max"),
    careerPath: jsonb("career_path").$type<
      Array<{ level: number; title: string }>
    >(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("positions_slug_idx").on(table.slug),
    index("positions_category_idx").on(table.category),
  ],
);

// ========== TEMPORAL ENTITIES ==========

export const recruitments = pgTable(
  "recruitments",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    examId: integer("exam_id").references(() => exams.id), // optional
    year: smallint("year").notNull(),
    name: varchar("name", { length: 220 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull().unique(),

    // External identity for deduplication
    officialNotificationNumber: varchar("official_notification_number", {
      length: 200,
    }), // e.g., "No. 22/2026-RC"
    externalIdentifiers: jsonb("external_identifiers").$type<
      Record<string, string>
    >(), // {"ssc_ref": "22/2026-RC", "employment_news_ref": "..."}
    sourceDocumentId: integer("source_document_id").references(
      () => sourceDocuments.id,
    ), // primary official source document

    status: recruitmentStatusEnum("status")
      .notNull()
      .default("UPCOMING"),
    notificationDate: timestamp("notification_date", { withTimezone: true }),
    applicationStartDate: timestamp("application_start_date", {
      withTimezone: true,
    }),
    applicationEndDate: timestamp("application_end_date", {
      withTimezone: true,
    }),
    examDate: timestamp("exam_date", { withTimezone: true }),
    resultDate: timestamp("result_date", { withTimezone: true }),
    totalVacancies: integer("total_vacancies"),
    description: text("description"),
    notificationUrl: text("notification_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("recruitments_slug_idx").on(table.slug),
    index("recruitments_organization_idx").on(table.organizationId),
    index("recruitments_exam_idx").on(table.examId),
    index("recruitments_status_idx").on(table.status),
    index("recruitments_official_notification_idx").on(
      table.organizationId,
      table.officialNotificationNumber,
    ), // Identity signal for lookups; recruitment identity survives missing/changed notification numbers
    index("recruitments_source_document_idx").on(table.sourceDocumentId),
  ],
);

export const selectionProcesses = pgTable(
  "selection_processes",
  {
    id: serial("id").primaryKey(),
    recruitmentId: integer("recruitment_id")
      .notNull()
      .references(() => recruitments.id, { onDelete: "cascade" }),
    processType: selectionProcessTypeEnum("process_type").notNull(),
    stages: jsonb("stages").$type<
      Array<{ stageNum: number; type: string; description: string }>
    >(),
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("selection_processes_recruitment_idx").on(table.recruitmentId)],
);

// ========== CHANGE HISTORY (Recruitment Lifecycle Events) ==========

export const recruitmentEvents = pgTable(
  "recruitment_events",
  {
    id: serial("id").primaryKey(),
    recruitmentId: integer("recruitment_id")
      .notNull()
      .references(() => recruitments.id, { onDelete: "cascade" }),
    eventType: recruitmentEventTypeEnum("event_type").notNull(),
    eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
    title: varchar("title", { length: 220 }),
    description: text("description"),
    changedFields: jsonb("changed_fields").$type<
      Record<string, { old?: unknown; new?: unknown }>
    >(), // {vacancies: {old: 500, new: 450}, deadline: {old: "2026-10-15", new: "2026-10-31"}}
    sourceDocumentId: integer("source_document_id").references(
      () => sourceDocuments.id,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("recruitment_events_recruitment_idx").on(table.recruitmentId),
    index("recruitment_events_type_idx").on(table.eventType),
    index("recruitment_events_date_idx").on(table.eventDate),
  ],
);

// ========== RECRUITMENT-SPECIFIC ROLES & ELIGIBILITY ==========

export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    recruitmentId: integer("recruitment_id")
      .notNull()
      .references(() => recruitments.id, { onDelete: "cascade" }),
    positionId: integer("position_id")
      .notNull()
      .references(() => positions.id),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    description: text("description"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    payLevel: jsonb("pay_level").$type<Record<string, unknown>>(),
    vacancyTotal: integer("vacancy_total"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("posts_recruitment_idx").on(table.recruitmentId),
    index("posts_position_idx").on(table.positionId),
    uniqueIndex("posts_recruitment_slug_idx").on(
      table.recruitmentId,
      table.slug,
    ),
  ],
);

export const eligibilities = pgTable(
  "eligibilities",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    qualificationId: integer("qualification_id").references(
      () => qualifications.id,
    ),
    ageMin: smallint("age_min"),
    ageMax: smallint("age_max"),
    experienceYearsMin: smallint("experience_years_min"),
    experienceYearsMax: smallint("experience_years_max"),
    domicileType: domicileTypeEnum("domicile_type").default("ANY"),
    domicileValue: jsonb("domicile_value").$type<string[]>(), // ['Haryana', 'Punjab'] if state_specific
    physicalRequirements: text("physical_requirements"),
    skillsRequired: jsonb("skills_required").$type<string[]>(),
    citizenship: citizenshipEnum("citizenship").default("INDIAN"),
    otherConditions: jsonb("other_conditions").$type<Record<string, unknown>>(),
    hasAlternatives: boolean("has_alternatives").default(false), // if true, check eligibility_alternatives for OR conditions
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("eligibilities_post_idx").on(table.postId)],
);

// Alternative eligibility criteria (for "OR" conditions)
// E.g., Post requires: (B.Tech) OR (B.Sc + XYZ condition)
export const eligibilityAlternatives = pgTable(
  "eligibility_alternatives",
  {
    id: serial("id").primaryKey(),
    eligibilityId: integer("eligibility_id")
      .notNull()
      .references(() => eligibilities.id, { onDelete: "cascade" }),
    alternativeOrder: smallint("alternative_order").notNull(), // 1, 2, 3... to order alternatives
    qualificationId: integer("qualification_id").references(
      () => qualifications.id,
    ),
    ageMin: smallint("age_min"),
    ageMax: smallint("age_max"),
    experienceYearsMin: smallint("experience_years_min"),
    experienceYearsMax: smallint("experience_years_max"),
    additionalConditions: text("additional_conditions"), // free text for complex conditions
    description: text("description"), // e.g., "B.Tech in CSE" or "B.Sc + typing test"
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("eligibility_alternatives_eligibility_idx").on(table.eligibilityId),
    index("eligibility_alternatives_order_idx").on(
      table.eligibilityId,
      table.alternativeOrder,
    ),
  ],
);

// ========== VACANCY BREAKDOWN (Extensible Dimensions) ==========

export const vacancies = pgTable(
  "vacancies",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    locationId: integer("location_id").references(() => locations.id), // NULL = all-india
    categoryType: vacancyCategoryTypeEnum("category_type").notNull(),
    gender: genderEnum("gender").default("ANY"),
    count: integer("count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("vacancies_post_idx").on(table.postId),
    index("vacancies_location_idx").on(table.locationId),
    uniqueIndex("vacancies_unique_idx").on(
      table.postId,
      table.locationId,
      table.categoryType,
      table.gender,
    ),
  ],
);

// ========== DATA INSTANCES (Scraped Postings) ==========

export const postings = pgTable(
  "postings",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id").references(() => sources.id),
    sourceDocumentId: integer("source_document_id").references(
      () => sourceDocuments.id,
    ), // where this posting came from
    externalId: varchar("external_id", { length: 200 }), // external system's ID
    sourceUrl: text("source_url"),

    title: varchar("title", { length: 220 }).notNull(),
    description: text("description"),
    slug: varchar("slug", { length: 220 }).notNull().unique(),

    // Raw source preservation
    rawTitle: text("raw_title"), // original title from source
    rawDescription: text("raw_description"), // original description
    rawContent: text("raw_content"), // full raw HTML/text
    contentHash: varchar("content_hash", { length: 64 }), // SHA-256 for dedup across sources
    extractedAt: timestamp("extracted_at", { withTimezone: true }),
    extractionMethod: varchar("extraction_method", { length: 80 }), // "pdf_parser", "html_scraper", etc.

    // JobOye normalization (inferred from title/content)
    inferredRecruitmentId: integer("inferred_recruitment_id").references(
      () => recruitments.id,
    ),
    inferredPostId: integer("inferred_post_id").references(() => posts.id),

    // Confidence in the inferred linkage
    confidenceScore: smallint("confidence_score"), // 0-100

    // Canonical designation
    isCanonical: boolean("is_canonical").default(false), // if multiple sources describe same posting
    canonicalSlug: varchar("canonical_slug", { length: 220 }),

    // Content Quality Gate (see src/lib/content-quality/gate.ts). Same
    // physical "postings" table as schema.ts — kept in sync here because
    // the ingestion pipeline (write-postings.ts) writes through this
    // definition, not schema.ts's.
    indexTier: varchar("index_tier", { length: 1 }).notNull().default("C"),
    qualityMissing: jsonb("quality_missing").$type<string[]>().notNull().default([]),
    qualityEvaluatedAt: timestamp("quality_evaluated_at", { withTimezone: true }),

    // Posting status + expiry tracking (Google JobPosting compatible)
    status: postingStatusEnum("status").notNull().default("ACTIVE"),
    applicationDeadline: timestamp("application_deadline", {
      withTimezone: true,
    }), // For Google JobPosting schema: validThrough
    examDate: timestamp("exam_date", { withTimezone: true }), // When exam occurs
    resultDate: timestamp("result_date", { withTimezone: true }), // When results published
    markedExpiredAt: timestamp("marked_expired_at", { withTimezone: true }), // When we marked it expired
    lastCrawledAt: timestamp("last_crawled_at", { withTimezone: true }), // Last time we checked source

    // Scraped metadata
    scrapedAt: timestamp("scraped_at", { withTimezone: true }),

    // Moderation
    reviewStatus: reviewStatusEnum("review_status")
      .notNull()
      .default("APPROVED"),

    // SEO tracking
    viewCount: integer("view_count").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("postings_slug_idx").on(table.slug),
    index("postings_source_idx").on(table.sourceId),
    index("postings_recruitment_idx").on(table.inferredRecruitmentId),
    index("postings_post_idx").on(table.inferredPostId),
    index("postings_status_idx").on(table.status),
    index("postings_review_idx").on(table.reviewStatus),
    index("postings_deadline_idx").on(table.applicationDeadline),
    index("postings_content_hash_idx").on(table.contentHash), // for dedup detection
    uniqueIndex("postings_source_external_idx")
      .on(table.sourceId, table.externalId)
      .where(sql`${table.externalId} is not null`),
  ],
) as any;

// ========== CANONICAL PAGES (SEO Layer) ==========

export const canonicalPages = pgTable(
  "canonical_pages",
  {
    id: serial("id").primaryKey(),
    entityType: varchar("entity_type", { length: 60 }).notNull(), // position, exam, recruitment, organization, location
    entityId: integer("entity_id").notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    status: varchar("status", { length: 60 }).notNull().default("ACTIVE"), // lifecycle state
    indexed: boolean("indexed").default(true),
    contentVersion: integer("content_version").notNull().default(1),
    lastUpdated: timestamp("last_updated", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("canonical_pages_entity_idx").on(table.entityType, table.entityId),
    index("canonical_pages_slug_idx").on(table.slug),
  ],
);

// ========== RELATIONS ==========

export const locationsRelations = relations(locations, ({ many }) => ({
  vacancies: many(vacancies),
}));

export const qualificationsRelations = relations(qualifications, ({
  many,
}) => ({
  positions: many(positions),
  eligibilities: many(eligibilities),
}));

export const sourcesRelations = relations(sources, ({ many }) => ({
  documents: many(sourceDocuments),
  postings: many(postings),
}));

export const sourceDocumentsRelations = relations(
  sourceDocuments,
  ({ one, many }) => ({
    source: one(sources, {
      fields: [sourceDocuments.sourceId],
      references: [sources.id],
    }),
    recruitmentEvents: many(recruitmentEvents),
    postings: many(postings),
  }),
);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  exams: many(exams),
  recruitments: many(recruitments),
}));

export const examsRelations = relations(exams, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [exams.organizationId],
    references: [organizations.id],
  }),
  recruitments: many(recruitments),
}));

export const positionsRelations = relations(positions, ({ one, many }) => ({
  typicalQualification: one(qualifications, {
    fields: [positions.typicalQualificationId],
    references: [qualifications.id],
  }),
  posts: many(posts),
}));

export const recruitmentsRelations = relations(recruitments, ({
  one,
  many,
}) => ({
  organization: one(organizations, {
    fields: [recruitments.organizationId],
    references: [organizations.id],
  }),
  exam: one(exams, {
    fields: [recruitments.examId],
    references: [exams.id],
  }),
  sourceDocument: one(sourceDocuments, {
    fields: [recruitments.sourceDocumentId],
    references: [sourceDocuments.id],
  }),
  posts: many(posts),
  selectionProcesses: many(selectionProcesses),
  events: many(recruitmentEvents),
  postings: many(postings),
}));

export const recruitmentEventsRelations = relations(
  recruitmentEvents,
  ({ one }) => ({
    recruitment: one(recruitments, {
      fields: [recruitmentEvents.recruitmentId],
      references: [recruitments.id],
    }),
    sourceDocument: one(sourceDocuments, {
      fields: [recruitmentEvents.sourceDocumentId],
      references: [sourceDocuments.id],
    }),
  }),
);

export const selectionProcessesRelations = relations(
  selectionProcesses,
  ({ one }) => ({
    recruitment: one(recruitments, {
      fields: [selectionProcesses.recruitmentId],
      references: [recruitments.id],
    }),
  }),
);

export const postsRelations = relations(posts, ({ one, many }) => ({
  recruitment: one(recruitments, {
    fields: [posts.recruitmentId],
    references: [recruitments.id],
  }),
  position: one(positions, {
    fields: [posts.positionId],
    references: [positions.id],
  }),
  eligibility: many(eligibilities),
  vacancies: many(vacancies),
  postings: many(postings),
}));

export const eligibilitiesRelations = relations(eligibilities, ({ one, many }) => ({
  post: one(posts, {
    fields: [eligibilities.postId],
    references: [posts.id],
  }),
  qualification: one(qualifications, {
    fields: [eligibilities.qualificationId],
    references: [qualifications.id],
  }),
  alternatives: many(eligibilityAlternatives),
}));

export const eligibilityAlternativesRelations = relations(
  eligibilityAlternatives,
  ({ one }) => ({
    eligibility: one(eligibilities, {
      fields: [eligibilityAlternatives.eligibilityId],
      references: [eligibilities.id],
    }),
    qualification: one(qualifications, {
      fields: [eligibilityAlternatives.qualificationId],
      references: [qualifications.id],
    }),
  }),
);

export const vacanciesRelations = relations(vacancies, ({ one }) => ({
  post: one(posts, {
    fields: [vacancies.postId],
    references: [posts.id],
  }),
  location: one(locations, {
    fields: [vacancies.locationId],
    references: [locations.id],
  }),
}));

export const postingsRelations = relations(postings, ({ one }) => ({
  source: one(sources, {
    fields: [postings.sourceId],
    references: [sources.id],
  }),
  sourceDocument: one(sourceDocuments, {
    fields: [postings.sourceDocumentId],
    references: [sourceDocuments.id],
  }),
  recruitment: one(recruitments, {
    fields: [postings.inferredRecruitmentId],
    references: [recruitments.id],
  }),
  post: one(posts, {
    fields: [postings.inferredPostId],
    references: [posts.id],
  }),
}));

export const canonicalPagesRelations = relations(canonicalPages, () => ({}));
