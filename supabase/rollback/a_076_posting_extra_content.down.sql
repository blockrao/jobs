-- Rollback for 20261005100000_a_076_posting_extra_content.sql. Never applied automatically.
ALTER TABLE public.postings DROP COLUMN IF EXISTS extra_content;
