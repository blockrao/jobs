-- JobOye Surgical Migration: Clean-Slate Jobs Table
-- Date: 2026-10-19
-- Purpose: Replace complex multi-table schema with simplified jobs table
-- Preserves: All existing data, URL routes, and public access
--
-- BACKWARDS COMPATIBILITY:
-- - Existing public.postings, public.organizations, etc. remain unchanged
-- - New public.jobs table mirrors postings data for simpler queries
-- - Both can coexist during transition; public.postings is read-only after migration
--
-- EXECUTION: Run this in Supabase SQL Editor. Idempotent (safe to re-run).

-- ========== STEP 1: Create the simplified jobs table ==========
-- Single table with all critical job posting fields
-- UUID primary key, indexes on frequently-queried fields

CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic recruitment info (from public.postings)
  recruitment_slug TEXT NOT NULL,
  post_slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  title_hi TEXT,

  -- Organization & exam
  organization TEXT NOT NULL,
  organization_slug TEXT,
  exam_name TEXT,
  exam_slug TEXT,

  -- Location & details
  location TEXT,
  location_state TEXT,

  -- Vacancies & qualification
  vacancies INTEGER,
  vacancies_breakdown JSONB,
  qualification TEXT,
  qualification_hi TEXT,

  -- Age requirements
  age_min INTEGER,
  age_max INTEGER,
  age_reference_date DATE,
  age_relaxations JSONB,

  -- Salary/pay
  salary_min NUMERIC,
  salary_max NUMERIC,
  pay_level INTEGER,
  pay_scale_text TEXT,
  employment_type TEXT,

  -- Application & dates
  apply_deadline TIMESTAMP,
  apply_url TEXT,
  notification_date DATE,
  application_start DATE,
  application_end DATE,

  -- Source & verification
  official_notification_url TEXT UNIQUE,
  source_url TEXT,
  advertisement_no TEXT,

  -- Status & visibility
  status TEXT DEFAULT 'open',  -- announced, open, closed, exam, result, archived
  review_status TEXT DEFAULT 'auto',  -- auto, reviewed, flagged
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  extraction_confidence NUMERIC,
  summary TEXT,
  summary_hi TEXT,
  selection_process JSONB,
  how_to_apply JSONB,
  documents_required JSONB,
  extra JSONB,

  -- Timestamps
  posted_date TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- UNIQUE constraint: one post per recruitment per title
  UNIQUE (recruitment_slug, title)
);

