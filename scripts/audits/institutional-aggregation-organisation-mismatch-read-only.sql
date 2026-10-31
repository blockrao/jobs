-- Recruitment/organisation identity mismatch audit — READ ONLY.
-- Scope: institutional_aggregation cohort only (4,002 records).
-- The token heuristic is a conservative publication-safety signal, not proof
-- of the correct organisation. It must not be used to rewrite foreign keys.

BEGIN READ ONLY;

WITH base AS (
  SELECT r.id, r.slug, r.name AS recruitment_name, r.organization_id,
         o.name AS organisation_name, o.slug AS organisation_slug,
         r.enrichment_data -> 'institution' ->> 'name' AS institution_name,
         r.verification_status::text AS verification_status,
         r.official_link_source, r.official_notification_url,
         (SELECT count(*) FROM public.posts p
          WHERE p.recruitment_id = r.id
            AND p.slug IS NOT NULL AND btrim(p.slug) <> ''
            AND p.posting_status IS DISTINCT FROM 'DUPLICATE') AS valid_post_leaves
  FROM public.recruitments r
  LEFT JOIN public.organizations o ON o.id = r.organization_id
  WHERE r.enrichment_data -> 'meta' ->> 'source' = 'institutional_aggregation'
),
tokens AS (
  SELECT b.*,
    ARRAY(
      SELECT DISTINCT regexp_replace(lower(t), 's$', '')
      FROM regexp_split_to_table(coalesce(b.institution_name, ''), '[^a-zA-Z0-9]+') t
      WHERE length(t) > 2
        AND lower(t) NOT IN (
          'indian','india','institute','institutes','of','the','and','for',
          'department','government','recruitment','jobs','job','board',
          'commission','authority','centre','center','one','stop','other',
          'post','posts','limited','ltd','company','corporation','national',
          'university','college','school','medical','sciences','science',
          'technology','public','service','services','assistant','reader',
          'professor','inspector','registrar','direct','aiims','nlu','iit','iiit'
        )
    ) AS issuer_tokens,
    ARRAY(
      SELECT DISTINCT regexp_replace(lower(t), 's$', '')
      FROM regexp_split_to_table(coalesce(b.recruitment_name, ''), '[^a-zA-Z0-9]+') t
      WHERE length(t) > 2
        AND lower(t) NOT IN (
          'indian','india','institute','institutes','of','the','and','for',
          'department','government','recruitment','jobs','job','board',
          'commission','authority','centre','center','one','stop','other',
          'post','posts','limited','ltd','company','corporation','national',
          'university','college','school','medical','sciences','science',
          'technology','public','service','services','assistant','reader',
          'professor','inspector','registrar','direct','aiims','nlu','iit','iiit'
        )
    ) AS recruitment_tokens,
    ARRAY(
      SELECT DISTINCT regexp_replace(lower(t), 's$', '')
      FROM regexp_split_to_table(coalesce(b.organisation_name, ''), '[^a-zA-Z0-9]+') t
      WHERE length(t) > 2
        AND lower(t) NOT IN (
          'indian','india','institute','institutes','of','the','and','for',
          'department','government','recruitment','jobs','job','board',
          'commission','authority','centre','center','one','stop','other',
          'post','posts','limited','ltd','company','corporation','national',
          'university','college','school','medical','sciences','science',
          'technology','public','service','services','assistant','reader',
          'professor','inspector','registrar','direct','aiims','nlu','iit','iiit'
        )
    ) AS organisation_tokens
  FROM base b
),
flags AS (
  SELECT *,
    EXISTS (
      SELECT 1 FROM unnest(issuer_tokens) i
      WHERE i = ANY(recruitment_tokens)
    ) AS issuer_matches_recruitment,
    EXISTS (
      SELECT 1 FROM unnest(issuer_tokens) i
      WHERE i = ANY(organisation_tokens)
    ) AS issuer_matches_organisation
  FROM tokens
),
candidates AS (
  SELECT *,
    (organisation_slug = 'unclassified-government-jobs') AS already_unresolved
  FROM flags
  WHERE issuer_matches_recruitment
    AND NOT issuer_matches_organisation
)
-- 1) Summary: 4,002 cohort, 51 mismatch candidates, 45 already unresolved,
--    6 resolved-organisation candidates requiring publication suppression.
SELECT count(*) AS cohort_records,
       count(*) FILTER (WHERE true) AS mismatch_candidates,
       count(*) FILTER (WHERE already_unresolved) AS already_noindex_placeholder,
       count(*) FILTER (WHERE NOT already_unresolved) AS resolved_organisation_mismatches,
       count(*) FILTER (WHERE NOT already_unresolved AND valid_post_leaves > 0) AS resolved_mismatches_with_valid_post_leaves,
       count(*) FILTER (WHERE NOT already_unresolved AND verification_status IN ('VERIFIED','MANUALLY_VERIFIED')) AS resolved_mismatches_marked_verified
