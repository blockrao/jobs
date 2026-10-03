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
import { JobSearch } from "@/components/JobSearch";
import { DiscoverySections } from "@/components/DiscoverySections";

export const metadata: Metadata = {
  title: "Search Jobs",
  description: "Search and discover government and public sector job opportunities with advanced filtering and urgency indicators.",
  // Search is a utility view: never indexed.
  ...pageSeo("/search", { index: false }),
};

export default function SearchPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const initialQuery = Array.isArray(searchParams.q)
    ? searchParams.q[0]
    : searchParams.q || "";

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-blue-600 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Find Your Opportunity</h1>
          <p className="text-blue-100 text-lg max-w-2xl">
            Search thousands of government and public sector job opportunities. Filter by urgency, location, and more.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Search Section */}
        <section className="mb-16">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Search Jobs</h2>
            <JobSearch initialQuery={initialQuery} />
          </div>
        </section>

        {/* Discovery Sections */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Discover Opportunities</h2>
          <DiscoverySections limit={6} />
        </section>

        {/* Info Section */}
        <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="font-semibold text-gray-900 mb-2">Smart Search</h3>
            <p className="text-gray-600 text-sm">
              Full-text search across job titles, organizations, positions, and requirements.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold text-gray-900 mb-2">Urgency Indicators</h3>
            <p className="text-gray-600 text-sm">
              Visual badges show announcement freshness and application closing dates.
            </p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="font-semibold text-gray-900 mb-2">Advanced Filters</h3>
            <p className="text-gray-600 text-sm">
              Filter by announcement date, closing date, organization, and location.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
