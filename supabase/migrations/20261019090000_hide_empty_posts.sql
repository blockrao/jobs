-- Hide empty posts that have zero factual content
-- Applied directly to production 2026-10-19 via Supabase MCP
--
-- Two categories hidden:
--
-- 1. Posts with recruitmentId IS NULL (1,428 posts)
--    All created 2026-10-15, sourceName='aggregator', position_id=6 (catch-all),
--    no organization, state, official URL, or description.
--    Cannot be linked to a recruitment without a data audit.
--
-- 2. Posts where title = recruitment.name (207 posts, ids 3642–3848)
--    These had their post title set to the FJA recruitment headline verbatim.
--    All 207 also have: organizationName=NULL, officialSourceUrl=NULL,
--    location_state=NULL, description=NULL, vacancy_total=NULL.
--    Zero useful content for display.
--
-- Both sets are hidden (isLive=false) rather than deleted.
-- They remain for potential data-track linkage in Phase 2.

-- Category 1: unlinked posts (recruitmentId IS NULL)
UPDATE posts
SET "isLive" = false
WHERE "recruitmentId" IS NULL
  AND "isLive" = true;

-- Category 2: posts where title matches recruitment headline exactly
UPDATE posts p
SET "isLive" = false
FROM recruitments r
WHERE r.id = p."recruitmentId"
  AND p."isLive" = true
  AND p.title = r.name;
