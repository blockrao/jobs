import type { Metadata } from "next";
import { jsonLdGraph } from "@/lib/structured-data";
import Link from "next/link";
import { getAllHubs } from "@/data/hubs-metadata";
import { pageSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const revalidate = 86400; // Daily revalidation

export const metadata: Metadata = {
  title: "Government Job Guides & Hub Pages",
  description:
    "Comprehensive guides for government jobs by exam, state, salary range, and qualification. UPSC, SSC, Banking, Railways, Police, ISRO, and 28+ specialized hubs.",
  ...pageSeo(`${SITE_URL}/hubs`),
  openGraph: {
    title: "Government Job Guides & Hub Pages | JobOye",
    description:
      "Comprehensive guides for government jobs by exam, state, salary range, and qualification.",
    url: `${SITE_URL}/hubs`,
    type: "website",
  },
};

export default function HubsIndexPage() {
  const allHubs = getAllHubs();

  // Group hubs by category
  const categories = {
    exam: { label: "Exams", hubs: allHubs.filter((h) => h.category === "exam") },
    state: { label: "States", hubs: allHubs.filter((h) => h.category === "state") },
    department: { label: "Departments", hubs: allHubs.filter((h) => h.category === "department") },
    qualification: { label: "Qualifications", hubs: allHubs.filter((h) => h.category === "qualification") },
    salary: { label: "Salary Ranges", hubs: allHubs.filter((h) => h.category === "salary") },
  };

  // Category color mapping
  const categoryColors: Record<string, string> = {
    exam: "#8B5CF6",      // purple
    state: "#10B981",      // green
    department: "#F97316", // orange
    qualification: "#EF4444", // red
    salary: "#3B82F6",     // blue
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Header */}
      <section className="text-center mb-16">
        <h1 className="text-[36px] sm:text-[48px] lg:text-[52px] font-bold leading-[1.12] tracking-tight text-neutral-900 mb-4">
          Government Job Guides
        </h1>
        <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto">
          Explore comprehensive guides for government jobs across India. Find your path by exam, state,
          department, qualification, or salary range. Live job data, eligibility details, and career guidance.
        </p>
      </section>

      {/* Hubs Grid by Category */}
      {Object.entries(categories).map(
        ([categoryKey, { label, hubs: categoryHubs }]) =>
          categoryHubs.length > 0 && (
            <section key={categoryKey} className="mb-16">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: categoryColors[categoryKey] }}
                  />
                  <h2 className="text-2xl font-bold text-neutral-900">{label}</h2>
                  <span className="text-sm font-semibold text-neutral-500">({categoryHubs.length})</span>
                </div>
                <p className="text-sm text-neutral-600">
                  {categoryKey === "exam" &&
                    "Guides for major government exams including UPSC, SSC, Railways, Banking, and more."}
                  {categoryKey === "state" &&
                    "State-wise job guides covering all Indian states and union territories."}
                  {categoryKey === "department" &&
                    "Specialized government departments including Police, Defense, Health, Education, and more."}
                  {categoryKey === "qualification" &&
                    "Job paths based on educational qualification from 12th pass to postgraduate degrees."}
                  {categoryKey === "salary" &&
                    "Government jobs organized by salary ranges from entry-level to premium senior positions."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryHubs.map((hub) => (
                  <Link
                    key={hub.slug}
                    href={`/hubs/${hub.slug}`}
                    className="group p-6 rounded-lg border border-black/8 hover:border-black/20 transition-all hover:shadow-sm"
                  >
                    {/* Category badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: hub.color }}
                      />
                      <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-neutral-500">
                        {label}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-base text-neutral-900 mb-2 line-clamp-2 group-hover:text-neutral-700">
                      {hub.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-neutral-600 mb-4 line-clamp-2">
                      {hub.description}
                    </p>

                    {/* Stats */}
                    {Object.keys(hub.stats).length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {Object.entries(hub.stats)
                          .slice(0, 2)
                          .map(([key, value]) => (
                            <div
                              key={key}
                              className="text-xs font-semibold text-neutral-700 bg-neutral-100 px-2 py-1 rounded"
                            >
                              {value}
                            </div>
                          ))}
                      </div>
                    )}

                    {/* CTA */}
                    <div className="text-sm font-semibold text-neutral-900 group-hover:text-neutral-700 transition-colors">
                      Read Guide →
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )
      )}

      {/* CTA Section */}
      <section className="mt-16 pt-12 border-t border-black/8">
        <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-lg p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-4">
            Can't find your path?
          </h2>
          <p className="text-neutral-600 mb-6 max-w-2xl mx-auto">
            Browse all live government job notifications, filter by exam, state, salary, and qualification. Set job
            alerts to get notified the moment new positions are posted.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/jobs"
              className="inline-block px-6 py-3 rounded-lg bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-colors"
            >
              Browse All Jobs
            </Link>
          </div>
        </div>
      </section>

      {/* Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdGraph({
            "@type": "CollectionPage",
            name: "Government Job Guides",
            description:
              "Comprehensive guides for government jobs by exam, state, salary range, and qualification.",
            url: `${SITE_URL}/hubs`,
            isPartOf: {
              "@type": "WebSite",
              name: "JobOye",
              url: SITE_URL,
            },
            mainEntity: {
              "@type": "ItemList",
              itemListElement: allHubs.map((hub, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: `${SITE_URL}/hubs/${hub.slug}`,
                name: hub.title,
                description: hub.description,
              })),
            },
          })),
        }}
      />
    </div>
  );
}
