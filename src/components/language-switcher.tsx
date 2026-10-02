'use client';

import { usePathname, useRouter } from 'next/navigation';
import { locales, type Locale } from '@/i18n/request';

// Matches a leading /en or /hi segment only (not "/articles/english-exam"
// or any other path that merely contains those letters).
const LOCALE_PREFIX_RE = /^\/(en|hi)(?=\/|$)/;

function localeFromPathname(pathname: string): Locale {
  const match = pathname.match(LOCALE_PREFIX_RE);
  return (match ? match[1] : 'en') as Locale;
}

export function LanguageSwitcher() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  // Header (and this switcher) is rendered by the root layout, which sits
  // ABOVE the [locale] route segment and so has no next-intl locale context
  // of its own — it's permanently stuck on the app's defaultLocale. Using
  // useLocale() here previously meant this switcher always believed the
  // current page was English, even while viewing a /hi/... page. Clicking
  // "HI" then prepended /hi to a pathname that already started with /hi,
  // producing /hi/hi/... links. Deriving locale from the actual URL fixes
  // that regardless of which React context surrounds this component.
  const locale = localeFromPathname(pathname);

  const switchLanguage = (newLocale: Locale) => {
    if (newLocale === locale) return;

    // Strip only a genuine leading /en or /hi segment, never a mid-path
    // substring that happens to match.
    const pathWithoutLocale = pathname.replace(LOCALE_PREFIX_RE, '') || '/';
    const newPath = `/${newLocale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;

    router.push(newPath);
  };

  return (
    <div className="flex gap-2">
      {(locales as readonly Locale[]).map((lang) => (
        <button
          key={lang}
          onClick={() => switchLanguage(lang)}
          className={`px-3 py-1 rounded text-xs font-semibold uppercase transition-colors ${
            locale === lang
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
