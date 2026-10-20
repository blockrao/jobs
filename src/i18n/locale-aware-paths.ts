// Single source of truth for "which routes actually have a `[locale]`
// counterpart. PHASE 2 (2026-10-19+): ALL locale-based routes have been removed.
// The src/app/[locale] directory no longer exists. All routes are now canonical
// unprefixed paths in src/app/(default).
//
// This list is kept empty to prevent next-intl middleware from trying to add
// locale prefixes to URLs. With localePrefix: 'always', any path listed here
// would be redirected to /en/... or /hi/..., which no longer exist.
//
// Both src/proxy.ts (server-side routing) and language-switcher.tsx need this
// list to remain accurate.

// Detail-page prefixes: NONE (all routes removed in Phase 2)
export const LOCALE_AWARE_PREFIXES = [] as const;

// Entity / listing prefixes: the path itself (with no further slug) is
// a valid locale-aware destination. e.g. /hi/jobs, /hi/exams,
// /hi/commissions/bpsc, /hi/recruitments/bpsc-tre-4, /hi/positions/teacher.
const LOCALE_AWARE_ENTITIES = [
  '/commissions/',
  '/recruitments/',
  '/positions/',
] as const;

// Bare listing pages that live at exactly this path (no slug required).
// PHASE 2: ALL listing pages removed (no longer have [locale] variants)
const LOCALE_AWARE_LISTINGS = [] as const;

// Strips a leading /en or /hi segment before checking, so callers can pass
// either an already-prefixed path (e.g. /hi/exams/foo) or a bare one.
const LOCALE_PREFIX_RE = /^\/(en|hi)(?=\/|$)/;

export function isLocaleAwarePath(pathname: string): boolean {
  const stripped = pathname.replace(LOCALE_PREFIX_RE, '') || '/';

  // Detail-page prefixes: require a slug after the prefix, not just the
  // prefix itself — "/jobs/" with nothing after it would otherwise satisfy
  // `startsWith('/jobs/')` and get incorrectly routed through next-intl's
  // middleware, which has no match for a bare listing under [locale]/jobs/.
  if (LOCALE_AWARE_PREFIXES.some(
    (prefix) => stripped.startsWith(prefix) && stripped.length > prefix.length,
  )) return true;

  // JKSSB's temporary preview hub has a dedicated static route in (default).
  // Keep this exact path out of next-intl so it isn't rewritten to the generic
  // locale-aware job detail page, which cannot resolve the preview fixture.
  if (stripped === '/jobs/jkssb-advertisement-08-of-2026') return false;

  // PHASE 2: Job routes NO LONGER have locale variants. /jobs/[slug] and
  // /jobs/[recruitment-slug]/[post-slug] are not locale-aware anymore.
  // Do not route job paths through next-intl.
  if (stripped.startsWith('/jobs/')) {
    return false;
  }

  // Entity prefixes: require a slug after the prefix (same rule as above).
  if (LOCALE_AWARE_ENTITIES.some(
    (prefix) => stripped.startsWith(prefix) && stripped.length > prefix.length,
  )) return true;

  // Bare listing pages: exact match (or trailing slash).
  if (LOCALE_AWARE_LISTINGS.some(
    (listing) => stripped === listing || stripped === listing + '/',
  )) return true;

  // Listing pages also match with query strings (e.g. /hi/jobs?kind=GOVERNMENT).
  // The stripped path never includes a query string (pathname is already the
  // path segment), so the check above is sufficient.

  return false;
}
