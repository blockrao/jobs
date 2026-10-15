-- Migration: Phase 2 — Add parsed education/experience fields
-- Purpose: Store parsed education and experience requirements extracted from qualification text
-- for use in JobPosting schema enrichmentRequirements fields
--
-- These columns store the output of the qualification parser (src/lib/parsers/qualification-parser.ts)
-- to avoid re-parsing on every schema generation request.

ALTER TABLE public.post_enrichments
ADD COLUMN IF NOT EXISTS parsed_education_requirements jsonb COMMENT 'Array of parsed education requirements: [{level, field, credentialCategory}, ...]',
ADD COLUMN IF NOT EXISTS parsed_experience_requirements jsonb COMMENT 'Parsed experience requirement: {years, field, monthsOfExperience, description}',
ADD COLUMN IF NOT EXISTS parsed_skills text[] DEFAULT '{}' COMMENT 'Array of extracted technical skills from qualification text';

-- Add index for verification status + completeness queries
CREATE INDEX IF NOT EXISTS idx_post_enrichments_phase2_complete
ON public.post_enrichments(sourceVerificationStatus, (parsed_education_requirements IS NOT NULL));

COMMENT ON TABLE public.post_enrichments IS 'Enrichment data for individual job postings including parsed Phase 2 fields (educationRequirements, experienceRequirements)';
