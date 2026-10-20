-- A-090 (2026-10-20): Data integrity repair for the 173-record batch created on
-- 2026-10-13 and "fixed" by PHASE1_ORG_FIX_173_RECRUITMENTS_2026_10_14.sql.
--
-- Evidence (read-only audit, 2026-10-20):
--   * 173 rows in recruitment_slug_redirects point to new_slug values that do not
--     exist (every one starts with "-": the first letter of each word was dropped
--     by a buggy slug generator). Each row carries the correct recruitment_id.
--   * The same 173 recruitments are single-post recruitments whose post still
--     carries recruitmentSlug "unknown-organization-…". The 2026-10-14 bulk fix
--     assigned 157 of them to four organisations (OSPCB 53, One Stop Centre
--     Sivasagar 42, Rajasthan DMHFW 42, SDAU Oilseeds 20). The official source
--     URLs on those records belong to unrelated bodies (Sainik Schools, Indian
--     Coast Guard, Karnataka ZP Belagavi, …). The organisation and recruitment
--     name on these records are therefore fabricated, not extracted.
--
-- Decision: identity cannot be inferred from a title or URL without the source
-- document, so the batch is QUARANTINED, not "fixed". Quarantined recruitments
-- are excluded from the listing, sitemap, hub and leaf routes (code guards on
-- recruitments.verification_status = 'QUARANTINED'). The redirect rows are
-- repaired from their own recruitment_id so no mapping points at a slug that
-- does not exist. Nothing is deleted; the previous values are kept in metadata.
--
-- Statements are independent (no transaction/temp tables) for the SQL editor.

-- 1. Record the quarantine on each affected recruitment (idempotent).
UPDATE recruitments r
SET verification_status = 'QUARANTINED',
    metadata = COALESCE(r.metadata, '{}'::jsonb) || jsonb_build_object(
      'quarantine', jsonb_build_object(
        'at', now(),
        'reason', 'A-090: organisation/recruitment identity fabricated by 2026-10-14 bulk org fix; source URL disagrees with assigned organisation',
        'previous_verification_status', r.verification_status,
        'previous_status', r.status::text
      )
    ),
    updated_at = now()
WHERE r.verification_status IS DISTINCT FROM 'QUARANTINED'
  AND EXISTS (
    SELECT 1 FROM recruitment_slug_redirects rr
    WHERE rr.recruitment_id = r.id
      AND NOT EXISTS (SELECT 1 FROM recruitments x WHERE x.slug = rr.new_slug)
  );

-- 2. Repair redirect targets from the row's own recruitment_id (idempotent).
UPDATE recruitment_slug_redirects rr
SET new_slug = r.slug
FROM recruitments r
WHERE r.id = rr.recruitment_id
  AND rr.new_slug IS DISTINCT FROM r.slug
  AND NOT EXISTS (SELECT 1 FROM recruitments x WHERE x.slug = rr.new_slug);

-- 3. Verification (expected: 0 invalid targets; 173 quarantined).
-- SELECT count(*) FROM recruitment_slug_redirects rr
--   WHERE NOT EXISTS (SELECT 1 FROM recruitments x WHERE x.slug = rr.new_slug);
-- SELECT count(*) FROM recruitments WHERE verification_status = 'QUARANTINED';

-- Rollback (restores the previous verification_status; redirect repair is kept
-- because the old targets were unreachable):
-- UPDATE recruitments
-- SET verification_status = metadata->'quarantine'->>'previous_verification_status',
--     metadata = metadata - 'quarantine',
--     updated_at = now()
-- WHERE verification_status = 'QUARANTINED'
--   AND metadata->'quarantine'->>'reason' LIKE 'A-090%';
