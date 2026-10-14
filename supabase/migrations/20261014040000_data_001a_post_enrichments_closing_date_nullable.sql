-- DATA-001a: post_enrichments.applicationClosingDate becomes nullable.
--
-- The NOT NULL constraint is the structural cause of the fabricated deadlines
-- in production: a writer with no verified closing date was forced to store
-- something, and stored 2099-12-31 (38 rows) or the insert time (20 rows).
-- A missing deadline is a fact ("not yet verified"); the application already
-- models it as absent (PostEnrichment.applicationClosingDate is optional and
-- resolveDeadline() returns UNKNOWN). Ledger A-088.
ALTER TABLE public.post_enrichments
  ALTER COLUMN "applicationClosingDate" DROP NOT NULL;
