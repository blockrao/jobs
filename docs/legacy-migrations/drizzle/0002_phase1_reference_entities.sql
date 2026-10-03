-- ========== PHASE 1: Reference & Persistent Entities ==========

-- Enums for new entities
CREATE TYPE "public"."organization_role" AS ENUM('EXAM_AUTHORITY', 'RECRUITING_BODY', 'EMPLOYER');
--> statement-breakpoint
CREATE TYPE "public"."position_category" AS ENUM('POLICE', 'ADMINISTRATIVE', 'BANKING', 'TEACHING', 'ENGINEERING', 'MEDICAL', 'DEFENCE', 'RAILWAY', 'POSTAL', 'CUSTOMS', 'TAX', 'JUDICIAL', 'LEGAL', 'PSU', 'OTHER');
--> statement-breakpoint
CREATE TYPE "public"."qualification_level" AS ENUM('SECONDARY', 'SENIOR_SECONDARY', 'BACHELOR', 'MASTER', 'PHD');
--> statement-breakpoint

-- Locations (Indian states, UTs, regions)
CREATE TABLE IF NOT EXISTS "public"."locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"type" varchar(60) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_slug_idx" ON "public"."locations" USING btree ("slug");
--> statement-breakpoint

-- Qualifications (reference data: 10th, 12th, Bachelor, Master, PhD)
CREATE TABLE IF NOT EXISTS "public"."qualifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"level" "public"."qualification_level" NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qualifications_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qualifications_slug_idx" ON "public"."qualifications" USING btree ("slug");
--> statement-breakpoint

-- Organizations (with roles array for exam authorities, recruiting bodies, employers)
CREATE TABLE IF NOT EXISTS "public"."organizations_new" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"roles" "public"."organization_role"[] DEFAULT '{}',
	"website" text,
	"logo_url" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_new_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organizations_new_slug_idx" ON "public"."organizations_new" USING btree ("slug");
--> statement-breakpoint

-- Exams (persistent, independent of any single recruitment)
CREATE TABLE IF NOT EXISTS "public"."exams_new" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL REFERENCES "public"."organizations_new"("id"),
	"name" varchar(200) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"short_name" varchar(80),
	"category" varchar(80),
	"frequency" varchar(60) DEFAULT 'ANNUAL',
	"description" text,
	"syllabus" text,
	"exam_pattern" text,
	"stages" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exams_new_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exams_new_slug_idx" ON "public"."exams_new" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exams_new_organization_idx" ON "public"."exams_new" USING btree ("organization_id");
--> statement-breakpoint

-- Positions (normalized, evergreen career concepts)
CREATE TABLE IF NOT EXISTS "public"."positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"category" "public"."position_category" NOT NULL,
	"description" text,
	"typical_qualification_id" integer REFERENCES "public"."qualifications"("id"),
	"typical_age_min" smallint,
	"typical_age_max" smallint,
	"typical_salary_min" integer,
	"typical_salary_max" integer,
	"career_path" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "positions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "positions_slug_idx" ON "public"."positions" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "positions_category_idx" ON "public"."positions" USING btree ("category");
--> statement-breakpoint
