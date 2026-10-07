-- Rollback: Remove posts inserted by the bulk vacancy-table decomposition
-- Reverses: 20261007280000_bulk_decompose_posts_from_vacancy_tables.sql
-- Removes posts for the 23 recruitments that had no posts before this migration.
-- Safe only if these recruitments still have no manually-created posts.

DELETE FROM public.posts
WHERE recruitment_id IN (
  SELECT r.id
  FROM public.postings p
  JOIN public.recruitments r ON r.id = p.inferred_recruitment_id,
  LATERAL jsonb_array_elements(p.extra_content->'tables') AS tbl
  WHERE r.status IN ('ACTIVE', 'UPCOMING')
    AND jsonb_array_length(tbl->'headers') >= 2
    AND (
      (tbl->'headers'->0)::text ILIKE '%post name%'
      OR (
        (tbl->'headers'->0)::text ILIKE '"S%'
        AND (tbl->'headers'->1)::text ILIKE '%post name%'
      )
    )
    AND (
      (tbl->'headers'->1)::text ~* 'vacanc|total post|no\.? of post'
      OR (
        (tbl->'headers'->0)::text ILIKE '"S%'
        AND (tbl->'headers'->2)::text ~* 'vacanc|total post|no\.? of post'
      )
    )
);
