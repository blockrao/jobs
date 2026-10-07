import { entitySeo } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOrganizationBySlug,
  getOrganizationRecruitments,
  getOrganizationExams,
  getOrganizationStats,
  getOrganizationPostNames,
} from "@/db/operations/get-organizations";
import { buildBreadcrumbSchema, buildOrganizationPageSchema, jsonLdGraph } from "@/lib/structured-data";
import { safeQuery } from "@/lib/safe-query";
import { StatTile } from "@/components/ui/stat-tile";
import { InfoCard } from "@/components/ui/info-card";
import { Badge } from "@/components/ui/badge";
import { ROLE_REGISTRY, roleAliases } from "@/lib/roles";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

/**
 * Match a list of raw post names against ROLE_REGISTRY to find which canonical
 * roles this organization has recruited for. Returns deduplicated role entries
 * sorted by name, capped at the requested limit for display (full set for schema).
 */
function matchRoles(postNames: string[]) {
  const lower = postNames.map((n) => n.toLowerCase());
  const matched: typeof ROLE_REGISTRY = [];

  for (const role of ROLE_REGISTRY) {
    const aliases = roleAliases(role).map((a) =>
      // roleAliases returns SQL ILIKE patterns — strip wildcards for plain includes check
      a.replace(/%/g, "").toLowerCase().trim()
    );
    const hit = aliases.some((alias) =>
      lower.some((name) => name.includes(alias) || alias.includes(name))
    );
    if (hit && !matched.find((r) => r.slug === role.slug)) {
      matched.push(role);
    }
  }

  return matched.sort((a, b) => a.name.localeCompare(b.name));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await safeQuery(() => getOrganizationBySlug(slug), null);

  if (!org) return {};

  const hasHindi = Boolean((org as any).nameHi);
  const title = `${org.name} - Recruitment Campaigns & Exams`;
  const metaDescription =
    org.description ||
    `${org.name}: View all recruitment campaigns, exams conducted, available positions, and application details.`;

  const seo = entitySeo({ base: "/organizations", slug: org.slug, locale: "en", hasHindi });

  // Substantive indexability gate: index if we have any recruitments, exams, or
  // canonical roles. A pure zero-entity org (stub created by data ingestion but
  // never populated) gets noindex until it earns real content.
  const stats = await safeQuery(
    () => getOrganizationStats(org.id),
    { recruitmentCount: 0, examCount: 0, positionCount: 0 }
  );
  const hasContent = stats.recruitmentCount > 0 || stats.examCount > 0;

  return {
    title,
    description: metaDescription,
    alternates: hasContent ? seo.alternates : undefined,
    robots: hasContent ? seo.robots : { index: false, follow: true },
    openGraph: {
      title,
      description: metaDescription,
      url: seo.url,
      type: "website",
    },
  };
}

