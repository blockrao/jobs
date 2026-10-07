import { listingSeo } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { listPostings } from "@/lib/queries";
import { SeoFooterLinks } from "@/components/seo-footer-links";
import { JOBS_PAGE_SIZE, pageHref, parsePage } from "@/lib/pagination";
import {
  STAGE_LABELS,
  STAGE_LABELS_HI,
  KIND_LABELS,
  KIND_LABELS_HI,
  formatDate,
} from "@/lib/labels";
import { ChevronRight } from "lucide-react";

// This page deliberately stays at the plain /jobs URL rather than gaining a
// /hi variant: it's an aggregator view, not unique content that should rank
// separately in Hindi search (that's what /hi/jobs/[slug] is for — see
// src/i18n/locale-aware-paths.ts). What it CAN do is honor a visitor's
// saved language choice by reading the same NEXT_LOCALE cookie the language
// switcher writes (src/components/language-switcher.tsx) and rendering
// Hindi titles/labels + linking into the Hindi job detail pages, without
// ever changing this page's own canonical URL or forcing it into a
// different render mode than before (it was already request-dynamic from
// `searchParams`, so reading another cookie here has no new cost).
export const revalidate = 120;

type Props = {
  searchParams: Promise<{
    kind?: string;
    q?: string;
    page?: string;
    filter?: string;
  }>;
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const { kind, q, page, filter } = await searchParams;
  let label = "All Jobs";
  if (kind === "GOVERNMENT") label = "Government Jobs";
  else if (kind === "PRIVATE") label = "Private Jobs";
  if (filter === "newly-added") label = `Newly Added ${label}`;
  else if (filter === "open") label = `Open Applications — ${label}`;

  return {
    title: label,
    description: `Browse the latest ${label.toLowerCase()} notifications and openings across India.`,
    // No `languages` alternate here on purpose — this URL never changes by
    // locale (see the file-level comment above), so there's nothing to
    // cross-link.
    // Filter and search views are noindex and canonical to the unfiltered
    // listing (SEO-001 section 4).
    // A paginated view (page 2 and later) is treated as filtered: noindex, canonical to /jobs.
    ...listingSeo("/jobs", { kind, q, page: parsePage(page) > 1 ? page : undefined }),
  };
}

// Stage pill color mapping
const STAGE_COLORS: Record<string, string> = {
  APPLICATION_OPEN: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  NOTIFICATION_OUT: "bg-blue-50 text-blue-700 ring-blue-600/20",
  APPLICATION_CLOSED: "bg-neutral-100 text-neutral-600 ring-neutral-500/20",
  ADMIT_CARD_RELEASED: "bg-violet-50 text-violet-700 ring-violet-600/20",
  EXAM_SCHEDULED: "bg-amber-50 text-amber-700 ring-amber-600/20",
  EXAM_CONDUCTED: "bg-amber-50 text-amber-700 ring-amber-600/20",
  ANSWER_KEY_OUT: "bg-sky-50 text-sky-700 ring-sky-600/20",
  OBJECTION_WINDOW: "bg-orange-50 text-orange-700 ring-orange-600/20",
  RESULT_OUT: "bg-teal-50 text-teal-700 ring-teal-600/20",
  MERIT_LIST_OUT: "bg-teal-50 text-teal-700 ring-teal-600/20",
  INTERVIEW_SCHEDULED: "bg-purple-50 text-purple-700 ring-purple-600/20",
  FINAL_RESULT_OUT: "bg-teal-50 text-teal-700 ring-teal-600/20",
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  FILLED: "bg-neutral-100 text-neutral-500 ring-neutral-400/20",
  CLOSED: "bg-neutral-100 text-neutral-500 ring-neutral-400/20",
};

