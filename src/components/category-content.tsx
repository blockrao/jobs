'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import type { getCategoryBySlug } from "@/lib/queries";
import { STAGE_LABELS, STAGE_LABELS_HI, formatDate } from "@/lib/labels";
import { readLocaleCookie, LOCALE_CHANGE_EVENT } from "@/i18n/locale-cookie";
import type { Locale } from "@/i18n/request";

type CategoryResult = NonNullable<Awaited<ReturnType<typeof getCategoryBySlug>>>;

// Same pattern as home-content.tsx / categories-content.tsx: the page
// (src/app/categories/[slug]/page.tsx) stays a plain static/ISR server
// component that only fetches data, and this client component decides how
// to render it based on the visitor's saved language cookie.
export function CategoryContent({ result }: { result: CategoryResult }) {
  const { category, postings, articles } = result;
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
  const stageLabels = isHi ? STAGE_LABELS_HI : STAGE_LABELS;
  const dateLocale = isHi ? "hi-IN" : "en-IN";

  const nameHi = (category as any).nameHi as string | null;
  const descriptionHi = (category as any).descriptionHi as string | null;
  const displayName = isHi && nameHi ? nameHi : category.name;
  const displayDescription =
    isHi && descriptionHi ? descriptionHi : category.description;

  const L = {
    openPostings: isHi ? "खुली पोस्टिंग" : "Open Postings",
    noPostings: isHi
      ? "इस श्रेणी में अभी कोई पोस्टिंग नहीं है।"
      : "No postings in this category yet.",
    relatedGuides: isHi ? "संबंधित गाइड" : "Related Guides",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
      {displayDescription && (
        <p className="mt-2 max-w-2xl text-neutral-600">{displayDescription}</p>
      )}

      <h2 className="mt-8 text-lg font-semibold">{L.openPostings}</h2>
      <ul className="mt-3 divide-y divide-black/10">
        {postings.map((posting) => {
          const titleHi = (posting as any).titleHi as string | null;
          const orgNameHi = (posting.organization as any).nameHi as
            | string
            | null;
          const displayTitle = isHi && titleHi ? titleHi : posting.title;
          const displayOrgName =
            isHi && orgNameHi ? orgNameHi : posting.organization.name;
          const detailHref =
            isHi && titleHi ? `/hi/jobs/${posting.slug}` : `/jobs/${posting.slug}`;
          return (
            <li key={posting.id} className="py-4">
              <Link href={detailHref} className="font-semibold hover:underline">
                {displayTitle}
              </Link>
              <p className="text-sm text-neutral-600">
                {displayOrgName} ·{" "}
                {stageLabels[posting.currentStage] ?? posting.currentStage} ·{" "}
                {isHi ? "पोस्ट किया गया " : "Posted "}
                {formatDate(posting.datePosted, dateLocale)}
              </p>
            </li>
          );
        })}
        {postings.length === 0 && (
          <li className="py-6 text-sm text-neutral-500">{L.noPostings}</li>
        )}
      </ul>

      {articles.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold">{L.relatedGuides}</h2>
          <ul className="mt-3 space-y-2">
            {articles.map((article) => {
              const titleHi = (article as any).titleHi as string | null;
              const displayTitle = isHi && titleHi ? titleHi : article.title;
              const href =
                isHi && titleHi
                  ? `/hi/articles/${article.slug}`
                  : `/articles/${article.slug}`;
              return (
                <li key={article.id}>
                  <Link
                    href={href}
                    className="font-medium underline hover:no-underline"
                  >
                    {displayTitle}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
