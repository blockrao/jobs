"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import type { SearchResult } from "@/lib/search-types";

interface JobSearchProps {
  onResultsChange?: (results: SearchResult[]) => void;
  initialQuery?: string;
}

type AnnouncementFilter = "ANNOUNCED_TODAY" | "ANNOUNCED_THIS_WEEK" | "ANNOUNCED_THIS_MONTH" | "OLDER" | "";
type ClosingFilter =
  | "LAST_DATE_TODAY"
  | "CLOSING_TOMORROW"
  | "CLOSING_THIS_WEEK"
  | "CLOSING_SOON"
  | "NO_DEADLINE"
  | "EXPIRED"
  | "";
type SortOption = "relevance" | "newest" | "closing_soonest" | "most_urgent";

export function JobSearch({ onResultsChange, initialQuery = "" }: JobSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [announcementFilter, setAnnouncementFilter] = useState<AnnouncementFilter>("");
  const [closingFilter, setClosingFilter] = useState<ClosingFilter>("");
  const [sortBy, setSortBy] = useState<SortOption>(initialQuery.trim() ? "relevance" : "newest");
  // Until the visitor picks a sort order themselves, a typed query sorts by
  // relevance and an empty box by newest. (Previously the sort stayed on
  // "Newest" after typing, so the best match was never listed first.)
  const sortChosenByVisitor = useRef(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPartial, setIsPartial] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  // Only the latest request may update the list: a slow earlier response must
  // not overwrite the results of what the visitor typed since.
  const inFlight = useRef<AbortController | null>(null);

  const updateQuery = useCallback((value: string) => {
    setQuery(value);
    if (!sortChosenByVisitor.current) {
      setSortBy(value.trim() ? "relevance" : "newest");
    }
  }, []);

  // Execute search
  const performSearch = useCallback(
    async (q: string, announcement: string, closing: string, sort: string) => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const trimmed = q.trim();
        const response = await fetch(
          `/api/search/jobs?${new URLSearchParams({
            ...(trimmed && { q: trimmed }),
            ...(announcement && { announcement }),
            ...(closing && { closing }),
            sort: sort || "relevance",
          }).toString()}`,
          { signal: controller.signal }
        );

        const data = await response.json().catch(() => null);
        if (controller.signal.aborted) return;

        if (response.ok && data?.success) {
          setResults(data.data);
          setIsPartial(Boolean(data.partial));
          setHasMore(Boolean(data.pagination?.hasMore));
          setSearchedQuery(trimmed);
          onResultsChange?.(data.data);
        } else {
          // A failed search is shown as a failure, never as "No results found".
          setResults([]);
          setError(data?.message || "Search is temporarily unavailable. Please try again in a moment.");
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Search request failed:", err);
        setResults([]);
        setError("Search is temporarily unavailable. Please check your connection and try again.");
      } finally {
        if (inFlight.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [onResultsChange]
  );

  // Handle search input changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, announcementFilter, closingFilter, sortBy);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, announcementFilter, closingFilter, sortBy, performSearch]);

  // Fetch autocomplete suggestions as the visitor types.
  useEffect(() => {
    if (query.trim().length <= 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search/suggestions?${new URLSearchParams({ q: query }).toString()}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setSuggestions(data.data);
            setActiveSuggestion(-1);
          }
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            console.error("Suggestions fetch failed:", err);
          }
        });
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSortChange = (newSort: SortOption) => {
    sortChosenByVisitor.current = true;
    setSortBy(newSort);
  };

  const handleClearFilters = () => {
    sortChosenByVisitor.current = false;
    setQuery("");
    setAnnouncementFilter("");
    setClosingFilter("");
    setSortBy("newest");
  };

  const hasActiveFilters = query || announcementFilter || closingFilter;

  return (
    <div className="w-full space-y-6">
      {/* Search Input */}
      <div className="relative">
        <label htmlFor="job-search-input" className="sr-only">
          Search jobs by title, organization, post name, or any word from the notice
        </label>
        <input
          id="job-search-input"
          type="text"
          placeholder="Search jobs by title, post name, organization, or any word from the notice..."
          value={query}
          role="combobox"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-controls="job-search-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={
            activeSuggestion >= 0 ? `job-search-suggestion-${activeSuggestion}` : undefined
          }
          onChange={(e) => {
            updateQuery(e.target.value);
            setActiveSuggestion(-1);
            if (e.target.value.length > 2) {
              setShowSuggestions(true);
            } else {
              setShowSuggestions(false);
            }
          }}
          onFocus={() => query.length > 2 && setShowSuggestions(true)}
          onKeyDown={(e) => {
            if (!showSuggestions || suggestions.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveSuggestion((i) => (i + 1) % suggestions.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveSuggestion((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
            } else if (e.key === "Enter" && activeSuggestion >= 0) {
              e.preventDefault();
              updateQuery(suggestions[activeSuggestion]);
              setShowSuggestions(false);
              setActiveSuggestion(-1);
            } else if (e.key === "Escape") {
              setShowSuggestions(false);
              setActiveSuggestion(-1);
            }
          }}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Autocomplete suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            id="job-search-suggestions"
            role="listbox"
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10"
          >
            {suggestions.map((suggestion, i) => (
              <button
                key={suggestion}
                id={`job-search-suggestion-${i}`}
                type="button"
                role="option"
                aria-selected={i === activeSuggestion}
                onClick={() => {
                  updateQuery(suggestion);
                  setShowSuggestions(false);
                  setActiveSuggestion(-1);
                }}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 text-sm ${
                  i === activeSuggestion ? "bg-gray-100" : ""
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-wrap gap-4 items-end">
        {/* Announcement Filter */}
        <div>
          <label htmlFor="job-search-announcement" className="block text-sm font-medium text-gray-700 mb-1">
            Announcement
          </label>
          <select
            id="job-search-announcement"
            value={announcementFilter}
            onChange={(e) => setAnnouncementFilter(e.target.value as AnnouncementFilter)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="ANNOUNCED_TODAY">Today</option>
            <option value="ANNOUNCED_THIS_WEEK">This Week</option>
            <option value="ANNOUNCED_THIS_MONTH">This Month</option>
            <option value="OLDER">Older</option>
          </select>
        </div>

        {/* Closing Filter */}
        <div>
          <label htmlFor="job-search-closing" className="block text-sm font-medium text-gray-700 mb-1">
            Closing
          </label>
          <select
            id="job-search-closing"
            value={closingFilter}
            onChange={(e) => setClosingFilter(e.target.value as ClosingFilter)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="LAST_DATE_TODAY">Today</option>
            <option value="CLOSING_TOMORROW">Tomorrow</option>
            <option value="CLOSING_THIS_WEEK">This Week</option>
            <option value="CLOSING_SOON">Soon</option>
            <option value="NO_DEADLINE">No Deadline</option>
            <option value="EXPIRED">Closed</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <label htmlFor="job-search-sort" className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            id="job-search-sort"
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as SortOption)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="relevance">Relevance</option>
            <option value="newest">Newest</option>
            <option value="closing_soonest">Closing Soonest</option>
            <option value="most_urgent">Most Urgent</option>
          </select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Searching...</div>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && results.length > 0 && (
        <div className="space-y-3">
          {isPartial && searchedQuery && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
              No job matches every word of &ldquo;{searchedQuery}&rdquo;. Showing the closest matches.
            </div>
          )}
          <div className="text-sm text-gray-600" aria-live="polite">
            {hasMore
              ? `Showing the first ${results.length} results`
              : `Found ${results.length} ${results.length === 1 ? "result" : "results"}`}
          </div>
          {results.map((result) => (
            <JobResultCard key={result.id} result={result} />
          ))}
        </div>
      )}

      {/* No Results */}
      {!isLoading && !error && results.length === 0 && (query || announcementFilter || closingFilter) && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No results found</p>
          <p className="text-gray-400 text-xs mt-1">Try fewer or different words, or clear the filters</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && results.length === 0 && !query && !announcementFilter && !closingFilter && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">Start searching to see job postings</p>
        </div>
      )}
    </div>
  );
}

/** "8 Oct 2026" in Indian time, or null when the value is not a date. */
function formatLastDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Individual job result card with urgency badge and priority styling
 */
interface JobResultCardProps {
  result: SearchResult;
}

function JobResultCard({ result }: JobResultCardProps) {
  const urgencyColors: Record<string, string> = {
    Hot: "bg-red-100 text-red-800",
    Urgent: "bg-orange-100 text-orange-800",
    "This Week": "bg-yellow-100 text-yellow-800",
    Fresh: "bg-green-100 text-green-800",
    Open: "bg-gray-100 text-gray-800",
    Closed: "bg-gray-200 text-gray-600",
  };

  const priorityColors: Record<string, string> = {
    CRITICAL: "border-l-4 border-red-500",
    HOT: "border-l-4 border-orange-500",
    URGENT: "border-l-4 border-yellow-500",
    HIGH: "border-l-4 border-blue-500",
    MEDIUM: "border-l-4 border-green-500",
    NORMAL: "border-l-4 border-gray-300",
  };

  const PRIORITY_LABELS: Record<string, string> = {
    CRITICAL: "Critical",
    HOT: "Hot",
    URGENT: "Urgent",
    HIGH: "High",
    MEDIUM: "Medium",
    NORMAL: "Normal",
  };

  const lastDate = formatLastDate(result.validThrough);
  const days = result.daysToClosing;

  return (
    <div
      className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${
        priorityColors[result.priorityLevel] ?? priorityColors.NORMAL
      } ${result.isClosed ? "bg-gray-50" : ""}`}
    >
      {/* The border color above conveys priority visually but has no text
          equivalent anywhere on the card. This stays visually hidden since
          urgencyBadge below already shows a similar signal as visible text. */}
      {!result.isClosed && (
        <span className="sr-only">Priority: {PRIORITY_LABELS[result.priorityLevel] ?? result.priorityLevel}</span>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link href={result.href} className="hover:underline">
            <h3 className={`font-semibold break-words ${result.isClosed ? "text-gray-600" : "text-gray-900"}`}>
              {result.title}
            </h3>
          </Link>
          {result.organizationName && <p className="text-sm text-gray-600 mt-1">{result.organizationName}</p>}

          {/* Posts of this recruitment whose title matched the search, each
              linked to its own page. */}
          {result.matchingPosts.length > 0 && (result.postCount > 1 || result.matchingPosts[0].href !== result.href) && (
            <p className="text-sm text-gray-700 mt-2">
              <span className="text-gray-500">
                {result.matchingPostCount === 1 ? "Matching post: " : "Matching posts: "}
              </span>
              {result.matchingPosts.map((post, i) => (
                <span key={post.href}>
                  {i > 0 && <span className="text-gray-400"> · </span>}
                  <Link href={post.href} className="text-blue-700 hover:underline">
                    {post.title}
                  </Link>
                </span>
              ))}
              {result.matchingPostCount > result.matchingPosts.length && (
                <>
                  <span className="text-gray-400"> · </span>
                  <Link href={`/jobs/${result.slug}`} className="text-blue-700 hover:underline">
                    +{result.matchingPostCount - result.matchingPosts.length} more
                  </Link>
                </>
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            {result.locationCity && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                📍 {result.locationCity}
              </span>
            )}
            {result.totalVacancies !== null && result.totalVacancies > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                👥 {result.totalVacancies} {result.totalVacancies === 1 ? "vacancy" : "vacancies"}
              </span>
            )}
            {result.postCount > 1 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {result.postCount} posts
              </span>
            )}
            {result.isClosed ? (
              <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded">
                {lastDate ? `Applications closed on ${lastDate}` : "Applications closed"}
              </span>
            ) : (
              days !== null &&
              days >= 0 && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  ⏱️ {days === 0 ? "Closes today" : days === 1 ? "1 day left" : `${days} days left`}
                </span>
              )
            )}
            {result.eligibility && (
              <span
                className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded max-w-full sm:max-w-md truncate"
                title={result.eligibility}
              >
                {result.eligibility}
              </span>
            )}
          </div>
        </div>

        {/* Urgency Badge */}
        <div className="flex-shrink-0">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
              urgencyColors[result.urgencyBadge] || urgencyColors.Open
            }`}
          >
            {result.urgencyBadge}
          </span>
        </div>
      </div>
    </div>
  );
}
