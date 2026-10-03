-- Migration: Schema Infrastructure Layer
-- Date: 2026-10-01
-- Purpose: Implement 5 architectural layers for provenance, identity, raw preservation, events, and eligibility

-- ========== LAYER 1: PROVENANCE TRACKING ==========

-- Enum: Source Authority Levels
CREATE TYPE source_authority AS ENUM ('OFFICIAL', 'TRUSTED_SECONDARY', 'AGGREGATED');

-- Table: Sources (where facts come from)
CREATE TABLE IF NOT EXISTS sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(100) NOT NULL, -- 'official_portal', 'trusted_secondary', 'aggregator', etc.
  base_url VARCHAR(512),
  authority source_authority NOT NULL,
  is_official BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sources_authority ON sources(authority);
CREATE INDEX idx_sources_active ON sources(active);

-- Table: Source Documents (audit trail with raw content)
CREATE TABLE IF NOT EXISTS source_documents (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  url VARCHAR(2048),
  document_type VARCHAR(100), -- 'notification', 'corrigendum', 'result', 'posting', etc.
  external_id VARCHAR(500), -- e.g., "No. 22/2026-RC" from the PDF
  published_at TIMESTAMP,
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  content_hash VARCHAR(64), -- SHA-256 hex
  raw_content TEXT, -- First ~10KB of raw text/HTML
  extracted_at TIMESTAMP,
  extraction_method VARCHAR(100), -- 'pdf_parser', 'html_scraper', 'api', etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_source_documents_source_id ON source_documents(source_id);
CREATE INDEX idx_source_documents_content_hash ON source_documents(content_hash);
CREATE INDEX idx_source_documents_external_id ON source_documents(external_id);
CREATE INDEX idx_source_documents_published_at ON source_documents(published_at);

-- ========== LAYER 2: RECRUITMENT IDENTITY & DEDUPLICATION ==========

-- Add new columns to recruitments table (identity signal fields)
ALTER TABLE recruitments
  ADD COLUMN IF NOT EXISTS official_notification_number VARCHAR(255),
  ADD COLUMN IF NOT EXISTS external_identifiers JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_document_id INTEGER REFERENCES source_documents(id) ON DELETE SET NULL;

-- Index for lookups (not unique — notification number can change/duplicate)
CREATE INDEX IF NOT EXISTS idx_recruitments_official_notification ON recruitments(organization_id, official_notification_number);
CREATE INDEX IF NOT EXISTS idx_recruitments_source_document ON recruitments(source_document_id);

-- ========== LAYER 3: RAW SOURCE PRESERVATION ==========

-- Add new columns to postings table (raw preservation chain)
ALTER TABLE postings
  ADD COLUMN IF NOT EXISTS source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_document_id INTEGER REFERENCES source_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS raw_title TEXT,
  ADD COLUMN IF NOT EXISTS raw_description TEXT,
  ADD COLUMN IF NOT EXISTS raw_content TEXT, -- Full original HTML/text from source
  ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64), -- SHA-256 for deduplication
  ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS extraction_method VARCHAR(100),
  ADD COLUMN IF NOT EXISTS application_deadline TIMESTAMP,
  ADD COLUMN IF NOT EXISTS exam_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS result_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS marked_expired_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_crawled_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_postings_source_id ON postings(source_id);
CREATE INDEX IF NOT EXISTS idx_postings_source_document_id ON postings(source_document_id);
CREATE INDEX IF NOT EXISTS idx_postings_content_hash ON postings(content_hash);
CREATE INDEX IF NOT EXISTS idx_postings_application_deadline ON postings(application_deadline);
CREATE INDEX IF NOT EXISTS idx_postings_exam_date ON postings(exam_date);
CREATE INDEX IF NOT EXISTS idx_postings_extracted_at ON postings(extracted_at);

-- ========== LAYER 4: CHANGE HISTORY & EVENTS ==========

-- Enum: Recruitment Event Types
CREATE TYPE recruitment_event_type AS ENUM (
  'NOTIFICATION_PUBLISHED',
  'APPLICATION_DEADLINE_EXTENDED',
  'APPLICATION_DEADLINE_SHORTENED',
  'CORRIGENDUM',
  'VACANCY_REVISED',
  'EXAM_DATE_CHANGED',
  'EXAM_POSTPONED',
  'RESULT_PUBLISHED',
  'INTERVIEW_SCHEDULE_RELEASED',
  'MERIT_LIST_RELEASED',
  'FINAL_RESULT_PUBLISHED',
  'OTHER'
);

-- Table: Recruitment Events (externally evidenced changes)
CREATE TABLE IF NOT EXISTS recruitment_events (
  id SERIAL PRIMARY KEY,
  recruitment_id INTEGER NOT NULL REFERENCES recruitments(id) ON DELETE CASCADE,
  event_type recruitment_event_type NOT NULL,
  event_date TIMESTAMP NOT NULL,
  title VARCHAR(500),
  description TEXT,
  changed_fields JSONB DEFAULT '{}'::jsonb, -- {field_name: {old: val, new: val}, ...}
  source_document_id INTEGER REFERENCES source_documents(id) ON DELETE SET NULL, -- Link to evidence
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recruitment_events_recruitment_id ON recruitment_events(recruitment_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_events_event_type ON recruitment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_recruitment_events_event_date ON recruitment_events(event_date);
CREATE INDEX IF NOT EXISTS idx_recruitment_events_source_document_id ON recruitment_events(source_document_id);

-- ========== LAYER 5: STRUCTURED & QUERYABLE ELIGIBILITY ==========

-- Add new column to eligibilities table
ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS has_alternatives BOOLEAN DEFAULT FALSE;

-- Table: Eligibility Alternatives (support OR conditions within AND context)
CREATE TABLE IF NOT EXISTS eligibility_alternatives (
  id SERIAL PRIMARY KEY,
  eligibility_id INTEGER NOT NULL REFERENCES eligibilities(id) ON DELETE CASCADE,
  alternative_order INTEGER NOT NULL, -- Order within OR group
  qualification_id INTEGER REFERENCES qualifications(id) ON DELETE SET NULL,
  age_min INTEGER,
  age_max INTEGER,
  experience_years_min DECIMAL(5, 2),
  experience_years_max DECIMAL(5, 2),
  additional_conditions TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_eligibility_alternatives_eligibility_id ON eligibility_alternatives(eligibility_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_alternatives_qualification_id ON eligibility_alternatives(qualification_id);

-- ========== QUALITY METRICS TABLE ==========

-- Table: Ingest Metrics (for tracking quality over time)
CREATE TABLE IF NOT EXISTS ingest_metrics (
  id SERIAL PRIMARY KEY,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metric_name VARCHAR(100) NOT NULL,
  metric_value INTEGER,
  metric_details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ingest_metrics_date_name ON ingest_metrics(metric_date, metric_name);
