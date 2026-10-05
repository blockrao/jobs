-- A-076: structured page content for a posting (tables, FAQs, notices), additive and nullable.
-- Holds facts already verified against the official notification so the job page can show
-- level-wise tables and notice-specific FAQs without hand-built HTML. No existing row changes.
ALTER TABLE public.postings ADD COLUMN IF NOT EXISTS extra_content jsonb;
COMMENT ON COLUMN public.postings.extra_content IS
  'Optional structured page content: {tables:[{title,titleHi,headers,headersHi,rows,rowsHi}], notices:[{title,titleHi,body,bodyHi}], faqs:[{q,a,qHi,aHi}]}. Facts only, verified against the official notification.';
