-- Bulk decompose recruitment postings into individual Post rows
-- Source: extra_content.tables with vacancy-breakdown headers
-- Covers 23 ACTIVE/UPCOMING recruitments → 142 Post rows
-- Header patterns handled:
--   ["Post Name", "Total Posts" | "Vacancies" | "No. of Posts", ...]
--   ["S. No.", "Post Name", "No. of Posts", ...]
-- Skips "Total" rows. Vacancy count NULL when cell is "-" or blank.
-- Safe to re-run: guarded with WHERE NOT EXISTS per recruitment.
-- 2026-10-07

BEGIN;

INSERT INTO public.posts (
  recruitment_id,
  position_id,
  name,
  slug,
  vacancy_total,
  source_post_code
)
SELECT DISTINCT ON (r.id, slug_candidate)
  r.id,
  6,   -- position_id 6 = "Other" (generic fallback)
  post_name,
  slug_candidate,
  vacancy_int,
  NULL
FROM (
  SELECT
    r.id,
    trim(trim(
      CASE
        -- S. No. | Post Name | No. of Posts  →  name at index 1
        WHEN (tbl->'headers'->0)::text ILIKE '"S%'
             AND (tbl->'headers'->1)::text ILIKE '%post name%'
        THEN (row_data->1)::text
        -- Standard: Post Name | Total Posts | ...  →  name at index 0
        ELSE (row_data->0)::text
      END,
    '"')) AS post_name,
    regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(trim(trim(
            CASE
              WHEN (tbl->'headers'->0)::text ILIKE '"S%'
                   AND (tbl->'headers'->1)::text ILIKE '%post name%'
              THEN (row_data->1)::text
              ELSE (row_data->0)::text
            END,
          '"'))),
          '[^a-z0-9\s-]', '', 'g'
        ),
        '[\s-]+', '-', 'g'
      ),
      '^-|-$', '', 'g'
    ) AS slug_candidate,
    -- Parse first integer from vacancy cell (handles "15", "1 (OBC-1)", "33 (UR–19,...)")
    (regexp_match(
      trim(trim(
        CASE
          WHEN (tbl->'headers'->0)::text ILIKE '"S%'
               AND (tbl->'headers'->1)::text ILIKE '%post name%'
          THEN (row_data->2)::text
          ELSE (row_data->1)::text
        END,
      '"')),
      '^\d+'
    ))[1]::integer AS vacancy_int
  FROM public.postings p
  JOIN public.recruitments r ON r.id = p.inferred_recruitment_id,
  LATERAL jsonb_array_elements(p.extra_content->'tables') AS tbl,
  LATERAL jsonb_array_elements(tbl->'rows') AS row_data
  WHERE r.status IN ('ACTIVE', 'UPCOMING')
    AND jsonb_array_length(tbl->'headers') >= 2
    -- First column must be "Post Name" (standard) or "S. No." followed by "Post Name"
    AND (
      (tbl->'headers'->0)::text ILIKE '%post name%'
      OR (
        (tbl->'headers'->0)::text ILIKE '"S%'
        AND (tbl->'headers'->1)::text ILIKE '%post name%'
      )
    )
    -- Second column (or third in S.No pattern) must be a vacancy count column
    AND (
      (tbl->'headers'->1)::text ~* 'vacanc|total post|no\.? of post'
      OR (
        (tbl->'headers'->0)::text ILIKE '"S%'
        AND (tbl->'headers'->2)::text ~* 'vacanc|total post|no\.? of post'
      )
    )
) AS candidate
JOIN public.recruitments r ON r.id = candidate.id
WHERE
  -- Skip "Total" summary rows
  lower(post_name) NOT LIKE 'total%'
  -- Skip blank or pure-numeric rows (row indices that weren't filtered)
  AND post_name != ''
  AND post_name ~ '[a-zA-Z]'
  -- No posts yet for this recruitment (entire block is undecomposed)
  AND NOT EXISTS (
    SELECT 1 FROM public.posts po WHERE po.recruitment_id = r.id
  )
  -- Don't duplicate a slug we're about to insert (within this batch)
  AND NOT EXISTS (
    SELECT 1 FROM public.posts po2
    WHERE po2.recruitment_id = r.id
      AND po2.slug = slug_candidate
  )
ON CONFLICT DO NOTHING;

COMMIT;
