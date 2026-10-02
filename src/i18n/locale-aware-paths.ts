// Single source of truth for "which routes actually have a `[locale]`
// counterpart" — src/app/[locale]/articles|exams|organizations|jobs/[slug].
// Every other route (/news, /categories, /commissions/[slug], /positions,
// /recruitments, /search, the homepage, ...) only exists at its plain,
// non-prefixed path. Both src/proxy.ts (server-side routing) and
// language-switcher.tsx (client-side "which link should the हिन्दी/EN
// button build") need this exact list; keeping it in one place means they
// can't drift out of sync the way they did when the switcher assumed any
// page could be locale-prefixed and built dead /en/news, /en/categories,
// /en/search, ... links that 404 (no [locale] route matches them, and
// they're also not the bare-root case proxy.ts separately redirects).
export const LOCALE_AWARE_PREFIXES = ['/articles/', '/exams/', '/organizations/', '/jobs/'] as const;

// Strips a leading /en or /hi segment before checking, so callers can pass
// either an already-prefixed path (e.g. /hi/exams/foo) or a bare one.
const LOCALE_PREFIX_RE = /^\/(en|hi)(?=\/|$)/;

export function isLocaleAwarePath(pathname: string): boolean {
  const stripped = pathname.replace(LOCALE_PREFIX_RE, '') || '/';
  return LOCALE_AWARE_PREFIXES.some((prefix) => stripped.startsWith(prefix));
}
