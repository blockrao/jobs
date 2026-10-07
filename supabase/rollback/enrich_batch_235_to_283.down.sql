-- Rollback for 20261007190000_enrich_batch_235_to_283.sql
-- Restores the values recorded immediately before the migration was applied
-- (2026-10-07). Never applied automatically.

UPDATE public.postings SET employment_type = 'FULL_TIME', age_limit_max = NULL, apply_url = NULL,
  enrichment_source = NULL, enriched_at = NULL, enrichment_notes = NULL WHERE id = 235;
UPDATE public.postings SET employment_type = 'FULL_TIME', salary_max = NULL,
  enrichment_source = NULL, enriched_at = NULL, enrichment_notes = NULL WHERE id = 254;
UPDATE public.postings SET employment_type = 'FULL_TIME', salary_max = NULL,
  enrichment_source = NULL, enriched_at = NULL, enrichment_notes = NULL WHERE id = 260;
UPDATE public.postings SET employment_type = 'FULL_TIME',
  enrichment_source = NULL, enriched_at = NULL, enrichment_notes = NULL WHERE id = 272;
UPDATE public.postings SET employment_type = 'FULL_TIME', age_limit_min = NULL, age_limit_max = NULL,
  enrichment_source = NULL, enriched_at = NULL, enrichment_notes = NULL WHERE id = 283;
