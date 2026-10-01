-- ========== PHASE 4: Canonical Pages (SEO Projections) ==========

-- Canonical Pages table - projections of graph entities for routing & SEO
CREATE TABLE IF NOT EXISTS "public"."canonical_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(60) NOT NULL,
	"entity_id" integer NOT NULL,
	"slug" varchar(220) NOT NULL,
	"status" varchar(60) DEFAULT 'ACTIVE',
	"indexed" boolean DEFAULT true,
	"content_version" integer DEFAULT 1,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "canonical_pages_unique" UNIQUE("entity_type", "entity_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "canonical_pages_entity_idx" ON "public"."canonical_pages" USING btree ("entity_type", "entity_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "canonical_pages_slug_idx" ON "public"."canonical_pages" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "canonical_pages_status_idx" ON "public"."canonical_pages" USING btree ("status");
--> statement-breakpoint
