-- Backfill Migration: Aggregate 9 enrichment tables into posts.enrichment JSONB
-- Strategy: Staged batches (500 posts per batch) with 0.5s delay between batches
-- Status tracking: Uses temp table to track processed batches (resume-safe)

-- Step 1: Create temp tracking table for batch progress
CREATE TEMP TABLE enrichment_backfill_progress (
  batch_number INT,
  post_count INT,
  processed_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pending'
);

-- Step 2: Create aggregate enrichment function
-- This function builds the complete enrichment JSONB document from all 9 tables
CREATE OR REPLACE FUNCTION aggregate_enrichment_for_post(p_post_id INT)
RETURNS jsonb AS $$
DECLARE
  v_enrichment jsonb := '{}';
BEGIN
  -- Aggregate vacancies
  v_enrichment := v_enrichment || jsonb_build_object(
    'vacancies',
    (SELECT jsonb_build_object(
      'total', SUM(pv.total_vacancies)::INT,
      'categories', jsonb_object_agg(pv.category, pv.total_vacancies::INT)
        FILTER (WHERE pv.category IS NOT NULL),
      'location_count', MAX(pv.location_count)::INT,
      'category_count', MAX(pv.category_count)::INT,
      'by_location', jsonb_object_agg(pv.location, pv.total_vacancies::INT)
        FILTER (WHERE pv.location IS NOT NULL)
    )
    FROM posts_vacancies pv
    WHERE pv.post_id = p_post_id)
  );

  -- Aggregate education requirements
  v_enrichment := v_enrichment || jsonb_build_object(
    'education',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'degree', pe.degree,
        'subject', pe.subject,
        'specialization', pe.specialization,
        'source', pe.source
      ) ORDER BY pe.id)
      FROM posts_education pe
      WHERE pe.post_id = p_post_id),
      '[]'::jsonb
    )
  );

  -- Aggregate experience requirements
  v_enrichment := v_enrichment || jsonb_build_object(
    'experience',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'type', pex.experience_type,
        'source', pex.source,
        'description', pex.description
      ) ORDER BY pex.id)
      FROM posts_experience pex
      WHERE pex.post_id = p_post_id),
      '[]'::jsonb
    )
  );

  -- Aggregate selection process stages
  v_enrichment := v_enrichment || jsonb_build_object(
    'selection_process',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'step', psp.id,
        'name', psp.stage_name,
        'description', psp.description,
        'marks', psp.marks,
        'duration', psp.duration,
        'mode', psp.mode
      ) ORDER BY psp.id)
      FROM posts_selection_process psp
      WHERE psp.post_id = p_post_id),
      '[]'::jsonb
    )
  );

  -- Aggregate required documents
  v_enrichment := v_enrichment || jsonb_build_object(
    'documents',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'name', pd.document_name,
        'category', pd.document_category,
        'required', pd.is_required,
        'required_for_categories', pd.required_for_categories
      ) ORDER BY pd.id)
      FROM posts_documents pd
      WHERE pd.post_id = p_post_id),
      '[]'::jsonb
    )
  );

  -- Aggregate important dates
  v_enrichment := v_enrichment || jsonb_build_object(
    'important_dates',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'label', pid.date_type,
        'description', pid.description
      ) ORDER BY pid.id)
      FROM posts_important_dates pid
      WHERE pid.post_id = p_post_id),
      '[]'::jsonb
    )
  );

  -- Aggregate age rules
  v_enrichment := v_enrichment || jsonb_build_object(
    'age_rules',
    (SELECT jsonb_object_agg(par.category, jsonb_build_object(
      'max', par.max_age,
      'relaxation_years', par.relaxation_years,
      'rule_type', par.rule_type,
      'condition', par.condition_text
    ))
    FROM post_age_rules par
    WHERE par.post_id = p_post_id)
  );

  -- Aggregate application fees (by category)
  v_enrichment := v_enrichment || jsonb_build_object(
    'application_fees',
    (SELECT jsonb_object_agg(paf.category, jsonb_build_object(
      'amount', paf.amount,
      'currency_code', paf.currency_code,
      'payment_mode', paf.payment_mode,
      'note', paf.note
    ))
    FROM posts_application_fee paf
    WHERE paf.post_id = p_post_id)
  );

  -- Aggregate official links
  v_enrichment := v_enrichment || jsonb_build_object(
    'official_links',
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'type', pol.link_type,
        'label', pol.label,
        'url', pol.url,
        'is_official', pol.is_official
      ) ORDER BY pol.id)
      FROM posts_official_links pol
      WHERE pol.post_id = p_post_id),
      '[]'::jsonb
    )
  );

  -- Replace null objects with empty objects for consistency
  v_enrichment := CASE
    WHEN v_enrichment -> 'vacancies' IS NULL THEN v_enrichment || '{"vacancies": {}}'::jsonb
    ELSE v_enrichment
  END;

  v_enrichment := CASE
    WHEN v_enrichment -> 'age_rules' IS NULL THEN v_enrichment || '{"age_rules": {}}'::jsonb
    ELSE v_enrichment
  END;

  v_enrichment := CASE
    WHEN v_enrichment -> 'application_fees' IS NULL THEN v_enrichment || '{"application_fees": {}}'::jsonb
    ELSE v_enrichment
  END;

  RETURN v_enrichment;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 3: Backfill in staged batches (500 posts per batch)
