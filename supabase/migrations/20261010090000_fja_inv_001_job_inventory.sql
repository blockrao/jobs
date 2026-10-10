-- FJA-INV-001: canonical current inventory for extracted FreeJobAlert listings.
-- The source inventory is separate from canonical JobOye recruitments/posts:
-- source observations are discovery evidence, not publication approval.
CREATE TABLE IF NOT EXISTS public.fja_job_inventory (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_slug text NOT NULL DEFAULT 'freejobalert',
  external_id text NOT NULL,
  source_url text NOT NULL,
  title text NOT NULL,
  organization_name text,
  listing_category text,
  published_date date,
  application_start_date date,
  application_end_date date,
  advertisement_number text,
  qualification text,
  vacancy_count integer,
  detail_status text NOT NULL DEFAULT 'PENDING',
  source_status text NOT NULL DEFAULT 'UNKNOWN',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_text text,
  content_hash text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_crawl_run_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fja_job_inventory_source_external_unique UNIQUE (source_slug, external_id),
  CONSTRAINT fja_job_inventory_detail_status_check CHECK (detail_status IN ('EXTRACTED','PARTIAL','FAILED','PENDING')),
  CONSTRAINT fja_job_inventory_source_status_check CHECK (source_status IN ('OPEN','CLOSED','UNKNOWN','REMOVED'))
);
CREATE INDEX IF NOT EXISTS fja_job_inventory_published_date_idx ON public.fja_job_inventory (published_date DESC);
CREATE INDEX IF NOT EXISTS fja_job_inventory_application_end_idx ON public.fja_job_inventory (application_end_date);
CREATE INDEX IF NOT EXISTS fja_job_inventory_category_idx ON public.fja_job_inventory (listing_category);
ALTER TABLE public.fja_job_inventory ENABLE ROW LEVEL SECURITY;
