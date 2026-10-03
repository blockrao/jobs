import { entitySeo } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganizationBySlug, getOrganizationRecruitments, getOrganizationExams, getOrganizationStats } from "@/db/operations/get-organizations";
import { buildBreadcrumbSchema, buildOrganizationPageSchema, jsonLdGraph } from "@/lib/structured-data";
import { safeQuery } from "@/lib/safe-query";
import { StatTile } from "@/components/ui/stat-tile";
import { InfoCard } from "@/components/ui/info-card";
import { Badge } from "@/components/ui/badge";

export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string; locale: string }>
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const org = await safeQuery(() => getOrganizationBySlug(slug), null);

  if (!org) return {};

  const nameHi = (org as any).nameHi;
  const descriptionHi = (org as any).descriptionHi;
  const name = locale === "hi" ? nameHi || org.name : org.name;
  const description = locale === "hi" ? descriptionHi : org.description;

  const title = `${name} - Recruitment Campaigns & Exams`;
  const metaDescription = description ||
    `${name}: View all recruitment campaigns, exams conducted, available positions, and application details.`;

  // Only advertise the Hindi alternate when this organization actually has
  // translated content (nameHi) — most don't yet (15/121 as of writing),
  // matching the gating already applied on src/app/organizations/[slug].
  // Without this, every English-only org page declares a /hi/... hreflang
  // alternate that renders with the same English content, which is a
  // duplicate-content signal rather than a genuine translation.
  const hasHindi = Boolean(nameHi);

  const seo = entitySeo({ base: "/organizations", slug: org.slug, locale, hasHindi });

  return {
    title,
    description: metaDescription,
    alternates: seo.alternates,
    robots: seo.robots,
    openGraph: {
      title,
      description: metaDescription,
      url: seo.url,
      type: "website",
    },
  };
}

export default async function OrganizationPage({ params }: Props) {
  const { slug, locale } = await params;
  const org = await safeQuery(() => getOrganizationBySlug(slug), null);

  if (!org) {
    notFound();
  }

  const [recruitmentResults, examResults, stats] = await Promise.all([
    safeQuery(() => getOrganizationRecruitments(org.id), []),
    safeQuery(() => getOrganizationExams(org.id), []),
    safeQuery(() => getOrganizationStats(org.id), {
      recruitmentCount: 0,
      examCount: 0,
      positionCount: 0,
    }),
  ]);

  const recruitments = recruitmentResults.map((r) => r.recruitment);
  const exams = examResults;

  const nameHi = (org as any).nameHi;
  const descriptionHi = (org as any).descriptionHi;
  const displayName = locale === "hi" ? nameHi || org.name : org.name;
  const displayDescription = locale === "hi" ? descriptionHi : org.description;

  const breadcrumbSchema = buildBreadcrumbSchema([
    // No localized homepage exists (see root layout.tsx) — point breadcrumb
    // schema at "/" directly rather than a /${locale} URL that just bounces
    // through proxy.ts's redirect.
    { name: locale === "hi" ? "होम" : "Home", path: "/" },
    { name: displayName, path: locale === "hi" ? `/hi/organizations/${org.slug}` : `/organizations/${org.slug}` },
  ]);

  const organizationSchema = buildOrganizationPageSchema(org, locale);

  const schema = jsonLdGraph(breadcrumbSchema, organizationSchema);

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
              alt={displayName}
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <div>
            <h1 className="text-4xl font-bold">{displayName}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {org.sector.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {displayDescription && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-lg text-gray-700">{displayDescription}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.recruitmentCount > 0 && (
          <StatTile
            tone="brand"
            value={stats.recruitmentCount}
            label={locale === "hi" ? "भर्ती अभियान" : "Recruitment Campaigns"}
          />
        )}
        {stats.examCount > 0 && (
          <StatTile
            tone="neutral"
            value={stats.examCount}
            label={locale === "hi" ? "आयोजित परीक्षाएं" : "Exams Conducted"}
          />
        )}
        {stats.positionCount > 0 && (
          <StatTile
            tone="success"
            value={stats.positionCount}
            label={locale === "hi" ? "भर्ती पद" : "Positions Recruited"}
          />
        )}
      </div>

      {/* Official Links */}
      {org.websiteUrl && (
        <div className="mb-8 p-4 border-l-4 border-blue-500 bg-blue-50 rounded">
          <h3 className="font-semibold mb-2">{locale === "hi" ? "आधिकारिक वेबसाइट" : "Official Website"}</h3>
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

      {/* Exams Section */}
      {exams.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">{locale === "hi" ? "परीक्षाएं" : "Exams Recruited Through"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((exam) => (
              <InfoCard
                key={exam.id}
                tone="neutral"
                href={locale === "hi" ? `/hi/exams/${exam.slug}` : `/exams/${exam.slug}`}
                title={locale === "hi" ? exam.labelHi || exam.label : exam.label}
                subtitle={locale === "hi" ? "परीक्षा विवरण देखें" : "View exam details"}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recruitment Campaigns Section */}
      {recruitments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">{locale === "hi" ? "भर्ती अभियान" : "Recruitment Campaigns"}</h2>
          <div className="space-y-3">
            {recruitments
              .sort((a, b) => b.year - a.year)
              .map((recruitment) => (
                // /recruitments/[slug] has no [locale] counterpart — link to
                // the real page rather than a /${locale}/... URL that 404s.
                <Link
                  key={recruitment.id}
                  href={`/recruitments/${recruitment.slug}`}
                  className="p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-neutral-900 hover:underline text-lg">
                        {recruitment.name}
                      </div>
                      <div className="text-sm text-neutral-600 mt-1">
                        {recruitment.totalVacancies && `${recruitment.totalVacancies} ${locale === "hi" ? "रिक्तियां" : "vacancies"}`}
                        {recruitment.totalVacancies && recruitment.year && " • "}
                        {recruitment.year}
                      </div>
                    </div>
                    <Badge tone={recruitment.status === "ACTIVE" ? "success" : "neutral"}>
                      {recruitment.status}
                    </Badge>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {recruitments.length === 0 && exams.length === 0 && (
        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            {locale === "hi"
              ? "इस समय कोई सक्रिय भर्ती अभियान या परीक्षा नहीं है।"
              : "No active recruitment campaigns or exams at the moment."}
          </p>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="mt-12 pt-6 border-t text-sm text-gray-600">
        <Link href="/" className="hover:underline">
          {locale === "hi" ? "होम" : "Home"}
        </Link>
        {" / "}
        <span>{displayName}</span>
      </div>
    </div>
  );
}
