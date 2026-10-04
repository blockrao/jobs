-- Rollback for 20261004060000_wp_001_observation_candidate_boundary.sql. Never applied automatically.
-- Drops three tables that only WP-001 creates. Data in them is lost; take a dump first if it matters.
drop table if exists public.source_observations;
drop table if exists public.organization_candidates;
drop table if exists public.organization_aliases;
