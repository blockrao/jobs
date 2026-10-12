-- Migration: add official_notification_url to fja_job_inventory
--
-- Context: the extractor (scripts/fja-inventory.ts) now promotes the best
-- official PDF / gov.in link found on an FJA article page to a top-level
-- field instead of only storing it inside the details JSONB blob.
-- This makes it queryable without a JSON extract and enables the recruitment
-- verification pipeline to find it directly.
--
-- Backfill: rows that already have details->>'official_notification_url' set
-- (from the improved extractor) will be backfilled automatically in the
-- same transaction.  Older rows with no promoted URL stay null.

ALTER TABLE public.fja_job_inventory
  ADD COLUMN IF NOT EXISTS official_notification_url text;

-- Backfill from the details JSONB for any rows that already have it there
-- (populated by a re-run of the improved extractor before this migration
--  was applied, or test runs).
UPDATE public.fja_job_inventory
   SET official_notification_url = (details->>'official_notification_url')
 WHERE official_notification_url IS NULL
   AND details->>'official_notification_url' IS NOT NULL
   AND details->>'official_notification_url' <> '';

-- Index for the verification pipeline (bulk-find rows with a URL that
-- haven't been verified yet).
CREATE INDEX IF NOT EXISTS idx_fja_job_inventory_official_notification_url
  ON public.fja_job_inventory (official_notification_url)
  WHERE official_notification_url IS NOT NULL;
