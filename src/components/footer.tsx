'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import { readLocaleCookie, LOCALE_CHANGE_EVENT } from "@/i18n/locale-cookie";
import type { Locale } from "@/i18n/request";

const COPY: Record<Locale, { disclaimer: string; allJobs: string; categories: string; articles: string }> = {
  en: {
    disclaimer:
      "Job and exam information is aggregated for informational purposes — always verify against the official notification before applying.",
    allJobs: "All Jobs",
    categories: "Categories",
    articles: "Articles",
  },
  hi: {
    disclaimer:
      "नौकरी और परीक्षा संबंधी जानकारी सूचना के उद्देश्य से एकत्र की गई है — आवेदन करने से पहले हमेशा आधिकारिक अधिसूचना से पुष्टि करें।",
    allJobs: "सभी नौकरियां",
    categories: "श्रेणियां",
    articles: "लेख",
  },
};

export function Footer() {
  // Same reasoning as header.tsx: the footer has no [locale] counterpart
  // and is rendered once in the root layout for every page, so it reads
  // the saved language cookie client-side rather than forcing the whole
  // site into dynamic (per-request) rendering via a server-side cookies()
  // read at the layout level.
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

  const t = COPY[locale];

  return (
    <footer className="mt-auto border-t border-black/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-neutral-600">
        <p>
          © {new Date().getFullYear()} {SITE_NAME}. {t.disclaimer}
        </p>
        <div className="flex flex-wrap gap-x-4">
          <Link href="/jobs" className="hover:underline">
            {t.allJobs}
          </Link>
          <Link href="/categories" className="hover:underline">
            {t.categories}
          </Link>
          <Link href="/articles" className="hover:underline">
            {t.articles}
          </Link>
        </div>
      </div>
    </footer>
  );
}
