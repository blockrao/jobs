import { listingSeo } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { listRecruitments } from "@/db/operations/get-recruitments";
import { deriveLifecycle, lifecycleLabel } from "@/lib/lifecycle";
import { SeoFooterLinks } from "@/components/seo-footer-links";
import { JOBS_PAGE_SIZE, pageHref, parsePage } from "@/lib/pagination";
import { KIND_LABELS, KIND_LABELS_HI, formatDate } from "@/lib/labels";
import { ChevronRight } from "lucide-react";

// /jobs is the discovery listing of the URL contract (2026-10-20):
//   /jobs → /jobs/{recruitment-slug} → /jobs/{recruitment-slug}/{post-slug}
// Every row is a canonical `recruitments` record linking to its hub. The
// legacy `postings` table is never used here: its one-segment slugs did not
// resolve to any route (audit P0 #2). Hindi UI labels follow the NEXT_LOCALE
// cookie; the URL never changes by language.
export const revalidate = 3600; // Keep the current-jobs listing fresh hourly.

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

  const description = `Browse the latest ${label.toLowerCase()} notifications and openings across India.`;

  return {
    title: label,
    description,
    // Keep social metadata aligned with this page's canonical URL instead of
    // inheriting the locale layout's generic homepage title and /en URL.
    openGraph: {
      title: label,
      description,
      url: "https://www.joboye.com/jobs",
      siteName: "JobOye",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: label,
      description,
    },
    // No `languages` alternate here on purpose — this URL never changes by
    // locale (see the file-level comment above), so there's nothing to
    // cross-link.
    // Filter and search views are noindex and canonical to the unfiltered
    // listing (SEO-001 section 4).
    // A paginated view (page 2 and later) is treated as filtered: noindex, canonical to /jobs.
    ...listingSeo("/jobs", { kind, q, filter, page: parsePage(page) > 1 ? page : undefined }),
  };
}

