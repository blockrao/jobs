import { listingSeo } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { listPostings } from "@/lib/queries";
import { JOBS_PAGE_SIZE, pageHref, parsePage } from "@/lib/pagination";
import {
  STAGE_LABELS,
  STAGE_LABELS_HI,
  KIND_LABELS,
  KIND_LABELS_HI,
  formatDate,
} from "@/lib/labels";

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
      <h1 className="text-2xl font-bold tracking-tight">{pageHeading()}</h1>

      <form className="mt-4 flex gap-2" action="/jobs" method="get">
        {validKind && <input type="hidden" name="kind" value={validKind} />}
        {validFilter && <input type="hidden" name="filter" value={validFilter} />}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={L.searchPlaceholder}
          className="w-full rounded-md border border-black/20 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
        >
          {L.search}
        </button>
      </form>

      {/* Kind filter row */}
      <div className="mt-4 flex gap-3 text-sm">
        <Link
          href={kindHref(undefined)}
          className={!validKind ? "font-semibold underline" : "text-neutral-600"}
        >
          {L.all}
        </Link>
        <Link
          href={kindHref("GOVERNMENT")}
          className={
            validKind === "GOVERNMENT"
              ? "font-semibold underline"
              : "text-neutral-600"
          }
        >
          {L.government}
        </Link>
        <Link
          href={kindHref("PRIVATE")}
          className={
            validKind === "PRIVATE"
              ? "font-semibold underline"
              : "text-neutral-600"
          }
        >
          {L.private}
        </Link>
      </div>

      {/* Status / time filter row */}
      <div className="mt-2 flex gap-2 text-xs">
        <Link
          href={filterHref(undefined)}
          className={
            !validFilter
              ? "rounded-full border border-neutral-900 bg-neutral-900 px-3 py-1 font-semibold text-white"
              : "rounded-full border border-black/20 px-3 py-1 text-neutral-600 hover:border-black/40"
          }
        >
          {L.all}
        </Link>
        <Link
          href={filterHref("newly-added")}
          className={
            validFilter === "newly-added"
              ? "rounded-full border border-neutral-900 bg-neutral-900 px-3 py-1 font-semibold text-white"
              : "rounded-full border border-black/20 px-3 py-1 text-neutral-600 hover:border-black/40"
          }
        >
          {L.newlyAdded}
        </Link>
        <Link
          href={filterHref("open")}
          className={
            validFilter === "open"
              ? "rounded-full border border-green-700 bg-green-700 px-3 py-1 font-semibold text-white"
              : "rounded-full border border-green-600/40 px-3 py-1 text-green-700 hover:border-green-600"
          }
        >
          {L.open}
        </Link>
      </div>

      <div className="mt-6">
        <div className="mb-4 text-sm text-neutral-600">
          {L.showing(results.length)}
        </div>

        <ul className="divide-y divide-black/10">
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

            return (
              <li key={posting.id} className="py-4">
                <Link
                  href={detailHref}
                  className="text-base font-semibold hover:underline"
                >
                  {displayTitle}
                </Link>
                <p className="text-sm text-neutral-600">
                  {displayOrgName}
                  {displayCity ? ` · ${displayCity}` : ""}
                  {posting.locationRegion ? `, ${posting.locationRegion}` : ""}{" "}
                  ·{" "}
                  {stageLabels[posting.currentStage] ?? posting.currentStage}
                </p>
                <p className="text-xs text-neutral-400">
                  {L.posted} {formatDate(posting.datePosted, dateLocale)}
                  {examDate && (
                    <> · {L.examOn}: {formatDate(examDate, dateLocale)}</>
                  )}
                  {lastVerifiedAt && (
                    <> · {L.verified} {formatDate(lastVerifiedAt, dateLocale)}</>
                  )}
                </p>
              </li>
            );
          })}
          {results.length === 0 && (
            <li className="py-8 text-center text-sm text-neutral-500">
              {L.noResults}
            </li>
          )}
        </ul>
        {(page > 1 || hasNext) && (
          <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link rel="prev" href={pageHref("/jobs", { kind: validKind, q, filter: validFilter }, page - 1)} className="hover:underline">
                {isHi ? "← पिछला" : "← Previous"}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-neutral-500">{isHi ? `पृष्ठ ${page}` : `Page ${page}`}</span>
            {hasNext ? (
              <Link rel="next" href={pageHref("/jobs", { kind: validKind, q, filter: validFilter }, page + 1)} className="hover:underline">
                {isHi ? "अगला →" : "Next →"}
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
