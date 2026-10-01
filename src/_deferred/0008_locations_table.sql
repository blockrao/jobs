-- Migration: Geographic Structuring Foundation
-- Date: 2026-10-01
-- Purpose: Create locations hierarchy (state → district → city) for geo-filtering and analysis

-- ========== LOCATIONS TABLE ==========

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  state_code VARCHAR(2) NOT NULL,       -- e.g., "MH", "DL", "KA"
  state_name VARCHAR(80) NOT NULL,       -- e.g., "Maharashtra", "Delhi"
  district_name VARCHAR(100),            -- e.g., "Pune", "Mumbai (Suburban)" — nullable for state-only records
  city_name VARCHAR(100),                -- e.g., "Pune City" — nullable for district-only records
  latitude DECIMAL(9, 6),                -- e.g., 18.516726
  longitude DECIMAL(9, 6),               -- e.g., 73.856255

  -- Full hierarchy slug for filtering (e.g., "MH_Pune_Pune")
  slug VARCHAR(255) NOT NULL UNIQUE,

  -- Denormalized path for UI breadcrumbs / hierarchy
  hierarchy_path VARCHAR(255),           -- e.g., "Maharashtra > Pune > Pune City"

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for all filtering patterns
CREATE INDEX IF NOT EXISTS idx_locations_state_code ON locations(state_code);
CREATE INDEX IF NOT EXISTS idx_locations_state_name ON locations(state_name);
CREATE INDEX IF NOT EXISTS idx_locations_district ON locations(state_code, district_name) WHERE district_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_locations_city ON locations(state_code, district_name, city_name) WHERE city_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_locations_slug ON locations(slug);

-- Geospatial index (if PostGIS available; otherwise no-op)
CREATE INDEX IF NOT EXISTS idx_locations_geo ON locations USING GIST(ll_to_earth(latitude, longitude));

-- ========== WIRE POSTINGS TO LOCATIONS ==========

ALTER TABLE postings
  ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_postings_location_id ON postings(location_id);

-- ========== CLEANUP: CONSOLIDATE LOCATION COLUMNS ==========

-- Keep existing location_city, location_region, location_country for backward compatibility.
-- New UI prefers location_id → locations.* for hierarchical filtering.
-- Migration: Parse posting.location_city + location_region → match to locations → set location_id.
