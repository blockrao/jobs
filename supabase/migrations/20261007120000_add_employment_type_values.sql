-- A-042: Extend employment_type enum with values needed for correct classification
-- Adds APPRENTICESHIP, DEPUTATION, FELLOWSHIP, INTERNSHIP, PERMANENT to the enum.
-- This is an additive-only change; no existing rows are affected.
-- All existing values remain valid.

ALTER TYPE employment_type ADD VALUE IF NOT EXISTS 'APPRENTICESHIP';
ALTER TYPE employment_type ADD VALUE IF NOT EXISTS 'DEPUTATION';
ALTER TYPE employment_type ADD VALUE IF NOT EXISTS 'FELLOWSHIP';
ALTER TYPE employment_type ADD VALUE IF NOT EXISTS 'INTERNSHIP';
ALTER TYPE employment_type ADD VALUE IF NOT EXISTS 'PERMANENT';
