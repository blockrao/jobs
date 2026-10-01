-- ========================================================
-- Schema Infrastructure Layer - October 1, 2026
-- Adds provenance tracking, events, structured eligibility
-- ========================================================

-- 1. Create ENUM types
CREATE TYPE source_authority AS ENUM ('OFFICIAL', 'TRUSTED_SECONDARY', 'AGGREGATED');

CREATE TYPE recruitment_event_type AS ENUM (
  'NOTIFICATION_PUBLISHED',
  'APPLICATION_OPENED',
  'APPLICATION_DEADLINE_EXTENDED',
  'CORRIGENDUM',
  'VACANCY_REVISED',
  'EXAM_DATE_CHANGED',
  'EXAM_HELD',
  'ADMIT_CARD_RELEASED',
  'ANSWER_KEY_RELEASED',
  'RESULT_DECLARED',
  'FINAL_RESULT',
  'OTHER'
);

-- 2. Create SOURCES table (Authority Layer)
CREATE TABLE IF NOT EXISTS sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(80),
  base_url TEXT,
  authority source_authority NOT NULL DEFAULT 'AGGREGATED',
  is_official BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sources_authority_idx ON sources(authority);

-- 3. Create SOURCE_DOCUMENTS table (Document Provenance)
CREATE TABLE IF NOT EXISTS source_documents (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  url TEXT,
  document_type VARCHAR(80),
  external_id VARCHAR(200),
  published_at TIMESTAMP WITH TIME ZONE,
  discovered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  content_hash VARCHAR(64),
  raw_content TEXT,
  extracted_at TIMESTAMP WITH TIME ZONE,
  extraction_method VARCHAR(80),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS source_documents_source_idx ON source_documents(source_id);
CREATE INDEX IF NOT EXISTS source_documents_url_idx ON source_documents(url);
CREATE INDEX IF NOT EXISTS source_documents_content_hash_idx ON source_documents(content_hash);

-- 4. Create RECRUITMENT_EVENTS table (Lifecycle History)
CREATE TABLE IF NOT EXISTS recruitment_events (
  id SERIAL PRIMARY KEY,
  recruitment_id INTEGER NOT NULL REFERENCES recruitments(id) ON DELETE CASCADE,
  event_type recruitment_event_type NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  title VARCHAR(220),
  description TEXT,
  changed_fields JSONB,
  source_document_id INTEGER REFERENCES source_documents(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recruitment_events_recruitment_idx ON recruitment_events(recruitment_id);
CREATE INDEX IF NOT EXISTS recruitment_events_type_idx ON recruitment_events(event_type);
CREATE INDEX IF NOT EXISTS recruitment_events_date_idx ON recruitment_events(event_date);

-- 5. Create ELIGIBILITY_ALTERNATIVES table (OR Conditions)
CREATE TABLE IF NOT EXISTS eligibility_alternatives (
  id SERIAL PRIMARY KEY,
  eligibility_id INTEGER NOT NULL REFERENCES eligibilities(id) ON DELETE CASCADE,
  alternative_order SMALLINT NOT NULL,
  qualification_id INTEGER REFERENCES qualifications(id),
  age_min SMALLINT,
  age_max SMALLINT,
  experience_years_min SMALLINT,
  experience_years_max SMALLINT,
  additional_conditions TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS eligibility_alternatives_eligibility_idx ON eligibility_alternatives(eligibility_id);
CREATE INDEX IF NOT EXISTS eligibility_alternatives_order_idx ON eligibility_alternatives(eligibility_id, alternative_order);

-- 6. Modify RECRUITMENTS table (Add External Identity + Provenance)
ALTER TABLE recruitments 
ADD COLUMN IF NOT EXISTS official_notification_number VARCHAR(200),
ADD COLUMN IF NOT EXISTS external_identifiers JSONB,
ADD COLUMN IF NOT EXISTS source_document_id INTEGER REFERENCES source_documents(id);

CREATE INDEX IF NOT EXISTS recruitments_official_notification_idx 
  ON recruitments(organization_id, official_notification_number);
CREATE INDEX IF NOT EXISTS recruitments_source_document_idx 
  ON recruitments(source_document_id);

-- 7. Modify ELIGIBILITIES table (Add Alternative Support)
ALTER TABLE eligibilities
ADD COLUMN IF NOT EXISTS has_alternatives BOOLEAN DEFAULT false;

-- 8. Modify POSTINGS table (Raw Preservation + Expiry Tracking)
ALTER TABLE postings
ADD COLUMN IF NOT EXISTS source_id INTEGER REFERENCES sources(id),
ADD COLUMN IF NOT EXISTS source_document_id INTEGER REFERENCES source_documents(id),
ADD COLUMN IF NOT EXISTS raw_title TEXT,
ADD COLUMN IF NOT EXISTS raw_description TEXT,
ADD COLUMN IF NOT EXISTS raw_content TEXT,
ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS extraction_method VARCHAR(80),
ADD COLUMN IF NOT EXISTS application_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS exam_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS result_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS marked_expired_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_crawled_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS postings_source_id_idx ON postings(source_id);
CREATE INDEX IF NOT EXISTS postings_content_hash_idx ON postings(content_hash);
CREATE INDEX IF NOT EXISTS postings_application_deadline_idx ON postings(application_deadline);

-- 9. Update POSTINGS unique constraint to use new source_id
-- First, drop old unique index if it exists
DROP INDEX IF EXISTS postings_source_external_id_unique;

-- Create new unique index using source_id (if source_id is populated)
-- Note: Once source_id backfill is complete, this should be enforced
-- CREATE UNIQUE INDEX postings_source_id_external_id_unique 
--   ON postings(source_id, external_id) WHERE source_id IS NOT NULL;

-- ========================================================
-- Migration Notes:
-- 1. New tables and columns are created with IF NOT EXISTS
-- 2. Foreign keys reference new tables (sources, source_documents)
-- 3. Indexes are created for common query patterns
-- 4. No data migration in this file - separate backfill scripts needed
-- 5. Build hooks ensure deployment consistency
-- ========================================================
