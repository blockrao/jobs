'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { locales, type Locale } from '@/i18n/request';

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname() || '/';
  const router = useRouter();

  const switchLanguage = (newLocale: Locale) => {
    if (newLocale === locale) return;

    // Remove the current locale from pathname
    const pathWithoutLocale = pathname.replace(`/${locale}`, '');
    const newPath = `/${newLocale}${pathWithoutLocale || '/'}`;

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
