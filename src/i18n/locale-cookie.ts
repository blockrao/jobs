'use client';

// Shared client-side helpers for the visitor's saved language choice —
// used by every client component that needs to read or react to it
// (language-switcher.tsx, header.tsx, footer.tsx, ...), so they can't drift
// into separate cookie names or separate "did it change" logic.
//
// Same cookie name next-intl's own middleware reads for locale detection
// (src/proxy.ts's createMiddleware) — reusing it means a choice made here
// on a page with no Hindi template (home, /jobs, /search, ...) still takes
// effect automatically the next time the visitor lands on a page that does
// have one.
import type { Locale } from './request';

export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

// Dispatched on `window` right after the cookie is written, so other
// mounted client components (header/footer nav labels, anything else that
// renders text depending on locale) can update immediately without a full
// page navigation — a plain cookie write alone wouldn't notify components
// that already read it once on mount.
export const LOCALE_CHANGE_EVENT = 'joboye:locale-change';

export function readLocaleCookie(): Locale | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=(en|hi)(?:;|$)/);
  return match ? (match[1] as Locale) : null;
}

export function writeLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent<Locale>(LOCALE_CHANGE_EVENT, { detail: locale }));
}
