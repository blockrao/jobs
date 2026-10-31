"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SearchResult } from "@/lib/search-types";

type AnnouncementFilter = "" | "ANNOUNCED_TODAY" | "ANNOUNCED_THIS_WEEK" | "ANNOUNCED_THIS_MONTH" | "OLDER";
type ClosingFilter = "" | "LAST_DATE_TODAY" | "CLOSING_TOMORROW" | "CLOSING_THIS_WEEK" | "CLOSING_SOON" | "NO_DEADLINE" | "EXPIRED";
type SortOption = "relevance" | "newest" | "closing_soonest" | "most_urgent";

export interface SearchInitialState {
  q?: string;
  announcement?: AnnouncementFilter;
  closing?: ClosingFilter;
  location?: string;
  sort?: SortOption;
}

const PAGE_SIZE = 20;

export function SearchExperience({ initialState }: { initialState: SearchInitialState }) {
  const [query, setQuery] = useState(initialState.q ?? "");
  const [announcement, setAnnouncement] = useState<AnnouncementFilter>(initialState.announcement ?? "");
  const [closing, setClosing] = useState<ClosingFilter>(initialState.closing ?? "");
  const [location, setLocation] = useState(initialState.location ?? "");
  const [sort, setSort] = useState<SortOption>(initialState.sort ?? (initialState.q ? "relevance" : "newest"));
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [partial, setPartial] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [submittedState, setSubmittedState] = useState<SearchInitialState>({});
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchController = useRef<AbortController | null>(null);
  const suggestionController = useRef<AbortController | null>(null);
  const suggestionListId = "job-search-suggestions";

  const writeUrlState = useCallback((state: SearchInitialState) => {
    const params = new URLSearchParams();
    if (state.q?.trim()) params.set("q", state.q.trim());
    if (state.announcement) params.set("announcement", state.announcement);
    if (state.closing) params.set("closing", state.closing);
    if (state.location?.trim()) params.set("location", state.location.trim());
    if (state.sort && state.sort !== (state.q?.trim() ? "relevance" : "newest")) params.set("sort", state.sort);
    const queryString = params.toString();
    window.history.pushState(null, "", queryString ? `/search?${queryString}` : "/search");
  }, []);

  const requestResults = useCallback(async (offset: number, append: boolean, state: SearchInitialState) => {
    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      setError(null);
      setResults([]);
      setSearched(false);
    }

    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset), sort: state.sort ?? "relevance" });
      if (state.q?.trim()) params.set("q", state.q.trim());
      if (state.announcement) params.set("announcement", state.announcement);
      if (state.closing) params.set("closing", state.closing);
      if (state.location?.trim()) params.set("location", state.location.trim());

      const response = await fetch(`/api/search/jobs?${params.toString()}`, { signal: controller.signal });
      const data = await response.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Search is temporarily unavailable. Please try again.");
      }
      setResults((current) => append ? [...current, ...data.data] : data.data);
      if (!append) setSubmittedState(state);
      setPartial(Boolean(data.partial));
      setSearchedQuery(state.q?.trim() ?? "");
      setHasMore(Boolean(data.pagination?.hasMore));
      setNextOffset(offset + data.data.length);
      setSearched(true);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "Search is temporarily unavailable. Please try again.");
      if (!append) setResults([]);
    } finally {
      if (searchController.current === controller) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  const submitSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    const state = { q: query, announcement, closing, location, sort: query.trim() && sort === "newest" ? "relevance" : sort };
    setSort(state.sort as SortOption);
    setSuggestionsOpen(false);
    writeUrlState(state);
    void requestResults(0, false, state);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      void requestResults(nextOffset, true, submittedState);
    }
  };

  const clearAll = () => {
    setQuery("");
    setAnnouncement("");
    setClosing("");
    setLocation("");
    setSort("newest");
    writeUrlState({});
    void requestResults(0, false, { sort: "newest" });
  };

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const next: SearchInitialState = {
        q: params.get("q") ?? "",
        announcement: (params.get("announcement") ?? "") as AnnouncementFilter,
        closing: (params.get("closing") ?? "") as ClosingFilter,
        location: params.get("location") ?? "",
        sort: (params.get("sort") ?? undefined) as SortOption | undefined,
      };
      setQuery(next.q ?? "");
      setAnnouncement(next.announcement ?? "");
      setClosing(next.closing ?? "");
      setLocation(next.location ?? "");
      setSort(next.sort ?? (next.q ? "relevance" : "newest"));
      void requestResults(0, false, next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [requestResults]);

  useEffect(() => {
    const hasInitialState = Boolean(initialState.q || initialState.announcement || initialState.closing || initialState.location);
    if (hasInitialState) {
      void requestResults(0, false, initialState);
    }
    return () => {
      searchController.current?.abort();
      suggestionController.current?.abort();
    };
  // Initial state is intentionally read once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    suggestionController.current?.abort();
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    suggestionController.current = controller;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search/suggestions?${new URLSearchParams({ q: query.trim(), limit: "8" })}`, { signal: controller.signal });
        const data = await response.json();
        if (!controller.signal.aborted && response.ok && data?.success) {
          setSuggestions(Array.isArray(data.data) ? data.data : []);
        }
      } catch {
        // Suggestions are optional; keep the core search usable if they fail.
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const chooseSuggestion = (value: string) => {
    setQuery(value);
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
  };

  const onQueryKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setSuggestionsOpen(false);
      setActiveSuggestion(-1);
    } else if (event.key === "ArrowDown" && suggestionsOpen && suggestions.length) {
      event.preventDefault();
      setActiveSuggestion((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestionsOpen && suggestions.length) {
      event.preventDefault();
      setActiveSuggestion((current) => current <= 0 ? suggestions.length - 1 : current - 1);
    } else if (event.key === "Enter" && suggestionsOpen && activeSuggestion >= 0) {
      event.preventDefault();
      chooseSuggestion(suggestions[activeSuggestion]);
    }
  };

  const activeFilters = Boolean(query.trim() || announcement || closing || location.trim());

  return (
    <div className="space-y-7">
      <form onSubmit={submitSearch} className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm sm:p-6">
        <label htmlFor="job-search-query" className="mb-2 block text-sm font-bold text-slate-800">What government job are you looking for?</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <input
              id="job-search-query"
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setSuggestionsOpen(true); setActiveSuggestion(-1); }}
              onFocus={() => setSuggestionsOpen(true)}
              onKeyDown={onQueryKeyDown}
              placeholder="Try “SSC CGL”, “B.Tech jobs in Haryana”, “Railway clerk”…"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={suggestionsOpen && suggestions.length > 0}
              aria-controls={suggestionListId}
              aria-activedescendant={activeSuggestion >= 0 ? `job-search-suggestion-${activeSuggestion}` : undefined}
              className="h-13 w-full rounded-xl border border-slate-300 px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            />
            {suggestionsOpen && suggestions.length > 0 && (
              <ul id={suggestionListId} role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                {suggestions.map((suggestion, index) => (
                  <li key={suggestion} role="option" aria-selected={index === activeSuggestion}>
                    <button
                      id={`job-search-suggestion-${index}`}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseSuggestion(suggestion)}
                      className={`w-full px-4 py-3 text-left text-sm font-medium text-slate-800 hover:bg-indigo-50 ${index === activeSuggestion ? "bg-indigo-50" : ""}`}
                    >{suggestion}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="submit" disabled={loading} className="h-13 rounded-xl bg-indigo-700 px-7 text-base font-bold text-white transition hover:bg-indigo-800 disabled:cursor-wait disabled:opacity-60">
            {loading ? "Searching…" : "Search jobs"}
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">Search by post, exam, recruiting organisation, qualification or location. Press Enter to search.</p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect label="Announcement" value={announcement} onChange={(value) => setAnnouncement(value as AnnouncementFilter)}>
            <option value="">Any time</option>
            <option value="ANNOUNCED_TODAY">Announced today</option>
            <option value="ANNOUNCED_THIS_WEEK">This week</option>
            <option value="ANNOUNCED_THIS_MONTH">This month</option>
            <option value="OLDER">Older</option>
          </FilterSelect>
          <FilterSelect label="Application status" value={closing} onChange={(value) => setClosing(value as ClosingFilter)}>
            <option value="">Any status</option>
            <option value="LAST_DATE_TODAY">Closes today</option>
            <option value="CLOSING_TOMORROW">Closes tomorrow</option>
            <option value="CLOSING_THIS_WEEK">Closes this week</option>
            <option value="CLOSING_SOON">Closing later</option>
            <option value="NO_DEADLINE">No published deadline</option>
            <option value="EXPIRED">Applications closed</option>
          </FilterSelect>
          <div>
            <label htmlFor="job-search-location" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Location</label>
            <input id="job-search-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="State or region" className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" />
          </div>
          <FilterSelect label="Sort results" value={sort} onChange={(value) => setSort(value as SortOption)}>
            <option value="relevance">Most relevant</option>
            <option value="newest">Newest first</option>
            <option value="closing_soonest">Closing soonest</option>
            <option value="most_urgent">Most urgent</option>
          </FilterSelect>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="font-semibold text-slate-500">Popular:</span>
            {["SSC CGL", "Railway", "Banking", "12th pass", "B.Tech"].map((term) => (
              <button key={term} type="button" onClick={() => setQuery(term)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50">{term}</button>
            ))}
          </div>
          {activeFilters && <button type="button" onClick={clearAll} className="text-sm font-semibold text-slate-600 underline underline-offset-4 hover:text-indigo-700">Clear all</button>}
        </div>
      </form>

      <section aria-live="polite" aria-busy={loading || loadingMore} className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-950">Job opportunities</h2>
            <p className="mt-1 text-sm text-slate-600">
              {loading ? "Finding matching opportunities…" : error ? "Search could not be completed." : searched ? `${results.length} opportunities shown` : "Enter a search or apply filters to find matching opportunities."}
            </p>
          </div>
          {searched && results.length > 0 && <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">{partial ? "Closest matches" : "Matching results"}</span>}
        </div>

        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">{error}</div>}
        {partial && searchedQuery && results.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No recruitment matched every word in “{searchedQuery}”. These are the closest matches; try a shorter phrase to narrow the results.</div>}
        {loading && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500">Searching current opportunities…</div>}
        {!loading && !error && searched && results.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
            <h3 className="text-lg font-bold text-slate-900">No matching opportunities found</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">Try a shorter exam or post name, remove one filter, or search using an abbreviation such as SSC, RRB or IBPS.</p>
            <button type="button" onClick={clearAll} className="mt-4 rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-800">Clear search</button>
          </div>
        )}
        {!loading && !error && !searched && <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">Start with a post, exam, organisation, qualification or state. You can narrow the results with filters.</div>}

        {!loading && !error && results.length > 0 && (
          <>
            <div className="space-y-3">{results.map((result) => <SearchResultCard key={result.id} result={result} />)}</div>
            {hasMore && <div className="flex justify-center pt-2"><button type="button" onClick={loadMore} disabled={loadingMore} className="min-h-11 rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-800 shadow-sm hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-60">{loadingMore ? "Loading more…" : "Load more opportunities"}</button></div>}
          </>
        )}
      </section>
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  const id = `search-filter-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return <div><label htmlFor={id} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">{label}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100">{children}</select></div>;
}

function SearchResultCard({ result }: { result: SearchResult }) {
  const lastDate = result.validThrough ? new Date(result.validThrough).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : null;
  const urgencyTone = result.isClosed ? "bg-slate-100 text-slate-700" : result.urgencyBadge === "Hot" || result.urgencyBadge === "Urgent" ? "bg-rose-50 text-rose-800" : result.urgencyBadge === "Fresh" ? "bg-emerald-50 text-emerald-800" : "bg-indigo-50 text-indigo-800";
  return (
    <article className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${urgencyTone}`}>{result.urgencyBadge}</span>
            {result.totalVacancies != null && result.totalVacancies > 0 && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">{result.totalVacancies.toLocaleString("en-IN")} vacancies</span>}
            {result.postCount > 1 && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">{result.postCount} posts</span>}
          </div>
          <h3 className="text-lg font-extrabold leading-7 tracking-tight text-slate-950 sm:text-xl"><Link href={result.href} className="hover:text-indigo-700 hover:underline">{result.title}</Link></h3>
          {result.organizationName && <p className="mt-1 text-sm font-semibold text-slate-700">{result.organizationName}</p>}
          {result.matchingPosts.length > 0 && <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3"><p className="mb-1 text-xs font-bold uppercase tracking-wide text-indigo-800">Matching posts</p><ul className="flex flex-wrap gap-x-4 gap-y-2">{result.matchingPosts.map((post) => <li key={post.href}><Link href={post.href} className="text-sm font-semibold text-indigo-800 underline-offset-4 hover:underline">{post.title}</Link></li>)}</ul>{result.matchingPostCount > result.matchingPosts.length && <p className="mt-2 text-xs text-slate-600">And {result.matchingPostCount - result.matchingPosts.length} more matching posts on the recruitment page.</p>}</div>}
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
            {result.locationCity && <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">{result.locationCity}{result.locationRegion ? `, ${result.locationRegion}` : ""}</span>}
            {result.eligibility && <span className="max-w-full truncate rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5" title={result.eligibility}>{result.eligibility}</span>}
            {result.isClosed ? <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">Applications closed{lastDate ? ` · ${lastDate}` : ""}</span> : result.daysToClosing != null && result.daysToClosing >= 0 ? <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">{result.daysToClosing === 0 ? "Closes today" : result.daysToClosing === 1 ? "1 day left" : `${result.daysToClosing} days left`}</span> : null}
          </div>
        </div>
        <Link href={result.href} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-800 hover:bg-indigo-100">View recruitment <span aria-hidden="true" className="ml-1">→</span></Link>
      </div>
    </article>
  );
}
