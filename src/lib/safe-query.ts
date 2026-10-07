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
 *
 * DIAGNOSTIC: errors are logged with full detail so they surface in Vercel
 * function logs rather than silently becoming 404s. When the error is
 * persistent (not transient), the log shows the actual exception.
 */
export async function safeQuery<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Log with enough structure to diagnose in Vercel logs.
    // A missing record is not an error (queries return null); only thrown
    // exceptions reach here, which means a real DB/query failure.
    console.error(
      "[safeQuery] DB query threw — returning fallback instead of crashing.",
      {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : typeof error,
        errorStack: error instanceof Error ? error.stack?.split("\n").slice(0, 5).join(" | ") : undefined,
      }
    );
    return fallback;
  }
}