export default async function JobsListPage({ searchParams }: Props) {
  const { kind, q, page: pageParam, filter: filterParam } = await searchParams;
  const page = parsePage(pageParam);
  const validKind =
    kind === "GOVERNMENT" || kind === "PRIVATE" ? kind : undefined;
  const validFilter =
    filterParam === "newly-added" || filterParam === "open"
      ? (filterParam as "newly-added" | "open")
      : undefined;

  let results: Awaited<ReturnType<typeof listPostings>> = [];
  try {
    results = await listPostings({
      kind: validKind,
      filter: validFilter,
      search: q,
      // One extra row tells us whether a next page exists.
      limit: JOBS_PAGE_SIZE + 1,
      offset: (page - 1) * JOBS_PAGE_SIZE,
    });
  } catch {
    results = [];
  }

  const hasNext = results.length > JOBS_PAGE_SIZE;
  if (hasNext) results = results.slice(0, JOBS_PAGE_SIZE);

  const cookieStore = await cookies();
  const isHi = cookieStore.get("NEXT_LOCALE")?.value === "hi";

  const stageLabels = isHi ? STAGE_LABELS_HI : STAGE_LABELS;
  const kindLabels = isHi ? KIND_LABELS_HI : KIND_LABELS;
  const dateLocale = isHi ? "hi-IN" : "en-IN";

  const L = {
    allJobs: isHi ? "सभी नौकरियां" : "All Jobs",
    kindJobs: (k: "GOVERNMENT" | "PRIVATE") =>
      isHi ? `${kindLabels[k]} नौकरियां` : `${KIND_LABELS[k]} Jobs`,
    searchPlaceholder: isHi
      ? "पद, विभाग या कीवर्ड से खोजें..."
      : "Search by title, department, keyword...",
    search: isHi ? "खोजें" : "Search",
    all: isHi ? "सभी" : "All",
    government: isHi ? "सरकारी" : "Government",
    private: isHi ? "निजी" : "Private",
    newlyAdded: isHi ? "नई नौकरियां" : "Newly Added",
    open: isHi ? "आवेदन खुले" : "Applications Open",
    showing: (n: number) =>
      isHi ? `${n} नौकरियां दिखाई जा रही हैं` : `Showing ${n} job${n !== 1 ? "s" : ""}`,
    noResults: isHi
      ? "कोई नौकरी नहीं मिली। कोई और खोज आज़माएं।"
      : "No jobs found. Try a different search.",
    posted: isHi ? "प्रकाशित" : "Posted",
    verified: isHi ? "सत्यापित" : "Verified",
    examOn: isHi ? "परीक्षा" : "Exam",
    daysLeft: (n: number) => isHi ? `${n} दिन बचे` : `${n}d left`,
    previous: isHi ? "पिछला" : "Previous",
    next: isHi ? "अगला" : "Next",
    pageOf: (p: number) => isHi ? `पृष्ठ ${p}` : `Page ${p}`,
    liveJobs: isHi ? "लाइव नौकरियां" : "Live Jobs",
    heroSubtitle: isHi
      ? "सरकारी और सार्वजनिक क्षेत्र की नौकरियों की आधिकारिक अधिसूचनाएं, एक ही जगह।"
      : "Official notifications for government and public-sector openings, all in one place.",
    vacancies: isHi ? "पद" : "posts",
    jobsUnit: isHi ? "नौकरियां" : "jobs",
  };

  // Heading: combine kind + filter
  function pageHeading() {
    const base = validKind ? L.kindJobs(validKind) : L.allJobs;
    if (validFilter === "newly-added") return `${L.newlyAdded} — ${base}`;
    if (validFilter === "open") return `${L.open} — ${base}`;
    return base;
  }

  // Build href helpers that keep existing params
  function filterHref(f: string | undefined) {
    const params = new URLSearchParams();
    if (validKind) params.set("kind", validKind);
    if (q) params.set("q", q);
    if (f) params.set("filter", f);
    const qs = params.toString();
    return `/jobs${qs ? `?${qs}` : ""}`;
  }

  function kindHref(k: string | undefined) {
    const params = new URLSearchParams();
    if (k) params.set("kind", k);
    if (q) params.set("q", q);
    if (validFilter) params.set("filter", validFilter);
    const qs = params.toString();
    return `/jobs${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">

      {/* ── Hero strip ───────────────────────────────────────────────────── */}
      <div className="mb-8 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-white px-6 py-7 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              {/* live pulse dot */}
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-600 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-600" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
                {L.liveJobs}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
              {pageHeading()}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-neutral-500">
              {L.heroSubtitle}
            </p>
          </div>
          {/* Stat chip */}
          <div className="shrink-0">
            <div className="inline-flex flex-col items-center rounded-xl border border-indigo-100 bg-white px-5 py-3 shadow-sm">
              <span className="text-2xl font-bold text-indigo-600">
                {results.length}{hasNext ? "+" : ""}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                {L.jobsUnit}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search bar ───────────────────────────────────────────────────── */}
      <form className="flex gap-2" action="/jobs" method="get">
        {validKind && <input type="hidden" name="kind" value={validKind} />}
        {validFilter && <input type="hidden" name="filter" value={validFilter} />}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={L.searchPlaceholder}
          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <button
          type="submit"
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/40 active:scale-95 transition-all"
        >
          {L.search}
        </button>
      </form>

      {/* ── Kind filter row ───────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link
          href={kindHref(undefined)}
          className={
            !validKind
              ? "rounded-full bg-neutral-900 px-4 py-1.5 font-semibold text-white shadow-sm"
              : "rounded-full border border-neutral-200 px-4 py-1.5 text-neutral-600 hover:border-neutral-400 transition-colors"
          }
        >
          {L.all}
        </Link>
        <Link
          href={kindHref("GOVERNMENT")}
          className={
            validKind === "GOVERNMENT"
              ? "rounded-full bg-indigo-600 px-4 py-1.5 font-semibold text-white shadow-sm"
              : "rounded-full border border-neutral-200 px-4 py-1.5 text-neutral-600 hover:border-neutral-400 transition-colors"
          }
        >
          {L.government}
        </Link>
        <Link
          href={kindHref("PRIVATE")}
          className={
            validKind === "PRIVATE"
              ? "rounded-full bg-indigo-600 px-4 py-1.5 font-semibold text-white shadow-sm"
              : "rounded-full border border-neutral-200 px-4 py-1.5 text-neutral-600 hover:border-neutral-400 transition-colors"
          }
        >
          {L.private}
        </Link>
      </div>

      {/* ── Status / time filter pills ────────────────────────────────────── */}
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <Link
          href={filterHref(undefined)}
          className={
            !validFilter
              ? "rounded-full border border-indigo-600 bg-indigo-600 px-3 py-1 font-semibold text-white"
              : "rounded-full border border-neutral-200 px-3 py-1 text-neutral-600 hover:border-neutral-400 transition-colors"
          }
        >
          {L.all}
        </Link>
        <Link
          href={filterHref("newly-added")}
          className={
            validFilter === "newly-added"
              ? "rounded-full border border-indigo-600 bg-indigo-600 px-3 py-1 font-semibold text-white"
              : "rounded-full border border-neutral-200 px-3 py-1 text-neutral-600 hover:border-neutral-400 transition-colors"
          }
        >
          {L.newlyAdded}
        </Link>
        <Link
          href={filterHref("open")}
          className={
            validFilter === "open"
              ? "rounded-full border border-emerald-600 bg-emerald-600 px-3 py-1 font-semibold text-white"
              : "rounded-full border border-emerald-200 px-3 py-1 text-emerald-700 hover:border-emerald-400 transition-colors"
          }
        >
          {L.open}
        </Link>
      </div>

      {/* ── Job list ─────────────────────────────────────────────────────── */}
      <div className="mt-6">
        <ul className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden divide-y divide-neutral-100">
          {results.map((posting) => {
            const titleHi = (posting as any).titleHi as string | null;
            const locationCityHi = (posting as any).locationCityHi as
              | string
              | null;
            const orgNameHi = (posting.organization as any).nameHi as
              | string
              | null;

            const displayTitle = isHi && titleHi ? titleHi : posting.title;
            const displayOrgName =
              isHi && orgNameHi ? orgNameHi : posting.organization.name;
            const displayCity =
              isHi && locationCityHi ? locationCityHi : posting.locationCity;
            // Only link into the Hindi detail page when this posting
            // actually has Hindi content — otherwise send visitors to the
            // plain canonical page rather than a /hi URL that just shows
            // the same English text under a different path.
            const detailHref =
              isHi && titleHi
                ? `/hi/jobs/${posting.slug}`
                : `/jobs/${posting.slug}`;

            const examDate = (posting as any).examDate as Date | null | undefined;
            const lastVerifiedAt = (posting as any).lastVerifiedAt as Date | null | undefined;
            const totalVacancies = (posting as any).totalVacancies as number | null | undefined;
            const validThrough = (posting as any).validThrough as Date | null | undefined;

            // "Closing soon" = last date within 7 days from now (and not already past)
            const daysLeftNum = (() => {
              if (!validThrough) return null;
              const now = Date.now();
              const end = new Date(validThrough).getTime();
              const d = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
              return d >= 0 && d <= 7 ? d : null;
            })();
            const closingSoon = daysLeftNum !== null;

            const stageColor =
              STAGE_COLORS[posting.currentStage] ??
              "bg-neutral-100 text-neutral-600 ring-neutral-500/20";
            const stageLabel =
              stageLabels[posting.currentStage] ?? posting.currentStage;

            const locationLine = [
              displayOrgName,
              displayCity
                ? posting.locationRegion
                  ? `${displayCity}, ${posting.locationRegion}`
                  : displayCity
                : posting.locationRegion ?? null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li key={posting.id} className="group relative">
                <Link
                  href={detailHref}
                  className="flex items-start gap-4 px-5 py-5 transition-colors hover:bg-indigo-50/40 sm:px-6"
                >
                  {/* Left: text content */}
                  <div className="min-w-0 flex-1">
                    {/* Title + closing badge row */}
                    <div className="flex flex-wrap items-start gap-2">
                      <span className="text-base font-semibold text-neutral-900 group-hover:text-indigo-600 transition-colors leading-snug">
                        {displayTitle}
                      </span>
                      {/* Closing soon badge */}
                      {closingSoon && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 ring-1 ring-red-500/20">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                          </span>
                          {daysLeftNum === 0
                            ? (isHi ? "आज बंद" : "Closes today")
                            : L.daysLeft(daysLeftNum!)}
                        </span>
                      )}
                    </div>

                    {/* Org + location */}
                    {locationLine && (
                      <p className="mt-1 text-sm text-neutral-500 leading-snug">
                        {locationLine}
                      </p>
                    )}

                    {/* Badges row: stage + vacancies */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${stageColor}`}
                      >
                        {stageLabel}
                      </span>
                      {totalVacancies != null && totalVacancies > 0 && (
                        <span className="inline-flex items-center rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                          {totalVacancies.toLocaleString("en-IN")} {L.vacancies}
                        </span>
                      )}
                    </div>

                    {/* Metadata row */}
                    <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
                      {L.posted} {formatDate(posting.datePosted, dateLocale)}
                      {examDate && (
                        <> · {L.examOn}: {formatDate(examDate, dateLocale)}</>
                      )}
                      {lastVerifiedAt && (
                        <> · {L.verified} {formatDate(lastVerifiedAt, dateLocale)}</>
                      )}
                    </p>
                  </div>

                  {/* Right: chevron (visible on hover) */}
                  <div className="mt-1 shrink-0 text-neutral-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-600">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </Link>
              </li>
            );
          })}

          {results.length === 0 && (
            <li className="py-16 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-2xl">
                🔍
              </div>
              <p className="text-sm font-medium text-neutral-600">{L.noResults}</p>
            </li>
          )}
        </ul>

        {/* ── Pagination ─────────────────────────────────────────────────── */}
        {(page > 1 || hasNext) && (
          <nav
            aria-label="Pagination"
            className="mt-6 flex items-center justify-between gap-4"
          >
            {page > 1 ? (
              <Link
                rel="prev"
                href={pageHref("/jobs", { kind: validKind, q, filter: validFilter }, page - 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
              >
                ← {L.previous}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-neutral-400">
              {L.pageOf(page)}
            </span>
            {hasNext ? (
              <Link
                rel="next"
                href={pageHref("/jobs", { kind: validKind, q, filter: validFilter }, page + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                {L.next} →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>

      {/* ── SEO / AEO / GEO internal link grid ─────────────────────────── */}
      <SeoFooterLinks />
    </div>
  );
}
