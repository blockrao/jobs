-- Rollback for 20261007220000_enrich_batch_1050.sql
-- Clears enrichment fields for posting 1050.

UPDATE public.postings
SET
  employment_type   = 'FULL_TIME',
  apply_url         = NULL,
  enrichment_source = NULL,
  enriched_at       = NULL,
  enrichment_notes  = NULL
WHERE id = 1050;
