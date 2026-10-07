-- Rollback for 20261007210000_enrich_batch_272_to_932.sql
-- Clears enrichment fields for all 29 postings touched in batch 3.
-- 329 was also touched in batch 2 (aggregator); this rollback resets it
-- fully to un-enriched state (enrichment_source = NULL).

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
WHERE id IN (272, 284, 304, 309, 329, 361, 419, 435, 452, 463,
             480, 488, 544, 549, 559, 687, 803, 896,
             318, 337, 377, 420, 669, 756, 801, 921, 922, 928, 932);
