CREATE TYPE "public"."review_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "source" varchar(60) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "external_id" varchar(200);--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "ingested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "confidence" integer;--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "review_status" "review_status" DEFAULT 'APPROVED' NOT NULL;--> statement-breakpoint
CREATE INDEX "postings_review_idx" ON "postings" USING btree ("review_status");--> statement-breakpoint
CREATE UNIQUE INDEX "postings_source_external_idx" ON "postings" USING btree ("source","external_id") WHERE "postings"."external_id" is not null;