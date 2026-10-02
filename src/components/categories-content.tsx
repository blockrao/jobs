'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import type { listCategories } from "@/lib/queries";
import { readLocaleCookie, LOCALE_CHANGE_EVENT } from "@/i18n/locale-cookie";
import type { Locale } from "@/i18n/request";

type Categories = Awaited<ReturnType<typeof listCategories>>;

// Same pattern as home-content.tsx: the page (src/app/categories/page.tsx)
// stays a plain static/ISR server component that only fetches data — every
// row already includes nameHi/descriptionHi regardless of locale — and this
// client component decides how to render it, reading the visitor's saved
// language cookie instead of the page reading cookies() server-side (which
// would force this page out of static rendering just to pick a language).
export function CategoriesContent({ categories }: { categories: Categories }) {
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
    heading: isHi ? "श्रेणियां" : "Categories",
    none: isHi ? "अभी कोई श्रेणी नहीं है।" : "No categories yet.",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">{L.heading}</h1>
      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {categories.map((category) => {
          const nameHi = (category as any).nameHi as string | null;
          const descriptionHi = (category as any).descriptionHi as
            | string
            | null;
          return (
            <li key={category.id}>
              <Link
                href={`/categories/${category.slug}`}
                className="block rounded-md border border-black/10 px-4 py-3 hover:border-black/30"
              >
                <span className="font-medium">
                  {isHi && nameHi ? nameHi : category.name}
                </span>
                {(isHi && descriptionHi ? descriptionHi : category.description) && (
                  <p className="text-sm text-neutral-600">
                    {isHi && descriptionHi ? descriptionHi : category.description}
                  </p>
                )}
              </Link>
            </li>
          );
        })}
        {categories.length === 0 && (
          <li className="text-sm text-neutral-500">{L.none}</li>
        )}
      </ul>
    </div>
  );
}
