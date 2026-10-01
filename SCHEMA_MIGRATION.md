# Schema Migration: Ontology Freeze to Implementation

## Overview

Migrating from the current single-entity postings model to a normalized graph model with multiple canonical hubs.

**Current State**: `postings` table is the canonical entity. Exam linking is done via regex/inference at query time.

**Target State**: Multi-entity graph (Organization → Recruitment → Post → Position) with explicit relationships. Postings become data instances that reference the normalized graph.

---

## Migration Phases

### Phase 1: Create New Persistent Entities (No Breaking Changes)

These tables can be created alongside the existing schema without affecting production.

**Create Tables**:
1. `locations` — Geographic reference data
2. `qualifications` — Education level reference data
3. `organizations` — Enhanced (with roles array)
4. `exams` — Persistent exam definitions
5. `positions` — Evergreen normalized position concepts

**Effort**: ~2-3 hours

**Why non-breaking**: No changes to `postings` table yet. These are new reference tables only.

**Data**: Seed with:
- Indian states/UTs in `locations`
- Education levels (10th, 12th, Bachelor, Master, PhD) in `qualifications`
- All government exams in `exams` (SSC, UPSC, RRB, IBPS, State PSCs)
- Normalized positions in `positions` (Constable, Sub-Inspector, ASO, Clerk, etc.)

---

### Phase 2: Create Temporal & Normalized Entities

**Create Tables**:
1. `recruitments` — Specific recruitment campaigns
2. `selection_processes` — How candidates are selected
3. `posts` — Recruitment-specific roles
4. `eligibilities` — Structured eligibility dimensions
5. `vacancies` — Segmented opening counts

**Effort**: ~4-5 hours

**Why non-breaking**: No foreign keys from old `postings` table to these yet. These tables are independent.

**Data Population**:
- Manually seed key recruitments (SSC CGL 2024, UPSC CSE 2025, ITBP 2026, etc.)
- Infer Posts from existing postings' title patterns
- Extract Eligibility from existing postings' eligibility text (semi-manual or regex)
- Populate Vacancies from existing postings' vacancyTotal, ageLimitMin/Max, etc.

---

### Phase 3: Extend Postings Table (Backward Compatibility)

**Modify `postings` Table**:
```sql
ALTER TABLE postings ADD COLUMN inferred_recruitment_id INTEGER REFERENCES recruitments(id);
ALTER TABLE postings ADD COLUMN inferred_post_id INTEGER REFERENCES posts(id);
ALTER TABLE postings ADD COLUMN confidence_score SMALLINT;
ALTER TABLE postings ADD COLUMN is_canonical BOOLEAN DEFAULT false;
ALTER TABLE postings ADD COLUMN canonical_slug VARCHAR(220);
ALTER TABLE postings ADD COLUMN status VARCHAR(60) DEFAULT 'ACTIVE';
```

**Why non-breaking**: New columns are nullable. Old code continues to work. New code can use inferred relationships.

**Data**: Back-fill inferred relationships:
```sql
UPDATE postings
SET inferred_recruitment_id = (
  SELECT r.id FROM recruitments r
  WHERE postings.examId = r.examId
  ORDER BY r.year DESC
  LIMIT 1
),
status = 'ACTIVE'
WHERE inferred_recruitment_id IS NULL;
```

---

### Phase 4: Create SEO Layer & Canonical Pages Table

**Create Table**:
1. `canonical_pages` — Projections of graph entities for SEO/routing

**Effort**: ~1 hour

**Why non-breaking**: Purely additive; used by new routes.

---

### Phase 5: Update Routes & Query Logic (Gradual)

**Build new routes alongside old ones**:
- `/positions/[slug]` → Queries Position + related Posts + Recruitments + Postings
- `/exams/[slug]` → Queries Exam + related Recruitments + Posts
- `/recruitments/[slug]` → Queries Recruitment + all Posts + Vacancies
- `/jobs/[canonical-slug]` → Updated to show Posting + inferred Post + Recruitment + Position

**Old routes still work**: `/[exam-slug]` (exam hub) continues to function; gradually redirect to `/exams/[slug]`.

---

## SQL Migration Script (Phase 1-2)

