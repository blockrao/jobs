'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { locales, type Locale } from '@/i18n/request';
import { useNavigationProgress } from '@/components/navigation-progress';

// Matches a leading /en or /hi segment only (not "/articles/english-exam"
// or any other path that merely contains those letters).
const LOCALE_PREFIX_RE = /^\/(en|hi)(?=\/|$)/;

// Same cookie name next-intl's own middleware reads for locale detection
// (src/proxy.ts's createMiddleware) — reusing it means a choice made here
// on a page with no Hindi template (home, /jobs, /search, ...) still takes
// effect automatically the next time the visitor lands on a page that does
// have one (a job/exam/organization/article detail page), with no extra
// wiring: next-intl's middleware already redirects an unprefixed
// locale-aware URL to match this cookie.
const COOKIE_NAME = 'NEXT_LOCALE';

function localeFromPathname(pathname: string): Locale | null {
  const match = pathname.match(LOCALE_PREFIX_RE);
  return match ? (match[1] as Locale) : null;
}

function readLocaleCookie(): Locale | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=(en|hi)(?:;|$)/);
  return match ? (match[1] as Locale) : null;
}

function writeLocaleCookie(locale: Locale) {
  document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
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

    // No page is localized at the bare root — e.g. the homepage itself has
    // no Hindi template (see root layout.tsx) — so there's nowhere to
    // navigate to. The cookie write above is what makes the choice stick:
    // it already applies the next time this visitor opens a page that does
    // support it. Without this early return, clicking हिन्दी here used to
    // bounce to /hi and immediately back to / with no visible effect at
    // all, which is why the button looked unresponsive.
    if (pathWithoutLocale === '/') return;

    const newPath = `/${newLocale}${pathWithoutLocale}`;
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
