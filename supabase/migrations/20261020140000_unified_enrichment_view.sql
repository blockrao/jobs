-- Migration: Create unified enrichment data view
-- Date: 2026-10-20
-- Purpose: Consolidate all post enrichment data (vacancies, education, experience, selection process, documents, dates, age rules) into single query result
-- Status: Phase 1 P0 - Data display unification

-- Drop existing view if it exists
DROP VIEW IF EXISTS post_complete_enrichment_data CASCADE;

-- Create unified view that aggregates all enrichment detail tables
CREATE OR REPLACE VIEW post_complete_enrichment_data AS
SELECT
  p.id,
  p.slug,
  p.title,
  p.description,
  p."organizationId",
  COALESCE(o.name, p."organizationName") as organization_name,
  p.location_city,
  p.location_state,
  p.location_country,
  p."isLive",
  p."postedAt",
  p."updatedAt",
  p."officialSourceUrl",
  p."applyPortalUrl",

  -- Core enrichment fields from post_enrichments
  pe.id as enrichment_id,
  pe."payScale",
  pe."salaryMin",
  pe."salaryMax",
  pe."eligibilityPathways",
  pe."applicationClosingDate",

  -- Aggregated detail data (as JSON objects for structured display)
  COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'id', pv.id,
      'total_vacancies', pv.total_vacancies,
      'category', pv.category,
      'location', pv.location,
      'location_count', pv.location_count,
      'category_count', pv.category_count,
      'source', pv.source
    ) ORDER BY pv.category) FILTER (WHERE pv.id IS NOT NULL),
    '[]'::jsonb
  ) as vacancies_detail,

  COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'id', pid.id,
      'date_type', pid.date_type,
      'date_value', pid.date_value
    ) ORDER BY pid.date_type) FILTER (WHERE pid.id IS NOT NULL),
    '[]'::jsonb
  ) as important_dates_detail,

  COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'id', psp.id,
      'stage_name', psp.stage_name,
      'description', psp.description,
      'stage_order', psp.stage_order
    ) ORDER BY psp.stage_order) FILTER (WHERE psp.id IS NOT NULL),
    '[]'::jsonb
  ) as selection_process_detail,

  COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'id', pd.id,
      'document_name', pd.document_name,
      'document_category', pd.document_category,
      'is_required', pd.is_required,
      'required_for_categories', pd.required_for_categories
    ) ORDER BY pd.document_category, pd.document_name) FILTER (WHERE pd.id IS NOT NULL),
    '[]'::jsonb
  ) as documents_detail,

  COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'id', pe_edu.id,
      'degree', pe_edu.degree,
      'subject', pe_edu.subject,
      'specialization', pe_edu.specialization,
      'minimum_percentage', pe_edu.minimum_percentage,
      'minimum_marks', pe_edu.minimum_marks,
      'source', pe_edu.source,
      'confidence_score', pe_edu.confidence_score
    ) ORDER BY pe_edu.degree) FILTER (WHERE pe_edu.id IS NOT NULL),
    '[]'::jsonb
  ) as education_detail,

  COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'id', pe_exp.id,
      'total_years', pe_exp.total_years,
      'min_years', pe_exp.min_years,
      'experience_type', pe_exp.experience_type,
      'source', pe_exp.source,
      'confidence_score', pe_exp.confidence_score
    ) ORDER BY pe_exp.experience_type) FILTER (WHERE pe_exp.id IS NOT NULL),
    '[]'::jsonb
  ) as experience_detail,

  COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'id', par.id,
      'age_min', par.age_min,
      'age_max', par.age_max,
      'category', par.category,
      'relaxation_years', par.relaxation_years
    ) ORDER BY par.category, par.age_min) FILTER (WHERE par.id IS NOT NULL),
    '[]'::jsonb
  ) as age_rules_detail

FROM posts p
LEFT JOIN organizations o ON o.id = p."organizationId"
LEFT JOIN post_enrichments pe ON pe.post_id = p.id
LEFT JOIN posts_vacancies pv ON pv.post_id = p.id
LEFT JOIN posts_important_dates pid ON pid.post_id = p.id
LEFT JOIN posts_selection_process psp ON psp.post_id = p.id
LEFT JOIN posts_documents pd ON pd.post_id = p.id
LEFT JOIN posts_education pe_edu ON pe_edu.post_id = p.id
LEFT JOIN posts_experience pe_exp ON pe_exp.post_id = p.id
LEFT JOIN post_age_rules par ON par.post_id = p.id

WHERE p."isLive" = true

GROUP BY
  p.id, p.slug, p.title, p.description, p."organizationId", o.name, p."organizationName",
  p.location_city, p.location_state, p.location_country, p."isLive", p."postedAt", p."updatedAt",
  p."officialSourceUrl", p."applyPortalUrl",
  pe.id, pe."payScale", pe."salaryMin", pe."salaryMax", pe."eligibilityPathways", pe."applicationClosingDate";

-- Grant view access
GRANT SELECT ON post_complete_enrichment_data TO anon, authenticated;

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_post_complete_enrichment_id ON posts(id) WHERE "isLive" = true;
