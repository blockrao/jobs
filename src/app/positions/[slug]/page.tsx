import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPositionBySlug, getPositionQualification, getPositionRelatedExams, getPositionRelatedRecruitments, getPositionPostings } from "@/db/operations/get-positions";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600; // 1 hour

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const position = await getPositionBySlug(slug);

  if (!position) return {};

  const title = `${position.name} - Career Path, Salary & Exams`;
  const description = position.description ||
    `Explore the ${position.name} position: typical salary, age requirements, career progression, and all related government exams and recruitments.`;

  return {
    title,
    description,
    alternates: { canonical: `/positions/${position.slug}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/positions/${position.slug}`),
      type: "website",
    },
  };
}

export default async function PositionPage({ params }: Props) {
  const { slug } = await params;
  const position = await getPositionBySlug(slug);

  if (!position) {
    notFound();
  }

  const [qualification, relatedExams, relatedRecruitments, recentPostings] = await Promise.all([
    getPositionQualification(position.id),
    getPositionRelatedExams(position.id),
    getPositionRelatedRecruitments(position.id),
    getPositionPostings(position.id, 10),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{position.name}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {position.category && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
              {position.category.replace(/_/g, " ")}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {position.description && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-lg text-gray-700">{position.description}</p>
        </div>
      )}

      {/* Career Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Typical Requirements */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Typical Requirements</h2>
          <div className="space-y-3 text-sm">
            {qualification && (
              <div>
                <div className="text-gray-600">Qualification</div>
                <div className="font-medium">{qualification.name}</div>
              </div>
            )}
            {position.typicalAgeMin && position.typicalAgeMax && (
              <div>
                <div className="text-gray-600">Age Limit</div>
                <div className="font-medium">{position.typicalAgeMin} - {position.typicalAgeMax} years</div>
              </div>
            )}
            {position.typicalSalaryMin && position.typicalSalaryMax && (
              <div>
                <div className="text-gray-600">Typical Salary</div>
                <div className="font-medium">₹{(position.typicalSalaryMin / 1000).toFixed(0)}K - ₹{(position.typicalSalaryMax / 1000).toFixed(0)}K</div>
              </div>
            )}
          </div>
        </div>

        {/* Career Path */}
        {position.careerPath && position.careerPath.length > 0 && (
          <div className="p-4 border border-gray-200 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Career Progression</h2>
            <div className="space-y-2 text-sm">
              {position.careerPath
                .sort((a, b) => a.level - b.level)
                .map((level) => (
                  <div key={level.level} className="flex items-center gap-2">
                    <span className="inline-block w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">
                      {level.level}
                    </span>
                    <span>{level.title}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Related Exams */}
      {relatedExams.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Exams That Recruit for This Position</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedExams.map((exam) => (
              <Link
                key={exam.id}
                href={`/exams/${exam.slug}`}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
              >
                <div className="font-semibold text-blue-600 hover:underline">{exam.name}</div>
                {exam.shortName && (
                  <div className="text-sm text-gray-600">{exam.shortName}</div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related Recruitments */}
      {relatedRecruitments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Recent Recruitment Campaigns</h2>
          <div className="space-y-3">
            {relatedRecruitments
              .sort((a, b) => b.year - a.year)
              .slice(0, 10)
              .map((recruitment) => (
                <Link
                  key={recruitment.id}
                  href={`/recruitments/${recruitment.slug}`}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-blue-600 hover:underline">{recruitment.name}</div>
                      <div className="text-sm text-gray-600">{recruitment.year}</div>
                    </div>
                    <div className="text-sm font-medium px-3 py-1 bg-green-100 text-green-800 rounded">
                      {recruitment.status}
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* Recent Postings */}
      {recentPostings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Latest Job Postings</h2>
          <div className="space-y-3">
            {recentPostings.slice(0, 5).map((item) => (
              <Link
                key={item.posting.id}
                href={`/jobs/${item.posting.slug}`}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
              >
                <div className="font-semibold text-blue-600 hover:underline">{item.posting.title}</div>
                {item.recruitment && (
                  <div className="text-sm text-gray-600">{item.recruitment.name}</div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="mt-12 pt-6 border-t text-sm text-gray-600">
        <Link href="/" className="hover:underline">Home</Link>
        {" / "}
        <span>{position.name}</span>
      </div>
    </div>
  );
}
