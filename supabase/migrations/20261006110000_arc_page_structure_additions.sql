-- ARC: Page structure additions
-- Adds advertisement_number to recruitments (for the hub page URL/breadcrumb)
-- Adds vacancy_details JSONB to posts (denormalised breakdown for the hub comparison table)
--
-- Both columns are nullable — existing rows are unaffected and continue to work.
-- No canonical-data mutation; no backfill; existing postings render unchanged.

-- recruitments: official advertisement / notification number
-- e.g. "12/2026" for UPSC Advt. No. 12/2026
ALTER TABLE recruitments
  ADD COLUMN IF NOT EXISTS advertisement_number text;

-- Optional: index for the hub page lookup ( /jobs/upsc-advt-12-2026 )
CREATE INDEX IF NOT EXISTS recruitments_advertisement_number_idx
  ON recruitments (advertisement_number)
  WHERE advertisement_number IS NOT NULL;

-- posts: vacancy breakdown as JSONB for hub comparison table
-- Shape: { ur: 4, ews: 1, obc: 2, sc: 1, st: 0, total: 8,
--          pwbdHorizontal: 1, pwbdCategory: "B/LV" }
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS vacancy_details jsonb;

-- Grant read access to the readonly role used by Next.js server components
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'readonly'
  ) THEN
    GRANT SELECT ON TABLE recruitments TO readonly;
    GRANT SELECT ON TABLE posts TO readonly;
  END IF;
END $$;
