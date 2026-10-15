-- Migration: Create organization_mapping table
-- Date: 2026-10-15
-- Purpose: Maintain authoritative mapping between official organization names and canonical org IDs

CREATE TABLE organization_mapping (
  id SERIAL PRIMARY KEY,
  official_name VARCHAR NOT NULL UNIQUE,
  canonical_org_id INTEGER NOT NULL REFERENCES organizations(id),
  match_score FLOAT,
  match_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for quick lookup
CREATE INDEX idx_org_mapping_official_name ON organization_mapping(official_name);
CREATE INDEX idx_org_mapping_canonical_id ON organization_mapping(canonical_org_id);

-- Table documentation
COMMENT ON TABLE organization_mapping IS 'Maps official names from FreeJobAlert notifications to canonical organization IDs. Enables consistent organization resolution across all ingest sources.';
COMMENT ON COLUMN organization_mapping.official_name IS 'Organization name as it appears in official notification';
COMMENT ON COLUMN organization_mapping.canonical_org_id IS 'Foreign key to organizations.id (canonical record)';
COMMENT ON COLUMN organization_mapping.match_score IS 'Fuzzy match score (0.0-1.0) used for matching. 1.0 = exact match.';
COMMENT ON COLUMN organization_mapping.match_method IS 'How match was determined: exact, fuzzy, manual, new_record';
