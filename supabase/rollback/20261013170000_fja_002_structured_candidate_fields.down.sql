-- Manual rollback for FJA-002. Never run automatically.
DROP INDEX IF EXISTS public.fja_post_inventory_age_status_idx;
DROP INDEX IF EXISTS public.fja_post_inventory_salary_status_idx;
ALTER TABLE public.fja_post_inventory
  DROP CONSTRAINT IF EXISTS fja_post_official_source_page_check,
  DROP CONSTRAINT IF EXISTS fja_post_age_bounds_check,
  DROP CONSTRAINT IF EXISTS fja_post_salary_bounds_check,
  DROP CONSTRAINT IF EXISTS fja_post_age_status_check,
  DROP CONSTRAINT IF EXISTS fja_post_salary_status_check,
  DROP CONSTRAINT IF EXISTS fja_post_salary_type_check,
  DROP CONSTRAINT IF EXISTS fja_post_salary_period_check,
  DROP CONSTRAINT IF EXISTS fja_post_salary_currency_check,
  DROP COLUMN IF EXISTS verified_at,
  DROP COLUMN IF EXISTS verification_notes,
  DROP COLUMN IF EXISTS official_source_page,
  DROP COLUMN IF EXISTS age_normalization_status,
  DROP COLUMN IF EXISTS age_reference_date_candidate,
  DROP COLUMN IF EXISTS max_age_years_candidate,
  DROP COLUMN IF EXISTS min_age_years_candidate,
  DROP COLUMN IF EXISTS salary_normalization_status,
  DROP COLUMN IF EXISTS salary_type_candidate,
  DROP COLUMN IF EXISTS salary_period_candidate,
  DROP COLUMN IF EXISTS salary_currency_candidate,
  DROP COLUMN IF EXISTS salary_max_candidate,
  DROP COLUMN IF EXISTS salary_min_candidate;
