/**
 * Runs a database query and returns `fallback` instead of throwing if it
 * fails (connection timeout, pool exhaustion, transient outage, etc).
 *
 * Detail pages (jobs/[slug], exams/[slug], organizations/[slug], ...) call
 * their lookup query directly in generateMetadata/the page body with no
 * try/catch, unlike generateStaticParams in these same files, which already
 * wraps its DB calls and falls back to an empty array. An uncaught query
 * error there crashes straight through to the root error boundary
 * (src/app/error.tsx) — a generic "Something went wrong" page — instead of
 * the existing, much friendlier "this isn't available" handling these pages
 * already have for a genuinely missing slug. Wrapping the lookup with this
 * (fallback: null, matching what "not found" already looks like in every
 * one of these queries) lets a transient DB hiccup degrade to that same
 * path instead of a hard crash.
 */
export async function safeQuery<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error("safeQuery: query failed, using fallback", error);
    return fallback;
  }
}
