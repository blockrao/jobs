import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDbV2 } from "@/db";
import { recruitments } from "@/db/schema-v2";
import { absoluteUrl } from "@/lib/site";
import { eq } from "drizzle-orm";

export const revalidate = 300; // 5 minutes

type Props = { params: Promise<{ slug: string }> };

async function getRecruitmentBySlug(slug: string) {
  const db = getDbV2();
  if (!db) return null;

  const result = await db.query.recruitments.findFirst({
    where: eq(recruitments.slug, slug),
    with: {
      organization: true,
      posts: {
        with: {
          position: true,
        },
      },
    },
  });

  return result || null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const recruitment = await getRecruitmentBySlug(slug);

  if (!recruitment) return {};

  const title = `${recruitment.name} — Government Job Recruitment`;
  const description =
    recruitment.description ||
    `${recruitment.name} recruitment - ${recruitment.posts?.length || 0} posts, vacancies, eligibility, application dates, and official notification.`;

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
  if (!date) return "—";
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

  const posts_data = recruitment.posts || [];
  const totalVacancies = posts_data.reduce((sum, p) => sum + (p.totalVacancies || 0), 0);
  const daysToClosing = recruitment.daysToClosing;
  const isClosingSoon = daysToClosing !== null && daysToClosing <= 3 && daysToClosing > 0;
  const isClosed = daysToClosing !== null && daysToClosing <= 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
          <Link href="/recruitments" className="hover:text-blue-600">Recruitments</Link>
          <span>/</span>
          <span>{recruitment.name}</span>
        </div>

        <h1 className="text-4xl font-bold mb-4">{recruitment.name}</h1>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-3 h-3 rounded-full ${
              recruitment.calculatedStatus === 'APPLICATION_OPEN' ? 'bg-green-500' :
              recruitment.calculatedStatus === 'CLOSING_SOON' ? 'bg-orange-500' :
              recruitment.calculatedStatus === 'EXAM_SCHEDULED' ? 'bg-blue-500' :
              'bg-gray-400'
            }`}></span>
            <span className="font-medium">{recruitment.calculatedStatus || recruitment.status}</span>
          </div>

          {totalVacancies > 0 && (
            <div className="text-lg font-semibold text-blue-600">{totalVacancies} Vacancies</div>
          )}

          {recruitment.applicationEndDate && (
            <div className="text-sm">
              <span className="font-medium">Last Date:</span> {formatDate(recruitment.applicationEndDate)}
            </div>
          )}
        </div>

        {isClosingSoon && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <p className="text-orange-900 font-medium">
              ⚠️ Applications close in {daysToClosing} day{daysToClosing > 1 ? 's' : ''}. Apply now.
            </p>
          </div>
        )}

        {isClosed && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-900 font-medium">
              This recruitment has closed.
            </p>
          </div>
        )}
      </div>

      {/* Quick Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-6">Quick Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-600 font-medium mb-1">Organization</div>
            <div className="text-lg font-semibold">{recruitment.organization?.name}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 font-medium mb-1">Total Vacancies</div>
            <div className="text-lg font-semibold text-green-600">{totalVacancies}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 font-medium mb-1">Posts</div>
            <div className="text-lg font-semibold">{posts_data.length}</div>
          </div>
          {recruitment.year && (
            <div>
              <div className="text-sm text-gray-600 font-medium mb-1">Year</div>
              <div className="text-lg font-semibold">{recruitment.year}</div>
            </div>
          )}
        </div>
      </div>

      {/* Important Dates */}
      {(recruitment.notificationDate || recruitment.applicationStartDate || recruitment.applicationEndDate || recruitment.examDate) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">Important Dates</h2>
          <table className="w-full text-sm">
            <tbody>
              {recruitment.notificationDate && (
                <tr className="border-b border-gray-100">
                  <td className="py-3 font-medium text-gray-700">Notification</td>
                  <td className="py-3">{formatDate(recruitment.notificationDate)}</td>
                </tr>
              )}
              {recruitment.applicationStartDate && (
                <tr className="border-b border-gray-100">
                  <td className="py-3 font-medium text-gray-700">Application Starts</td>
                  <td className="py-3">{formatDate(recruitment.applicationStartDate)}</td>
                </tr>
              )}
              {recruitment.applicationEndDate && (
                <tr className={`border-b border-gray-100 ${isClosingSoon || isClosed ? 'bg-orange-50' : ''}`}>
                  <td className="py-3 font-medium text-gray-700">Last Date to Apply</td>
                  <td className="py-3 font-semibold">{formatDate(recruitment.applicationEndDate)}</td>
                </tr>
              )}
              {recruitment.examDate && (
                <tr className="border-b border-gray-100">
                  <td className="py-3 font-medium text-gray-700">Exam Date</td>
                  <td className="py-3">{formatDate(recruitment.examDate)}</td>
                </tr>
              )}
              {recruitment.resultDate && (
                <tr>
                  <td className="py-3 font-medium text-gray-700">Result Date</td>
                  <td className="py-3">{formatDate(recruitment.resultDate)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Posts */}
      {posts_data.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">Posts Available</h2>
          <div className="space-y-4">
            {posts_data.map((post) => (
              <div key={post.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-blue-600">{post.name}</h3>
                  </div>
                  {post.totalVacancies && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">{post.totalVacancies}</div>
                      <div className="text-xs text-gray-600">Vacancies</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selection Process */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Selection Process</h3>
        <ol className="space-y-3 text-sm text-blue-900">
          <li className="flex gap-3">
            <span className="font-bold">1</span>
            <span>Check the official notification for eligibility</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold">2</span>
            <span>Register on the official portal</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold">3</span>
            <span>Fill the application form</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold">4</span>
            <span>Pay application fee (if applicable)</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold">5</span>
            <span>Appear for examination</span>
          </li>
        </ol>
      </div>

      {/* Official Sources */}
      <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-green-900 mb-4">Official Sources</h3>
        <p className="text-sm text-gray-700 mb-4">Verify all details in the official notification before applying.</p>
        
        <div className="space-y-3">
          {recruitment.notificationUrl && (
            <a href={recruitment.notificationUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-white border border-green-200 rounded hover:bg-green-50">
              <span>📄</span>
              <div>
                <div className="font-medium text-green-900">Official Notification</div>
                <div className="text-xs text-green-700">PDF</div>
              </div>
              <span className="ml-auto">→</span>
            </a>
          )}
          {recruitment.organization?.website && (
            <a href={recruitment.organization.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-white border border-blue-200 rounded hover:bg-blue-50">
              <span>🌐</span>
              <div>
                <div className="font-medium text-blue-900">Official Website</div>
                <div className="text-xs text-blue-700">{recruitment.organization.name}</div>
              </div>
              <span className="ml-auto">→</span>
            </a>
          )}
        </div>
      </div>

      {/* Trust Statement */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <p className="text-sm text-amber-900">
          <strong>JobOye is an independent job information platform.</strong> Always verify details in the official notification before applying.
        </p>
        {recruitment.statusLastCalculated && (
          <p className="text-xs text-amber-700 mt-2">
            Last verified: {new Date(recruitment.statusLastCalculated).toLocaleDateString("en-IN")}
          </p>
        )}
      </div>
    </div>
  );
}
