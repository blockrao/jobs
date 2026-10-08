import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageSeo } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { getRoleBySlug, ROLE_REGISTRY } from "@/lib/roles";
import { getPostsForRole, getRoleStats } from "@/db/operations/get-roles";
import { getPositionBySlug, getPostsForPosition, getPositionStats } from "@/db/operations/get-positions";
import { safeQuery } from "@/lib/safe-query";
import { buildBreadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";
import { EnrichedPostRow } from "@/components/enriched-post-row";

export const revalidate = 3600;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return ROLE_REGISTRY.map((role) => ({ slug: role.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  // Try position first (database-driven), then fall back to hardcoded role
  const position = await safeQuery(() => getPositionBySlug(slug), null);

  if (position) {
    const title = `${position.name} Government Jobs 2026 — Vacancies & Official Notifications`;
    const description = `Find all active ${position.name} government job recruitments on JobOye. View vacancy counts, eligibility criteria, application dates and official notification links from verified sources.`;
    const seo = pageSeo(`/posts/${position.slug}`);

    const stats = await safeQuery(() => getPositionStats(position.id), { totalVacancies: 0, activeRecruitments: 0, totalRecruitments: 0 });
    const hasContent = stats.totalRecruitments > 0;

    return {
      title,
      description,
      alternates: hasContent ? seo.alternates : undefined,
      robots: hasContent ? undefined : { index: false, follow: true },
      openGraph: {
        title,
        description,
        url: absoluteUrl(`/posts/${position.slug}`),
        type: "website",
      },
    };
  }

  // Fall back to hardcoded role
  const role = getRoleBySlug(slug);
  if (!role) return {};

  const title = `${role.name} Government Jobs 2026 — Vacancies & Official Notifications`;
  const description = `Find all active ${role.name} government job recruitments on JobOye. View vacancy counts, eligibility criteria, application dates and official notification links from verified sources.`;
  const seo = pageSeo(`/posts/${role.slug}`);

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

function daysRemaining(applicationEndDate: Date | null | undefined): number | null {
  if (!applicationEndDate) return null;
  return Math.ceil((new Date(applicationEndDate).getTime() - Date.now()) / 86400000);
}

/** Post leaf URL when postSlug exists, else fall back to recruitment hub */
function postUrl(recruitmentSlug: string, postSlug: string | null | undefined): string {
  return postSlug ? `/jobs/${recruitmentSlug}/${postSlug}` : `/jobs/${recruitmentSlug}`;
}

/** Human-readable application status label for active posts */
function applicationStatusLabel(applicationEndDate: Date | null | undefined, recruitmentStatus: string): string {
  const days = daysRemaining(applicationEndDate);
  if (days !== null) {
    if (days <= 0) return "Closing today";
    if (days === 1) return "Closing tomorrow";
    if (days <= 7) return `Closing in ${days} days`;
    return `Applications open · Last date ${formatDate(applicationEndDate)}`;
  }
  if (recruitmentStatus === "ACTIVE") return "Applications open";
  return "";
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;

  // Try position first (database-driven), then fall back to hardcoded role
  const position = await safeQuery(() => getPositionBySlug(slug), null);

  let rolePosts: any[] = [];
  let stats: any = { totalVacancies: 0, activeRecruitments: 0, totalRecruitments: 0 };
  let displayName = "";
  let displayDescription = "";

  if (position) {
    displayName = position.name;
    displayDescription = position.description || "";

    const [positionPosts, positionStats] = await Promise.all([
      safeQuery(() => getPostsForPosition(position.id), []),
      safeQuery(() => getPositionStats(position.id), { totalVacancies: 0, activeRecruitments: 0, totalRecruitments: 0 }),
    ]);

    rolePosts = positionPosts;
    stats = positionStats;
  } else {
    const role = getRoleBySlug(slug);
    if (!role) notFound();

    displayName = role.name;
    displayDescription = role.description;

    const [rolePostsResult, statsResult] = await Promise.all([
      safeQuery(() => getPostsForRole(role), []),
      safeQuery(() => getRoleStats(role), { totalVacancies: 0, activeRecruitments: 0, totalRecruitments: 0 }),
    ]);

    rolePosts = rolePostsResult;
    stats = statsResult;
  }

  // Derive distinct organizations
  const orgMap = new Map<number, { id: number; name: string; slug: string }>();
  for (const p of rolePosts) {
    if (!orgMap.has(p.organizationId)) {
      orgMap.set(p.organizationId, { id: p.organizationId, name: p.organizationName, slug: p.organizationSlug });
    }
  }
  const recruitingOrgs = Array.from(orgMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  const activePosts = rolePosts.filter((p) => isActive(p.recruitmentStatus, p.applicationEndDate));
  const closedPosts = rolePosts.filter((p) => !isActive(p.recruitmentStatus, p.applicationEndDate));

  const occupationSchema = {
    "@type": "Occupation",
    "@id": absoluteUrl(`/posts/${slug}#occupation`),
    name: displayName,
    description: displayDescription,
    occupationLocation: { "@type": "Country", name: "India" },
  };

  const itemListSchema = activePosts.length > 0
    ? {
        "@type": "ItemList",
        name: `Active ${displayName} Government Job Recruitments`,
        numberOfItems: activePosts.length,
        itemListElement: activePosts.slice(0, 20).map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: absoluteUrl(postUrl(p.recruitmentSlug, p.postSlug)),
          name: `${p.postName} — ${p.recruitmentName}`,
        })),
      }
    : null;

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Government Posts", path: "/posts" },
    { name: displayName, path: `/posts/${slug}` },
  ]);

  const schema = jsonLdGraph(breadcrumbSchema, occupationSchema, itemListSchema);

  return (
    <div className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* Page header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-8">
          <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-400 mb-4">
            <Link href="/posts" className="hover:text-neutral-700 transition-colors">Government Posts</Link>
            <span>›</span>
            <span className="text-neutral-500">{position?.category || "Government"}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 leading-tight mb-3">
            {displayName} Government Jobs
          </h1>
          <p className="text-base sm:text-lg text-neutral-500 leading-relaxed max-w-2xl">
            {displayDescription}
          </p>

          {/* Stats — only meaningful candidate-facing numbers */}
          {(stats.activeRecruitments > 0 || stats.totalVacancies > 0) && (
            <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-neutral-100">
              {stats.activeRecruitments > 0 && (
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{stats.activeRecruitments}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">Open now</div>
                </div>
              )}
              {stats.totalVacancies > 0 && (
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.totalVacancies.toLocaleString("en-IN")}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">Total vacancies</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Open Opportunities */}
        {activePosts.length > 0 ? (
          <section className="mb-10">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-neutral-900">Open Opportunities</h2>
            </div>
            <div className="space-y-3">
              {activePosts.map((p) => {
                const days = daysRemaining(p.applicationEndDate);
                const isUrgent = days !== null && days <= 7;
                const href = postUrl(p.recruitmentSlug, p.postSlug);
                const statusLabel = applicationStatusLabel(p.applicationEndDate, p.recruitmentStatus);
                return (
                  <EnrichedPostRow
                    key={p.postId}
                    post={p}
                    isActive={true}
                    href={href}
                    statusLabel={statusLabel}
                    daysRemaining={days}
                    isUrgent={isUrgent}
                    notificationUrl={p.notificationUrl || undefined}
                  />
                );
              })}
            </div>
          </section>
        ) : (
          /* Zero-active state — clear notice before past opportunities */
          closedPosts.length > 0 && (
            <div className="mb-8 rounded-xl border border-neutral-200 bg-white px-5 py-4 flex items-start gap-3">
              <span className="mt-0.5 text-neutral-400 shrink-0">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 6v4M10 13h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-neutral-700 text-sm">No current openings</p>
                <p className="text-neutral-500 text-sm mt-0.5">
                  There are no active {displayName} recruitments right now. Past opportunities are listed below.
                </p>
              </div>
            </div>
          )
        )}

        {/* Past Opportunities — compact table */}
        {closedPosts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">Past Opportunities</h2>
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wide w-16">Year</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wide">Post · Recruitment</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wide hidden sm:table-cell">Organisation</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wide hidden sm:table-cell w-24">Vacancies</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {closedPosts.map((p) => (
                    <tr key={p.postId} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-neutral-400 whitespace-nowrap align-top text-xs">
                        {p.recruitmentYear}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Link
                          href={postUrl(p.recruitmentSlug, p.postSlug)}
                          className="font-medium text-neutral-700 hover:text-blue-700 hover:underline block leading-snug"
                        >
                          {p.postName}
                        </Link>
                        <span className="text-neutral-400 text-xs block mt-0.5 sm:hidden">
                          {p.organizationName}{p.organizationState && `, ${p.organizationState}`}
                        </span>
                        <span className="text-neutral-400 text-xs block mt-0.5">
                          {p.recruitmentName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-500 text-sm hidden sm:table-cell align-top">
                        {p.organizationName}
                        {p.organizationState && <span className="text-neutral-400">, {p.organizationState}</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-500 hidden sm:table-cell align-top whitespace-nowrap">
                        {p.vacancyTotal ? p.vacancyTotal.toLocaleString("en-IN") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Organizations recruiting for this role */}
        {recruitingOrgs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-neutral-900 mb-1">
              Bodies Recruiting {displayName}s
            </h2>
            <p className="text-sm text-neutral-500 mb-4">
              Recruitment bodies that have notified {displayName} vacancies
            </p>
            <div className="flex flex-wrap gap-2">
              {recruitingOrgs.slice(0, 20).map((org) => (
                <Link
                  key={org.id}
                  href={`/organizations/${org.slug}`}
                  className="px-3 py-1.5 bg-white border border-neutral-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 text-neutral-600 rounded-full text-sm font-medium transition-colors"
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

        {/* About the role — evergreen, below transactional content */}
        <section className="mb-10 pt-8 border-t border-neutral-200">
          <h2 className="text-xl font-semibold text-neutral-900 mb-3">About {displayName} Roles</h2>
          <p className="text-neutral-600 leading-relaxed max-w-2xl">
            {displayDescription}
          </p>
          <p className="text-sm text-neutral-500 mt-3 leading-relaxed max-w-2xl">
            Vacancies are notified by central and state government bodies throughout the year.
            Eligibility, application window and selection process vary by recruiting organisation
            and recruitment cycle. Check official notifications before applying.
          </p>
        </section>

        {/* Empty state — no posts at all */}
        {rolePosts.length === 0 && (
          <div className="py-16 text-center bg-white rounded-xl border border-neutral-200">
            <p className="text-neutral-500 text-lg mb-1">No recruitments on record yet</p>
            <p className="text-neutral-400 text-sm">
              {displayName} vacancies will appear here when notified.
            </p>
          </div>
        )}

        {/* Breadcrumb footer */}
        <div className="mt-4 pt-6 border-t border-neutral-200 text-sm text-neutral-400">
          <Link href="/" className="hover:text-neutral-600 transition-colors">Home</Link>
          {" / "}
          <Link href="/posts" className="hover:text-neutral-600 transition-colors">Government Posts</Link>
          {" / "}
          <span className="text-neutral-600">{displayName}</span>
        </div>
      </div>
    </div>
  );
}
