-- Rollback for 20261014040000_data_001a_post_enrichments_closing_date_nullable.sql.
-- Never applied automatically. Fails if any row holds NULL; that is intended —
-- restoring NOT NULL would force a fabricated value back in.
ALTER TABLE public.post_enrichments ALTER COLUMN "applicationClosingDate" SET NOT NULL;