```sql
-- ========== PHASE 1: Reference & Persistent Entities ==========

-- Locations
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  type VARCHAR(60) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS locations_slug_idx ON locations(slug);

-- Qualifications
CREATE TABLE IF NOT EXISTS qualifications (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  level VARCHAR(60) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS qualifications_slug_idx ON qualifications(slug);

-- Enhanced Organizations (if not using commissions renaming)
-- Note: Consider migrating commissions → organizations with roles
CREATE TABLE IF NOT EXISTS organizations_new (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(160) NOT NULL UNIQUE,
  roles organization_role[] DEFAULT '{}'::organization_role[],
  website TEXT,
  logo_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exams (independent of commissions)
CREATE TABLE IF NOT EXISTS exams_new (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations_new(id),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  short_name VARCHAR(80),
  category VARCHAR(80),
  frequency VARCHAR(60) DEFAULT 'ANNUAL',
  description TEXT,
  syllabus TEXT,
  exam_pattern TEXT,
  stages JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS exams_new_slug_idx ON exams_new(slug);
CREATE INDEX IF NOT EXISTS exams_new_organization_idx ON exams_new(organization_id);

-- Positions (evergreen career concepts)
CREATE TABLE IF NOT EXISTS positions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  category VARCHAR(60) NOT NULL,
  description TEXT,
  typical_qualification_id INTEGER REFERENCES qualifications(id),
  typical_age_min SMALLINT,
  typical_age_max SMALLINT,
  typical_salary_min INTEGER,
  typical_salary_max INTEGER,
  career_path JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS positions_slug_idx ON positions(slug);
CREATE INDEX IF NOT EXISTS positions_category_idx ON positions(category);

-- ========== PHASE 2: Temporal & Normalized Entities ==========

-- Recruitments (temporal campaigns)
CREATE TABLE IF NOT EXISTS recruitments (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations_new(id),
  exam_id INTEGER REFERENCES exams_new(id),
  year SMALLINT NOT NULL,
  name VARCHAR(220) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  status VARCHAR(60) NOT NULL DEFAULT 'UPCOMING',
  notification_date TIMESTAMP WITH TIME ZONE,
  application_start_date TIMESTAMP WITH TIME ZONE,
  application_end_date TIMESTAMP WITH TIME ZONE,
  exam_date TIMESTAMP WITH TIME ZONE,
  result_date TIMESTAMP WITH TIME ZONE,
  total_vacancies INTEGER,
  description TEXT,
  notification_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS recruitments_slug_idx ON recruitments(slug);
CREATE INDEX IF NOT EXISTS recruitments_organization_idx ON recruitments(organization_id);
CREATE INDEX IF NOT EXISTS recruitments_exam_idx ON recruitments(exam_id);
CREATE INDEX IF NOT EXISTS recruitments_status_idx ON recruitments(status);

-- Selection Processes
CREATE TABLE IF NOT EXISTS selection_processes (
  id SERIAL PRIMARY KEY,
  recruitment_id INTEGER NOT NULL REFERENCES recruitments(id) ON DELETE CASCADE,
  process_type VARCHAR(60) NOT NULL,
  stages JSONB,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS selection_processes_recruitment_idx ON selection_processes(recruitment_id);

-- Posts (recruitment-specific roles)
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  recruitment_id INTEGER NOT NULL REFERENCES recruitments(id) ON DELETE CASCADE,
  position_id INTEGER NOT NULL REFERENCES positions(id),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  description TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  pay_level JSONB,
  vacancy_total INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(recruitment_id, slug)
);
CREATE INDEX IF NOT EXISTS posts_recruitment_idx ON posts(recruitment_id);
CREATE INDEX IF NOT EXISTS posts_position_idx ON posts(position_id);

-- Eligibilities (structured dimensions per Post)
CREATE TABLE IF NOT EXISTS eligibilities (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  qualification_id INTEGER REFERENCES qualifications(id),
  age_min SMALLINT,
  age_max SMALLINT,
  experience_years_min SMALLINT,
  experience_years_max SMALLINT,
  domicile_type VARCHAR(60) DEFAULT 'ANY',
  domicile_value JSONB,
  physical_requirements TEXT,
  skills_required JSONB,
  citizenship VARCHAR(60) DEFAULT 'INDIAN',
  other_conditions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS eligibilities_post_idx ON eligibilities(post_id);

-- Vacancies (segmented opening counts)
CREATE TABLE IF NOT EXISTS vacancies (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  location_id INTEGER REFERENCES locations(id),
  category_type VARCHAR(60) NOT NULL,
  gender VARCHAR(20) DEFAULT 'ANY',
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, location_id, category_type, gender)
);
CREATE INDEX IF NOT EXISTS vacancies_post_idx ON vacancies(post_id);
CREATE INDEX IF NOT EXISTS vacancies_location_idx ON vacancies(location_id);

-- ========== PHASE 3: Extend Postings ==========

ALTER TABLE postings
  ADD COLUMN IF NOT EXISTS inferred_recruitment_id INTEGER REFERENCES recruitments(id),
  ADD COLUMN IF NOT EXISTS inferred_post_id INTEGER REFERENCES posts(id),
  ADD COLUMN IF NOT EXISTS confidence_score SMALLINT,
  ADD COLUMN IF NOT EXISTS is_canonical BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS canonical_slug VARCHAR(220),
  ADD COLUMN IF NOT EXISTS status VARCHAR(60) DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS postings_recruitment_idx ON postings(inferred_recruitment_id);
CREATE INDEX IF NOT EXISTS postings_post_idx ON postings(inferred_post_id);
CREATE INDEX IF NOT EXISTS postings_status_idx ON postings(status);

-- ========== PHASE 4: Canonical Pages ==========

CREATE TABLE IF NOT EXISTS canonical_pages (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(60) NOT NULL,
  entity_id INTEGER NOT NULL,
  slug VARCHAR(220) NOT NULL,
  status VARCHAR(60) DEFAULT 'ACTIVE',
  indexed BOOLEAN DEFAULT true,
  content_version INTEGER DEFAULT 1,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS canonical_pages_entity_idx ON canonical_pages(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS canonical_pages_slug_idx ON canonical_pages(slug);
```

