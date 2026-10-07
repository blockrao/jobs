-- Rollback for 20261007200000_enrich_batch_256_to_440.sql
-- Restores the values recorded immediately before the migration was applied
-- (2026-10-07). Never applied automatically.

UPDATE public.postings SET employment_type = 'FULL_TIME',
  enrichment_source = NULL, enriched_at = NULL, enrichment_notes = NULL WHERE id = 256;
UPDATE public.postings SET employment_type = 'FULL_TIME', salary_max = NULL,
  enrichment_source = NULL, enriched_at = NULL, enrichment_notes = NULL WHERE id = 257;
UPDATE public.postings SET employment_type = 'FULL_TIME', salary_max = NULL,
  enrichment_source = NULL, enriched_at = NULL, enrichment_notes = NULL WHERE id = 273;
UPDATE public.postings SET apply_url = NULL,
  enrichment_source = NULL, enriched_at = NULL, enrichment_notes = NULL WHERE id = 317;
UPDATE public.postings SET employment_type = 'FULL_TIME', salary_max = NULL,
  enrichment_source = NULL, enriched_at = NULL, enrichment_notes = NULL WHERE id = 326;
UPDATE public.postings SET
  enrichment_source = NULL, enriched_at = NULL, enrichment_notes = NULL WHERE id = 329;
UPDATE public.postings SET employment_type = 'FULL_TIME', apply_url = NULL,
  enrichment_source = NULL, enriched_at = NULL, enrichment_notes = NULL WHERE id = 364;
UPDATE public.postings SET employment_type = 'FULL_TIME', salary_max = NULL,
  enrichment_source = NULL, enriched_at = NULL, enrichment_notes = NULL WHERE id = 368;
UPDATE public.postings SET employment_type = 'FULL_TIME', salary_max = NULL, apply_url = NULL,
  enrichment_source = NULL, enriched_at = NULL, enrichment_notes = NULL WHERE id = 418;
UPDATE public.postings SET salary_min = NULL, salary_max = NULL,
  enrichment_source = NULL, enriched_at = NULL, enrichment_notes = NULL WHERE id = 426;
UPDATE public.postings SET employment_type = 'FULL_TIME', salary_max = NULL,
  enrichment_source = NULL, enriched_at = NULL, enrichment_notes = NULL WHERE id = 440;
