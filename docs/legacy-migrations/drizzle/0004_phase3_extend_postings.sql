-- ========== PHASE 3: Extend Postings Table (Backward Compatibility) ==========

-- Posting Status Enum
CREATE TYPE "public"."posting_status" AS ENUM('ACTIVE', 'ARCHIVED', 'INACTIVE');
--> statement-breakpoint

-- Review Status Enum
CREATE TYPE "public"."review_status" AS ENUM('APPROVED', 'PENDING', 'REJECTED');
--> statement-breakpoint

-- Extend postings table with inferred relationships (nullable for backward compatibility)
ALTER TABLE "public"."postings"
  ADD COLUMN IF NOT EXISTS "inferred_recruitment_id" integer REFERENCES "public"."recruitments"("id"),
  ADD COLUMN IF NOT EXISTS "inferred_post_id" integer REFERENCES "public"."posts"("id"),
  ADD COLUMN IF NOT EXISTS "confidence_score" smallint,
  ADD COLUMN IF NOT EXISTS "is_canonical" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "canonical_slug" varchar(220),
  ADD COLUMN IF NOT EXISTS "status" "public"."posting_status" DEFAULT 'ACTIVE';
--> statement-breakpoint

-- Create indexes for performance on frequently queried columns
CREATE INDEX IF NOT EXISTS "postings_inferred_recruitment_idx" ON "public"."postings" USING btree ("inferred_recruitment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "postings_inferred_post_idx" ON "public"."postings" USING btree ("inferred_post_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "postings_status_idx" ON "public"."postings" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "postings_confidence_idx" ON "public"."postings" USING btree ("confidence_score");
--> statement-breakpoint
