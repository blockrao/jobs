-- LIFE-002a: the public lifecycle can say "closed". Ledger A-089.
--
-- recruitment_status had UPCOMING, ACTIVE, RESULTS, ARCHIVED. With no CLOSED
-- member, refresh_recruitment_lifecycle() had to map a computed CLOSED back to
-- ACTIVE, so 442 recruitments whose application window has passed were stored,
-- listed and counted as active. Adding the value is additive; the mapping
-- change is a separate migration (a new enum value cannot be used in the
-- transaction that adds it).
ALTER TYPE public.recruitment_status ADD VALUE IF NOT EXISTS 'CLOSED' AFTER 'ACTIVE';
