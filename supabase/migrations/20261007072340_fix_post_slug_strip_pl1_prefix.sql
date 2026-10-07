-- Strip the recruitment-slug prefix from post slugs that contain '-pl1-'.
-- At ingest, post slugs were generated as: {truncated-recruitment-slug}-pl1-{post-name}
-- We want just: {post-name}, unique within the recruitment.
--
-- For the rare cases where two posts in the same recruitment produce the same
-- post-name after stripping (genuine duplicate entries), we append -{id} to
-- keep slugs unique within the recruitment.

WITH
  -- Compute the proposed new slug for every affected post
  proposed AS (
    SELECT
      p.id,
      split_part(p.slug, '-pl1-', 2) AS new_slug
    FROM posts p
    WHERE p.slug LIKE '%-pl1-%'
  ),
  -- Find which proposed slugs collide within the same recruitment
  collision_ids AS (
    SELECT p.id
    FROM posts p
    JOIN proposed pr ON pr.id = p.id
    WHERE EXISTS (
      SELECT 1 FROM posts p2
      JOIN proposed pr2 ON pr2.id = p2.id
      WHERE p2.recruitment_id = p.recruitment_id
        AND p2.id != p.id
        AND pr2.new_slug = pr.new_slug
    )
  )
UPDATE posts
SET slug = CASE
  WHEN posts.id IN (SELECT id FROM collision_ids)
    THEN split_part(posts.slug, '-pl1-', 2) || '-' || posts.id::text
  ELSE
    split_part(posts.slug, '-pl1-', 2)
END
WHERE posts.slug LIKE '%-pl1-%';
