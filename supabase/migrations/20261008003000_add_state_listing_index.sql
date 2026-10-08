-- MIG: Add composite index for state listing queries
--
-- The /states/[slug] pages query postings filtered by:
--   state_slug = $1 AND review_status = 'APPROVED' AND is_expired IS NOT TRUE
--   AND (valid_through IS NULL OR valid_through >= now()) AND index_tier IS DISTINCT FROM 'C'
-- ordered by date_posted DESC, id DESC
--
-- With only single-column indexes on state_slug and review_status, Postgres
-- intersects two large index scans and times out during Next.js static generation
-- (60s build limit). This composite index resolves all filter predicates in one
-- scan and supports the ORDER BY via the trailing date_posted/id columns.
--
-- CONCURRENTLY: no table lock, safe on live production.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_postings_state_listing
  ON public.postings (state_slug, date_posted DESC, id DESC)
  WHERE review_status = 'APPROVED'
    AND is_expired IS NOT TRUE
    AND (valid_through IS NULL OR valid_through >= now()::date)
    AND index_tier IS DISTINCT FROM 'C';
