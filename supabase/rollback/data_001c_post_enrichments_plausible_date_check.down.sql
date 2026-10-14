-- Rollback for 20261014040200_data_001c_post_enrichments_plausible_date_check.sql.
-- Never applied automatically.
ALTER TABLE public.post_enrichments DROP CONSTRAINT IF EXISTS post_enrichments_dates_plausible;
