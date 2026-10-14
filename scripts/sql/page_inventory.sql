-- Page inventory: every public URL family with its index status and the
-- reason, computed with the same rules the pages use. Re-run any time
-- (Supabase SQL editor or the connector). Added by DISC-001 (2026-10-14).

WITH live_rec AS (
  SELECT r.id, r.slug, o.sector,
         (r.status IN ('ACTIVE','UPCOMING') AND (r.application_end_date IS NULL OR r.application_end_date > NOW())) AS is_live,
         (SELECT count(*) FROM public.posts p WHERE p.recruitment_id = r.id) AS post_count,
         (SELECT p1.slug FROM public.posts p1
            WHERE p1.recruitment_id = r.id
              AND (SELECT count(*) FROM public.posts p2 WHERE p2.recruitment_id = r.id) = 1
              AND p1.slug IS NOT NULL AND p1.title IS NOT NULL AND p1."officialSourceUrl" ~ '^https?://'
            LIMIT 1) AS single_leaf
  FROM public.recruitments r JOIN public.organizations o ON o.id = r.organization_id
  WHERE r.slug IS NOT NULL
),
post_rows AS (
  SELECT p.id, lr.is_live, lr.sector,
         CASE WHEN lr.sector = 'PRIVATE' THEN 'noindex: unresolved organisation'
              WHEN p.title IS NULL THEN 'noindex: no title'
              WHEN p."officialSourceUrl" !~ '^https?://' THEN 'noindex: no official source URL'
              ELSE 'indexable' END AS status
  FROM public.posts p JOIN live_rec lr ON lr.id = p.recruitment_id
  WHERE p.slug IS NOT NULL
),
rec_rows AS (
  SELECT id, is_live,
         CASE WHEN sector = 'PRIVATE' THEN 'noindex: unresolved organisation'
              WHEN single_leaf IS NOT NULL THEN 'canonical → its Post leaf (noindex, leaf indexable)'
              ELSE 'indexable' END AS status
  FROM live_rec
),
role_rows AS (
  SELECT po.id,
         CASE WHEN po.slug = 'category-other' THEN 'noindex: catch-all bucket'
              WHEN po.slug LIKE 'category-%' THEN 'noindex: coarse bucket'
              WHEN NOT EXISTS (SELECT 1 FROM public.posts p JOIN live_rec lr ON lr.id = p.recruitment_id WHERE p.position_id = po.id AND lr.is_live) THEN 'noindex: no live recruitment'
              ELSE 'indexable' END AS status
  FROM public.positions po
),
org_rows AS (
  SELECT o.id,
         CASE WHEN o.sector = 'PRIVATE' THEN 'noindex: unresolved organisation'
              WHEN NOT EXISTS (SELECT 1 FROM public.recruitments r WHERE r.organization_id = o.id) THEN 'noindex: no recruitments'
              ELSE 'indexable' END AS status
  FROM public.organizations o
)
SELECT '/jobs/{rec}/{post} (live)' AS family, status, count(*) FROM post_rows WHERE is_live GROUP BY status
UNION ALL SELECT '/jobs/{rec}/{post} (all)', status, count(*) FROM post_rows GROUP BY status
UNION ALL SELECT '/jobs/{rec} (live)', status, count(*) FROM rec_rows WHERE is_live GROUP BY status
UNION ALL SELECT '/jobs/{rec} (all)', status, count(*) FROM rec_rows GROUP BY status
UNION ALL SELECT '/posts/{role}', status, count(*) FROM role_rows GROUP BY status
UNION ALL SELECT '/organizations/{slug}', status, count(*) FROM org_rows GROUP BY status
UNION ALL SELECT '/categories/{sector}', 'indexable', 6
UNION ALL SELECT '/states/{state}', 'indexable when it has jobs', 36
UNION ALL SELECT '/positions/{slug}', '301 → /posts/{slug}', count(*) FROM public.positions
UNION ALL SELECT '/recruitments/{slug}', '308 → /jobs/{slug}', count(*) FROM public.recruitments WHERE slug IS NOT NULL
UNION ALL SELECT 'static (/, /jobs, /closing-soon, /categories, /organizations, /states, /exams, /articles, /news, /dashboard)', 'indexable', 10
UNION ALL SELECT 'internal (/search, /reports, /preview/*, /admin/*, /fja-review)', 'noindex', 5
ORDER BY 1, 2;
