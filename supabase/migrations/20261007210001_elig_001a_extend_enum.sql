-- ELIG-001a: Extend qualification_level enum
-- Must be a separate transaction from any use of the new values (PostgreSQL restriction).
-- Applied 2026-10-07.

ALTER TYPE qualification_level ADD VALUE IF NOT EXISTS 'ITI'          AFTER 'SECONDARY';
ALTER TYPE qualification_level ADD VALUE IF NOT EXISTS 'DIPLOMA'       AFTER 'ITI';
ALTER TYPE qualification_level ADD VALUE IF NOT EXISTS 'PROFESSIONAL'  AFTER 'MASTER';
ALTER TYPE qualification_level ADD VALUE IF NOT EXISTS 'BELOW_10TH'   BEFORE 'SECONDARY';
