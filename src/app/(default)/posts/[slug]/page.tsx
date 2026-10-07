import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageSeo } from "@/lib/seo";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { getRoleBySlug, ROLE_REGISTRY } from "@/lib/roles";
import { getPostsForRole, getRoleStats } from "@/db/operations/get-roles";
import { safeQuery } from "@/lib/safe-query";
import { StatTile } from "@/components/ui/stat-tile";
import { buildBreadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return ROLE_REGISTRY.map((role) => ({ slug: role.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const role = getRoleBySlug(slug);
  if (!role) return {};

  const title = `${role.name} Government Jobs 2026 — Vacancies & Official Notifications`;
  const description = `Find all active ${role.name} government job recruitments on JobOye. View vacancy counts, eligibility criteria, application dates and official notification links from verified sources.`;
  const seo = pageSeo(`/posts/${role.slug}`);

  // Noindex role pages with no recruitment data (PQ-007).
  // A page with zero total recruitments has nothing for search engines to index
  // and may be penalised as thin content. Pages with closed/historical
  // recruitments are still valuable and remain indexed.
  const stats = await safeQuery(() => getRoleStats(role), { totalVacancies: 0, activeRecruitments: 0, totalRecruitments: 0 });
  const hasContent = stats.totalRecruitments > 0;

  return {
    title,
    description,
    alternates: hasContent ? seo.alternates : undefined,
    robots: hasContent ? undefined : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/posts/${role.slug}`),
      type: "website",
    },
  };
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function isActive(status: string, applicationEndDate: Date | null | undefined): boolean {
  if (status === "ACTIVE") return true;
  if (applicationEndDate && new Date(applicationEndDate) >= new Date()) return true;
  return false;
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const role = getRoleBySlug(slug);
  if (!role) notFound();

  const [rolePosts, stats] = await Promise.all([
    safeQuery(() => getPostsForRole(role), []),
    safeQuery(() => getRoleStats(role), { totalVacancies: 0, activeRecruitments: 0, totalRecruitments: 0 }),
  ]);

  // Derive distinct organizations from the role's posts (already joined).
  // Deduplicate by organizationId, sort by name for display.
  const orgMap = new Map<number, { id: number; name: string; slug: string }>();
  for (const p of rolePosts) {
    if (!orgMap.has(p.organizationId)) {
      orgMap.set(p.organizationId, {
        id: p.organizationId,
        name: p.organizationName,
        slug: p.organizationSlug,
      });
    }
  }
  const recruitingOrgs = Array.from(orgMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Separate active vs closed
  const activePosts = rolePosts.filter((p) => isActive(p.recruitmentStatus, p.applicationEndDate));
  const closedPosts = rolePosts.filter((p) => !isActive(p.recruitmentStatus, p.applicationEndDate));

  // Occupation schema for the role entity itself
  const occupationSchema = {
    "@type": "Occupation",
    "@id": absoluteUrl(`/posts/${role.slug}#occupation`),
    name: role.name,
    description: role.description,
    occupationLocation: {
      "@type": "Country",
      name: "India",
    },
  };

  // ItemList of active job postings linking to the recruitment hub pages
  const itemListSchema = activePosts.length > 0
    ? {
        "@type": "ItemList",
        name: `Active ${role.name} Government Job Recruitments`,
        numberOfItems: activePosts.length,
        itemListElement: activePosts.slice(0, 20).map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: absoluteUrl(`/jobs/${p.recruitmentSlug}`),
          name: p.recruitmentName,
        })),
      }
    : null;

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Government Posts", path: "/posts" },
    { name: role.name, path: `/posts/${role.slug}` },
  ]);

  const schema = jsonLdGraph(breadcrumbSchema, occupationSchema, itemListSchema);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* Header */}
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500 mb-3">
          <Link href="/posts" className="hover:underline">Government Posts</Link>
          <span>›</span>
          <span>{role.sector}</span>
        </div>
        <h1 className="text-4xl font-bold text-neutral-900 mb-3">
          {role.name} Government Jobs
        </h1>
        <p className="text-lg text-neutral-600 leading-relaxed">
          {role.description}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-8">
        {stats.activeRecruitments > 0 && (
          <StatTile tone="success" value={stats.activeRecruitments} label="Active Recruitments" />
        )}
        {stats.totalVacancies > 0 && (
          <StatTile tone="brand" value={stats.totalVacancies} label="Total Vacancies" />
        )}
        {stats.totalRecruitments > 0 && (
          <StatTile tone="neutral" value={stats.totalRecruitments} label="Total Recruitments" />
        )}
      </div>

      {/* Active Recruitments */}
      {activePosts.length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">
            Active Recruitments
          </h2>
          <div className="space-y-3">
            {activePosts.map((p) => (
              <div
                key={p.postId}
                className="border border-neutral-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/jobs/${p.recruitmentSlug}`}
                      className="font-semibold text-neutral-900 hover:text-blue-700 hover:underline text-lg leading-snug block"
                    >
                      {p.recruitmentName}
                    </Link>
                    <div className="text-sm text-neutral-500 mt-1">
                      <span>{p.organizationName}</span>
                      {p.vacancyTotal && (
                        <>
                          <span className="mx-2">·</span>
                          <span className="font-medium text-neutral-700">{p.vacancyTotal.toLocaleString("en-IN")} vacancies</span>
                        </>
                      )}
                      {p.applicationEndDate && (
                        <>
                          <span className="mx-2">·</span>
                          <span>Last date: {formatDate(p.applicationEndDate)}</span>
                        </>
                      )}
                    </div>
                    {(p.salaryMin || p.salaryMax) && (
                      <div className="text-sm text-neutral-600 mt-1">
                        Pay:{" "}
                        {p.salaryMin && `₹${p.salaryMin.toLocaleString("en-IN")}`}
                        {p.salaryMin && p.salaryMax && "–"}
                        {p.salaryMax && `₹${p.salaryMax.toLocaleString("en-IN")}`}
                        /month
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end shrink-0">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      Active
                    </span>
                    {p.notificationUrl && (
                      <a
                        href={p.notificationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                        aria-label={`Official notification for ${p.recruitmentName}`}
                      >
                        Official Notification ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Past Recruitments */}
      {closedPosts.length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">
            Past Recruitments
          </h2>
          <div className="space-y-2">
            {closedPosts.map((p) => (
              <div
                key={p.postId}
                className="border border-neutral-100 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <Link
                    href={`/jobs/${p.recruitmentSlug}`}
                    className="font-medium text-neutral-700 hover:text-blue-700 hover:underline"
                  >
                    {p.recruitmentName}
                  </Link>
                  <div className="text-sm text-neutral-400 mt-0.5">
                    {p.organizationName}
                    {p.vacancyTotal && (
                      <>
                        <span className="mx-2">·</span>
                        <span>{p.vacancyTotal.toLocaleString("en-IN")} vacancies</span>
                      </>
                    )}
                    <span className="mx-2">·</span>
                    <span>{p.recruitmentYear}</span>
                  </div>
                </div>
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500 shrink-0">
                  Closed
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Organizations recruiting for this role */}
      {recruitingOrgs.length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-neutral-900 mb-1">
            Organizations Recruiting {role.name}s
          </h2>
          <p className="text-sm text-neutral-500 mb-4">
            Recruitment bodies that have notified {role.name} vacancies
          </p>
          <div className="flex flex-wrap gap-2">
            {recruitingOrgs.slice(0, 20).map((org) => (
              <Link
                key={org.id}
                href={`/organizations/${org.slug}`}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-blue-100 hover:text-blue-800 text-neutral-700 rounded-full text-sm font-medium transition-colors"
              >
                {org.name}
              </Link>
            ))}
            {recruitingOrgs.length > 20 && (
              <span className="px-3 py-1.5 text-neutral-400 text-sm">
                +{recruitingOrgs.length - 20} more
              </span>
            )}
          </div>
        </section>
      )}

      {/* Empty state */}
      {rolePosts.length === 0 && (
        <div className="py-12 text-center bg-neutral-50 rounded-lg">
          <p className="text-neutral-500">
            No recruitments found for {role.name} at this time. Check back soon.
          </p>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="mt-12 pt-6 border-t text-sm text-neutral-500">
        <Link href="/" className="hover:underline">Home</Link>
        {" / "}
        <Link href="/posts" className="hover:underline">Government Posts</Link>
        {" / "}
        <span>{role.name}</span>
      </div>
    </div>
  );
}
