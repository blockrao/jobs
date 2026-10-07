'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import type { listArticles, listCategories, listPostings } from "@/lib/queries";
import type { HomepageStats, ClosingSoonJob } from "@/lib/queries";
import { STAGE_LABELS, STAGE_LABELS_HI, formatDate } from "@/lib/labels";
import { readLocaleCookie, LOCALE_CHANGE_EVENT } from "@/i18n/locale-cookie";
import type { Locale } from "@/i18n/request";

type Postings = Awaited<ReturnType<typeof listPostings>>;
type Categories = Awaited<ReturnType<typeof listCategories>>;
type Articles = Awaited<ReturnType<typeof listArticles>>;

const CATEGORY_GRID = [
  { label: "UPSC / IAS", labelHi: "UPSC / IAS", href: "/categories/upsc", emoji: "🏛️" },
  { label: "SSC", labelHi: "SSC", href: "/categories/ssc", emoji: "📋" },
  { label: "Railway", labelHi: "रेलवे", href: "/categories/railway", emoji: "🚆" },
  { label: "Banking", labelHi: "बैंकिंग", href: "/categories/banking", emoji: "🏦" },
  { label: "Teaching", labelHi: "शिक्षक", href: "/categories/teaching", emoji: "📚" },
  { label: "Defence", labelHi: "रक्षा", href: "/categories/defence", emoji: "🪖" },
  { label: "State PSC", labelHi: "राज्य PSC", href: "/categories/state-psc", emoji: "⚖️" },
  { label: "Police", labelHi: "पुलिस", href: "/categories/police", emoji: "🛡️" },
];

const FAQ_EN = [
  {
    q: "How do I find government jobs closing soon?",
    a: "Use the 'Closing This Week' filter on the Jobs page. JobOye shows a live countdown for every open notification — dates, application links, and vacancy counts — sourced from official government notifications.",
  },
  {
    q: "What is the difference between a recruitment notification and a post?",
    a: "A recruitment notification covers an entire drive (e.g., SSC CHSL 2026). Each role within that drive — such as LDC or Postal Assistant — is a separate post with its own vacancy count and eligibility criteria.",
  },
  {
    q: "How often is job data updated on JobOye?",
    a: "Pages are refreshed automatically. Vacancy counts and deadlines reflect the latest official notifications. If you spot an error, contact us — facts here always trace back to official sources.",
  },
  {
    q: "Can I apply for government jobs directly from JobOye?",
    a: "Each post page links directly to the official application portal on the recruiting body's website. JobOye never charges a fee and is not an intermediary — we only point you to the official source.",
  },
  {
    q: "Which organisations post the most vacancies on JobOye?",
    a: "Consistently high-volume recruiters include SSC, Railway Recruitment Boards, State Public Service Commissions, and various defence and paramilitary bodies. Browse by organisation on the Jobs page.",
  },
  {
    q: "Is JobOye free to use?",
    a: "Yes, completely free. JobOye is an information resource — we publish notification summaries, eligibility details, and official links. There is no registration, subscription, or fee of any kind.",
  },
];