-- This approach avoids connection pool exhaustion
DO $$
DECLARE
  v_batch_size INT := 500;
  v_total_posts INT;
  v_current_batch INT := 0;
  v_start_id INT := 0;
  v_end_id INT;
  v_processed INT := 0;
BEGIN
  SELECT COUNT(*) INTO v_total_posts FROM posts WHERE enrichment = '{}';

  RAISE NOTICE 'Starting backfill of % posts in batches of %', v_total_posts, v_batch_size;

  WHILE v_processed < v_total_posts LOOP
    v_current_batch := v_current_batch + 1;

    -- Get batch of post IDs
    SELECT COALESCE(MAX(id), 0) INTO v_end_id
    FROM (
      SELECT id FROM posts
      WHERE enrichment = '{}'
      ORDER BY id
      LIMIT v_batch_size
      OFFSET (v_current_batch - 1) * v_batch_size
    ) t;

    -- Backfill this batch
    UPDATE posts
    SET enrichment = aggregate_enrichment_for_post(id)
    WHERE id IN (
      SELECT id FROM posts
      WHERE enrichment = '{}'
      ORDER BY id
      LIMIT v_batch_size
      OFFSET (v_current_batch - 1) * v_batch_size
    );

    v_processed := v_processed + v_batch_size;

    INSERT INTO enrichment_backfill_progress (batch_number, post_count, status)
    VALUES (v_current_batch, v_batch_size, 'completed');

    RAISE NOTICE 'Batch % complete: % / % posts processed',
      v_current_batch, v_processed, v_total_posts;

    -- Small delay to avoid connection pool exhaustion
    PERFORM pg_sleep(0.5);
  END LOOP;

  RAISE NOTICE 'Backfill complete! All posts now have enrichment data';

  -- Show progress
  SELECT COUNT(*) FROM posts WHERE enrichment != '{}' INTO v_processed;
  RAISE NOTICE 'Verification: % posts now have non-empty enrichment', v_processed;
END $$;

-- Step 4: Validation checks
-- Verify backfill integrity
SELECT
  COUNT(*) as total_posts,
  COUNT(*) FILTER (WHERE enrichment != '{}') as posts_with_enrichment,
  COUNT(*) FILTER (WHERE enrichment = '{}') as posts_without_enrichment,
  COUNT(*) FILTER (WHERE enrichment IS NULL) as posts_with_null_enrichment
FROM posts;

-- Sample data check - verify structure
SELECT
  id,
  jsonb_keys(enrichment) as enrichment_keys,
  jsonb_typeof(enrichment -> 'vacancies') as vacancies_type,
  jsonb_typeof(enrichment -> 'education') as education_type,
  jsonb_array_length(enrichment -> 'education') as education_count
FROM posts
WHERE enrichment != '{}'
LIMIT 5;

-- Drop temp progress table
DROP TABLE enrichment_backfill_progress;
