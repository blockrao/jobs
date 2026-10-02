'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import type { listArticles, listCategories, listPostings } from "@/lib/queries";
import { STAGE_LABELS, STAGE_LABELS_HI, formatDate } from "@/lib/labels";
import { readLocaleCookie, LOCALE_CHANGE_EVENT } from "@/i18n/locale-cookie";
import type { Locale } from "@/i18n/request";
import { InfoCard } from "@/components/ui/info-card";

type Postings = Awaited<ReturnType<typeof listPostings>>;
type Categories = Awaited<ReturnType<typeof listCategories>>;
type Articles = Awaited<ReturnType<typeof listArticles>>;

// The homepage (src/app/page.tsx) stays a plain server component that only
// fetches data — it's still ○ Static/ISR (confirmed via `next build`), and
// it already fetches every row's Hindi fields (titleHi, nameHi, ...)
// regardless of locale, so there's no need to re-fetch per-language. This
// component takes that same data and decides HOW to render it, reading the
// visitor's saved language cookie client-side (same pattern as
// header.tsx/footer.tsx) instead of the page reading cookies() server-side
// — which would force the homepage out of static rendering just to pick a
// language, the same tradeoff avoided there.
export function HomeContent({
  govtJobs,
  privateJobs,
  categories,
  articles,
}: {
  govtJobs: Postings;
  privateJobs: Postings;
  categories: Categories;
  articles: Articles;
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
  const stageLabels = isHi ? STAGE_LABELS_HI : STAGE_LABELS;
  const dateLocale = isHi ? "hi-IN" : "en-IN";

  const L = {
    heroTitle: isHi
      ? "सरकारी और निजी नौकरी सूचनाएं, परिणाम और गाइड"
      : "Govt & Private Job Notifications, Results, and Guides",
    heroSubtitle: isHi
      ? "हर अधिसूचना के लिए एक स्थायी पेज — घोषणा से लेकर प्रवेश पत्र और परिणाम तक — साथ ही सिलेबस, परीक्षा पैटर्न और वेतन पर विस्तृत गाइड।"
      : "One permanent page per notification — from announcement to admit card to result — plus in-depth guides on syllabus, exam pattern, and salary.",
    searchPlaceholder: isHi
      ? "नौकरी, परीक्षा, विभाग खोजें..."
      : "Search jobs, exams, departments...",
    search: isHi ? "खोजें" : "Search",
    latestGovt: isHi ? "नवीनतम सरकारी नौकरियां" : "Latest Government Jobs",
    latestPrivate: isHi ? "नवीनतम निजी नौकरियां" : "Latest Private Jobs",
    viewAll: isHi ? "सभी देखें" : "View all",
    noPostings: isHi
      ? "अभी कोई पोस्टिंग नहीं — जल्द ही फिर देखें।"
      : "No postings yet — check back soon.",
    browseGovt: isHi ? "सरकारी नौकरियां ब्राउज़ करें" : "Browse Government Jobs",
    positions: isHi ? "पद" : "Positions",
    careerPaths: isHi ? "करियर पथ" : "Career paths",
    exams: isHi ? "परीक्षाएं" : "Exams",
    byCommission: isHi ? "आयोग अनुसार" : "By commission",
    campaigns: isHi ? "अभियान" : "Campaigns",
    byYear: isHi ? "वर्ष अनुसार" : "By year",
    organizations: isHi ? "संगठन" : "Organizations",
    allEmployers: isHi ? "सभी नियोक्ता" : "All employers",
    browseByCategory: isHi ? "श्रेणी अनुसार ब्राउज़ करें" : "Browse by Category",
    guidesArticles: isHi ? "गाइड और लेख" : "Guides & Articles",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {L.heroTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-neutral-600">
          {L.heroSubtitle}
        </p>
        <form action="/jobs" method="get" className="mx-auto mt-6 flex max-w-lg gap-2">
          <input
            type="search"
            name="q"
            placeholder={L.searchPlaceholder}
            className="w-full rounded-md border border-black/20 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {L.search}
          </button>
        </form>
      </section>

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <JobColumn
          title={L.latestGovt}
          href="/jobs?kind=GOVERNMENT"
          postings={govtJobs}
          isHi={isHi}
          stageLabels={stageLabels}
          dateLocale={dateLocale}
          viewAllLabel={L.viewAll}
          noPostingsLabel={L.noPostings}
        />
        <JobColumn
          title={L.latestPrivate}
          href="/jobs?kind=PRIVATE"
          postings={privateJobs}
          isHi={isHi}
          stageLabels={stageLabels}
          dateLocale={dateLocale}
          viewAllLabel={L.viewAll}
          noPostingsLabel={L.noPostings}
        />
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-semibold mb-4">{L.browseGovt}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <InfoCard center tone="brand" href="/positions" title={L.positions} subtitle={L.careerPaths} />
          <InfoCard center tone="neutral" href="/exams" title={L.exams} subtitle={L.byCommission} />
          <InfoCard center tone="success" href="/recruitments" title={L.campaigns} subtitle={L.byYear} />
          <InfoCard center tone="neutral" href="/organizations" title={L.organizations} subtitle={L.allEmployers} />
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">{L.browseByCategory}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((category) => {
              const nameHi = (category as any).nameHi as string | null;
              return (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="rounded-full border border-black/10 px-3 py-1.5 text-sm hover:border-black/30"
                >
                  {isHi && nameHi ? nameHi : category.name}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {articles.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">{L.guidesArticles}</h2>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {articles.map((article) => {
              const titleHi = (article as any).titleHi as string | null;
              const dekHi = (article as any).dekHi as string | null;
              const displayTitle = isHi && titleHi ? titleHi : article.title;
              const displayDek = isHi && dekHi ? dekHi : article.dek;
              // Only link into the Hindi article page when it actually has
              // Hindi content — otherwise the plain canonical page.
              const href =
                isHi && titleHi
                  ? `/hi/articles/${article.slug}`
                  : `/articles/${article.slug}`;
              return (
                <li key={article.id}>
                  <Link
                    href={href}
                    className="block rounded-md border border-black/10 px-4 py-3 hover:border-black/30"
                  >
                    <span className="font-medium">{displayTitle}</span>
                    {displayDek && (
                      <p className="text-sm text-neutral-600">{displayDek}</p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function JobColumn({
  title,
  href,
  postings,
  isHi,
  stageLabels,
  dateLocale,
  viewAllLabel,
  noPostingsLabel,
}: {
  title: string;
  href: string;
  postings: Postings;
  isHi: boolean;
  stageLabels: Record<string, string>;
  dateLocale: "en-IN" | "hi-IN";
  viewAllLabel: string;
  noPostingsLabel: string;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link href={href} className="text-sm underline">
          {viewAllLabel}
        </Link>
      </div>
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
            <li key={posting.id} className="py-3">
              <Link href={detailHref} className="font-medium hover:underline">
                {displayTitle}
              </Link>
              <p className="text-sm text-neutral-600">
                {displayOrgName} ·{" "}
                {stageLabels[posting.currentStage] ?? posting.currentStage}
              </p>
              <p className="text-xs text-neutral-400">
                {formatDate(posting.datePosted, dateLocale)}
              </p>
            </li>
          );
        })}
        {postings.length === 0 && (
          <li className="py-6 text-sm text-neutral-500">{noPostingsLabel}</li>
        )}
      </ul>
    </section>
  );
}
