/**
 * Search & Discovery Page
 *
 * Unified interface for:
 * - Full-text search across jobs
 * - Filtering by announcement freshness and closing urgency
 * - Discovery sections highlighting urgent, expiring, and new opportunities
 *
 * P1 #11-12: Search as first-class feature + strong job filters
 */

import { pageSeo } from "@/lib/seo";
import { Metadata } from "next";
import { SearchExperience, type SearchInitialState } from "@/components/SearchExperience";
import { DiscoverySections } from "@/components/DiscoverySections";

export const metadata: Metadata = {
  title: "Search Government Jobs in India | JobOye",
  description: "Find government job opportunities by post, exam, recruiting organisation, qualification and location. Refine results by announcement date and application deadline.",
  // Search is a utility view: never indexed.
  ...pageSeo("/search", { index: false }),
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) ?? "";
  };
  const allowedAnnouncement = ["ANNOUNCED_TODAY", "ANNOUNCED_THIS_WEEK", "ANNOUNCED_THIS_MONTH", "OLDER"];
  const allowedClosing = ["LAST_DATE_TODAY", "CLOSING_TOMORROW", "CLOSING_THIS_WEEK", "CLOSING_SOON", "NO_DEADLINE", "EXPIRED"];
  const allowedSort = ["relevance", "newest", "closing_soonest", "most_urgent"];
  const initialState: SearchInitialState = {
    q: first("q").slice(0, 160),
    announcement: allowedAnnouncement.includes(first("announcement")) ? first("announcement") as SearchInitialState["announcement"] : "",
    closing: allowedClosing.includes(first("closing")) ? first("closing") as SearchInitialState["closing"] : "",
    location: first("location").slice(0, 100),
    sort: allowedSort.includes(first("sort")) ? first("sort") as SearchInitialState["sort"] : undefined,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-indigo-700">JobOye · Government job search</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Find the right government job</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Search by post, exam, recruiting organisation, qualification or state. Compare application deadlines and open the recruitment or matching post for full details.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        <SearchExperience initialState={initialState} />
        <nav aria-label="Browse government jobs" className="mt-12 border-t border-slate-200 pt-7">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">Browse without a search</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/government-jobs" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-700">All Government Jobs</Link>
            <Link href="/closing-soon" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-700">Closing Soon</Link>
            <Link href="/categories" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-700">Job Categories</Link>
            <Link href="/states" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-700">State Jobs</Link>
            <Link href="/qualifications" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-700">By Qualification</Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
