-- Migration: Fix enrichment verification status for decomposed posts
-- Context: Decomposed posts had enrichment records created with PENDING verification
-- status and 0 confidence. These are canonical postings with official data,
-- not extracted data, so they should be marked VERIFIED with appropriate confidence.
--
-- Strategy: Update enrichment records for posts that have no FJA inventory link
-- (i.e., canonical posts, not aggregator-scraped ones). Set verification to
-- VERIFIED and recalculate confidence based on available salary/vacancy data.

UPDATE post_enrichments e
SET
  "sourceVerificationStatus" = 'VERIFIED',
  "extractionConfidence" = CASE
    WHEN e."salaryMin" IS NOT NULL AND e."salaryMax" IS NOT NULL THEN 85
    WHEN e."vacanciesTotal" IS NOT NULL THEN 70
    ELSE 60
  END,
  updated_at = NOW()
WHERE e.post_id IN (
  SELECT p.id FROM posts p
  WHERE NOT EXISTS (
    SELECT 1 FROM fja_post_inventory
    WHERE other_info_raw->>'canonical_post_id' = p.id::text
  )
  -- Only update enrichments that were PENDING (newly created by decomposition)
  AND e."sourceVerificationStatus" = 'PENDING'
);
