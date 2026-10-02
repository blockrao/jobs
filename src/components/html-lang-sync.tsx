'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { readLocaleCookie, LOCALE_CHANGE_EVENT } from '@/i18n/locale-cookie';

// Root layout (src/app/layout.tsx) owns the single <html> tag for the whole
// app and hardcodes lang="en" there, since it sits above the [locale]
// segment and has no way to read that route param. This keeps the
// accessibility/SEO-relevant lang attribute in sync with the actual locale
// for /hi/* pages without re-declaring a second <html> element in
// src/app/[locale]/layout.tsx (that duplication was the root cause of the
// /hi/hi/... link bug — see the comment in that file).
//
// A /hi/... URL isn't the only way a page renders Hindi, though — the
// homepage, /jobs, /categories, /exams, /organizations, and the header and
// footer all render Hindi based on the saved locale cookie with no /hi/ in
// the URL at all (see home-content.tsx and friends). Tracking only the
// pathname left <html lang="en"> on an entirely Devanagari page, which
// makes screen readers mispronounce it — so this also reads the cookie,
// same as every other locale-aware client component.
export function HtmlLangSync() {
  const pathname = usePathname() || '/';

  useEffect(() => {
    function sync() {
      const isHindiPath = pathname === '/hi' || pathname.startsWith('/hi/');
      const isHindiCookie = readLocaleCookie() === 'hi';
      document.documentElement.lang = isHindiPath || isHindiCookie ? 'hi' : 'en';
    }

    sync();
    window.addEventListener(LOCALE_CHANGE_EVENT, sync);
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, sync);
  }, [pathname]);

  return null;
}
