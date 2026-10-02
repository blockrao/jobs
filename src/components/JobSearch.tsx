"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { searchPostings, SearchResult } from "@/lib/search-queries";

interface JobSearchProps {
  onResultsChange?: (results: SearchResult[]) => void;
  initialQuery?: string;
}

export function JobSearch({ onResultsChange, initialQuery = "" }: JobSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [announcementFilter, setAnnouncementFilter] = useState<
    "ANNOUNCED_TODAY" | "ANNOUNCED_THIS_WEEK" | "ANNOUNCED_THIS_MONTH" | "OLDER" | ""
  >("");
  const [closingFilter, setClosingFilter] = useState<
    "LAST_DATE_TODAY" | "CLOSING_TOMORROW" | "CLOSING_THIS_WEEK" | "CLOSING_SOON" | "NO_DEADLINE" | "EXPIRED" | ""
  >("");
  const [sortBy, setSortBy] = useState<"relevance" | "newest" | "closing_soonest" | "most_urgent">(
    query ? "relevance" : "newest"
  );
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Execute search
  const performSearch = useCallback(
    async (q: string, announcement: string = "", closing: string = "", sort: string = "relevance") => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/search/jobs?${new URLSearchParams({
          ...(q && { q }),
          ...(announcement && { announcement }),
          ...(closing && { closing }),
          sort: sort || "relevance",
        }).toString()}`);

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.success) {
          setResults(data.data);
          onResultsChange?.(data.data);
        } else {
          setError(data.message || "Search failed");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
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

  // Fetch autocomplete suggestions as the visitor types. Previously the
  // suggestions dropdown below was fully built (state, rendering, click
  // handling) but nothing ever called setSuggestions, so it could never
  // show anything — /api/search/suggestions (backed by the already-working
  // getSearchSuggestions query) now feeds it.
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

  const handleSortChange = (newSort: "relevance" | "newest" | "closing_soonest" | "most_urgent") => {
    setSortBy(newSort);
  };

  const handleClearFilters = () => {
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
        <input
          type="text"
          placeholder="Search jobs by title, organization, position, or location..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length > 2) {
              setShowSuggestions(true);
            } else {
              setShowSuggestions(false);
            }
          }}
          onFocus={() => query.length > 2 && setShowSuggestions(true)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Autocomplete suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setQuery(suggestion);
                  setShowSuggestions(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Announcement
          </label>
          <select
            value={announcementFilter}
            onChange={(e) => setAnnouncementFilter(e.target.value as any)}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Closing
          </label>
          <select
            value={closingFilter}
            onChange={(e) => setClosingFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="LAST_DATE_TODAY">Today</option>
            <option value="CLOSING_TOMORROW">Tomorrow</option>
            <option value="CLOSING_THIS_WEEK">This Week</option>
            <option value="CLOSING_SOON">Soon</option>
            <option value="NO_DEADLINE">No Deadline</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as any)}
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
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
      {!isLoading && results.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            Found {results.length} {results.length === 1 ? "result" : "results"}
          </div>
          {results.map((result) => (
            <JobResultCard key={result.id} result={result} />
          ))}
        </div>
      )}

      {/* No Results */}
      {!isLoading && results.length === 0 && (query || announcementFilter || closingFilter) && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No results found</p>
          <p className="text-gray-400 text-xs mt-1">Try adjusting your filters or search terms</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && results.length === 0 && !query && !announcementFilter && !closingFilter && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">Start searching to see job postings</p>
        </div>
      )}
    </div>
  );
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
  };

  const priorityColors: Record<string, string> = {
    CRITICAL: "border-l-4 border-red-500",
    HOT: "border-l-4 border-orange-500",
    URGENT: "border-l-4 border-yellow-500",
    HIGH: "border-l-4 border-blue-500",
    MEDIUM: "border-l-4 border-green-500",
    NORMAL: "border-l-4 border-gray-300",
  };

  return (
    <div
      className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${priorityColors[result.priorityLevel]}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <a href={`/jobs/${result.slug}`} className="hover:underline">
            <h3 className="font-semibold text-gray-900 break-words">{result.title}</h3>
          </a>
          <p className="text-sm text-gray-600 mt-1">{result.organizationName}</p>

          <div className="flex flex-wrap gap-2 mt-3">
            {result.locationCity && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                📍 {result.locationCity}
              </span>
            )}
            {result.eligibility && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {result.eligibility}
              </span>
            )}
            {result.daysToClosing !== null && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                ⏱️ {result.daysToClosing === 0 ? "Closes today" : `${result.daysToClosing} days left`}
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
