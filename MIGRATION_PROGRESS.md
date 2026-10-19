# JobOye Surgical Migration Progress

**Mission:** Keep URLs identical, replace complex backend with simple MVP code.

## Step 1: Remove Complex Backend Code
- [ ] Remove src/db/operations/* (complex query logic)
- [ ] Remove src/ingest/* (pipeline code)
- [ ] Remove src/enrich/* (enrichment pipeline)
- [ ] Remove complex script dependencies

## Step 2: Simplify Codebase
- [ ] Keep src/app routes (URL structure must stay identical)
- [ ] Keep route handlers but simplify logic
- [ ] Remove references to jo/ingest schemas
- [ ] Update page.tsx files to use simple queries

## Step 3: Create New Schema
- [ ] Create 20261019_migrate_to_simple_jobs_table.sql migration
- [ ] Define simple jobs table (from MVP)
- [ ] Drop old jo/ingest schemas (after verification)
- [ ] Set up RLS policies

## Step 4: Verify URLs
- [ ] All /jobs/{recruitment-slug} routes work
- [ ] All /exams/{slug} routes work
- [ ] All /organizations/{slug} routes work
- [ ] No 404s on indexed pages

## Step 5: Deploy
- [ ] Updated repo ready for git push
- [ ] Migration file ready for Supabase
- [ ] README with deployment steps
- [ ] Vercel redeploy

