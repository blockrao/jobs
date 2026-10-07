-- Rollback for 20261007230000_enrich_posts_stpi_1247_to_1251.sql

UPDATE public.posts
SET
  source_post_code = NULL,
  salary_min       = NULL,
  salary_max       = NULL,
  pay_level        = NULL,
  updated_at       = NOW()
WHERE id IN (1247, 1248, 1249, 1250, 1251);
