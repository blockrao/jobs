-- Fix post slugs where the recruitment slug prefix was incorrectly included.
-- Pattern: {recruitment-slug}-pl1-{post-name} → {post-name}
-- This migration attempted to strip using a LIKE match against the recruitment slug,
-- but was superseded by 20261007072340_fix_post_slug_strip_pl1_prefix.sql which
-- uses the -pl1- delimiter directly. This file is a no-op placeholder kept for
-- migration version continuity.
SELECT 1;
