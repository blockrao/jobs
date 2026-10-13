-- FJA-002: typed discovery candidates only. These columns do not imply official verification
-- and must never be promoted to canonical JobOye facts without the existing verification gates.
ALTER TABLE public.fja_post_inventory
  ADD COLUMN IF NOT EXISTS salary_min_candidate numeric(14,2),
  ADD COLUMN IF NOT EXISTS salary_max_candidate numeric(14,2),
  ADD COLUMN IF NOT EXISTS salary_currency_candidate text,
  ADD COLUMN IF NOT EXISTS salary_period_candidate text,
  ADD COLUMN IF NOT EXISTS salary_type_candidate text,
  ADD COLUMN IF NOT EXISTS salary_normalization_status text NOT NULL DEFAULT 'NEEDS_REVIEW',
  ADD COLUMN IF NOT EXISTS min_age_years_candidate integer,
  ADD COLUMN IF NOT EXISTS max_age_years_candidate integer,
  ADD COLUMN IF NOT EXISTS age_reference_date_candidate date,
  ADD COLUMN IF NOT EXISTS age_normalization_status text NOT NULL DEFAULT 'NEEDS_REVIEW',
  ADD COLUMN IF NOT EXISTS official_source_page integer,
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

ALTER TABLE public.fja_post_inventory
  ADD CONSTRAINT fja_post_salary_currency_check
    CHECK (salary_currency_candidate IS NULL OR salary_currency_candidate IN ('INR')),
  ADD CONSTRAINT fja_post_salary_period_check
    CHECK (salary_period_candidate IS NULL OR salary_period_candidate IN ('HOUR','DAY','WEEK','MONTH','YEAR')),
  ADD CONSTRAINT fja_post_salary_type_check
    CHECK (salary_type_candidate IS NULL OR salary_type_candidate IN ('FIXED','RANGE','PAY_SCALE','STIPEND','CONSOLIDATED','CTC','OTHER')),
  ADD CONSTRAINT fja_post_salary_status_check
    CHECK (salary_normalization_status IN ('NOT_PRESENT','NORMALIZED','NEEDS_REVIEW','MANUALLY_REVIEWED')),
  ADD CONSTRAINT fja_post_age_status_check
    CHECK (age_normalization_status IN ('NOT_PRESENT','NORMALIZED','NEEDS_REVIEW','MANUALLY_REVIEWED')),
  ADD CONSTRAINT fja_post_salary_bounds_check
    CHECK (salary_min_candidate IS NULL OR salary_max_candidate IS NULL OR salary_min_candidate <= salary_max_candidate),
  ADD CONSTRAINT fja_post_age_bounds_check
    CHECK (
      (min_age_years_candidate IS NULL OR min_age_years_candidate BETWEEN 14 AND 100)
      AND (max_age_years_candidate IS NULL OR max_age_years_candidate BETWEEN 14 AND 100)
      AND (min_age_years_candidate IS NULL OR max_age_years_candidate IS NULL OR min_age_years_candidate <= max_age_years_candidate)
    ),
  ADD CONSTRAINT fja_post_official_source_page_check
    CHECK (official_source_page IS NULL OR official_source_page > 0);

CREATE INDEX IF NOT EXISTS fja_post_inventory_salary_status_idx
  ON public.fja_post_inventory (salary_normalization_status);
CREATE INDEX IF NOT EXISTS fja_post_inventory_age_status_idx
  ON public.fja_post_inventory (age_normalization_status);
