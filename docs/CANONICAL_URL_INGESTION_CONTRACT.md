# Canonical URL contract for job ingestion

Status: required for all new ingestion and canonical post creation.

## Public URL contract

- Recruitment hub: `/jobs/{recruitment-slug}`
- Post leaf: `/jobs/{recruitment-slug}/{post-slug}`
- The recruitment slug identifies the recruitment notice.
- The post slug identifies only the individual role/post under that recruitment.
- The role slug must not repeat the recruitment slug, source URL, source hash, ingestion ID, classifier version, or generic `-jobs` suffix.
- Examples: `/jobs/wapcos-various-posts/site-engineer`, `/jobs/wapcos-various-posts/project-engineer`.

## Slug generation and collisions

The canonical writer creates role slugs from the normalized post name. The database enforces uniqueness within a recruitment using `(recruitment_id, slug)`. If two distinct role names normalize to the same slug, append a stable six-character hash suffix to the role slug. Do not silently attach a role to another role's URL.

Existing canonical slugs must not be rewritten during re-ingestion. If an existing URL is deliberately changed, add an explicit `slug_redirects` row and verify the old URL permanently redirects to the canonical URL. Do not create guessed/fuzzy redirects.

## Recruitment decomposition

- One recruitment notice can own multiple canonical post leaves.
- When a notice contains multiple distinct roles, create one post leaf per accepted role line.
- Do not publish a single aggregate leaf that combines several distinct roles.
- Duplicate/retired aggregate records must be marked `posting_status='DUPLICATE'` and `isLive=false`; route them to the recruitment hub only when the record is explicitly identified as a duplicate.
- A role URL must never be redirected to a different role merely because both roles appear in the same notice.

## Ingestion and release gates

1. Capture and deduplicate the source record; source URLs are identity/provenance inputs, not public canonical URLs.
2. Resolve the organization and recruitment using the canonical identity resolver. Hold ambiguous organizations and unresolved post lines for review.
3. Extract separate post lines from structured vacancy/post tables where available. Do not treat an aggregate headline as a role list.
4. Generate role-only post slugs with `postLineSlug`; do not use the legacy `deterministicSlug` for public post leaves.
5. Keep ingestion/review state separate from public publication. Do not mark a record public just because extraction succeeded.
6. Before promoting a batch, run the repository quality gates and check database invariants: one post per accepted role, no active duplicate aggregate, no conflicting slugs within a recruitment, and explicit redirects for any changed legacy slug.
7. After deployment, verify public URLs over HTTP: canonical hub and leaf return 200; legacy URLs return a single permanent redirect to the right hub/leaf; canonical tags and sitemap contain only the canonical URLs; no leaf is indexed under a legacy slug.
8. Do not treat the batch as verified until the production HTTP checks pass.

## Manual spot-check set

For each ingestion batch, test at least:
- one recruitment with one post;
- one recruitment with multiple posts;
- one role slug collision;
- one old slug with a redirect;
- one duplicate aggregate URL;
- one unknown URL, which must not be fuzzy-matched to an unrelated job.
