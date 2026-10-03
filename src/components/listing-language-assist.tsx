'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { readLocaleCookie, LOCALE_CHANGE_EVENT } from '@/i18n/locale-cookie';

// Accessibility only. NOT an SEO mechanism.
//
// The pages listed below show Hindi or English text at ONE address,
// depending on the visitor's saved language preference. For search engines
// they are English pages (SEO-001 D3) and the server sends lang="en". When
// a visitor has chosen Hindi, the text on screen is Hindi, and a screen
// reader needs to be told so — that is all this component does.
//
// It is mounted only by the unprefixed root layout. It never runs on entity
// pages under /hi: their language comes from the server (see
// src/app/[locale]/layout.tsx). It does not touch canonical, hreflang,
// robots or the sitemap.
const COOKIE_SWITCHED_LISTINGS = new Set(['/', '/jobs', '/organizations', '/exams', '/articles', '/categories']);

export function ListingLanguageAssist() {
  const pathname = usePathname() || '/';

  useEffect(() => {
    function sync() {
      const presentedInHindi = COOKIE_SWITCHED_LISTINGS.has(pathname) && readLocaleCookie() === 'hi';
      document.documentElement.lang = presentedInHindi ? 'hi' : 'en';
    }

    sync();
    window.addEventListener(LOCALE_CHANGE_EVENT, sync);
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, sync);
  }, [pathname]);

  return null;
}
