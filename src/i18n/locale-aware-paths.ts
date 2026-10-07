// Single source of truth for "which routes actually have a `[locale]`
// counterpart" — src/app/[locale]/articles|exams|organizations|jobs/[slug]
// for detail pages, and src/app/[locale]/jobs, /exams, /commissions/[slug],
// /recruitments/[slug], /positions/[slug] for listing and entity pages.
// Every other route (/news, /categories, /search, the homepage, ...) only
// exists at its plain, non-prefixed path. Both src/proxy.ts (server-side
// routing) and language-switcher.tsx (client-side "which link should the
// हिन्दी/EN button build") need this exact list; keeping it in one place
// means they can't drift out of sync the way they did when the switcher
// assumed any page could be locale-prefixed and built dead /en/news,
// /en/categories, /en/search, ... links that 404 (no [locale] route
// matches them, and they're also not the bare-root case proxy.ts separately
// redirects).

// Detail-page prefixes: a slug must follow, e.g. /jobs/bpsc-tre-4
// NOTE: /jobs/ is special — only single-slug paths (/jobs/[slug]) have a
// [locale] counterpart. Post leaf pages (/jobs/[slug]/[post-slug]) only
// exist in (default) and must NOT pass through next-intl's middleware.
// That special case is handled explicitly in isLocaleAwarePath below.
export const LOCALE_AWARE_PREFIXES = [
  '/articles/',
  '/exams/',
  '/organizations/',
] as const;

// Entity / listing prefixes: the path itself (with no further slug) is
// a valid locale-aware destination. e.g. /hi/jobs, /hi/exams,
// /hi/commissions/bpsc, /hi/recruitments/bpsc-tre-4, /hi/positions/teacher.
const LOCALE_AWARE_ENTITIES = [
  '/commissions/',
  '/recruitments/',
  '/positions/',
] as const;

// Bare listing pages that live at exactly this path (no slug required).
const LOCALE_AWARE_LISTINGS = [
  '/jobs',
  '/exams',
] as const;

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

  // /jobs/[slug] — locale-aware (src/app/[locale]/jobs/[slug]/page.tsx exists)
  // /jobs/[slug]/[post-slug] — NOT locale-aware (only in (default) tree)
  // Distinguish by counting segments after /jobs/: exactly one → locale-aware.
  if (stripped.startsWith('/jobs/')) {
    const afterPrefix = stripped.slice('/jobs/'.length); // e.g. "bpsc-tre-4" or "bpsc-tre-4/some-post"
    if (afterPrefix.length > 0 && !afterPrefix.includes('/')) return true;
    // Two or more segments (post leaf): fall through, not locale-aware.
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
