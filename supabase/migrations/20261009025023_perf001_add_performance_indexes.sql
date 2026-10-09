-- PERF-001: Add critical performance indexes
-- Addresses N+1 query patterns and slow URL routing
-- References: performance diagnosis 2026-10-09

-- Index on postings.slug for getPostingBySlug() lookups
CREATE INDEX IF NOT EXISTS idx_postings_slug ON postings(slug);

-- Index on posts.slug for recruitment detail page queries
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);

-- Index on posts.recruitment_id for efficient recruitment→posts joins
CREATE INDEX IF NOT EXISTS idx_posts_recruitment_id ON posts(recruitment_id);

-- Index on vacancies.post_id for enrichment queries
CREATE INDEX IF NOT EXISTS idx_vacancies_post_id ON vacancies(post_id);

-- Index on eligibilities.post_id for enrichment queries
CREATE INDEX IF NOT EXISTS idx_eligibilities_post_id ON eligibilities(post_id);

-- Composite index for recruitment→posts→vacancies query patterns
CREATE INDEX IF NOT EXISTS idx_vacancies_post_recruitment ON vacancies(post_id)
  INCLUDE (recruitment_id);

-- Comment for ledger tracking
COMMENT ON INDEX idx_postings_slug IS 'PERF-001: Route detail pages by slug efficiently';
COMMENT ON INDEX idx_posts_slug IS 'PERF-001: Support recruitment queries by post slug';
COMMENT ON INDEX idx_posts_recruitment_id IS 'PERF-001: Eliminate N+1 in recruitment enrichment';
COMMENT ON INDEX idx_vacancies_post_id IS 'PERF-001: Support vacancy enumeration by post';
COMMENT ON INDEX idx_eligibilities_post_id IS 'PERF-001: Support eligibility enumeration by post';