FROM candidates;

COMMIT;

-- 2) Record-level mismatch manifest (run separately in a read-only transaction).
BEGIN READ ONLY;
WITH base AS (
  SELECT r.id, r.slug, r.name AS recruitment_name, r.organization_id,
         o.name AS organisation_name, o.slug AS organisation_slug,
         r.enrichment_data -> 'institution' ->> 'name' AS institution_name,
         r.verification_status::text AS verification_status,
         r.official_link_source, r.official_notification_url,
         (SELECT count(*) FROM public.posts p
          WHERE p.recruitment_id = r.id
            AND p.slug IS NOT NULL AND btrim(p.slug) <> ''
            AND p.posting_status IS DISTINCT FROM 'DUPLICATE') AS valid_post_leaves
  FROM public.recruitments r
  LEFT JOIN public.organizations o ON o.id = r.organization_id
  WHERE r.enrichment_data -> 'meta' ->> 'source' = 'institutional_aggregation'
),
tokens AS (
  SELECT b.*,
    ARRAY(SELECT DISTINCT regexp_replace(lower(t), 's$', '')
      FROM regexp_split_to_table(coalesce(b.institution_name, ''), '[^a-zA-Z0-9]+') t
      WHERE length(t) > 2 AND lower(t) NOT IN (
        'indian','india','institute','institutes','of','the','and','for','department',
        'government','recruitment','jobs','job','board','commission','authority',
        'centre','center','one','stop','other','post','posts','limited','ltd','company',
        'corporation','national','university','college','school','medical','sciences',
        'science','technology','public','service','services','assistant','reader',
        'professor','inspector','registrar','direct','aiims','nlu','iit','iiit'
      )) AS issuer_tokens,
    ARRAY(SELECT DISTINCT regexp_replace(lower(t), 's$', '')
      FROM regexp_split_to_table(coalesce(b.recruitment_name, ''), '[^a-zA-Z0-9]+') t
      WHERE length(t) > 2 AND lower(t) NOT IN (
        'indian','india','institute','institutes','of','the','and','for','department',
        'government','recruitment','jobs','job','board','commission','authority',
        'centre','center','one','stop','other','post','posts','limited','ltd','company',
        'corporation','national','university','college','school','medical','sciences',
        'science','technology','public','service','services','assistant','reader',
        'professor','inspector','registrar','direct','aiims','nlu','iit','iiit'
      )) AS recruitment_tokens,
    ARRAY(SELECT DISTINCT regexp_replace(lower(t), 's$', '')
      FROM regexp_split_to_table(coalesce(b.organisation_name, ''), '[^a-zA-Z0-9]+') t
      WHERE length(t) > 2 AND lower(t) NOT IN (
        'indian','india','institute','institutes','of','the','and','for','department',
        'government','recruitment','jobs','job','board','commission','authority',
        'centre','center','one','stop','other','post','posts','limited','ltd','company',
        'corporation','national','university','college','school','medical','sciences',
        'science','technology','public','service','services','assistant','reader',
        'professor','inspector','registrar','direct','aiims','nlu','iit','iiit'
      )) AS organisation_tokens
  FROM base b
),
flags AS (
  SELECT *,
    EXISTS(SELECT 1 FROM unnest(issuer_tokens) i WHERE i=ANY(recruitment_tokens)) AS issuer_matches_recruitment,
    EXISTS(SELECT 1 FROM unnest(issuer_tokens) i WHERE i=ANY(organisation_tokens)) AS issuer_matches_organisation
  FROM tokens
)
SELECT id,slug,recruitment_name,organization_id,organisation_name,organisation_slug,
       institution_name,verification_status,official_link_source,
       official_notification_url,valid_post_leaves,
       CASE WHEN organisation_slug='unclassified-government-jobs'
         THEN 'ALREADY_UNRESOLVED_NOINDEX'
         ELSE 'RESOLVED_ORGANISATION_CONFLICT_REVIEW'
       END AS disposition_candidate
FROM flags
WHERE issuer_matches_recruitment AND NOT issuer_matches_organisation
ORDER BY id;
COMMIT;

-- 3) Alias control: Engineers India / EIL Associate Engineer should not be
--    flagged by the distinctive-token mismatch rule because issuer and
--    organisation share the "engineer" identity token.
BEGIN READ ONLY;
SELECT r.id,r.name AS recruitment_name,o.name AS organisation_name,
       r.enrichment_data -> 'institution' ->> 'name' AS institution_name,
       r.verification_status::text AS verification_status
FROM public.recruitments r
LEFT JOIN public.organizations o ON o.id=r.organization_id
WHERE r.enrichment_data -> 'meta' ->> 'source'='institutional_aggregation'
  AND r.enrichment_data -> 'institution' ->> 'name' ILIKE '%Engineers India%'
ORDER BY r.id;
COMMIT;
