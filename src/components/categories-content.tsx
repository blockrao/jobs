'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SectorDef } from "@/lib/sectors";
import { sectorHref } from "@/lib/sectors";
import { readLocaleCookie, LOCALE_CHANGE_EVENT } from "@/i18n/locale-cookie";
import type { Locale } from "@/i18n/request";

// Category index. The list comes from src/lib/sectors.ts (the single public
// taxonomy); the page passes a live Post count per sector. Language is read
// from the visitor's cookie here so the page stays static/ISR.
export function CategoriesContent({
  items,
}: {
  items: { sector: SectorDef; count: number }[];
}) {
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

  const isHi = locale === "hi";
  const L = {
    heading: isHi ? "श्रेणी के अनुसार सरकारी नौकरियां" : "Government jobs by category",
    open: isHi ? "खुली भर्तियां" : "open posts",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">{L.heading}</h1>
      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map(({ sector, count }) => (
          <li key={sector.slug}>
            <Link
              href={sectorHref(sector)}
              className="block rounded-md border border-black/10 px-4 py-3 hover:border-black/30"
            >
              <span className="font-medium">
                <span className="mr-2" aria-hidden>{sector.emoji}</span>
                {isHi ? sector.labelHi : sector.label}
                <span className="ml-2 text-xs font-normal text-neutral-500">
                  {count} {L.open}
                </span>
              </span>
              <p className="mt-1 text-sm text-neutral-600">
                {isHi ? sector.descriptionHi : sector.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
