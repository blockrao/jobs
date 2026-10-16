-- Migration: Consolidate post_enrichments into posts table
-- Phase 2 consolidation: moves all enrichment columns into posts table for simpler data model
-- Eliminates JOIN complexity and single source of truth for post data

-- Step 1: Add enrichment columns to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS
  -- Vacancies
  enrichment_vacancies_by_category jsonb,
  enrichment_vacancies_total integer,

  -- Application Fee
  enrichment_fees_by_category jsonb,
  enrichment_fee_note text,

  -- Age Limits
  enrichment_age_rules_by_category jsonb,
  enrichment_age_note text,
  enrichment_age_relaxation_rules text,
  enrichment_age_reference_date timestamptz,

  -- Pay & Salary
  enrichment_pay_scale text,
  enrichment_salary_min integer,
  enrichment_salary_max integer,
  enrichment_salary_note text,
  enrichment_pay_level text,

  -- Selection Process
  enrichment_selection_process jsonb,

  -- Important Dates
  enrichment_notification_date timestamptz,
  enrichment_application_open_date timestamptz,
  enrichment_application_closing_date timestamptz,
  enrichment_exam_date timestamptz,
  enrichment_admit_card_date timestamptz,
  enrichment_result_date timestamptz,
  enrichment_interview_schedule_date timestamptz,
  enrichment_appointment_date timestamptz,

  -- Eligibility Pathways
  enrichment_eligibility_pathways jsonb,

  -- Documents Required
  enrichment_documents_required jsonb,

  -- Duties & Responsibilities
  enrichment_duties text[],
  enrichment_responsibilities text[],

  -- Verification & Quality
  enrichment_source_verification_status text DEFAULT 'PENDING' CHECK (enrichment_source_verification_status IN ('VERIFIED', 'PENDING', 'UNVERIFIABLE')),
  enrichment_source_verification_date timestamptz,
  enrichment_extraction_confidence integer DEFAULT 0 CHECK (enrichment_extraction_confidence >= 0 AND enrichment_extraction_confidence <= 100),
  enrichment_data_gaps text[],

  -- Structured Education & Experience
  enrichment_education jsonb,
  enrichment_experience jsonb,

  -- Benefits
  enrichment_benefits text[],

  -- Enrichment metadata
  enrichment_id uuid,
  enrichment_created_at timestamptz,
  enrichment_updated_at timestamptz;

-- Step 2: Copy data from post_enrichments to posts
UPDATE public.posts p
SET
  enrichment_vacancies_by_category = pe.vacanciesByCategory,
  enrichment_vacancies_total = pe.vacanciesTotal,
  enrichment_fees_by_category = pe.feesByCategory,
  enrichment_fee_note = pe.feeNote,
  enrichment_age_rules_by_category = pe.ageRulesByCategory,
  enrichment_age_note = pe.ageNote,
  enrichment_age_relaxation_rules = pe.ageRelaxationRules,
  enrichment_age_reference_date = pe.ageReferenceDate,
  enrichment_pay_scale = pe.payScale,
  enrichment_salary_min = pe.salaryMin,
  enrichment_salary_max = pe.salaryMax,
  enrichment_salary_note = pe.salaryNote,
  enrichment_pay_level = pe.payLevel,
  enrichment_selection_process = pe.selectionProcess,
  enrichment_notification_date = pe.notificationDate,
  enrichment_application_open_date = pe.applicationOpenDate,
  enrichment_application_closing_date = pe.applicationClosingDate,
  enrichment_exam_date = pe.examDate,
  enrichment_admit_card_date = pe.admitCardDate,
  enrichment_result_date = pe.resultDate,
  enrichment_interview_schedule_date = pe.interviewScheduleDate,
  enrichment_appointment_date = pe.appointmentDate,
  enrichment_eligibility_pathways = pe.eligibilityPathways,
  enrichment_documents_required = pe.documentsRequired,
  enrichment_duties = pe.duties,
  enrichment_responsibilities = pe.responsibilities,
  enrichment_source_verification_status = pe.sourceVerificationStatus,
  enrichment_source_verification_date = pe.sourceVerificationDate,
  enrichment_extraction_confidence = pe.extractionConfidence,
  enrichment_data_gaps = pe.dataGaps,
  enrichment_education = pe.education,
  enrichment_experience = pe.experience,
  enrichment_benefits = pe.benefits,
  enrichment_id = pe.id,
  enrichment_created_at = pe.created_at,
  enrichment_updated_at = pe.updated_at
FROM public.post_enrichments pe
WHERE p.id = pe.post_id;

-- Step 3: Create indexes on key enrichment columns for query performance
CREATE INDEX IF NOT EXISTS idx_posts_enrichment_verification_status
  ON public.posts(enrichment_source_verification_status);
CREATE INDEX IF NOT EXISTS idx_posts_enrichment_closing_date
  ON public.posts(enrichment_application_closing_date);
CREATE INDEX IF NOT EXISTS idx_posts_enrichment_salary_min
  ON public.posts(enrichment_salary_min);
CREATE INDEX IF NOT EXISTS idx_posts_enrichment_salary_max
  ON public.posts(enrichment_salary_max);

-- Step 4: Add comments for documentation
COMMENT ON COLUMN public.posts.enrichment_vacancies_by_category IS 'Vacancies broken down by category (SC, ST, OBC, etc)';
COMMENT ON COLUMN public.posts.enrichment_education IS 'Required education qualifications';
COMMENT ON COLUMN public.posts.enrichment_experience IS 'Required experience qualifications';
COMMENT ON COLUMN public.posts.enrichment_selection_process IS 'Selection stages (written exam, interview, etc)';
COMMENT ON COLUMN public.posts.enrichment_documents_required IS 'Required documents for application';
COMMENT ON COLUMN public.posts.enrichment_source_verification_status IS 'Verification status: VERIFIED, PENDING, UNVERIFIABLE';
COMMENT ON COLUMN public.posts.enrichment_extraction_confidence IS 'Data quality score 0-100%';
