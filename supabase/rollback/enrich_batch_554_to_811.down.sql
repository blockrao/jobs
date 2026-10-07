-- Rollback for 20261007130435_enrich_batch_554_to_811.sql
-- Clears enrichment fields for all 20 postings touched in batch 4.

UPDATE public.postings
SET
  employment_type   = 'FULL_TIME',
  salary_min        = NULL,
  salary_max        = NULL,
  age_limit_min     = NULL,
  age_limit_max     = NULL,
  apply_url         = NULL,
  enrichment_source = NULL,
  enriched_at       = NULL,
  enrichment_notes  = NULL
WHERE id IN (292, 506, 554, 556, 557, 811,
             965, 1017, 1014, 1003, 297, 355, 698, 779, 357, 679, 525, 759, 248, 472);
