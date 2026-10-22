-- Phase 4: Posting Locations Seeding
-- Populates posting_locations table with city-level posting data

-- Helper function to get state from recruitment
CREATE OR REPLACE FUNCTION get_recruitment_state(rec_id INTEGER)
RETURNS TEXT AS $$
SELECT state FROM recruitments WHERE id = rec_id LIMIT 1;
$$ LANGUAGE SQL;

-- State-to-cities mapping for common Indian government postings
INSERT INTO posting_locations (post_id, city, state, count)
SELECT
  p.id,
  city_data.city,
  city_data.state,
  CASE
    WHEN city_data.rank = 1 THEN GREATEST(1, FLOOR(p.vacancies * 0.5)::int)
    WHEN city_data.rank = 2 THEN GREATEST(1, FLOOR(p.vacancies * 0.3)::int)
    ELSE GREATEST(1, CEIL((p.vacancies * 0.2) / (city_data.rank - 1))::int)
  END as vacancy_count
FROM posts p
CROSS JOIN LATERAL (
  SELECT
    CASE
      WHEN get_recruitment_state(p.recruitment_id) IN ('Rajasthan', 'RJ') THEN
        ARRAY[('Jaipur', 'Rajasthan', 1), ('Jodhpur', 'Rajasthan', 2), ('Udaipur', 'Rajasthan', 3)]
      WHEN get_recruitment_state(p.recruitment_id) IN ('Delhi', 'DL') THEN
        ARRAY[('New Delhi', 'Delhi', 1), ('East Delhi', 'Delhi', 2)]
      WHEN get_recruitment_state(p.recruitment_id) IN ('Maharashtra', 'MH') THEN
        ARRAY[('Mumbai', 'Maharashtra', 1), ('Pune', 'Maharashtra', 2), ('Nagpur', 'Maharashtra', 3)]
      WHEN get_recruitment_state(p.recruitment_id) IN ('Karnataka', 'KA') THEN
        ARRAY[('Bangalore', 'Karnataka', 1), ('Mysore', 'Karnataka', 2), ('Mangalore', 'Karnataka', 3)]
      WHEN get_recruitment_state(p.recruitment_id) IN ('Tamil Nadu', 'TN') THEN
        ARRAY[('Chennai', 'Tamil Nadu', 1), ('Coimbatore', 'Tamil Nadu', 2), ('Madurai', 'Tamil Nadu', 3)]
      WHEN get_recruitment_state(p.recruitment_id) IN ('Uttar Pradesh', 'UP') THEN
        ARRAY[('Lucknow', 'Uttar Pradesh', 1), ('Kanpur', 'Uttar Pradesh', 2), ('Varanasi', 'Uttar Pradesh', 3), ('Agra', 'Uttar Pradesh', 4)]
      WHEN get_recruitment_state(p.recruitment_id) IN ('West Bengal', 'WB') THEN
        ARRAY[('Kolkata', 'West Bengal', 1), ('Darjeeling', 'West Bengal', 2), ('Siliguri', 'West Bengal', 3)]
      WHEN get_recruitment_state(p.recruitment_id) IN ('Gujarat', 'GJ') THEN
        ARRAY[('Ahmedabad', 'Gujarat', 1), ('Surat', 'Gujarat', 2), ('Vadodara', 'Gujarat', 3)]
      WHEN get_recruitment_state(p.recruitment_id) IN ('Haryana', 'HR') THEN
        ARRAY[('Faridabad', 'Haryana', 1), ('Gurgaon', 'Haryana', 2), ('Hisar', 'Haryana', 3)]
      WHEN get_recruitment_state(p.recruitment_id) IN ('Punjab', 'PB') THEN
        ARRAY[('Amritsar', 'Punjab', 1), ('Ludhiana', 'Punjab', 2), ('Chandigarh', 'Chandigarh', 3)]
      ELSE
        ARRAY[('New Delhi', 'Pan-India', 1), ('Mumbai', 'Pan-India', 2), ('Bangalore', 'Pan-India', 3)]
    END as cities_with_rank
) city_data,
LATERAL (
  SELECT
    (city_data.cities_with_rank)[i][1] as city,
    (city_data.cities_with_rank)[i][2] as state,
    (city_data.cities_with_rank)[i][3]::int as rank
  FROM generate_subscripts(city_data.cities_with_rank, 1) as i
) AS expanded
WHERE p.id NOT IN (
  SELECT DISTINCT post_id FROM posting_locations
)
LIMIT 2000;

-- Verify seeding
SELECT
  COUNT(*) as total_locations,
  COUNT(DISTINCT post_id) as posts_with_locations,
  AVG(count) as avg_vacancies_per_location
FROM posting_locations;

-- Show sample locations
SELECT
  p.id as post_id,
  p.title,
  STRING_AGG(pl.city || ' (' || pl.count || ')', ', ') as locations
FROM posts p
LEFT JOIN posting_locations pl ON p.id = pl.post_id
WHERE pl.id IS NOT NULL
GROUP BY p.id, p.title
LIMIT 10;
