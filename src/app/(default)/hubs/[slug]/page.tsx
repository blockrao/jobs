import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getHub, getAllHubs } from "@/data/hubs";
import { pageSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const revalidate = 21600; // ISR: 6 hours

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const hub = getHub(slug);

  if (!hub) {
    return {
      title: "Hub Not Found — JobOye",
      description: "The hub page you're looking for doesn't exist.",
    };
  }

  const canonical = `${SITE_URL}/hubs/${slug}`;

  return {
    title: hub.title,
    description: hub.description,
    ...pageSeo(canonical),
    openGraph: {
      title: hub.title,
      description: hub.description,
      url: canonical,
      type: "website",
    },
  };
}

export async function generateStaticParams() {
  return getAllHubs().map((hub) => ({
    slug: hub.slug,
  }));
}

export default async function HubPage({ params }: PageProps) {
  const { slug } = await params;
  const hub = getHub(slug);

  if (!hub) {
    notFound();
  }

  // Get related hubs with full data
  const relatedHubs = hub.relatedHubs
    .map((slugRef) => getHub(slugRef))
    .filter((h) => h !== undefined);

  // Category label
  const categoryLabels: Record<string, string> = {
    qualification: "Qualification",
    exam: "Exam",
    state: "State",
    department: "Department",
    salary: "Salary Range",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "JobOye",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Hubs",
        item: `${SITE_URL}/hubs`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: hub.title,
        item: `${SITE_URL}/hubs/${slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="mx-auto max-w-6xl px-4">
        {/* Hero */}
        <section className="py-12 sm:py-16">
          <div className="flex flex-col gap-4 max-w-3xl">
            <p className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ color: hub.color }}>
              {categoryLabels[hub.category]}
            </p>
            <h1 className="text-[28px] sm:text-[40px] lg:text-[44px] font-bold leading-[1.12] tracking-tight text-neutral-900">
              {hub.title}
            </h1>
            <p className="text-base sm:text-lg text-neutral-600 max-w-2xl">
              {hub.description}
            </p>

            {/* Stats Grid */}
            {Object.keys(hub.stats).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                {Object.entries(hub.stats).map(([key, value]) => (
                  <div
                    key={key}
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: `${hub.color}08`,
                      borderColor: `${hub.color}20`,
                    }}
                  >
                    <div className="font-bold text-lg" style={{ color: hub.color }}>
                      {value}
                    </div>
                    <div className="text-[13px] font-semibold text-neutral-600">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                href={`/jobs?category=${slug}`}
                className="inline-block px-6 py-3 rounded-lg font-semibold text-white"
                style={{ backgroundColor: hub.color }}
              >
                Browse {hub.title}
              </Link>
              <Link
                href="/alerts"
                className="inline-block px-6 py-3 rounded-lg font-semibold border-2 text-neutral-900"
                style={{ borderColor: hub.color }}
              >
                Set Job Alert
              </Link>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12 prose prose-sm sm:prose max-w-none">
          <div
            dangerouslySetInnerHTML={{ __html: hub.content }}
            className="space-y-6"
          />
        </section>

        {/* Related Hubs */}
        {relatedHubs.length > 0 && (
          <section className="py-12 border-t border-black/8">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 mb-8">
              Related Hubs
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedHubs.map((relHub) => (
                <Link
                  key={relHub!.slug}
                  href={`/hubs/${relHub!.slug}`}
                  className="group p-6 rounded-lg border border-black/8 hover:border-black/20 transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-full mb-3"
                    style={{ backgroundColor: relHub!.color }}
                  />
                  <h3 className="font-semibold text-neutral-900 group-hover:underline">
                    {relHub!.title}
                  </h3>
                  <p className="text-sm text-neutral-600 mt-2 line-clamp-2">
                    {relHub!.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQ / Quick Links */}
        <section className="py-12 border-t border-black/8">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 mb-8">
            Popular Searches
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              "Latest Notifications",
              "Closing Soon",
              "Highest Paying",
              "Easiest to Clear",
              "Best Benefits",
              "Fastest Growth",
              "Work-Life Balance",
              "Stable Jobs",
            ].map((search) => (
              <Link
                key={search}
                href={`/search?q=${encodeURIComponent(search)}`}
                className="px-4 py-2 rounded-lg bg-neutral-100 text-neutral-900 text-sm font-semibold hover:bg-neutral-200 transition-colors"
              >
                {search}
              </Link>
            ))}
          </div>
        </section>

        {/* All Hubs Nav */}
        <section className="py-12 border-t border-black/8">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 mb-8">
            All Hubs
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {getAllHubs().map((h) => (
              <Link
                key={h.slug}
                href={`/hubs/${h.slug}`}
                className={`px-4 py-3 rounded-lg border text-sm font-semibold transition-colors ${
                  h.slug === slug
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white text-neutral-900 border-black/8 hover:border-black/20"
                }`}
              >
                {h.title.substring(0, 40)}...
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
