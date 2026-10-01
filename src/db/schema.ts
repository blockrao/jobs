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
    headquarters: varchar("headquarters", { length: 160 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("organizations_slug_idx").on(table.slug)],
);

// ---------- Commissions (SSC, UPSC, Banking, Railways, etc.) ----------

export const commissions = pgTable(
  "commissions",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 7 }).default("#000000"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("commissions_slug_idx").on(table.slug)],
);

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
    description: text("description"),
    eligibility: text("eligibility"),
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
);

// ---------- Categories (role / sector / state taxonomy for hub pages) ----------

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("categories_slug_idx").on(table.slug)],
);

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

    totalVacancies: integer("total_vacancies"),
    ageLimitMin: integer("age_limit_min"),
    ageLimitMax: integer("age_limit_max"),
    ageRelaxationNotes: text("age_relaxation_notes"),
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

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("postings_slug_idx").on(table.slug),
    index("postings_org_idx").on(table.organizationId),
    index("postings_exam_idx").on(table.examId),
    index("postings_stage_idx").on(table.currentStage),
    index("postings_kind_idx").on(table.kind),
    index("postings_review_idx").on(table.reviewStatus),
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
);

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
    description: text("description"),
    eventDate: timestamp("event_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    linkUrl: text("link_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("posting_updates_posting_idx").on(table.postingId)],
);

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
);

// ---------- Articles ----------

export const articles = pgTable(
  "articles",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 220 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    dek: text("dek"),
    body: text("body").notNull(),
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
);

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
);

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
);

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
