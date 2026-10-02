'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { locales, defaultLocale, type Locale } from '@/i18n/request';
import { isLocaleAwarePath } from '@/i18n/locale-aware-paths';
import { readLocaleCookie, writeLocaleCookie } from '@/i18n/locale-cookie';
import { useNavigationProgress } from '@/components/navigation-progress';

// Matches a leading /en or /hi segment only (not "/articles/english-exam"
// or any other path that merely contains those letters).
const LOCALE_PREFIX_RE = /^\/(en|hi)(?=\/|$)/;

function localeFromPathname(pathname: string): Locale | null {
  const match = pathname.match(LOCALE_PREFIX_RE);
  return match ? (match[1] as Locale) : null;
}

const LABELS: Record<Locale, string> = {
  en: 'EN',
  hi: 'हिन्दी',
};

export function LanguageSwitcher() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { start } = useNavigationProgress();
  const [isPending, startTransition] = useTransition();
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);

  // The URL is authoritative when it carries an explicit /en or /hi prefix.
  // Otherwise — home, /jobs, /search, /exams, and every other page with no
  // [locale] counterpart (see src/app/[locale]/layout.tsx) — fall back to
  // the visitor's remembered cookie preference, so the button still
  // reflects their last choice instead of always resetting to "EN" the
  // moment they leave a translated page.
  const [cookieLocale, setCookieLocale] = useState<Locale | null>(null);
  useEffect(() => {
    setCookieLocale(readLocaleCookie());
  }, [pathname]);

  const locale: Locale = localeFromPathname(pathname) ?? cookieLocale ?? 'en';

  useEffect(() => {
    if (!isPending) setPendingLocale(null);
  }, [isPending]);

  const switchLanguage = (newLocale: Locale) => {
    if (newLocale === locale || isPending) return;

    writeLocaleCookie(newLocale);
    setCookieLocale(newLocale);

    // Strip only a genuine leading /en or /hi segment, never a mid-path
    // substring that happens to match.
    const pathWithoutLocale = pathname.replace(LOCALE_PREFIX_RE, '') || '/';

    // Only articles/exams/organizations/jobs detail pages actually have a
    // [locale] counterpart (src/i18n/locale-aware-paths.ts, shared with
    // proxy.ts) — those get a real URL change via router.push below.
    // Everywhere else (the homepage, /jobs, /news, /search, /categories,
    // /commissions/[slug], /positions, /recruitments, ...) has no separate
    // Hindi URL to navigate to, but some of them (e.g. /jobs) still render
    // Hindi content server-side based on this same cookie once it's set.
    // router.refresh() re-runs the current route's server components with
    // the cookie we just wrote, so those pages visibly update in place
    // instead of silently doing nothing until the next full navigation —
    // which is what made the button look unresponsive or broken before.
    if (!isLocaleAwarePath(pathWithoutLocale)) {
      setPendingLocale(newLocale);
      start();
      startTransition(() => {
        router.refresh();
      });
      return;
    }

    // The default locale is served unprefixed (next-intl's "as-needed"
    // mode actively 308-redirects an explicit /en/... request back to the
    // unprefixed URL) — pushing "/en/..." directly would still land on the
    // right page, just after a wasted redirect round-trip. Skip it.
    const newPath =
      newLocale === defaultLocale ? pathWithoutLocale : `/${newLocale}${pathWithoutLocale}`;
    setPendingLocale(newLocale);
    start();
    startTransition(() => {
      router.push(newPath);
    });
  };

  return (
    <div className="flex gap-2">
      {(locales as readonly Locale[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => switchLanguage(lang)}
          disabled={isPending}
          aria-pressed={locale === lang}
          aria-label={lang === 'hi' ? 'हिन्दी में देखें (View in Hindi)' : 'View in English'}
          title={lang === 'hi' ? 'हिन्दी में देखें' : 'View in English'}
          className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-semibold uppercase transition-colors disabled:cursor-wait disabled:opacity-70 ${
            locale === lang
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          <span className={lang === 'hi' ? 'normal-case' : ''}>{LABELS[lang]}</span>
          {isPending && pendingLocale === lang && (
            <span
              aria-hidden="true"
              className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          )}
        </button>
      ))}
    </div>
  );
}
