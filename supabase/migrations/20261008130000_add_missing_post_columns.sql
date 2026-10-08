-- Migration: Add missing columns to posts table for enriched job posting pages
-- Adds denormalized fields that the job posting page requires for direct querying
-- without needing complex joins

-- Add missing columns to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS title character varying;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS "organizationId" integer REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS "organizationName" character varying;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS "recruitmentId" integer;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS "recruitmentName" character varying;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS "recruitmentSlug" character varying;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS "examType" character varying;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS "examTypeSlug" character varying;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS "isLive" boolean DEFAULT true;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS "postedAt" timestamptz;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS "officialSourceUrl" text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS "applyPortalUrl" text;

-- Backfill the columns from related tables
UPDATE public.posts p
SET
  title = p.name,
  "recruitmentId" = p.recruitment_id,
  "recruitmentName" = r.name,
  "recruitmentSlug" = r.slug,
  "organizationId" = r.organization_id,
  "organizationName" = o.name,
  "examType" = e.label,
  "examTypeSlug" = e.slug,
  "postedAt" = COALESCE(r.notification_date, r.created_at, p.created_at),
  "officialSourceUrl" = r.notification_url,
  "applyPortalUrl" = r.apply_url,
  "isLive" = true
FROM public.recruitments r
LEFT JOIN public.organizations o ON r.organization_id = o.id
LEFT JOIN public.exams e ON r.exam_id = e.id
WHERE p.recruitment_id = r.id;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_posts_recruitment_slug ON public.posts("recruitmentSlug");
CREATE INDEX IF NOT EXISTS idx_posts_slug_recruitment_slug ON public.posts(slug, "recruitmentSlug");
CREATE INDEX IF NOT EXISTS idx_posts_is_live ON public.posts("isLive");
CREATE INDEX IF NOT EXISTS idx_posts_organization_id ON public.posts("organizationId");

-- Add comments
COMMENT ON COLUMN public.posts.title IS 'Denormalized job title from position name for direct access';
COMMENT ON COLUMN public.posts."organizationId" IS 'Foreign key to organizations table';
COMMENT ON COLUMN public.posts."organizationName" IS 'Denormalized organization name for display';
COMMENT ON COLUMN public.posts."recruitmentId" IS 'Foreign key to recruitments table';
COMMENT ON COLUMN public.posts."recruitmentName" IS 'Denormalized recruitment name for display';
COMMENT ON COLUMN public.posts."recruitmentSlug" IS 'URL slug for the recruitment';
COMMENT ON COLUMN public.posts."examType" IS 'Type/label of the exam/recruitment';
COMMENT ON COLUMN public.posts."examTypeSlug" IS 'URL slug for the exam type';
COMMENT ON COLUMN public.posts."isLive" IS 'Whether this posting is currently live and visible';
COMMENT ON COLUMN public.posts."postedAt" IS 'When this posting was released';
COMMENT ON COLUMN public.posts."officialSourceUrl" IS 'URL to official notification';
COMMENT ON COLUMN public.posts."applyPortalUrl" IS 'URL to official application portal';
