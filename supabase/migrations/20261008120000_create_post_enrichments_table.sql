-- Migration: Create post_enrichments table for individual job posting enrichment data
-- Stores structured enrichment for each individual post with category-wise breakdowns,
-- selection processes, eligibility pathways, and verification metadata.

CREATE TABLE IF NOT EXISTS public.post_enrichments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE UNIQUE,

  -- Vacancies
  vacanciesByCategory jsonb,
  vacanciesTotal integer,

  -- Application Fee
  feesByCategory jsonb,
  feeNote text,

  -- Age Limits
  ageRulesByCategory jsonb,
  ageNote text,
  ageRelaxationRules text,
  ageReferenceDate timestamptz,

  -- Pay & Salary
  payScale text,
  salaryMin integer,
  salaryMax integer,
  salaryNote text,
  payLevel text,

  -- Selection Process
  selectionProcess jsonb,

  -- Important Dates
  notificationDate timestamptz,
  applicationOpenDate timestamptz,
  applicationClosingDate timestamptz NOT NULL,
  examDate timestamptz,
  admitCardDate timestamptz,
  resultDate timestamptz,
  interviewScheduleDate timestamptz,
  appointmentDate timestamptz,

  -- Eligibility Pathways
  eligibilityPathways jsonb,

  -- Documents Required
  documentsRequired jsonb,

  -- Duties & Responsibilities
  duties text[],
  responsibilities text[],

  -- Verification & Quality
  sourceVerificationStatus text DEFAULT 'PENDING' CHECK (sourceVerificationStatus IN ('VERIFIED', 'PENDING', 'UNVERIFIABLE')),
  sourceVerificationDate timestamptz NOT NULL DEFAULT NOW(),
  extractionConfidence integer DEFAULT 0 CHECK (extractionConfidence >= 0 AND extractionConfidence <= 100),
  dataGaps text[],

  -- Structured Education & Experience
  education jsonb,
  experience jsonb,

  -- Benefits
  benefits text[],

  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_post_enrichments_post_id ON public.post_enrichments(post_id);
CREATE INDEX idx_post_enrichments_verification_status ON public.post_enrichments(sourceVerificationStatus);
CREATE INDEX idx_post_enrichments_closing_date ON public.post_enrichments(applicationClosingDate);

-- Comments
COMMENT ON TABLE public.post_enrichments IS 'Enrichment data for individual job postings with category-wise breakdowns, selection process, and quality metadata';
COMMENT ON COLUMN public.post_enrichments.vacanciesByCategory IS 'JSON object with category names as keys and vacancy counts as values, e.g. {"General": 10, "SC": 2, "ST": 1}';
COMMENT ON COLUMN public.post_enrichments.feesByCategory IS 'JSON object with category names as keys and fees (integer or "Exempted" string) as values';
COMMENT ON COLUMN public.post_enrichments.ageRulesByCategory IS 'JSON object with category names as keys and {min, max} age objects as values';
COMMENT ON COLUMN public.post_enrichments.selectionProcess IS 'JSON array of selection stages with step, name, totalMarks, duration, minQualifyingMarks (by category), description';
COMMENT ON COLUMN public.post_enrichments.eligibilityPathways IS 'JSON array of eligibility pathways with pathway number, description, qualifications array, experienceYears';
COMMENT ON COLUMN public.post_enrichments.documentsRequired IS 'JSON object with "required" and "common" arrays of document names';
COMMENT ON COLUMN public.post_enrichments.education IS 'JSON object with degree, university, registration fields';
COMMENT ON COLUMN public.post_enrichments.experience IS 'JSON object with minYears, domains array, countedFrom text';
COMMENT ON COLUMN public.post_enrichments.extractionConfidence IS 'Percentage 0-100 indicating confidence level of extracted data';
