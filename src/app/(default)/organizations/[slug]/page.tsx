/**
 * /organizations/{slug} — the organization's canonical entity page.
 *
 * URL contract: exactly one URL per organization. Alias and merged-duplicate
 * slugs 301 to the canonical slug; nothing else renders here. Indexability is
 * decided by data volume (ORG_INDEX_MIN_RECRUITMENTS), not by whether an
 * editorial file exists.
 */
import { isUnresolvedOrganization } from "@/lib/organizations/unresolved";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { pageSeo } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { resolveOrganization } from "@/lib/organizations/resolve";
import { getOrganizationStats } from "@/lib/organizations/stats";
import { buildBreadcrumbSchema, buildOrganizationSchema, jsonLdGraph } from "@/lib/structured-data";
import { OrganizationPage } from "@/components/organization/organization-page";

export const revalidate = 7200; // 2 hours: deadlines and new notifications move daily

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveOrganization(slug);
  if (resolved.kind !== "canonical") {
    // Redirects and 404s are handled by the page; emit nothing indexable here.
    return { robots: { index: false, follow: true } };
  }
  const { org } = resolved;
  const stats = await getOrganizationStats(org.id);
  const year = new Date().getFullYear();

  const title = stats.live.length > 0
    ? `${org.name} Recruitment ${year}: ${stats.live.length} open notification${stats.live.length === 1 ? "" : "s"}`
    : `${org.name} Recruitment ${year}: notifications, posts and vacancies`;
  const description = stats.live.length > 0
    ? `${stats.live.length} current ${org.name} recruitment${stats.live.length === 1 ? "" : "s"}` +
      (stats.liveVacancies ? ` with ${stats.liveVacancies.toLocaleString("en-IN")} vacancies` : "") +
      `, with last dates and official notifications. ${stats.recruitments.length} notifications on record.`
    : `${org.name} job notifications on JobOye: ${stats.recruitments.length} recruitments on record with posts, vacancies and official notification links.`;

  return {
    title,
    description,
    ...pageSeo(`/organizations/${org.slug}`, { index: stats.indexable && !isUnresolvedOrganization(org.slug) }),
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/organizations/${org.slug}`),
      type: "website",
      ...(org.logoUrl ? { images: [{ url: org.logoUrl, alt: org.name }] } : {}),
    },
  };
}

export default async function OrganizationRoute({ params }: Props) {
  const { slug } = await params;
  const resolved = await resolveOrganization(slug);
  if (resolved.kind === "redirect") permanentRedirect(`/organizations/${resolved.slug}`);
  if (resolved.kind === "missing") notFound();

  const { org } = resolved;
  const stats = await getOrganizationStats(org.id);

  const schema = jsonLdGraph(
    buildOrganizationSchema(org, org.sector === "PRIVATE" ? null : "GOVERNMENT"),
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Organisations", path: "/organizations" },
      { name: org.name, path: `/organizations/${org.slug}` },
    ]),
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <OrganizationPage org={org} stats={stats} />
    </>
  );
}
