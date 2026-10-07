-- Rollback for 20261007240000_enrich_posts_stpi_full.sql
-- Removes eligibility, age rule, selection process, and fee rows for STPI recruitment

DELETE FROM public.eligibilities WHERE post_id IN (1247, 1248, 1249, 1250, 1251);

DELETE FROM public.post_age_rules WHERE post_id IN (1247, 1248, 1249, 1250, 1251)
  AND category IN ('GENERAL', 'SC_ST', 'OBC', 'ABSORPTION');

DELETE FROM public.selection_processes WHERE recruitment_id = 1453;

DELETE FROM public.recruitment_fees WHERE recruitment_id = 1453;
