-- ========== PHASE 2: Temporal & Normalized Entities ==========

-- Selection Process Types Enum
CREATE TYPE "public"."selection_process_type" AS ENUM('EXAM', 'DIRECT', 'INTERVIEW', 'PHYSICAL_TEST', 'SKILL_TEST', 'MERIT', 'MEDICAL', 'DOCUMENT_VERIFICATION', 'HYBRID');
--> statement-breakpoint

-- Recruitment Status Enum
CREATE TYPE "public"."recruitment_status" AS ENUM('UPCOMING', 'ACTIVE', 'RESULTS', 'ARCHIVED');
--> statement-breakpoint

-- Vacancy Category Type Enum
CREATE TYPE "public"."vacancy_category_type" AS ENUM('GENERAL', 'OBC', 'SC', 'ST', 'EWS');
--> statement-breakpoint

-- Gender Enum
CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE', 'ANY');
--> statement-breakpoint

-- Citizenship Enum
CREATE TYPE "public"."citizenship" AS ENUM('INDIAN', 'ANY');
--> statement-breakpoint

-- Domicile Type Enum
CREATE TYPE "public"."domicile_type" AS ENUM('ANY', 'STATE', 'DISTRICT', 'UNION_TERRITORY', 'SPECIFIC');
--> statement-breakpoint

-- Recruitments (temporal campaigns)
CREATE TABLE IF NOT EXISTS "public"."recruitments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL REFERENCES "public"."organizations_new"("id"),
	"exam_id" integer REFERENCES "public"."exams_new"("id"),
	"year" smallint NOT NULL,
	"name" varchar(220) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"status" "public"."recruitment_status" NOT NULL DEFAULT 'UPCOMING',
	"notification_date" timestamp with time zone,
	"application_start_date" timestamp with time zone,
	"application_end_date" timestamp with time zone,
	"exam_date" timestamp with time zone,
	"result_date" timestamp with time zone,
	"total_vacancies" integer,
	"description" text,
	"notification_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recruitments_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recruitments_slug_idx" ON "public"."recruitments" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recruitments_organization_idx" ON "public"."recruitments" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recruitments_exam_idx" ON "public"."recruitments" USING btree ("exam_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recruitments_status_idx" ON "public"."recruitments" USING btree ("status");
--> statement-breakpoint

-- Selection Processes
CREATE TABLE IF NOT EXISTS "public"."selection_processes" (
	"id" serial PRIMARY KEY NOT NULL,
	"recruitment_id" integer NOT NULL REFERENCES "public"."recruitments"("id") ON DELETE CASCADE,
	"process_type" "public"."selection_process_type" NOT NULL,
	"stages" jsonb,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "selection_processes_recruitment_idx" ON "public"."selection_processes" USING btree ("recruitment_id");
--> statement-breakpoint

-- Posts (recruitment-specific roles, links Recruitment → Position)
CREATE TABLE IF NOT EXISTS "public"."posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"recruitment_id" integer NOT NULL REFERENCES "public"."recruitments"("id") ON DELETE CASCADE,
	"position_id" integer NOT NULL REFERENCES "public"."positions"("id"),
	"name" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"description" text,
	"salary_min" integer,
	"salary_max" integer,
	"pay_level" jsonb,
	"vacancy_total" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_recruitment_slug_unique" UNIQUE("recruitment_id", "slug")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_recruitment_idx" ON "public"."posts" USING btree ("recruitment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_position_idx" ON "public"."posts" USING btree ("position_id");
--> statement-breakpoint

-- Eligibilities (structured dimensions per Post)
CREATE TABLE IF NOT EXISTS "public"."eligibilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL REFERENCES "public"."posts"("id") ON DELETE CASCADE,
	"qualification_id" integer REFERENCES "public"."qualifications"("id"),
	"age_min" smallint,
	"age_max" smallint,
	"experience_years_min" smallint,
	"experience_years_max" smallint,
	"domicile_type" "public"."domicile_type" DEFAULT 'ANY',
	"domicile_value" jsonb,
	"physical_requirements" text,
	"skills_required" jsonb,
	"citizenship" "public"."citizenship" DEFAULT 'INDIAN',
	"other_conditions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eligibilities_post_idx" ON "public"."eligibilities" USING btree ("post_id");
--> statement-breakpoint

-- Vacancies (segmented opening counts by location, category, gender)
CREATE TABLE IF NOT EXISTS "public"."vacancies" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL REFERENCES "public"."posts"("id") ON DELETE CASCADE,
	"location_id" integer REFERENCES "public"."locations"("id"),
	"category_type" "public"."vacancy_category_type" NOT NULL,
	"gender" "public"."gender" DEFAULT 'ANY',
	"count" integer NOT NULL DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vacancies_unique" UNIQUE("post_id", "location_id", "category_type", "gender")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vacancies_post_idx" ON "public"."vacancies" USING btree ("post_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vacancies_location_idx" ON "public"."vacancies" USING btree ("location_id");
--> statement-breakpoint