---

## Data Seeding (Phase 1-2)

### Seed Locations
```sql
INSERT INTO locations (name, slug, type) VALUES
('Haryana', 'haryana', 'state'),
('Maharashtra', 'maharashtra', 'state'),
('Delhi', 'delhi', 'union_territory'),
-- ... all 28 states + 8 UTs
;
```

### Seed Qualifications
```sql
INSERT INTO qualifications (name, slug, level) VALUES
('10th / Secondary', '10th', 'SECONDARY'),
('12th / Senior Secondary', '12th', 'SENIOR_SECONDARY'),
("Bachelor's Degree", 'bachelor', 'BACHELOR'),
("Master's Degree", 'master', 'MASTER'),
('Ph.D.', 'phd', 'PHD');
```

### Seed Organizations & Exams
```sql
INSERT INTO organizations_new (name, slug, roles) VALUES
('Staff Selection Commission', 'ssc', ARRAY['EXAM_AUTHORITY'::organization_role]),
('Union Public Service Commission', 'upsc', ARRAY['EXAM_AUTHORITY'::organization_role]),
('Railway Recruitment Board', 'rrb', ARRAY['EXAM_AUTHORITY'::organization_role]),
('Central Reserve Police Force', 'crpf', ARRAY['RECRUITING_BODY'::organization_role, 'EMPLOYER'::organization_role]);

INSERT INTO exams_new (organization_id, name, slug, short_name, category, frequency) VALUES
(1, 'Staff Selection Commission - Combined Graduate Level', 'ssc-cgl', 'SSC CGL', 'Phase 1', 'ANNUAL'),
(1, 'Staff Selection Commission - Combined Higher Secondary', 'ssc-chsl', 'SSC CHSL', 'Phase 1', 'ANNUAL'),
(2, 'Union Public Service Commission - Civil Services', 'upsc-ias', 'UPSC CSE', 'Prelims/Mains', 'ANNUAL'),
-- ... more exams
;
```

### Seed Positions
```sql
INSERT INTO positions (name, slug, category, description) VALUES
('Constable', 'constable', 'POLICE', 'Entry-level law enforcement position'),
('Sub-Inspector', 'sub-inspector', 'POLICE', 'Mid-level police management'),
('Assistant Section Officer', 'aso', 'ADMINISTRATIVE', 'Frontline government administrative officer'),
-- ... more positions
;
```

---

## Implementation Checklist

- [ ] **Phase 1**: Create reference & persistent entity tables (locations, qualifications, organizations_new, exams_new, positions)
- [ ] **Data**: Seed all reference data (states, qualifications, major organizations, exams, positions)
- [ ] **Phase 2**: Create temporal & normalized tables (recruitments, selection_processes, posts, eligibilities, vacancies)
- [ ] **Data**: Populate recruitments, posts, eligibilities, vacancies (manual + backfill)
- [ ] **Phase 3**: Extend postings table (add inferred_* columns, status, confidence)
- [ ] **Backfill**: Auto-link existing postings to recruitments/posts
- [ ] **Phase 4**: Create canonical_pages table
- [ ] **Test**: Verify all foreign keys, unique constraints, indexes
- [ ] **Build**: Update scraper to populate new relationships (inferredRecruitmentId, inferredPostId)
- [ ] **Routes**: Build `/positions/[slug]`, `/recruitments/[slug]` routes
- [ ] **Deploy**: Release new routes alongside old ones (gradual transition)
- [ ] **Cleanup**: Archive old exam hub logic after new routes are stable

---

## Rollback Plan

If any phase fails:
1. **Phase 1-2**: Drop new tables (they're independent)
2. **Phase 3**: Remove new columns from postings (they're nullable)
3. **Phase 4**: Drop canonical_pages table
4. Old code continues to work unchanged

---

## Timeline Estimate

- **Phase 1**: ~2-3 hours (tables + seeding)
- **Phase 2**: ~4-5 hours (tables + data population)
- **Phase 3**: ~1-2 hours (schema + backfill)
- **Phase 4**: ~1 hour (table + indexing)
- **Testing**: ~2 hours
- **Routes**: ~4-6 hours (build Position/Recruitment hubs)
- **Deployment**: ~2 hours (rolling, with rollback readiness)

**Total**: ~16-20 hours over 2-3 days

---

## Next Steps

1. **Confirm** this migration plan (any changes?)
2. **Start Phase 1** (create tables + seed reference data)
3. **Test Phase 1** (verify schemas, indexes, foreign keys)
4. Proceed to Phase 2 once Phase 1 is stable
