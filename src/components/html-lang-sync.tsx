'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Root layout (src/app/layout.tsx) owns the single <html> tag for the whole
// app and hardcodes lang="en" there, since it sits above the [locale]
// segment and has no way to read that route param. This keeps the
// accessibility/SEO-relevant lang attribute in sync with the actual locale
// for /hi/* pages without re-declaring a second <html> element in
// src/app/[locale]/layout.tsx (that duplication was the root cause of the
// /hi/hi/... link bug — see the comment in that file).
export function HtmlLangSync() {
  const pathname = usePathname() || '/';

  useEffect(() => {
    const isHindi = pathname === '/hi' || pathname.startsWith('/hi/');
    document.documentElement.lang = isHindi ? 'hi' : 'en';
  }, [pathname]);

  return null;
}
