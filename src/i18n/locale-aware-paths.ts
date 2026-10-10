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
// /jobs/ has two real locale-aware shapes: the legacy one-segment route
// (/jobs/[slug]) and the canonical Post Leaf route
// (/jobs/[recruitment-slug]/[post-slug]). Keep this classifier aligned with
// the actual route tree; excluding the leaf here makes /hi Post Leaf URLs
// unreachable and also breaks the language switcher.
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

  // JKSSB's temporary preview hub has a dedicated static route in `(default)`.
  // Keep this exact path out of next-intl so it isn't rewritten to the generic
  // locale-aware job detail page, which cannot resolve the preview fixture.
  if (stripped === '/jobs/jkssb-advertisement-08-of-2026') return false;

  // Both concrete job-detail route shapes exist below [locale]:
  // /jobs/[slug] and /jobs/[recruitment-slug]/[post-slug].
  // Match exactly one or two path segments; do not accidentally route deeper
  // unknown paths through next-intl.
  if (stripped.startsWith('/jobs/')) {
    const afterPrefix = stripped.slice('/jobs/'.length);
    const segments = afterPrefix.split('/').filter(Boolean);
    if (segments.length === 1 || segments.length === 2) return true;
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
