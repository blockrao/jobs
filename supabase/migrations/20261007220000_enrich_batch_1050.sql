-- Enrichment batch 5: posting 1050 (priority)
-- Brief: docs/enrichment/ENRICHMENT_PIPELINE_BRIEF.md (rule 6: no pre-change
-- report for fill-only enrichment; enrichment_source is the audit trail).
-- Rollback: supabase/rollback/enrich_batch_1050.down.sql
--
-- Scope: fills NULL fields only (COALESCE); employment_type moved off FULL_TIME
-- default. No non-NULL salary, age, link, deadline, vacancy, title or slug
-- is overwritten. Fields the notification does not address are left NULL.

-- 1050 STPI Assistant/Administrative Officer and more (10 posts)
-- Source: https://stpi.in/sites/default/files/career-documents/notice_26.pdf
--   Employment Notice No. 2(4)/I/STPI-HQ/2026-27
--   employment_type FULL_TIME -> PERMANENT (Direct Recruitment / Absorption;
--     2-year probation then regularized)
--   salary_min 18000 already stored (Level 1 Office Attendant min) — no change
--   salary_max 142400 already stored (Level 7 Admin Officer max) — no change
--   age_limit_min/max left NULL: limits differ by post and mode
--     (DR: 30/32/34/36/40 by grade; Absorption: 56 for all)
--   apply_url NULL -> https://www.stpi.in (online only, no other mode accepted)
UPDATE public.postings
SET
  employment_type   = 'PERMANENT',
  apply_url         = COALESCE(apply_url, 'https://www.stpi.in'),
  enrichment_source = 'official_notification',
  enriched_at       = NOW(),
  enrichment_notes  = 'STPI Employment Notice 2(4)/I/STPI-HQ/2026-27. 10 posts: Office Attendant (3, Level-1), Jr Accounts Officer (1, Level-6), Asst Administrative Officer (3, Level-6), Administrative Officer (2, Level-7), one post unreserved. Direct Recruitment or Absorption basis; 2-year probation then regularized (PERMANENT). Salary already stored: Level-1 min Rs.18,000 to Level-7 max Rs.1,42,400/month. Age limits differ by post/mode: DR max 30 (AAO), 32 (Accounts), 34 (Admin Officer), 36 (Asst Admin), 40 (Attendant); Absorption max 56 all posts — age fields left NULL. Apply online only at www.stpi.in; closing 12.10.2026.'
WHERE id = 1050 AND employment_type = 'FULL_TIME' AND enrichment_source IS NULL;

-- Verify
SELECT id, employment_type, apply_url, enrichment_source, enriched_at
FROM public.postings
WHERE id = 1050;
