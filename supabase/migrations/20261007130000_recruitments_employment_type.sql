-- A-042b: Add employment_type to the recruitments table.
-- Defaults to FULL_TIME (matches existing behaviour for most Indian govt jobs).
-- The ingest pipeline can set this correctly per recruitment at write time.

ALTER TABLE recruitments
  ADD COLUMN IF NOT EXISTS employment_type employment_type NOT NULL DEFAULT 'FULL_TIME';
