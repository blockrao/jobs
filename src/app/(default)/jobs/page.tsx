import { listingSeo } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { listPostings } from "@/lib/queries";
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
  }>;
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const { kind, q } = await searchParams;
  let label = "All Jobs";
  if (kind === "GOVERNMENT") label = "Government Jobs";
  else if (kind === "PRIVATE") label = "Private Jobs";

  return {
    title: label,
    description: `Browse the latest ${label.toLowerCase()} notifications and openings across India.`,
    // No `languages` alternate here on purpose — this URL never changes by
    // locale (see the file-level comment above), so there's nothing to
    // cross-link.
    // Filter and search views are noindex and canonical to the unfiltered
    // listing (SEO-001 section 4).
    ...listingSeo("/jobs", { kind, q }),
  };
}

export default async function JobsListPage({ searchParams }: Props) {
  const { kind, q } = await searchParams;
  const validKind =
    kind === "GOVERNMENT" || kind === "PRIVATE" ? kind : undefined;
  let results: Awaited<ReturnType<typeof listPostings>> = [];
  try {
    results = await listPostings({
      kind: validKind,
      search: q,
      limit: 50,
    });
  } catch {
    results = [];
  }

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
    showing: (n: number) =>
      isHi ? `${n} नौकरियां दिखाई जा रही हैं` : `Showing ${n} job${n !== 1 ? "s" : ""}`,
    noResults: isHi
      ? "कोई नौकरी नहीं मिली। कोई और खोज आज़माएं।"
      : "No jobs found. Try a different search.",
    posted: isHi ? "प्रकाशित" : "Posted",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">
        {validKind ? L.kindJobs(validKind) : L.allJobs}
      </h1>

      <form className="mt-4 flex gap-2" action="/jobs" method="get">
        {validKind && <input type="hidden" name="kind" value={validKind} />}
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

      <div className="mt-4 flex gap-3 text-sm">
        <Link
          href="/jobs"
          className={!validKind ? "font-semibold underline" : "text-neutral-600"}
        >
          {L.all}
        </Link>
        <Link
          href="/jobs?kind=GOVERNMENT"
          className={
            validKind === "GOVERNMENT"
              ? "font-semibold underline"
              : "text-neutral-600"
          }
        >
          {L.government}
        </Link>
        <Link
          href="/jobs?kind=PRIVATE"
          className={
            validKind === "PRIVATE"
              ? "font-semibold underline"
              : "text-neutral-600"
          }
        >
          {L.private}
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
      </div>
    </div>
  );
}
