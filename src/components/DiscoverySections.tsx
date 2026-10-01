"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SearchResult } from "@/lib/search-queries";

interface DiscoverySectionsProps {
  limit?: number;
}

interface DiscoveryResponse {
  success: boolean;
  discovery: {
    urgentOpportunities: {
      label: string;
      description: string;
      count: number;
      results: SearchResult[];
    };
    closingThisWeek: {
      label: string;
      description: string;
      count: number;
      results: SearchResult[];
    };
    newlyAnnounced: {
      label: string;
      description: string;
      count: number;
      results: SearchResult[];
    };
  };
}

export function DiscoverySections({ limit = 6 }: DiscoverySectionsProps) {
  const [data, setData] = useState<DiscoveryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDiscovery = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/search/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch discovery sections: ${response.statusText}`);
        }

        const result: DiscoveryResponse = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiscovery();
  }, [limit]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading discovery sections...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {error}
      </div>
    );
  }

  if (!data?.success || !data?.discovery) {
    return null;
  }

  const sections: Array<{
    key: string;
    icon: string;
    color: "red" | "yellow" | "green";
    section: { label: string; description: string; count: number; results: SearchResult[] };
  }> = [
    {
      key: "urgentOpportunities",
      icon: "🔥",
      color: "red",
      section: data.discovery.urgentOpportunities,
    },
    {
      key: "closingThisWeek",
      icon: "⏰",
      color: "yellow",
      section: data.discovery.closingThisWeek,
    },
    {
      key: "newlyAnnounced",
      icon: "✨",
      color: "green",
      section: data.discovery.newlyAnnounced,
    },
  ];

  return (
    <div className="space-y-8">
      {sections.map(({ key, icon, color, section }) => (
        <DiscoverySection
          key={key}
          icon={icon}
          color={color}
          label={section.label}
          description={section.description}
          results={section.results}
        />
      ))}
    </div>
  );
}

interface DiscoverySectionProps {
  icon: string;
  color: "red" | "yellow" | "green";
  label: string;
  description: string;
  results: SearchResult[];
}

function DiscoverySection({
  icon,
  color,
  label,
  description,
  results,
}: DiscoverySectionProps) {
  const bgColors = {
    red: "bg-red-50",
    yellow: "bg-yellow-50",
    green: "bg-green-50",
  };

  const borderColors = {
    red: "border-red-200",
    yellow: "border-yellow-200",
    green: "border-green-200",
  };

  const badgeColors = {
    red: "bg-red-100 text-red-800",
    yellow: "bg-yellow-100 text-yellow-800",
    green: "bg-green-100 text-green-800",
  };

  return (
    <div
      className={`rounded-lg border ${borderColors[color]} ${bgColors[color]} overflow-hidden`}
    >
      {/* Header */}
      <div className="p-6 border-b border-inherit">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{icon}</span>
          <h2 className="text-xl font-bold text-gray-900">{label}</h2>
          {results.length > 0 && (
            <span className={`ml-auto text-sm font-medium px-3 py-1 rounded-full ${badgeColors[color]}`}>
              {results.length} {results.length === 1 ? "posting" : "postings"}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      {/* Results */}
      <div className="divide-y divide-inherit">
        {results.length > 0 ? (
          results.map((result) => (
            <DiscoveryCard key={result.id} result={result} />
          ))
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500 text-sm">No postings at this time</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DiscoveryCard({ result }: { result: SearchResult }) {
  return (
    <Link
      href={`/jobs/${result.slug}`}
      className="block p-6 hover:bg-white/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 hover:text-blue-600 break-words">
            {result.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{result.organizationName}</p>

          <div className="flex flex-wrap gap-2 mt-3">
            {result.locationCity && (
              <span className="text-xs text-gray-500 bg-white/60 px-2 py-1 rounded">
                📍 {result.locationCity}
              </span>
            )}
            {result.daysToClosing !== null && (
              <span className="text-xs text-gray-500 bg-white/60 px-2 py-1 rounded">
                {result.daysToClosing === 0 ? "🔴 Closes today" : `⏱️ ${result.daysToClosing} days`}
              </span>
            )}
            {result.totalVacancies && (
              <span className="text-xs text-gray-500 bg-white/60 px-2 py-1 rounded">
                👥 {result.totalVacancies} {result.totalVacancies === 1 ? "vacancy" : "vacancies"}
              </span>
            )}
          </div>
        </div>

        {/* Arrow indicator */}
        <div className="flex-shrink-0 text-gray-400 text-lg">→</div>
      </div>
    </Link>
  );
}