const LIFECYCLE_COLORS: Record<string, string> = {
  open: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  upcoming: "bg-blue-50 text-blue-700 ring-blue-600/20",
  closed: "bg-neutral-100 text-neutral-600 ring-neutral-500/20",
  results: "bg-violet-50 text-violet-700 ring-violet-600/20",
  archived: "bg-neutral-100 text-neutral-500 ring-neutral-500/20",
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

  // Do not turn a database/query failure into a false "No jobs found" state.
  // Let Next.js render the route error boundary; empty results now mean a real
  // successful query returned no matching recruitment records.
  let results = await listRecruitments({
    kind: validKind,
    filter: validFilter,
    search: q,
    // One extra row tells us whether a next page exists.
    limit: JOBS_PAGE_SIZE + 1,
    offset: (page - 1) * JOBS_PAGE_SIZE,
  });

  const hasNext = results.length > JOBS_PAGE_SIZE;
  if (hasNext) results = results.slice(0, JOBS_PAGE_SIZE);

  const cookieStore = await cookies();
  const isHi = cookieStore.get("NEXT_LOCALE")?.value === "hi";

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
    newlyAdded: isHi ? "हाल की अधिसूचनाएं" : "Recent Notifications",
    open: isHi ? "आवेदन खुले" : "Applications Open",
    showing: (n: number) =>
      isHi ? `${n} नौकरियां दिखाई जा रही हैं` : `Showing ${n} job${n !== 1 ? "s" : ""}`,
    noResults: validFilter === "newly-added"
      ? (isHi ? "पिछले 30 दिनों में कोई स्रोत-सत्यापित भर्ती अधिसूचना उपलब्ध नहीं है।" : "No source-verified recruitment notifications are available from the last 30 days.")
      : isHi
        ? (q ? `“${q}” से मेल खाने वाली नौकरी नहीं मिली। खोज बदलें या फ़िल्टर हटाएं।` : "अभी कोई वर्तमान या आगामी नौकरी उपलब्ध नहीं है। कृपया बाद में फिर देखें।")
        : (q ? `No jobs match “${q}”. Try a broader search or clear your filters.` : "No current or upcoming jobs are available in this listing right now. Please check back soon."),
    clearFilters: isHi ? "खोज और फ़िल्टर हटाएं" : "Clear search and filters",
    browseGovernment: isHi ? "सभी सरकारी नौकरियां देखें" : "Browse all government jobs",
    notification: isHi ? "अधिसूचना" : "Notification",
    verified: isHi ? "सत्यापित" : "Verified",
    examOn: isHi ? "परीक्षा" : "Exam",
    daysLeft: (n: number) => isHi ? `${n} दिन बचे` : `${n}d left`,
    previous: isHi ? "पिछला" : "Previous",
    next: isHi ? "अगला" : "Next",
    pageOf: (p: number) => isHi ? `पृष्ठ ${p}` : `Page ${p}`,
    liveJobs: isHi ? "भारत में नौकरी खोज" : "JOB DISCOVERY · INDIA",
    heroSubtitle: isHi
      ? "सरकारी विभागों, PSU, बैंक, रेलवे, रक्षा संगठनों और निजी नियोक्ताओं की वर्तमान और आगामी भर्तियां देखें।"
      : "Browse current and upcoming recruitment notices from government departments, PSUs, banks, railways, defence organisations and private employers.",
    vacancies: isHi ? "पद" : "posts",
    jobsUnit: isHi ? "इस पृष्ठ पर नौकरियां" : "jobs on this page",
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
    <div className="bg-slate-50/70">
      <div className="mx-auto max-w-7xl px-4 pb-14 pt-4 sm:px-6 sm:pt-5 lg:px-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/" className="transition hover:text-indigo-700">Home</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-slate-700">{pageHeading()}</span>
        </nav>

        {/* Match the shared JobOye discovery-hub visual system. */}
        <header className="relative isolate mt-5 overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl shadow-slate-900/10 sm:px-10 sm:py-10 lg:px-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-32 -z-10 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 right-1/3 -z-10 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {L.liveJobs}
              </p>
              <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {pageHeading()}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                {L.heroSubtitle}
              </p>
              <form className="mt-7 flex max-w-2xl flex-col gap-2 rounded-2xl border border-white/15 bg-white p-2 shadow-lg shadow-black/20 sm:flex-row" action="/jobs" method="get">
                {validKind && <input type="hidden" name="kind" value={validKind} />}
                {validFilter && <input type="hidden" name="filter" value={validFilter} />}
                <label htmlFor="jobs-q" className="sr-only">{L.search}</label>
                <input
                  id="jobs-q"
                  type="search"
                  name="q"
                  defaultValue={q ?? ""}
                  placeholder={L.searchPlaceholder}
                  className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 px-4 text-base text-slate-950 outline-none placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="submit"
                  className="h-12 shrink-0 rounded-xl bg-indigo-700 px-7 text-base font-extrabold text-white transition hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
                >
                  {L.search}
                </button>
              </form>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/government-jobs" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                  {L.browseGovernment}
                </Link>
                <Link href="/closing-soon" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                  {isHi ? "जल्द बंद होने वाली नौकरियां" : "Closing soon"}
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm">
              <p className="text-4xl font-bold tracking-tight tabular-nums text-white">{results.length}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">{L.jobsUnit}</p>
              <p className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-400">{L.pageOf(page)}</p>
            </div>
          </div>
        </header>

      {/* ── Kind filter row ───────────────────────────────────────────────── */}
      <div className="mt-8 flex flex-wrap gap-2 text-sm">
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
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
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
          {results.map((r) => {
            const lifecycle = deriveLifecycle(r.status, r.applicationEndDate);
            const displayOrgName = isHi && r.organizationNameHi ? r.organizationNameHi : r.organizationName;
            const detailHref = `/jobs/${r.slug}`;
            const closingSoon = lifecycle.isOpen && lifecycle.daysLeft !== null && lifecycle.daysLeft >= 0 && lifecycle.daysLeft <= 7;
            const badgeColor = LIFECYCLE_COLORS[lifecycle.state] ?? LIFECYCLE_COLORS.closed;
            const notificationOn = r.notificationDate;

            return (
              <li key={r.id} className="group relative">
                <Link
                  href={detailHref}
                  className="flex items-start gap-4 px-5 py-5 transition-colors hover:bg-indigo-50/40 sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start gap-2">
                      <span className="text-base font-semibold text-neutral-900 group-hover:text-indigo-600 transition-colors leading-snug">
                        {r.name}
                      </span>
                      {closingSoon && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 ring-1 ring-red-500/20">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                          </span>
                          {lifecycle.daysLeft === 0
                            ? (isHi ? "आज बंद" : "Closes today")
                            : L.daysLeft(lifecycle.daysLeft!)}
                        </span>
                      )}
                    </div>

                    {displayOrgName && (
                      <p className="mt-1 text-sm text-neutral-500 leading-snug">{displayOrgName}</p>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${badgeColor}`}>
                        {lifecycleLabel(lifecycle.state, isHi)}
                      </span>
                      {r.totalVacancies != null && r.totalVacancies > 0 && (
                        <span className="inline-flex items-center rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                          {r.totalVacancies.toLocaleString("en-IN")} {L.vacancies}
                        </span>
                      )}
                      {r.postCount > 1 && (
                        <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
                          {r.postCount} {isHi ? "पद प्रकार" : "post types"}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
                      {notificationOn && <>{L.notification} {formatDate(notificationOn, dateLocale)}</>}
                      {lifecycle.deadline && (
                        <> · {isHi ? "अंतिम तिथि" : "Last date"}: {formatDate(lifecycle.deadline, dateLocale)}</>
                      )}
                      {r.examDate && (
                        <> · {L.examOn}: {formatDate(r.examDate, dateLocale)}</>
                      )}
                      {r.lastVerifiedAt && (
                        <> · {L.verified} {formatDate(r.lastVerifiedAt, dateLocale)}</>
                      )}
                    </p>
                  </div>

                  <div className="mt-1 shrink-0 text-neutral-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-600">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </Link>
              </li>
            );
          })}

          {results.length === 0 && (
            <li className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-700">
                🔍
              </div>
              <p className="text-base font-semibold text-slate-900">{L.noResults}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {(q || validKind || validFilter) && (
                  <Link href="/jobs" className="inline-flex min-h-10 items-center rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800">
                    {L.clearFilters}
                  </Link>
                )}
                <Link href="/government-jobs" className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">
                  {L.browseGovernment}
                </Link>
              </div>
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
    </div>
  );
}
