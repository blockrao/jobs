CREATE TYPE "public"."article_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."article_type" AS ENUM('GUIDE', 'SYLLABUS', 'EXAM_PATTERN', 'PREVIOUS_PAPERS', 'ADMIT_CARD_GUIDE', 'RESULT_GUIDE', 'CUTOFF', 'SALARY_REPORT', 'INTERVIEW_PREP', 'COMPARISON', 'NEWS', 'COMPANY_REVIEW');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN', 'TEMPORARY', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."org_sector" AS ENUM('GOVERNMENT_CENTRAL', 'GOVERNMENT_STATE', 'PSU', 'BANKING', 'DEFENCE', 'RAILWAY', 'PRIVATE');--> statement-breakpoint
CREATE TYPE "public"."posting_kind" AS ENUM('GOVERNMENT', 'PRIVATE');--> statement-breakpoint
CREATE TYPE "public"."posting_stage" AS ENUM('NOTIFICATION_OUT', 'APPLICATION_OPEN', 'APPLICATION_CLOSED', 'ADMIT_CARD_RELEASED', 'EXAM_SCHEDULED', 'EXAM_CONDUCTED', 'ANSWER_KEY_OUT', 'OBJECTION_WINDOW', 'RESULT_OUT', 'MERIT_LIST_OUT', 'INTERVIEW_SCHEDULED', 'FINAL_RESULT_OUT', 'ACTIVE', 'FILLED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."salary_period" AS ENUM('HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR');--> statement-breakpoint
CREATE TYPE "public"."workplace_type" AS ENUM('REMOTE', 'HYBRID', 'ONSITE');--> statement-breakpoint
CREATE TABLE "article_categories" (
	"article_id" integer NOT NULL,
	"category_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(220) NOT NULL,
	"title" varchar(220) NOT NULL,
	"dek" text,
	"body" text NOT NULL,
	"type" "article_type" DEFAULT 'GUIDE' NOT NULL,
	"author_name" varchar(120),
	"cover_image_url" text,
	"status" "article_status" DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(200) NOT NULL,
	"sector" "org_sector" DEFAULT 'PRIVATE' NOT NULL,
	"state" varchar(80),
	"logo_url" text,
	"website_url" text,
	"description" text,
	"headquarters" varchar(160),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posting_articles" (
	"posting_id" integer NOT NULL,
	"article_id" integer NOT NULL,
	"relation_type" varchar(60) DEFAULT 'RELATED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posting_categories" (
	"posting_id" integer NOT NULL,
	"category_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posting_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"posting_id" integer NOT NULL,
	"stage" "posting_stage" NOT NULL,
	"title" varchar(220) NOT NULL,
	"description" text,
	"event_date" timestamp with time zone DEFAULT now() NOT NULL,
	"link_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postings" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(220) NOT NULL,
	"title" varchar(220) NOT NULL,
	"kind" "posting_kind" DEFAULT 'GOVERNMENT' NOT NULL,
	"organization_id" integer NOT NULL,
	"post_names" jsonb DEFAULT '[]'::jsonb,
	"description" text NOT NULL,
	"eligibility" text,
	"responsibilities" text,
	"requirements" text,
	"total_vacancies" integer,
	"age_limit_min" integer,
	"age_limit_max" integer,
	"age_relaxation_notes" text,
	"application_fee_general" integer,
	"application_fee_reserved" integer,
	"employment_type" "employment_type" DEFAULT 'FULL_TIME' NOT NULL,
	"workplace_type" "workplace_type" DEFAULT 'ONSITE' NOT NULL,
	"location_city" varchar(120),
	"location_region" varchar(120),
	"location_country" varchar(120) DEFAULT 'India',
	"salary_min" integer,
	"salary_max" integer,
	"salary_currency" varchar(8) DEFAULT 'INR',
	"salary_period" "salary_period" DEFAULT 'MONTH',
	"seniority_level" varchar(60),
	"skills" jsonb DEFAULT '[]'::jsonb,
	"official_notification_url" text,
	"apply_url" text,
	"current_stage" "posting_stage" DEFAULT 'NOTIFICATION_OUT' NOT NULL,
	"date_posted" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_through" timestamp with time zone,
	"exam_date" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posting_articles" ADD CONSTRAINT "posting_articles_posting_id_postings_id_fk" FOREIGN KEY ("posting_id") REFERENCES "public"."postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posting_articles" ADD CONSTRAINT "posting_articles_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posting_categories" ADD CONSTRAINT "posting_categories_posting_id_postings_id_fk" FOREIGN KEY ("posting_id") REFERENCES "public"."postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posting_categories" ADD CONSTRAINT "posting_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posting_updates" ADD CONSTRAINT "posting_updates_posting_id_postings_id_fk" FOREIGN KEY ("posting_id") REFERENCES "public"."postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postings" ADD CONSTRAINT "postings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "article_categories_pk" ON "article_categories" USING btree ("article_id","category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "posting_articles_pk" ON "posting_articles" USING btree ("posting_id","article_id");--> statement-breakpoint
CREATE UNIQUE INDEX "posting_categories_pk" ON "posting_categories" USING btree ("posting_id","category_id");--> statement-breakpoint
CREATE INDEX "posting_updates_posting_idx" ON "posting_updates" USING btree ("posting_id");--> statement-breakpoint
CREATE UNIQUE INDEX "postings_slug_idx" ON "postings" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "postings_org_idx" ON "postings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "postings_stage_idx" ON "postings" USING btree ("current_stage");--> statement-breakpoint
CREATE INDEX "postings_kind_idx" ON "postings" USING btree ("kind");