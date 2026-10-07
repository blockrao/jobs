-- Rollback: Remove UPSC Advt No. 12/2026 posts and recruitment
-- Reverses: 20261007250000_enrich_posts_upsc_advt12_2026.sql

DELETE FROM public.posts
WHERE recruitment_id = (
  SELECT id FROM public.recruitments WHERE slug = 'upsc-advt-12-2026-92c97d'
);

DELETE FROM public.recruitments WHERE slug = 'upsc-advt-12-2026-92c97d';
