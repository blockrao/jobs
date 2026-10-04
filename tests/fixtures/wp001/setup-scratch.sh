#!/bin/bash
# Rebuilds the local scratch database used by the WP-001 readiness tests and dry run.
# Usage: PGHOST=localhost PGPORT=54329 PGUSER=postgres PGPASSWORD=... tests/fixtures/wp001/setup-scratch.sh
# The database MUST be UTF8: under SQL_ASCII, varchar(n) counts bytes and multi-byte text fails.
set -euo pipefail
export PGHOST=${PGHOST:-localhost} PGPORT=${PGPORT:-54329} PGUSER=${PGUSER:-postgres}
psql -q -d postgres -c "drop database if exists scratch" -c "create database scratch encoding 'UTF8' template template0 lc_collate 'C' lc_ctype 'C'"
export DATABASE_URL="postgres://$PGUSER:${PGPASSWORD}@$PGHOST:$PGPORT/scratch"
npx drizzle-kit push --force >/dev/null           # tables from src/db/schema.ts (includes the WP-001 tables)
# Use the real migration for the WP-001 tables, not drizzle-kit's rendering of schema.ts.
psql -q -d scratch -c "drop table if exists public.source_observations, public.organization_candidates, public.organization_aliases cascade" >/dev/null
psql -q -d scratch -v ON_ERROR_STOP=1 -f supabase/migrations/20261004060000_wp_001_observation_candidate_boundary.sql >/dev/null
psql -q -d scratch -v ON_ERROR_STOP=1 -f tests/fixtures/wp001/scratch-live-only.sql >/dev/null 2>&1
echo "scratch ready: $(psql -At -d scratch -c "select pg_encoding_to_char(encoding) from pg_database where datname='scratch'")"