export default async function OrganizationPage({ params }: Props) {
  const { slug } = await params;
  const org = await safeQuery(() => getOrganizationBySlug(slug), null);

  if (!org) {
    notFound();
  }

  const [recruitmentResults, examResults, stats, postNames] = await Promise.all([
    safeQuery(() => getOrganizationRecruitments(org.id), []),
    safeQuery(() => getOrganizationExams(org.id), []),
    safeQuery(() => getOrganizationStats(org.id), {
      recruitmentCount: 0,
      examCount: 0,
      positionCount: 0,
    }),
    safeQuery(() => getOrganizationPostNames(org.id), []),
  ]);

  const recruitments = recruitmentResults.map((r) => r.recruitment);
  const exams = examResults;
  const canonicalRoles = matchRoles(postNames);

  // Split recruitments into active and historical
  const activeRecruitments = recruitments.filter((r) => r.status === "ACTIVE");
  const historicalRecruitments = recruitments
    .filter((r) => r.status !== "ACTIVE")
    .sort((a, b) => b.year - a.year);

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: org.name, path: `/organizations/${org.slug}` },
  ]);

  const organizationSchema = buildOrganizationPageSchema(org, "en");
  const schema = jsonLdGraph(breadcrumbSchema, organizationSchema);

  const ROLES_DISPLAY_LIMIT = 20;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-4 mb-4">
          {org.logoUrl && (
            <img
              src={org.logoUrl}
              alt={org.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <div>
            <h1 className="text-4xl font-bold">{org.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {org.sector.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {org.description && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-lg text-gray-700">{org.description}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.recruitmentCount > 0 && (
          <StatTile tone="brand" value={stats.recruitmentCount} label="Recruitment Campaigns" />
        )}
        {stats.examCount > 0 && (
          <StatTile tone="neutral" value={stats.examCount} label="Exams Conducted" />
        )}
        {stats.positionCount > 0 && (
          <StatTile tone="success" value={stats.positionCount} label="Positions Recruited" />
        )}
      </div>

      {/* Official Website */}
      {org.websiteUrl && (
        <div className="mb-8 p-4 border-l-4 border-blue-500 bg-blue-50 rounded">
          <h3 className="font-semibold mb-2">Official Website</h3>
          <a
            href={org.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all"
          >
            {org.websiteUrl}
          </a>
        </div>
      )}

      {/* Active Recruitments */}
      {activeRecruitments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Active Recruitments</h2>
          <div className="space-y-3">
            {activeRecruitments.map((recruitment) => (
              <Link
                key={recruitment.id}
                href={`/jobs/${recruitment.slug}`}
                className="flex items-center justify-between gap-3 p-4 border border-neutral-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div>
                  <div className="font-semibold text-neutral-900 hover:underline text-lg">
                    {recruitment.name}
                  </div>
                  <div className="text-sm text-neutral-600 mt-1">
                    {recruitment.totalVacancies && `${recruitment.totalVacancies.toLocaleString("en-IN")} vacancies`}
                    {recruitment.totalVacancies && recruitment.year && " · "}
                    {recruitment.year}
                  </div>
                </div>
                <Badge tone="success">Active</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Roles Recruited For */}
      {canonicalRoles.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-1">Roles Recruited For</h2>
          <p className="text-sm text-neutral-500 mb-4">
            Government posts filled by {org.name} across all recruitment campaigns
          </p>
          <div className="flex flex-wrap gap-2">
            {canonicalRoles.slice(0, ROLES_DISPLAY_LIMIT).map((role) => (
              <Link
                key={role.slug}
                href={`/posts/${role.slug}`}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-blue-100 hover:text-blue-800 text-neutral-700 rounded-full text-sm font-medium transition-colors"
              >
                {role.name}
              </Link>
            ))}
            {canonicalRoles.length > ROLES_DISPLAY_LIMIT && (
              <span className="px-3 py-1.5 text-neutral-400 text-sm">
                +{canonicalRoles.length - ROLES_DISPLAY_LIMIT} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Exams Conducted */}
      {exams.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Exams Conducted</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((exam) => (
              <InfoCard
                key={exam.id}
                tone="neutral"
                href={`/exams/${exam.slug}`}
                title={exam.label}
                subtitle="View exam details"
              />
            ))}
          </div>
        </div>
      )}

      {/* Recruitment History */}
      {historicalRecruitments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Recruitment History</h2>
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left px-4 py-3 font-semibold text-neutral-700">Year</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-700">Recruitment</th>
                  <th className="text-right px-4 py-3 font-semibold text-neutral-700">Vacancies</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {historicalRecruitments.map((recruitment, idx) => (
                  <tr
                    key={recruitment.id}
                    className={idx % 2 === 0 ? "bg-white" : "bg-neutral-50"}
                  >
                    <td className="px-4 py-3 text-neutral-500">{recruitment.year}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/jobs/${recruitment.slug}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {recruitment.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-600">
                      {recruitment.totalVacancies
                        ? recruitment.totalVacancies.toLocaleString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral">{recruitment.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {recruitments.length === 0 && exams.length === 0 && (
        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <p className="text-gray-600">No recruitment campaigns or exams on record.</p>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="mt-12 pt-6 border-t text-sm text-gray-600">
        <Link href="/" className="hover:underline">Home</Link>
        {" / "}
        <Link href="/organizations" className="hover:underline">Organizations</Link>
        {" / "}
        <span>{org.name}</span>
      </div>
    </div>
  );
}