-- ========== STEP 2: Create performance indexes ==========
CREATE INDEX IF NOT EXISTS idx_jobs_exam_active ON public.jobs(exam_slug, is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_organization ON public.jobs(organization_slug);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON public.jobs(location_state);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_apply_deadline ON public.jobs(apply_deadline);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON public.jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_recruitment ON public.jobs(recruitment_slug);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON public.jobs(created_at DESC);

-- ========== STEP 3: Enable Row-Level Security ==========
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.jobs;
DROP POLICY IF EXISTS "Enable insert for admin" ON public.jobs;
DROP POLICY IF EXISTS "Enable update for admin" ON public.jobs;

-- Public read-only access (search engines, users, API)
CREATE POLICY "Enable read access for all users" ON public.jobs
  FOR SELECT
  USING (is_active = true);

-- Admin/service write access (for migrations and updates)
-- NOTE: Requires anon key with elevated permissions or a separate admin role
-- For now, migrations insert via direct connection
-- CREATE POLICY "Enable admin write" ON public.jobs
--   FOR ALL
--   USING (current_user_id() = auth.uid() AND is_admin())
--   WITH CHECK (current_user_id() = auth.uid() AND is_admin());

-- ========== STEP 4: Create views for common queries ==========
-- View for active jobs grouped by exam
CREATE OR REPLACE VIEW public.jobs_by_exam AS
SELECT
  exam_slug,
  exam_name,
  COUNT(*) as total_jobs,
  SUM(vacancies) as total_vacancies,
  MAX(apply_deadline) as latest_deadline
FROM public.jobs
WHERE is_active = true AND exam_slug IS NOT NULL
GROUP BY exam_slug, exam_name
ORDER BY latest_deadline DESC NULLS LAST;

-- View for active jobs by organization
CREATE OR REPLACE VIEW public.jobs_by_organization AS
SELECT
  organization_slug,
  organization,
  COUNT(*) as total_jobs,
  SUM(vacancies) as total_vacancies,
  MAX(apply_deadline) as latest_deadline
FROM public.jobs
WHERE is_active = true AND organization_slug IS NOT NULL
GROUP BY organization_slug, organization
ORDER BY latest_deadline DESC NULLS LAST;

-- View for jobs closing soon (next 30 days)
CREATE OR REPLACE VIEW public.jobs_closing_soon AS
SELECT
  recruitment_slug,
  post_slug,
  title,
  organization,
  exam_name,
  apply_deadline,
  vacancies,
  status
FROM public.jobs
WHERE is_active = true
  AND apply_deadline IS NOT NULL
  AND apply_deadline > NOW()
  AND apply_deadline <= NOW() + INTERVAL '30 days'
ORDER BY apply_deadline ASC;

-- ========== STEP 5: Migration instructions ==========
--
-- PHASE A: Data Migration (populate new jobs table)
-- Run separately after schema is created:
--
-- INSERT INTO public.jobs (
--   recruitment_slug, post_slug, title, title_hi,
--   organization, organization_slug, exam_name, exam_slug,
--   location, location_state,
--   vacancies, vacancies_breakdown, qualification, qualification_hi,
--   age_min, age_max, age_reference_date, age_relaxations,
--   salary_min, salary_max, pay_level, pay_scale_text, employment_type,
--   apply_deadline, apply_url, notification_date, application_start, application_end,
--   official_notification_url, source_url, advertisement_no,
--   status, review_status, is_active,
--   extraction_confidence, summary, summary_hi,
--   selection_process, how_to_apply, documents_required, extra,
--   posted_date, updated_at, created_at
-- )
-- SELECT
--   slug as recruitment_slug,
--   slug || '-' || LOWER(REPLACE(title, ' ', '-')) as post_slug,
--   title,
--   title_hi,
--   (SELECT name FROM public.organizations WHERE id = organization_id) as organization,
--   (SELECT slug FROM public.organizations WHERE id = organization_id) as organization_slug,
--   (SELECT name FROM public.exams WHERE id = exam_id) as exam_name,
--   (SELECT slug FROM public.exams WHERE id = exam_id) as exam_slug,
--   location,
--   location,
--   vacancies,
--   vacancies_breakdown,
--   qualification,
--   qualification_hi,
--   age_min,
--   age_max,
--   age_date_reference,
--   age_relaxations,
--   salary_min,
--   salary_max,
--   pay_level,
--   pay_scale,
--   employment_type,
--   application_end,
--   apply_url,
--   notification_date,
--   application_start,
--   application_end,
--   official_notification_url,
--   source_url,
--   advertisement_no,
--   stage as status,
--   review_status,
--   is_live as is_active,
--   extraction_confidence,
--   summary,
--   summary_hi,
--   selection_process,
--   how_to_apply,
--   documents_required,
--   extra_content as extra,
--   created_at as posted_date,
--   updated_at,
--   created_at
-- FROM public.postings
-- WHERE is_live = true OR is_live IS NULL
-- ON CONFLICT (post_slug) DO NOTHING;
--
--
-- PHASE B: Verify migration
-- SELECT
--   COUNT(*) as total_jobs,
--   COUNT(DISTINCT exam_slug) as total_exams,
--   COUNT(DISTINCT organization_slug) as total_orgs,
--   MAX(apply_deadline) as latest_deadline
-- FROM public.jobs;
--
--
-- PHASE C: Code migration
-- Update application code to use public.jobs instead of public.postings
-- See: MIGRATION_README.md in project root
--
--
-- PHASE D: Cleanup (after 1 week of clean redirect logs)
-- ALTER TABLE public.postings SET UNLOGGED;  -- Mark as read-only for archival
-- -- or DROP TABLE public.postings CASCADE; (only after confirming no dependencies)
--
--
-- NOTE: Do NOT drop public.exams, public.organizations, or public.categories
--       These are still used for faceted browse (/exams, /organizations, etc.)

-- ========== End of migration ==========
-- This migration creates the infrastructure for the new simple schema.
-- Data migration happens in a separate step to verify integrity.
