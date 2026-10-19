-- Add enrichment JSONB column to jobs table
-- Purpose: Store enriched job posting data (salary details, qualifications, selection process, benefits, etc.)
-- Schema:
-- {
--   "salary": "string (e.g., '₹35,000-₹60,000/month')",
--   "qualifications": ["string array of qualifications"],
--   "experience_years": number or null,
--   "age_limit": "string (e.g., '18-30 years')",
--   "selection_process": ["string array of process steps"],
--   "benefits": ["string array of benefits"],
--   "last_updated": "ISO 8601 timestamp",
--   "enriched_by": "source identifier (e.g., 'admin_form')"
-- }

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS enrichment JSONB;

-- Create index for future queries on enrichment data
CREATE INDEX IF NOT EXISTS idx_jobs_enrichment_exists ON public.jobs (id)
WHERE enrichment IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.jobs.enrichment IS 'Admin-enriched job posting data: salary, qualifications, experience, age limit, selection process, and benefits';
