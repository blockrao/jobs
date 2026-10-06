-- PQ-006: per-post facts and page model
-- Additive only — no existing column changes, no existing row changes.
-- A-080 approved 2026-10-06.

-- ── 1. New columns on posts ───────────────────────────────────────────────────

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS employing_organization_id integer
    REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_post_code varchar(100);

-- ── 2. New columns on eligibilities ──────────────────────────────────────────
-- These extend the existing (currently empty) table with richer structured
-- fields required for the leaf page and for the eligibility checker.

ALTER TABLE eligibilities
  ADD COLUMN IF NOT EXISTS age_as_on_date date,
  ADD COLUMN IF NOT EXISTS qualification_text text,
  ADD COLUMN IF NOT EXISTS qualification_expr jsonb,
  ADD COLUMN IF NOT EXISTS education_category varchar(50),
  ADD COLUMN IF NOT EXISTS experience_text text,
  ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;

-- ── 3. post_age_rules ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS post_age_rules (
  id            serial PRIMARY KEY,
  post_id       integer NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  category      varchar(50) NOT NULL,   -- UR, OBC, SC, ST, EWS, PwBD, ExSM, Govt
  max_age       smallint,
  relaxation_years smallint,
  note          text,
  created_at    timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE post_age_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON post_age_rules FOR SELECT USING (true);

-- ── 4. recruitment_fees ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recruitment_fees (
  id              serial PRIMARY KEY,
  recruitment_id  integer NOT NULL REFERENCES recruitments(id) ON DELETE CASCADE,
  category        varchar(50) NOT NULL,   -- General, OBC, SC, ST, EWS, PwBD, ExSM, All
  amount          integer,                -- INR; NULL means exempt / waived
  note            text,
  created_at      timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE recruitment_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON recruitment_fees FOR SELECT USING (true);

-- ── 5. position_aliases ───────────────────────────────────────────────────────
-- Maps normalised alias strings → positions.id for the title-match resolver.
-- A match here proposes a candidate; a human reviewer confirms (ARC-001 §3).

CREATE TABLE IF NOT EXISTS position_aliases (
  id          serial PRIMARY KEY,
  position_id integer NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  alias       varchar(300) NOT NULL,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (alias)
);

ALTER TABLE position_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON position_aliases FOR SELECT USING (true);

-- ── 6. evidence ───────────────────────────────────────────────────────────────
-- Every VERIFIED value in posts/eligibilities/post_age_rules must point to
-- at least one evidence row (ARC-001 rule 5).

CREATE TABLE IF NOT EXISTS evidence (
  id               serial PRIMARY KEY,
  source_document_id integer,            -- future FK to source_documents
  subject_type     varchar(50) NOT NULL, -- 'post', 'eligibility', 'age_rule', 'fee'
  subject_id       integer NOT NULL,
  field            varchar(100) NOT NULL,
  excerpt          text NOT NULL,
  page_ref         varchar(50),
  created_at       timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON evidence FOR SELECT USING (true);

-- Indexes for the common lookup patterns
CREATE INDEX IF NOT EXISTS evidence_subject_idx ON evidence (subject_type, subject_id);
CREATE INDEX IF NOT EXISTS post_age_rules_post_idx ON post_age_rules (post_id);
CREATE INDEX IF NOT EXISTS recruitment_fees_recruitment_idx ON recruitment_fees (recruitment_id);
