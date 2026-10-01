import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getExamBySlug, getExamRelatedPositions, getExamRecruitmentDetails } from "@/db/operations/get-exams";
import { absoluteUrl } from "@/lib/site";

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

function buildExamSchema(exam: any, organization: any): object {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalCredential",
    name: exam.name,
    description: exam.description || `${exam.name} government exam`,
    url: absoluteUrl(`/exams/${exam.slug}`),
    provider: {
      "@type": "Organization",
      name: organization.name,
      url: absoluteUrl(`/organizations/${organization.slug}`),
    },
    ...(exam.frequency && { educationalLevel: exam.frequency }),
    inLanguage: "en-IN",
  };
}

export const revalidate = 3600; // 1 hour

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const examData = await getExamBySlug(slug);

  if (!examData) return {};

  const exam = examData.exam;
  const title = `${exam.name} - Exam Pattern, Syllabus & Recruitment`;
  const description = exam.description ||
    `${exam.name}: Detailed exam pattern, syllabus, positions recruited, notification links, and all related government recruitment campaigns.`;

  return {
    title,
    description,
    alternates: { canonical: `/exams/${exam.slug}` },
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
  const examData = await getExamBySlug(slug);

  if (!examData) {
    notFound();
  }

  const exam = examData.exam;
  const organization = examData.organization;

  const [relatedPositions, recruitmentDetails] = await Promise.all([
    getExamRelatedPositions(exam.id),
    getExamRecruitmentDetails(exam.id),
  ]);

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: organization.name, path: `/organizations/${organization.slug}` },
    { name: exam.name, path: `/exams/${exam.slug}` },
  ]);

  const examSchema = buildExamSchema(exam, organization);

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
        <h1 className="text-4xl font-bold mb-2">
          {exam.name}
          {exam.shortName && <span className="text-2xl text-gray-600 ml-2">({exam.shortName})</span>}
        </h1>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link
            href={`/organizations/${organization.slug}`}
            className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full hover:underline"
          >
            {organization.name}
          </Link>
          {exam.frequency && (
            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full">
              Frequency: {exam.frequency}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {exam.description && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-lg text-gray-700">{exam.description}</p>
        </div>
      )}

      {/* Tabs-like sections */}
      <div className="space-y-8">
        {/* Exam Pattern */}
        {exam.examPattern && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Exam Pattern</h2>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg whitespace-pre-wrap text-sm">
              {exam.examPattern}
            </div>
          </div>
        )}

        {/* Syllabus */}
        {exam.syllabus && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Syllabus</h2>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg whitespace-pre-wrap text-sm">
              {exam.syllabus}
            </div>
          </div>
        )}

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
        <span>{exam.name}</span>
      </div>
    </div>
  );
}
