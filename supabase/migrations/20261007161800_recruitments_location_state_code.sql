-- Step B: add locationStateCode to recruitments for JobPosting addressRegion.
--
-- ISO 3166-2:IN codes (e.g. IN-RJ, IN-DL, IN-MH) are the correct
-- addressRegion value for JobPosting structured data (A-082 / PQ-006 §Schema.org).
-- The column is nullable: national-level recruitments (UPSC, SSC etc.) have
-- no single addressRegion and leave it NULL.
-- Enrichment sets this alongside stateSlug on postings.

ALTER TABLE public.recruitments
  ADD COLUMN IF NOT EXISTS location_state_code varchar(10);

COMMENT ON COLUMN public.recruitments.location_state_code IS
  'ISO 3166-2:IN state code for JobPosting addressRegion (e.g. IN-RJ). NULL for national recruitments.';
