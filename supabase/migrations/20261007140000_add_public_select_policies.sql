-- Add public SELECT policies to canonical entity tables.
--
-- Context: posts, recruitments, organizations, positions, eligibilities,
-- and vacancies all have RLS enabled but no SELECT policy for the anon role.
-- The app connects via DATABASE_URL as the anon role (or equivalent), so
-- db.query.recruitments.findFirst / db.query.posts.findFirst return null —
-- identical to "not found" — on every call. This is why /jobs/[slug]/[post-slug]
-- pages 404 even when the data exists.
--
-- postings (the legacy table, used by /jobs/[slug] hub pages) already has
-- a selective SELECT policy and works. These canonical entity tables serve
-- public job listing pages and must be publicly readable.
--
-- No data is modified; this is a policy-only change.

-- recruitments
CREATE POLICY "public read"
  ON public.recruitments
  FOR SELECT
  USING (true);

-- posts
CREATE POLICY "public read"
  ON public.posts
  FOR SELECT
  USING (true);

-- organizations
CREATE POLICY "public read"
  ON public.organizations
  FOR SELECT
  USING (true);

-- positions
CREATE POLICY "public read"
  ON public.positions
  FOR SELECT
  USING (true);

-- eligibilities
CREATE POLICY "public read"
  ON public.eligibilities
  FOR SELECT
  USING (true);

-- vacancies
CREATE POLICY "public read"
  ON public.vacancies
  FOR SELECT
  USING (true);
