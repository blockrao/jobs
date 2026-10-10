-- FJA-INV-002: source-specific post candidates, kept separate from canonical JobOye posts.
-- Candidate facts are source-reported only; this table does not authorize canonical publication.
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
  CONSTRAINT fja_post_inventory_extraction_status_check
    CHECK (extraction_status IN ('CANDIDATE_NEEDS_REVIEW','POST_DECOMPOSITION_NOT_EXTRACTED','PARTIAL','EXTRACTED','FAILED','PENDING')),
  CONSTRAINT fja_post_inventory_verification_status_check
    CHECK (official_verification_status IN ('PENDING','VERIFIED','CONFLICT','NOT_FOUND','NOT_APPLICABLE','NEEDS_REVIEW'))
);
CREATE INDEX IF NOT EXISTS fja_post_inventory_parent_idx
  ON public.fja_post_inventory (recruitment_inventory_id);
CREATE INDEX IF NOT EXISTS fja_post_inventory_name_idx
  ON public.fja_post_inventory (post_name_raw);
ALTER TABLE public.fja_post_inventory ENABLE ROW LEVEL SECURITY;
