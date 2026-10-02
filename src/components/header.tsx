'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import { LanguageSwitcher } from "@/components/language-switcher";
import { readLocaleCookie, LOCALE_CHANGE_EVENT } from "@/i18n/locale-cookie";
import type { Locale } from "@/i18n/request";

const NAV_LINKS: { href: string; label: Record<Locale, string> }[] = [
  { href: "/search", label: { en: "Search", hi: "खोजें" } },
  { href: "/jobs", label: { en: "All Jobs", hi: "सभी नौकरियां" } },
  { href: "/exams", label: { en: "By Exam", hi: "परीक्षा अनुसार" } },
  { href: "/news", label: { en: "News", hi: "समाचार" } },
  { href: "/articles", label: { en: "Guides", hi: "गाइड" } },
];

export function Header() {
  // Header has no [locale] counterpart of its own — it's rendered once in
  // the root layout for every page, including ones with no Hindi template
  // at all (home, /search, ...). Reading the visitor's saved language
  // cookie here, client-side, lets the nav match whatever the page body is
  // showing (e.g. the /jobs listing, which does the same per-cookie
  // rendering — see src/app/jobs/page.tsx) without forcing the root
  // layout into dynamic (per-request) rendering: that would happen if this
  // read cookies() server-side instead, which would opt every statically
  // generated page (/, /articles, /exams, /organizations, ...) out of
  // static rendering just because the header sits above them.
  //
  // Starts at 'en' to match what the server rendered (no cookie access
  // during SSR), then syncs on mount and reacts to LOCALE_CHANGE_EVENT so
  // it updates immediately when the language switcher is used, without
  // requiring a full page reload.
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    setLocale(readLocaleCookie() ?? "en");
    function onLocaleChange(e: Event) {
      const detail = (e as CustomEvent<Locale>).detail;
      setLocale(detail ?? "en");
    }
    window.addEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
  }, []);

  return (
    <header className="border-b border-black/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          {SITE_NAME}
        </Link>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-neutral-700 hover:text-black hover:underline"
            >
              {link.label[locale]}
            </Link>
          ))}
        </nav>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
