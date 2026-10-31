'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SectorPostRow } from "@/lib/queries";
import type { SectorDef } from "@/lib/sectors";
import { SECTORS, sectorHref } from "@/lib/sectors";
import { formatDate } from "@/lib/labels";
import { pageHref } from "@/lib/pagination";
import { readLocaleCookie, LOCALE_CHANGE_EVENT } from "@/i18n/locale-cookie";
import type { Locale } from "@/i18n/request";
import { JobOpportunityCard } from "@/components/jobs/job-opportunity-card";

// Sector hub body. The page (src/app/(default)/categories/[slug]/page.tsx)
// stays a static/ISR server component; this client component picks the
// language from the visitor's saved cookie — same pattern as home-content.

function daysUntil(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

export function CategoryContent({
  sector,
  posts,
  total,
  page,
  hasNext,
}: {
  sector: SectorDef;
  posts: SectorPostRow[];
  total: number;
  page: number;
  hasNext: boolean;
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
  const dateLocale = isHi ? "hi-IN" : "en-IN";
  const base = sectorHref(sector);

  const L = {
    title: isHi ? `${sector.labelHi} नौकरियां` : `${sector.label} Jobs`,
    live: isHi ? "खुली भर्तियां" : "Open posts",
    none: isHi ? "इस श्रेणी में अभी कोई खुली भर्ती नहीं है।" : "No open posts in this category right now.",
    vacancies: isHi ? "रिक्तियां" : "vacancies",
    lastDate: isHi ? "अंतिम तिथि" : "Last date",
    upcoming: isHi ? "जल्द" : "Upcoming",
    closingToday: isHi ? "आज बंद" : "Closes today",
    daysLeft: (n: number) => (isHi ? `${n} दिन बाकी` : `${n} days left`),
    prev: isHi ? "← पिछला" : "← Previous",
    next: isHi ? "अगला →" : "Next →",
    pageOf: isHi ? `पृष्ठ ${page}` : `Page ${page}`,
    other: isHi ? "अन्य श्रेणियां" : "Other categories",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-neutral-500">
        <Link href="/" className="hover:underline">{isHi ? "होम" : "Home"}</Link>
        {" / "}
        <Link href="/categories" className="hover:underline">{isHi ? "श्रेणियां" : "Categories"}</Link>
        {" / "}
        <span className="text-neutral-800">{isHi ? sector.labelHi : sector.label}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-bold tracking-tight">
        <span className="mr-2" aria-hidden>{sector.emoji}</span>
        {L.title}
      </h1>
      <p className="mt-2 max-w-2xl text-neutral-600">
        {isHi ? sector.descriptionHi : sector.description}
      </p>

      <h2 className="mt-8 text-lg font-semibold">
        {L.live}
        {total > 0 && (
          <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
            {total}
          </span>
        )}
      </h2>

      {posts.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">{L.none}</p>
      ) : (
        <ul className="mt-3 divide-y divide-black/10">
          {posts.map((p) => {
            const end = p.applicationEndDate ? new Date(p.applicationEndDate) : null;
            const days = end ? daysUntil(end) : null;
            const orgName = isHi && p.orgNameHi ? p.orgNameHi : p.orgName;
            let deadline: string | null = null;
            let deadlineTone = "text-neutral-600";
            if (p.recruitmentStatus === "UPCOMING" && !end) {
              deadline = L.upcoming;
            } else if (end && days !== null) {
              if (days <= 0) deadline = L.closingToday;
              else if (days <= 7) deadline = L.daysLeft(days);
              else deadline = `${L.lastDate}: ${formatDate(end, dateLocale)}`;
              if (days <= 7) deadlineTone = "text-red-700 font-medium";
            }
            const urgent = p.recruitmentStatus !== "UPCOMING" && days !== null && days >= 0 && days <= 7;
            const statusLabel = p.recruitmentStatus === "UPCOMING"
              ? L.upcoming
              : urgent ? L.closingToday === "आज बंद" ? "जल्द बंद" : "Closing soon" : (isHi ? "आवेदन खुले हैं" : "Applications open");
            return (
              <li key={p.postId}>
                <JobOpportunityCard
                  postName={p.postName}
                  organizationName={orgName}
                  organizationHref={`/organizations/${p.orgSlug}`}
                  recruitmentName={p.recruitmentName}
                  recruitmentHref={`/jobs/${p.recruitmentSlug}`}
                  detailHref={`/jobs/${p.recruitmentSlug}/${p.postSlug}`}
                  statusLabel={statusLabel}
                  urgent={urgent}
                  vacancyTotal={p.vacancyTotal}
                  deadlineLabel={deadline ?? (isHi ? "सूचना में नहीं दिया गया" : "Not stated")}
                  daysLeft={days}
                  vacanciesLabel={L.vacancies}
                  deadlineTitle={L.lastDate}
                  viewDetailsLabel={isHi ? "विवरण देखें" : "View job details"}
                />
              </li>
            );;
          })}
        </ul>
      )}

      {(page > 1 || hasNext) && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={pageHref(base, {}, page - 1)} className="hover:underline">{L.prev}</Link>
          ) : <span />}
          <span className="text-neutral-500">{L.pageOf}</span>
          {hasNext ? (
            <Link href={pageHref(base, {}, page + 1)} className="hover:underline">{L.next}</Link>
          ) : <span />}
        </nav>
      )}

      <section className="mt-12">
        <h2 className="text-base font-semibold text-neutral-900 mb-3">{L.other}</h2>
        <div className="flex flex-wrap gap-2">
          {SECTORS.filter((s) => s.slug !== sector.slug).map((s) => (
            <Link
              key={s.slug}
              href={sectorHref(s)}
              className="rounded-full border border-black/10 px-3 py-1.5 text-sm hover:border-black/30 hover:bg-neutral-50"
            >
              <span className="mr-1" aria-hidden>{s.emoji}</span>
              {isHi ? s.labelHi : s.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
