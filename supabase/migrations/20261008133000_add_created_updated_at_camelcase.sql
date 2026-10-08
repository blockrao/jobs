-- Migration: Add createdAt and updatedAt columns to posts table
-- Provides camelCase versions of timestamps for consistency with other denormalized columns

-- Add camelCase timestamp columns
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT NOW();

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT NOW();

-- Backfill from existing snake_case columns if they exist
UPDATE public.posts
SET "createdAt" = created_at
WHERE "createdAt" IS NULL AND created_at IS NOT NULL;

UPDATE public.posts
SET "updatedAt" = updated_at
WHERE "updatedAt" IS NULL AND updated_at IS NOT NULL;

-- Create index for updatedAt since it might be used for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_posts_updated_at ON public.posts("updatedAt" DESC);

-- Add comments
COMMENT ON COLUMN public.posts."createdAt" IS 'Timestamp when post was created (camelCase version)';
COMMENT ON COLUMN public.posts."updatedAt" IS 'Timestamp when post was last updated (camelCase version)';
