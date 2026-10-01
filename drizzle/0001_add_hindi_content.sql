-- Migration: Add Hindi (hi) content columns for multilingual support
-- Date: 2026-10-01
-- Purpose: Enable JobOye to store and serve content in English (en) and Hindi (hi)

-- Add Hindi columns to postings table
ALTER TABLE postings
ADD COLUMN IF NOT EXISTS title_hi VARCHAR(220),
ADD COLUMN IF NOT EXISTS description_hi TEXT,
ADD COLUMN IF NOT EXISTS eligibility_hi TEXT,
ADD COLUMN IF NOT EXISTS responsibilities_hi TEXT,
ADD COLUMN IF NOT EXISTS requirements_hi TEXT,
ADD COLUMN IF NOT EXISTS age_relaxation_notes_hi TEXT,
ADD COLUMN IF NOT EXISTS location_city_hi VARCHAR(120),
ADD COLUMN IF NOT EXISTS language_default VARCHAR(10) DEFAULT 'en';

-- Add Hindi columns to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS name_hi VARCHAR(200),
ADD COLUMN IF NOT EXISTS description_hi TEXT;

-- Add Hindi columns to commissions table
ALTER TABLE commissions
ADD COLUMN IF NOT EXISTS name_hi VARCHAR(160),
ADD COLUMN IF NOT EXISTS description_hi TEXT;

-- Add Hindi columns to exams table
ALTER TABLE exams
ADD COLUMN IF NOT EXISTS label_hi VARCHAR(160),
ADD COLUMN IF NOT EXISTS description_hi TEXT,
ADD COLUMN IF NOT EXISTS eligibility_hi TEXT;

-- Add Hindi columns to articles table
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS title_hi VARCHAR(220),
ADD COLUMN IF NOT EXISTS dek_hi TEXT,
ADD COLUMN IF NOT EXISTS body_hi TEXT;

-- Add Hindi columns to categories table
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS name_hi VARCHAR(160),
ADD COLUMN IF NOT EXISTS description_hi TEXT;

-- Add Hindi columns to locations table (for display names)
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS state_name_hi VARCHAR(80),
ADD COLUMN IF NOT EXISTS district_name_hi VARCHAR(100),
ADD COLUMN IF NOT EXISTS city_name_hi VARCHAR(100);

-- Add posting_updates Hindi columns (for timeline entries)
ALTER TABLE posting_updates
ADD COLUMN IF NOT EXISTS title_hi VARCHAR(220),
ADD COLUMN IF NOT EXISTS description_hi TEXT;

-- Create indexes for Hindi content (for full-text search support)
CREATE INDEX IF NOT EXISTS postings_fts_hi_idx ON postings
USING GIN(to_tsvector('hindi', COALESCE(title_hi, '') || ' ' || COALESCE(description_hi, '')));

-- Create index for language detection
CREATE INDEX IF NOT EXISTS postings_language_idx ON postings(language_default);

-- Commit marker (comment for changelog)
-- Migration 0001: Hindi content columns added.
-- All *_hi columns are nullable to support gradual migration.
-- Existing postings will have English content; Hindi translation follows via background job or manual process.
