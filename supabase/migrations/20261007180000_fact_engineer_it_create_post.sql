-- Create position and canonical post for FACT Engineer (IT) recruitment 1379.
-- Posting 976 had post_names = ['Engineer (IT)'] but no row in public.posts,
-- so the hub page card showed "Detailed page coming soon" with no link.
-- Source: Official Notification No. 7/2026 dated 01.10.2026

INSERT INTO public.positions (name, slug, category)
VALUES ('Engineer (IT)', 'engineer-it', 'ENGINEERING')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.posts (recruitment_id, position_id, name, slug, salary_min, salary_max, vacancy_total)
SELECT
  1379,
  (SELECT id FROM public.positions WHERE slug = 'engineer-it'),
  'Engineer (IT)',
  'engineer-it',
  31000,
  31000,
  NULL  -- notification forms a panel; no fixed vacancy count stated
WHERE NOT EXISTS (
  SELECT 1 FROM public.posts WHERE recruitment_id = 1379 AND slug = 'engineer-it'
);
