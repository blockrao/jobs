import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getExamBySlug, getExamRelatedPositions, getExamRecruitmentDetails } from "@/db/operations/get-exams";
import { absoluteUrl } from "@/lib/site";
import { safeQuery } from "@/lib/safe-query";

interface BreadcrumbItem {
  "@type": "ListItem";
  position: number;
  name: string;
  item: string;
}

function buildBreadcrumbSchema(items: { name: string; path: string }[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

function buildExamSchema(exam: any, commission: any): object {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalCredential",
    name: exam.label,
    description: exam.description || `${exam.label} government exam`,
    url: absoluteUrl(`/exams/${exam.slug}`),
    provider: {
      "@type": "Organization",
      name: commission.name,
      url: absoluteUrl(`/commissions/${commission.slug}`),
    },
    inLanguage: "en-IN",
  };
}

export const revalidate = 3600; // 1 hour

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const examData = await safeQuery(() => getExamBySlug(slug), null);

  if (!examData) return {};

  const exam = examData.exam;
  const title = `${exam.label} - Eligibility, Salary & Recruitment`;
  const description = exam.description ||
    `${exam.label}: Eligibility, positions recruited, notification links, and all related government recruitment campaigns.`;

  return {
    title,
    description,
    // All 68 exams have labelHi/descriptionHi populated, and /hi/exams/[slug]
    // already exists — declare the reciprocal hreflang here so Google
    // actually discovers the Hindi version instead of only finding it from
    // the /hi side. Without this pair, search engines can't reliably treat
    // the two URLs as language alternates of the same content.
    alternates: {
      canonical: `/exams/${exam.slug}`,
      languages: {
        en: absoluteUrl(`/en/exams/${exam.slug}`),
        hi: absoluteUrl(`/hi/exams/${exam.slug}`),
        "x-default": absoluteUrl(`/exams/${exam.slug}`),
      },
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/exams/${exam.slug}`),
      type: "website",
    },
  };
}

export default async function ExamPage({ params }: Props) {
  const { slug } = await params;
  const examData = await safeQuery(() => getExamBySlug(slug), null);

  if (!examData) {
    notFound();
  }

  const exam = examData.exam;
  const commission = examData.commission;

  const [relatedPositions, recruitmentDetails] = await Promise.all([
    safeQuery(() => getExamRelatedPositions(exam.id), []),
    safeQuery(() => getExamRecruitmentDetails(exam.id), []),
  ]);

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: commission.name, path: `/commissions/${commission.slug}` },
    { name: exam.label, path: `/exams/${exam.slug}` },
  ]);

  const examSchema = buildExamSchema(exam, commission);

  const jsonLdScripts = [breadcrumbSchema, examSchema];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {jsonLdScripts.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{exam.label}</h1>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link
            href={`/commissions/${commission.slug}`}
            className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full hover:underline"
          >
            {commission.name}
          </Link>
        </div>
      </div>

      {/* Description */}
      {exam.description && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-lg text-gray-700">{exam.description}</p>
        </div>
      )}

      {/* Eligibility */}
      {exam.eligibility && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Eligibility</h2>
          <p className="text-sm whitespace-pre-wrap">{exam.eligibility}</p>
        </div>
      )}

      {/* Tabs-like sections */}
      <div className="space-y-8">
        {/* Positions Recruited */}
        {relatedPositions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Positions Recruited by This Exam</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedPositions.map((position) => (
                <Link
                  key={position.id}
                  href={`/positions/${position.slug}`}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                >
                  <div className="font-semibold text-blue-600 hover:underline">{position.name}</div>
                  {position.typicalSalaryMin && position.typicalSalaryMax && (
                    <div className="text-sm text-gray-600 mt-2">
                      Salary: ₹{(position.typicalSalaryMin / 1000).toFixed(0)}K - ₹{(position.typicalSalaryMax / 1000).toFixed(0)}K
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recruitment Campaigns */}
        {recruitmentDetails.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Recruitment Campaigns Using This Exam</h2>
            <div className="space-y-4">
              {recruitmentDetails
                .sort((a, b) => b.year - a.year)
                .map((recruitment) => (
                  <div key={recruitment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Link
                          href={`/recruitments/${recruitment.slug}`}
                          className="text-lg font-semibold text-blue-600 hover:underline"
                        >
                          {recruitment.name}
                        </Link>
                        <div className="text-sm text-gray-600">{recruitment.year}</div>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {recruitment.status}
                      </span>
                    </div>

                    {recruitment.description && (
                      <p className="text-sm text-gray-600 mb-3">{recruitment.description}</p>
                    )}

                    {recruitment.posts && recruitment.posts.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          {recruitment.posts.length} position(s):
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
        <Link href="/" className="hover:underline">Home</Link>
        {" / "}
        <span>{exam.label}</span>
      </div>
    </div>
  );
}
