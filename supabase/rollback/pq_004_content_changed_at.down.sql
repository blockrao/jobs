-- Rollback for 20261005120000_pq_004_content_changed_at.sql. Never applied automatically.
-- Deploy code that no longer selects content_changed_at BEFORE running this.
ALTER TABLE public.postings DROP COLUMN IF EXISTS content_changed_at;
