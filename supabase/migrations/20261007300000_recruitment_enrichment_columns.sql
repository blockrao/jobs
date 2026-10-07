-- Migration: Add enrichment columns to recruitments
-- Adds fee, apply URL, selection process, and age relaxation fields
-- that are populated from official government notifications.
-- These are the durable structured store; rendered through
-- recruitment_fees and selection_processes relations on the page.

ALTER TABLE recruitments
  ADD COLUMN IF NOT EXISTS fee_general        integer,
  ADD COLUMN IF NOT EXISTS fee_reserved       integer,
  ADD COLUMN IF NOT EXISTS fee_note           text,
  ADD COLUMN IF NOT EXISTS apply_url          text,
  ADD COLUMN IF NOT EXISTS selection_process  text,
  ADD COLUMN IF NOT EXISTS age_note           text;

COMMENT ON COLUMN recruitments.fee_general    IS 'Application fee in INR for general/unreserved category';
COMMENT ON COLUMN recruitments.fee_reserved   IS 'Application fee in INR for reserved categories (SC/ST/PwBD); 0 means NIL';
COMMENT ON COLUMN recruitments.fee_note       IS 'Full fee note as display text, e.g. SC/ST/PwBD: NIL; All Others: Rs. 500';
COMMENT ON COLUMN recruitments.apply_url      IS 'Official online application portal URL';
COMMENT ON COLUMN recruitments.selection_process IS 'Selection process description';
COMMENT ON COLUMN recruitments.age_note       IS 'Age relaxation rules as display text';
