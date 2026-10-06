import { entitySeo } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getExamBySlug, getExamRelatedPositions, getExamRecruitmentDetails } from "@/db/operations/get-exams";
import { buildBreadcrumbSchema, buildExamSchema, jsonLdGraph } from "@/lib/structured-data";
import { safeQuery } from "@/lib/safe-query";
import { InfoCard } from "@/components/ui/info-card";
import { Badge } from "@/components/ui/badge";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string; locale: string }> };

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const examData = await safeQuery(() => getExamBySlug(slug), null);

  if (!examData) return {};

  const exam = examData.exam;
  const labelHi = exam.labelHi;
  const descriptionHi = exam.descriptionHi;
  const name = locale === "hi" ? labelHi || exam.label : exam.label;
  const title = `${name} - Eligibility, Salary & Recruitment`;
  const description = locale === "hi" ? descriptionHi : exam.description;
  const metaDescription = description ||
    `${name}: Eligibility, positions recruited, notification links, and all related government recruitment campaigns.`;

  // A Hindi version exists only when the exam has a Hindi name.
  const seo = entitySeo({ base: "/exams", slug: exam.slug, locale, hasHindi: Boolean(labelHi) });

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

export default async function ExamPage({ params }: Props) {
  const { slug, locale } = await params;
  const examData = await safeQuery(() => getExamBySlug(slug), null);

  if (!examData) {
    notFound();
  }

  const exam = examData.exam;
  const commission = examData.commission;

  const labelHi = (exam as any).labelHi;
  const descriptionHi = (exam as any).descriptionHi;
  const eligibilityHi = (exam as any).eligibilityHi;
  const commissionNameHi = (commission as any).nameHi;

  const displayExamName = locale === "hi" ? labelHi || exam.label : exam.label;
  const displayExamDescription = locale === "hi" ? descriptionHi : exam.description;
  const displayExamEligibility = locale === "hi" ? eligibilityHi : (exam as any).eligibility;
  const displayCommissionName = locale === "hi" ? commissionNameHi || commission.name : commission.name;

  const [relatedPositions, recruitmentDetails] = await Promise.all([
    safeQuery(() => getExamRelatedPositions(exam.id), []),
    safeQuery(() => getExamRecruitmentDetails(exam.id), []),
  ]);

  const breadcrumbSchema = buildBreadcrumbSchema([
    // No localized homepage or /commissions page exists (see root
    // layout.tsx and the note on the commission link below) — point
    // breadcrumb schema at the real pages instead of ones that 404.
    { name: locale === "hi" ? "होम" : "Home", path: "/" },
    { name: displayCommissionName, path: `/commissions/${commission.slug}` },
    { name: displayExamName, path: locale === "hi" ? `/hi/exams/${exam.slug}` : `/exams/${exam.slug}` },
  ]);

  const examSchema = buildExamSchema(exam, commission, locale);

  const schema = jsonLdGraph(breadcrumbSchema, examSchema);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{displayExamName}</h1>
        <div className="flex flex-wrap gap-4 text-sm">
          {/* /commissions/[slug] has no [locale] counterpart (see
              src/app/[locale]/layout.tsx) — link to the real page rather
              than a /${locale}/commissions/... URL that 404s. */}
          <Link
            href={`/commissions/${commission.slug}`}
            className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full hover:underline"
          >
            {displayCommissionName}
          </Link>
        </div>
      </div>

      {/* Description */}
      {displayExamDescription && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-lg text-gray-700">{displayExamDescription}</p>
        </div>
      )}

      {/* Tabs-like sections */}
      <div className="space-y-8">
        {/* Eligibility */}
        {displayExamEligibility && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">{locale === "hi" ? "पात्रता" : "Eligibility"}</h2>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg whitespace-pre-wrap text-sm">
              {displayExamEligibility}
            </div>
          </div>
        )}

        {/* Positions Recruited */}
        {relatedPositions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">
              {locale === "hi" ? "इस परीक्षा द्वारा भर्ती किए जाने वाले पद" : "Positions Recruited by This Exam"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedPositions.map((position) => (
                // /positions/[slug] has no [locale] counterpart — link to
                // the real page rather than a 404ing /${locale}/... URL.
                <InfoCard
                  key={position.id}
                  tone="brand"
                  href={`/positions/${position.slug}`}
                  title={position.name}
                  subtitle={
                    position.typicalSalaryMin && position.typicalSalaryMax
                      ? `${locale === "hi" ? "वेतन" : "Salary"}: ₹${(position.typicalSalaryMin / 1000).toFixed(0)}K - ₹${(position.typicalSalaryMax / 1000).toFixed(0)}K`
                      : locale === "hi" ? "विवरण देखें" : "View details"
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Recruitment Campaigns */}
        {recruitmentDetails.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">
              {locale === "hi" ? "इस परीक्षा का उपयोग करने वाले भर्ती अभियान" : "Recruitment Campaigns Using This Exam"}
            </h2>
            <div className="space-y-4">
              {recruitmentDetails
                .sort((a, b) => b.year - a.year)
                .map((recruitment) => (
                  <div key={recruitment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        {/* /recruitments/[slug] has no [locale] counterpart
                            — link to the real page, not a 404ing one. */}
                        <Link
                          href={`/jobs/${recruitment.slug}`}
                          className="text-lg font-semibold text-blue-600 hover:underline"
                        >
                          {recruitment.name}
                        </Link>
                        <div className="text-sm text-gray-600">{recruitment.year}</div>
                      </div>
                      <Badge tone={recruitment.status === "ACTIVE" ? "success" : "neutral"}>
                        {recruitment.status}
                      </Badge>
                    </div>

                    {recruitment.description && (
                      <p className="text-sm text-gray-600 mb-3">{recruitment.description}</p>
                    )}

                    {recruitment.posts && recruitment.posts.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          {recruitment.posts.length} {locale === "hi" ? "पद" : "position(s)"}:
                        </div>
                        <div className="space-y-1">
                          {recruitment.posts.map((item: any) => (
                            <Link
                              key={item.post.id}
                              href={`/positions/${item.position.slug}`}
                              className="text-sm text-blue-600 hover:underline block"
                            >
                              • {item.post.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="mt-12 pt-6 border-t text-sm text-gray-600">
        {/* No localized homepage exists (see root layout.tsx) — /${locale}
            would just bounce through proxy.ts's redirect back to "/". */}
        <Link href="/" className="hover:underline">
          {locale === "hi" ? "होम" : "Home"}
        </Link>
        {" / "}
        <span>{displayExamName}</span>
      </div>
    </div>
  );
}
