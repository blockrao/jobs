-- Fix postings RLS: allow all APPROVED postings regardless of source.
--
-- The previous policy (enrich_ro_read) restricted SELECT to rows where
-- source = 'freejobalert', making 770 APPROVED postings from other sources
-- (ext-1, ext-2, ext-3, ext-4, ext-5, manual) invisible to the app role.
-- This caused those job hub pages to return 404 in production.
--
-- The source column is an acquisition metadata field; it has no bearing on
-- whether a posting is suitable for public display. review_status = 'APPROVED'
-- is the correct and sufficient gate.

DROP POLICY IF EXISTS enrich_ro_read ON postings;

CREATE POLICY enrich_ro_read ON postings
  FOR SELECT
  USING (review_status = 'APPROVED');
