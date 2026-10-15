-- Migration: Add official source tracking columns to posts table
-- Date: 2026-10-15
-- Purpose: Track posts ingested from official government notifications

ALTER TABLE posts
ADD COLUMN is_official_source BOOLEAN DEFAULT false,
ADD COLUMN original_recruitment_url TEXT;

-- Add index for filtering official source posts
CREATE INDEX idx_posts_is_official_source ON posts(is_official_source)
WHERE is_official_source = true;

-- Document change
COMMENT ON COLUMN posts.is_official_source IS 'TRUE for posts ingested from official government notifications (FreeJobAlert official tier)';
COMMENT ON COLUMN posts.original_recruitment_url IS 'URL of official PDF/notification that served as source for this post';
