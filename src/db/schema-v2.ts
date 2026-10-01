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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("organizations_slug_idx").on(table.slug)],
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("eligibilities_post_idx").on(table.postId)],
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
    source: varchar("source", { length: 60 }).notNull().default("manual"),
    externalId: varchar("external_id", { length: 200 }),
    sourceUrl: text("source_url"),

    title: varchar("title", { length: 220 }).notNull(),
    description: text("description"),
    slug: varchar("slug", { length: 220 }).notNull().unique(),

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

    status: postingStatusEnum("status").notNull().default("ACTIVE"),

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
    index("postings_recruitment_idx").on(table.inferredRecruitmentId),
    index("postings_post_idx").on(table.inferredPostId),
    index("postings_status_idx").on(table.status),
    index("postings_review_idx").on(table.reviewStatus),
    uniqueIndex("postings_source_external_idx")
      .on(table.source, table.externalId)
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
  posts: many(posts),
  selectionProcesses: many(selectionProcesses),
  postings: many(postings),
}));

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

export const eligibilitiesRelations = relations(eligibilities, ({ one }) => ({
  post: one(posts, {
    fields: [eligibilities.postId],
    references: [posts.id],
  }),
  qualification: one(qualifications, {
    fields: [eligibilities.qualificationId],
    references: [qualifications.id],
  }),
}));

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
