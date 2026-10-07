-- Add enrichment tracking columns to postings.
-- These columns record whether a posting's structured fields have been
-- verified against its official notification, and by what method.
--
-- enrichment_source:
--   'official_notification' — fields were set from the official PDF/page
--   'aggregator'            — fields came from aggregator snippet only (default state)
--   NULL                    — not yet assessed
--
-- enriched_at: timestamp when enrichment was last applied
-- enrichment_notes: free text; used by automated pipeline to record
--   confidence issues, clauses that couldn't be parsed, etc.

ALTER TABLE public.postings
  ADD COLUMN IF NOT EXISTS enrichment_source  TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS enriched_at        TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS enrichment_notes   TEXT        DEFAULT NULL;

-- Mark the FACT posting we just enriched manually as done.
UPDATE public.postings
SET
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'Manual enrichment from Official Notification No. 7/2026 dated 01.10.2026'
WHERE id = 976;

COMMENT ON COLUMN public.postings.enrichment_source IS
  'Provenance of structured fields (salary, age, type, apply_url). official_notification = verified from issuing body doc; aggregator = scraped snippet only; NULL = not assessed.';
COMMENT ON COLUMN public.postings.enriched_at IS
  'When enrichment was last applied to this posting.';
COMMENT ON COLUMN public.postings.enrichment_notes IS
  'Pipeline or manual notes about the enrichment pass (confidence issues, unparsed clauses, etc.).';
