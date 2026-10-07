-- Rollback: Remove EIL Associate Engineer 2026 posts and recruitment
-- Reverses: 20261007260000_enrich_posts_eil_associate_engineer_2026.sql

DELETE FROM public.posts
WHERE recruitment_id = (
  SELECT id FROM public.recruitments WHERE slug = 'eil-associate-engineer-2026-bb35bb'
);

DELETE FROM public.recruitments WHERE slug = 'eil-associate-engineer-2026-bb35bb';
