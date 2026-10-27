-- 20261027190000 FJA private source inventory bootstrap.
-- Additive only: source evidence remains separate from canonical recruitments/posts.
-- Do not promote these records directly to public pages.
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
  other_info_raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_text text,
  content_hash text NOT NULL,
  official_notification_url text,
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
CREATE INDEX IF NOT EXISTS idx_fja_job_inventory_official_notification_url ON public.fja_job_inventory (official_notification_url) WHERE official_notification_url IS NOT NULL;
ALTER TABLE public.fja_job_inventory ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.fja_post_inventory (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recruitment_inventory_id bigint NOT NULL REFERENCES public.fja_job_inventory(id) ON DELETE CASCADE,
  source_slug text NOT NULL DEFAULT 'freejobalert',
  external_id text NOT NULL,
  source_post_key text NOT NULL,
  post_name_raw text,
  post_name_normalized_candidate text,
  source_post_code_raw text,
  vacancy_count_raw text,
  vacancy_count_candidate integer,
  qualification_raw text,
  experience_raw text,
  age_limit_raw text,
  age_reference_date_raw text,
  age_relaxation_rules_raw text,
  salary_raw text,
  salary_min_candidate numeric(14,2),
  salary_max_candidate numeric(14,2),
  salary_currency_candidate text,
  salary_period_candidate text,
  salary_type_candidate text,
  salary_normalization_status text NOT NULL DEFAULT 'NEEDS_REVIEW',
  min_age_years_candidate integer,
  max_age_years_candidate integer,
  age_reference_date_candidate date,
  age_normalization_status text NOT NULL DEFAULT 'NEEDS_REVIEW',
  official_source_page integer,
  verified_official_source_url text,
  verification_notes text,
  verified_at timestamptz,
  pay_level_raw text,
  employment_type_raw text,
  tenure_raw text,
  location_raw text,
  duties_responsibilities_raw text,
  eligibility_conditions_raw text,
  milestones_raw jsonb NOT NULL DEFAULT '[]'::jsonb,
  application_selection_raw jsonb NOT NULL DEFAULT '[]'::jsonb,
  other_info_raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_table_row_raw jsonb,
  extraction_status text NOT NULL DEFAULT 'PENDING',
  official_verification_status text NOT NULL DEFAULT 'PENDING',
  content_hash text NOT NULL,
  last_crawl_run_id text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fja_post_inventory_identity_unique UNIQUE (source_slug, external_id, source_post_key),
  CONSTRAINT fja_post_inventory_extraction_status_check CHECK (extraction_status IN ('CANDIDATE_NEEDS_REVIEW','POST_DECOMPOSITION_NOT_EXTRACTED','PARTIAL','EXTRACTED','FAILED','PENDING')),
  CONSTRAINT fja_post_inventory_verification_status_check CHECK (official_verification_status IN ('PENDING','VERIFIED','CONFLICT','NOT_FOUND','NOT_APPLICABLE','NEEDS_REVIEW')),
  CONSTRAINT fja_post_salary_currency_check CHECK (salary_currency_candidate IS NULL OR salary_currency_candidate IN ('INR')),
  CONSTRAINT fja_post_salary_period_check CHECK (salary_period_candidate IS NULL OR salary_period_candidate IN ('HOUR','DAY','WEEK','MONTH','YEAR')),
  CONSTRAINT fja_post_salary_type_check CHECK (salary_type_candidate IS NULL OR salary_type_candidate IN ('FIXED','RANGE','PAY_SCALE','STIPEND','CONSOLIDATED','CTC','OTHER')),
  CONSTRAINT fja_post_salary_status_check CHECK (salary_normalization_status IN ('NOT_PRESENT','NORMALIZED','NEEDS_REVIEW','MANUALLY_REVIEWED')),
  CONSTRAINT fja_post_age_status_check CHECK (age_normalization_status IN ('NOT_PRESENT','NORMALIZED','NEEDS_REVIEW','MANUALLY_REVIEWED')),
  CONSTRAINT fja_post_salary_bounds_check CHECK (salary_min_candidate IS NULL OR salary_max_candidate IS NULL OR salary_min_candidate <= salary_max_candidate),
  CONSTRAINT fja_post_age_bounds_check CHECK ((min_age_years_candidate IS NULL OR min_age_years_candidate BETWEEN 14 AND 100) AND (max_age_years_candidate IS NULL OR max_age_years_candidate BETWEEN 14 AND 100) AND (min_age_years_candidate IS NULL OR max_age_years_candidate IS NULL OR min_age_years_candidate <= max_age_years_candidate)),
  CONSTRAINT fja_post_official_source_page_check CHECK (official_source_page IS NULL OR official_source_page > 0)
);
CREATE INDEX IF NOT EXISTS fja_post_inventory_parent_idx ON public.fja_post_inventory (recruitment_inventory_id);
CREATE INDEX IF NOT EXISTS fja_post_inventory_name_idx ON public.fja_post_inventory (post_name_raw);
CREATE INDEX IF NOT EXISTS fja_post_inventory_salary_status_idx ON public.fja_post_inventory (salary_normalization_status);
CREATE INDEX IF NOT EXISTS fja_post_inventory_age_status_idx ON public.fja_post_inventory (age_normalization_status);
ALTER TABLE public.fja_post_inventory ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.fja_source_captures (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recruitment_inventory_id bigint NOT NULL REFERENCES public.fja_job_inventory(id) ON DELETE RESTRICT,
  source_slug text NOT NULL DEFAULT 'freejobalert',
  external_id text NOT NULL,
  source_url text NOT NULL,
  html_sha256 text NOT NULL,
  normalized_text_sha256 text,
  raw_html text NOT NULL,
  run_id text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fja_source_captures_identity_hash_unique UNIQUE (source_slug, external_id, html_sha256)
);
CREATE INDEX IF NOT EXISTS fja_source_captures_parent_idx ON public.fja_source_captures (recruitment_inventory_id, captured_at DESC);
ALTER TABLE public.fja_source_captures ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reject_fja_source_capture_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'fja_source_captures is append-only; create a new hash-version instead of updating or deleting a capture';
END;
$$;
DROP TRIGGER IF EXISTS fja_source_captures_append_only ON public.fja_source_captures;
CREATE TRIGGER fja_source_captures_append_only BEFORE UPDATE OR DELETE ON public.fja_source_captures FOR EACH ROW EXECUTE FUNCTION public.reject_fja_source_capture_mutation();

-- Existing rows may have stored this value before it was promoted to a column.
UPDATE public.fja_job_inventory
SET official_notification_url = details->>'official_notification_url'
WHERE official_notification_url IS NULL
  AND details->>'official_notification_url' IS NOT NULL
  AND details->>'official_notification_url' <> '';