function daysUntil(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

function fmtDeadline(d: Date, locale: string): string {
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export function HomeContent({
  govtJobs,
  privateJobs,
  categories,
  articles,
  homepageStats,
  closingSoon,
}: {
  govtJobs: Postings;
  privateJobs: Postings;
  categories: Categories;
  articles: Articles;
  homepageStats: HomepageStats;
  closingSoon: ClosingSoonJob[];
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

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_EN.map(({ q, a }) => ({
      "@type": "Question",
      "name": q,
      "acceptedAnswer": { "@type": "Answer", "text": a },
    })),
  };

  const vacancyDisplay = homepageStats.totalVacancies > 0
    ? homepageStats.totalVacancies.toLocaleString(dateLocale)
    : "—";

  const activeDisplay = homepageStats.activeRecruitments > 0
    ? homepageStats.activeRecruitments.toLocaleString(dateLocale)
    : "—";

  const closingDisplay = homepageStats.closingThisWeek > 0
    ? homepageStats.closingThisWeek.toLocaleString(dateLocale)
    : "—";

  const orgsDisplay = homepageStats.orgsHiring > 0
    ? homepageStats.orgsHiring.toLocaleString(dateLocale)
    : "—";

  return (
    <>
      <Script
        id="faq-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto max-w-6xl px-4 py-10">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="text-left pb-10 border-b border-black/8">
          <p className="text-xs font-medium uppercase tracking-widest text-brand-600 mb-3">
            {isHi ? "भारत का जॉब नोटिफिकेशन डेटाबेस" : "India's job notification database"}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-900 leading-tight max-w-2xl">
            {isHi
              ? "सरकारी नौकरी — सही जानकारी, सही समय पर"
              : "Government jobs,\nfacts straight from\nofficial notifications."}
          </h1>
          <p className="mt-4 max-w-xl text-neutral-500 text-base leading-relaxed">
            {isHi
              ? "हर अधिसूचना का स्थायी पेज — तारीखें, पात्रता, शुल्क और आधिकारिक आवेदन लिंक।"
              : "One permanent page per notification — dates, eligibility, fees, and the official apply link. No guesswork, no middlemen."}
          </p>

          {/* Live stats bar */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatPill
              value={vacancyDisplay}
              label={isHi ? "कुल पद" : "Positions open"}
              live
            />
            <StatPill
              value={activeDisplay}
              label={isHi ? "सक्रिय भर्तियां" : "Active recruitments"}
            />
            <StatPill
              value={closingDisplay}
              label={isHi ? "इस सप्ताह बंद" : "Closing this week"}
              urgent={homepageStats.closingThisWeek > 0}
            />
            <StatPill
              value={orgsDisplay}
              label={isHi ? "भर्ती करने वाले संगठन" : "Hiring organisations"}
            />
          </div>

          {/* Search + CTA */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl">
            <form action="/jobs" method="get" className="flex flex-1 gap-2">
              <input
                type="search"
                name="q"
                placeholder={isHi ? "नौकरी, परीक्षा, विभाग खोजें…" : "Search jobs, exams, departments…"}
                className="w-full rounded-md border border-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30"
              />
              <button
                type="submit"
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 shrink-0"
              >
                {isHi ? "खोजें" : "Search"}
              </button>
            </form>
            <Link
              href="/posts"
              className="inline-flex items-center justify-center rounded-md border border-black/15 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-black/30 hover:bg-neutral-50 shrink-0"
            >
              {isHi ? "सभी पोस्टिंग देखें →" : "Browse all postings →"}
            </Link>
          </div>
        </section>

        {/* ── Closing Soon urgency strip ────────────────────────── */}
        {closingSoon.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide">
                {isHi ? "जल्द बंद होने वाली भर्तियां" : "Closing soon — apply before it's too late"}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {closingSoon.map((job) => {
                const days = daysUntil(job.applicationEndDate);
                const urgent = days <= 2;
                return (
                  <Link
                    key={job.slug}
                    href={`/jobs/${job.slug}`}
                    className={`block rounded-lg border px-4 py-3 hover:shadow-md transition-shadow ${
                      urgent
                        ? "border-red-200 bg-red-50"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <p className="text-xs font-medium text-neutral-500 truncate">{job.orgName}</p>
                    <p className="mt-0.5 text-sm font-semibold text-neutral-900 line-clamp-2 leading-snug">
                      {job.name}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className={`font-semibold ${urgent ? "text-red-600" : "text-amber-700"}`}>
                        {days === 0
                          ? (isHi ? "आज बंद" : "Closes today")
                          : days === 1
                          ? (isHi ? "कल बंद" : "Closes tomorrow")
                          : isHi
                          ? `${days} दिन बाकी`
                          : `${days} days left`}
                      </span>
                      {job.totalVacancies != null && (
                        <span className="text-neutral-500">
                          {job.totalVacancies.toLocaleString(dateLocale)} {isHi ? "पद" : "posts"}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Browse by Category ────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-base font-semibold text-neutral-900 mb-4">
            {isHi ? "श्रेणी अनुसार खोजें" : "Browse by category"}
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {CATEGORY_GRID.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-black/8 bg-white px-2 py-3 text-center hover:border-brand-600/40 hover:bg-brand-50 transition-colors"
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-[11px] font-medium text-neutral-700 leading-tight">
                  {isHi ? cat.labelHi : cat.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Job listings ─────────────────────────────────────── */}
        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-2">
          <JobColumn
            title={isHi ? "नवीनतम सरकारी नौकरियां" : "Latest government jobs"}
            href="/jobs?kind=GOVERNMENT"
            postings={govtJobs}
            isHi={isHi}
            stageLabels={stageLabels}
            dateLocale={dateLocale}
            viewAllLabel={isHi ? "सभी देखें" : "View all"}
            noPostingsLabel={isHi ? "अभी कोई पोस्टिंग नहीं — जल्द आएगी।" : "No postings yet — check back soon."}
          />
          {privateJobs.length > 0 && (
            <JobColumn
              title={isHi ? "नवीनतम निजी नौकरियां" : "Latest private jobs"}
              href="/jobs?kind=PRIVATE"
              postings={privateJobs}
              isHi={isHi}
              stageLabels={stageLabels}
              dateLocale={dateLocale}
              viewAllLabel={isHi ? "सभी देखें" : "View all"}
              noPostingsLabel={isHi ? "अभी कोई पोस्टिंग नहीं — जल्द आएगी।" : "No postings yet — check back soon."}
            />
          )}
        </div>

        {/* ── Dynamic categories from DB ────────────────────────── */}
        {categories.length > 0 && (
          <section className="mt-12">
            <h2 className="text-base font-semibold text-neutral-900 mb-3">
              {isHi ? "सभी श्रेणियां" : "All categories"}
            </h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const nameHi = (category as Record<string, unknown>).nameHi as string | null;
                return (
                  <Link
                    key={category.id}
                    href={`/categories/${category.slug}`}
                    className="rounded-full border border-black/10 px-3 py-1.5 text-sm hover:border-black/30 hover:bg-neutral-50"
                  >
                    {isHi && nameHi ? nameHi : category.name}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Guides & Articles ─────────────────────────────────── */}
        {articles.length > 0 && (
          <section className="mt-12">
            <h2 className="text-base font-semibold text-neutral-900 mb-3">
              {isHi ? "गाइड और लेख" : "Guides & articles"}
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {articles.map((article) => {
                const titleHi = (article as Record<string, unknown>).titleHi as string | null;
                const dekHi = (article as Record<string, unknown>).dekHi as string | null;
                const displayTitle = isHi && titleHi ? titleHi : article.title;
                const displayDek = isHi && dekHi ? dekHi : article.dek;
                const href = isHi && titleHi ? `/hi/articles/${article.slug}` : `/articles/${article.slug}`;
                return (
                  <li key={article.id}>
                    <Link
                      href={href}
                      className="block rounded-md border border-black/10 px-4 py-3 hover:border-black/25 hover:bg-neutral-50"
                    >
                      <span className="font-medium text-neutral-900">{displayTitle}</span>
                      {displayDek && (
                        <p className="text-sm text-neutral-500 mt-0.5">{displayDek}</p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ── Control Center CTA ────────────────────────────────── */}
        <section className="mt-12">
          <Link
            href="/posts"
            className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-6 py-5 hover:bg-brand-100 transition-colors"
          >
            <div>
              <p className="font-semibold text-brand-800">
                {isHi ? "सभी सरकारी नौकरी पोस्टिंग देखें" : "View all government job postings"}
              </p>
              <p className="text-sm text-brand-600 mt-0.5">
                {isHi
                  ? "रिक्तियां, अंतिम तिथियां और शीर्ष संगठन एक जगह"
                  : "Vacancies, deadlines and top organisations — in one place"}
              </p>
            </div>
            <span className="text-2xl text-brand-400 ml-4">→</span>
          </Link>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <section className="mt-16 border-t border-black/8 pt-12">
          <h2 className="text-lg font-semibold text-neutral-900 mb-6">
            {isHi ? "अक्सर पूछे जाने वाले सवाल" : "Frequently asked questions"}
          </h2>
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {FAQ_EN.map(({ q, a }) => (
              <div key={q} className="rounded-lg border border-black/8 px-5 py-4">
                <dt className="font-medium text-neutral-900 text-sm">{q}</dt>
                <dd className="mt-2 text-sm text-neutral-600 leading-relaxed">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

      </div>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatPill({
  value,
  label,
  live,
  urgent,
}: {
  value: string;
  label: string;
  live?: boolean;
  urgent?: boolean;
}) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${urgent ? "border-amber-200 bg-amber-50" : "border-black/8 bg-white"}`}>
      <div className="flex items-center gap-1.5">
        {live && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
        )}
        <span className={`text-2xl font-bold tabular-nums tracking-tight ${urgent ? "text-amber-700" : "text-neutral-900"}`}>
          {value}
        </span>
      </div>
      <p className="text-xs text-neutral-500 mt-0.5">{label}</p>
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
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        <Link href={href} className="text-sm text-brand-600 hover:underline">
          {viewAllLabel}
        </Link>
      </div>
      <ul className="divide-y divide-black/8">
        {postings.map((posting) => {
          const titleHi = (posting as Record<string, unknown>).titleHi as string | null;
          const orgNameHi = (posting.organization as Record<string, unknown>).nameHi as string | null;
          const displayTitle = isHi && titleHi ? titleHi : posting.title;
          const displayOrgName = isHi && orgNameHi ? orgNameHi : posting.organization.name;
          const detailHref =
            isHi && titleHi ? `/hi/jobs/${posting.slug}` : `/jobs/${posting.slug}`;

          return (
            <li key={posting.id} className="py-3">
              <Link href={detailHref} className="font-medium text-neutral-900 hover:text-brand-700 hover:underline text-sm leading-snug">
                {displayTitle}
              </Link>
              <p className="text-xs text-neutral-500 mt-0.5">
                {displayOrgName} · {stageLabels[posting.currentStage] ?? posting.currentStage}
              </p>
              <p className="text-xs text-neutral-400 mt-0.5">
                {formatDate(posting.datePosted, dateLocale)}
                {(posting as Record<string, unknown>).totalVacancies != null && (
                  <> · {((posting as Record<string, unknown>).totalVacancies as number).toLocaleString(dateLocale)} {isHi ? "पद" : "posts"}</>
                )}
                {(posting as Record<string, unknown>).validThrough && (
                  <> · {isHi ? "अंतिम तिथि" : "Last date"}: {formatDate((posting as Record<string, unknown>).validThrough as string, dateLocale)}</>
                )}
              </p>
            </li>
          );
        })}
        {postings.length === 0 && (
          <li className="py-6 text-sm text-neutral-400">{noPostingsLabel}</li>
        )}
      </ul>
    </section>
  );
}
