import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecruitmentBySlug, getRecruitmentPosts, getRecruitmentVacancies, getRecruitmentVacancyCount } from "@/db/operations/get-recruitments";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600; // 1 hour

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const recruitment = await getRecruitmentBySlug(slug);

  if (!recruitment) return {};

  const title = `${recruitment.name} - Recruitment Timeline, Posts & Apply`;
  const description = recruitment.description ||
    `${recruitment.name}: Notification date, application deadline, exam date, vacancies, eligibility criteria, and how to apply.`;

  return {
    title,
    description,
    alternates: { canonical: `/recruitments/${recruitment.slug}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/recruitments/${recruitment.slug}`),
      type: "website",
    },
  };
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "TBD";
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function RecruitmentPage({ params }: Props) {
  const { slug } = await params;
  const recruitment = await getRecruitmentBySlug(slug);

  if (!recruitment) {
    notFound();
  }

  const [posts, vacancyRecords, totalVacancies] = await Promise.all([
    getRecruitmentPosts(recruitment.id),
    getRecruitmentVacancies(recruitment.id),
    getRecruitmentVacancyCount(recruitment.id),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{recruitment.name}</h1>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
            {recruitment.status}
          </span>
          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full">
            Year: {recruitment.year}
          </span>
          {totalVacancies > 0 && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
              {totalVacancies} Vacancies
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {recruitment.description && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-lg text-gray-700">{recruitment.description}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Recruitment Timeline</h2>
        <div className="space-y-3 border-l-4 border-blue-500 pl-6">
          <div className="pb-4">
            <div className="text-sm text-gray-600">Notification Released</div>
            <div className="font-semibold text-lg">{formatDate(recruitment.notificationDate)}</div>
          </div>
          <div className="pb-4">
            <div className="text-sm text-gray-600">Application Window</div>
            <div className="font-semibold text-lg">
              {formatDate(recruitment.applicationStartDate)} - {formatDate(recruitment.applicationEndDate)}
            </div>
          </div>
          {recruitment.examDate && (
            <div className="pb-4">
              <div className="text-sm text-gray-600">Exam Date</div>
              <div className="font-semibold text-lg">{formatDate(recruitment.examDate)}</div>
            </div>
          )}
          {recruitment.resultDate && (
            <div className="pb-4">
              <div className="text-sm text-gray-600">Result Announced</div>
              <div className="font-semibold text-lg">{formatDate(recruitment.resultDate)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Official Links */}
      {recruitment.notificationUrl && (
        <div className="mb-8 p-4 border-l-4 border-green-500 bg-green-50 rounded">
          <h3 className="font-semibold mb-2">Official Notification</h3>
          <a
            href={recruitment.notificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all"
          >
            {recruitment.notificationUrl}
          </a>
        </div>
      )}

      {/* Posts */}
      {posts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Positions Available ({posts.length})</h2>
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold">{post.name}</h3>
                    <Link
                      href={`/positions/${post.position.slug}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View position details →
                    </Link>
                  </div>
                  {post.vacancyTotal && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {post.vacancyTotal} vacancies
                    </span>
                  )}
                </div>

                {post.description && (
                  <p className="text-sm text-gray-600 mb-3">{post.description}</p>
                )}

                {post.salaryMin && post.salaryMax && (
                  <div className="text-sm mb-2">
                    <span className="text-gray-600">Salary: </span>
                    <span className="font-medium">
                      ₹{(post.salaryMin / 1000).toFixed(0)}K - ₹{(post.salaryMax / 1000).toFixed(0)}K
                    </span>
                  </div>
                )}

                {post.eligibilities && post.eligibilities.length > 0 && (
                  <div className="text-sm mt-3 pt-3 border-t">
                    <div className="text-gray-600 font-medium mb-2">Eligibility</div>
                    {post.eligibilities.map((elig) => (
                      <div key={elig.id} className="text-sm text-gray-700 mb-1">
                        {elig.ageMin && elig.ageMax && (
                          <span>Age: {elig.ageMin} - {elig.ageMax} years</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vacancy Breakdown */}
      {vacancyRecords.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Vacancy Breakdown by Location & Category</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="px-4 py-2 text-left">Location</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-center">Gender</th>
                  <th className="px-4 py-2 text-center">Count</th>
                </tr>
              </thead>
              <tbody>
                {vacancyRecords.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{row.location?.name || "All India"}</td>
                    <td className="px-4 py-2">{row.vacancy.categoryType}</td>
                    <td className="px-4 py-2 text-center">{row.vacancy.gender}</td>
                    <td className="px-4 py-2 text-center font-semibold">{row.vacancy.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="mt-12 pt-6 border-t text-sm text-gray-600">
        <Link href="/" className="hover:underline">Home</Link>
        {" / "}
        <span>{recruitment.name}</span>
      </div>
    </div>
  );
}
