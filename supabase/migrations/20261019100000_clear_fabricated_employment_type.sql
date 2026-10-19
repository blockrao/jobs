-- Clear fabricated employment_type values on aggregator-sourced posts
--
-- 56 live posts from aggregator sources have employment_type set.
-- Per Phase 1 P0 rule (P0 item 9 — no fabricated/inferred facts):
--   employment_type MUST NOT appear on a page unless the value was explicitly
--   extracted from the official government notification.
--
-- These values were inferred from job titles and FJA aggregator text
-- (e.g., "Consultant" → CONTRACTOR, "Project Fellow" → TEMPORARY),
-- not from official notifications. They are fabricated facts.
--
-- The official_notification-sourced posts (2 rows) are kept — those
-- values came from reviewing actual government notifications.
--
-- Applied 2026-10-19 via Supabase MCP.

UPDATE posts
SET employment_type = NULL
WHERE "isLive" = true
  AND employment_type IS NOT NULL
  AND "sourceName" = 'aggregator';

-- Verify: should show 0 aggregator posts with employment_type remaining
-- SELECT COUNT(*) FROM posts WHERE "isLive" = true AND employment_type IS NOT NULL AND "sourceName" = 'aggregator';
