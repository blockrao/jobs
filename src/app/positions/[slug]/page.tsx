import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { positions, posts, recruitments } from "@/db/schema";
import { absoluteUrl } from "@/lib/site";
import { eq, inArray } from "drizzle-orm";

export const revalidate = 3600; // 1 hour

type Props = { params: Promise<{ slug: string }> };

async function getPositionBySlug(slug: string) {
  const db = getDb();
  if (!db) return null;

  const result = await db.query.positions.findFirst({
    where: eq(positions.slug, slug),
  });

  return result || null;
}

async function getRecruitmentsByPosition(positionId: number) {
  const db = getDb();
  if (!db) return [];

  const postsList = await db.query.posts.findMany({
    where: eq(posts.positionId, positionId),
    with: {
      recruitment: true,
    },
  });

  const uniqueRecruitments = Array.from(
    new Map(
      postsList.map((p: any) => [p.recruitment.id, p.recruitment])
    ).values()
  );

  return uniqueRecruitments;
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const position = await getPositionBySlug(slug);

  if (!position) return {};

  const title = `${position.name} - Government Job Position, Salary, Age, Qualifications`;
  const description = position.description ||
    `${position.name}: Salary range ₹${position.typicalSalaryMin}-₹${position.typicalSalaryMax}, Age ${position.typicalAgeMin}-${position.typicalAgeMax} years. Find recruitments, eligibility, and how to apply.`;

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

  const recruitmentsList = await getRecruitmentsByPosition(position.id);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
          <Link href="/positions" className="hover:text-blue-600">Positions</Link>
          <span>/</span>
          <span className="text-gray-900">{position.name}</span>
        </div>

        <h1 className="text-4xl font-bold mb-2">{position.name}</h1>
        
        <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          {position.category}
        </div>
      </div>

      {position.description && (
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <p className="text-gray-700 text-lg">{position.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {position.typicalSalaryMin && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-sm text-gray-600 font-medium mb-2">Salary Package</div>
            <div className="text-2xl font-bold text-green-600">
              ₹{(position.typicalSalaryMin / 100000).toFixed(1)}L – ₹{(position.typicalSalaryMax! / 100000).toFixed(1)}L
            </div>
            <div className="text-xs text-gray-500 mt-1">Per year (typical)</div>
          </div>
        )}

        {position.typicalAgeMin && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-sm text-gray-600 font-medium mb-2">Age Limit</div>
            <div className="text-2xl font-bold text-blue-600">
              {position.typicalAgeMin} – {position.typicalAgeMax} years
            </div>
            <div className="text-xs text-gray-500 mt-1">At time of application</div>
          </div>
        )}

        {recruitmentsList.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-sm text-gray-600 font-medium mb-2">Active Recruitments</div>
            <div className="text-2xl font-bold text-purple-600">
              {recruitmentsList.length}
            </div>
            <div className="text-xs text-gray-500 mt-1">For this position</div>
          </div>
        )}
      </div>

      <div className="bg-white border-l-4 border-blue-500 p-6 rounded mb-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">About This Position</h3>
        <p className="text-gray-700">
          {position.name} is an evergreen position in the {position.category.toLowerCase().replace('_', ' ')} sector.
          This role is offered regularly through various government recruitment campaigns across central, state, and autonomous bodies.
          The position offers competitive salary, job security, and benefits typical of government employment.
        </p>
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Recruitment Campaigns</h2>

        {recruitmentsList.length === 0 ? (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <p className="text-gray-600">No active recruitments for this position at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recruitmentsList.map((recruitment) => (
              <Link
                key={recruitment.id}
                href={`/recruitments/${recruitment.slug}`}
                className="block"
              >
                <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-400 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-grow">
                      <h3 className="text-xl font-semibold text-blue-600 hover:underline mb-2">
                        {recruitment.name}
                      </h3>
                      {recruitment.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {recruitment.description.substring(0, 150)}...
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 whitespace-nowrap ml-4 ${
                      recruitment.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      recruitment.status === 'RESULTS' ? 'bg-blue-100 text-blue-800' :
                      recruitment.status === 'UPCOMING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {recruitment.status}
                    </span>
                  </div>

                  {recruitment.applicationStartDate && (
                    <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
                      <span className="font-medium">Application Period:</span> {new Date(recruitment.applicationStartDate).toLocaleDateString('en-IN')} – {recruitment.applicationEndDate ? new Date(recruitment.applicationEndDate).toLocaleDateString('en-IN') : 'TBD'}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">How to Apply</h3>
          <ol className="space-y-3 text-sm text-blue-900">
            <li className="flex gap-3">
              <span className="font-bold text-blue-600">1</span>
              <span>Check the recruitment notification for eligibility and application process</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-600">2</span>
              <span>Register on the official recruitment portal with your details</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-600">3</span>
              <span>Fill the application form and upload required documents</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-600">4</span>
              <span>Pay the application fee (if applicable) and submit</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-600">5</span>
              <span>Appear for the examination and subsequent rounds</span>
            </li>
          </ol>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4">Benefits & Eligibility</h3>
          <ul className="space-y-2 text-sm text-green-900">
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              <span>Competitive government salary with regular increments</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              <span>Comprehensive medical and pension benefits</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              <span>Job security and career advancement opportunities</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              <span>Age relaxation for reserved categories</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              <span>Check individual recruitment notification for specific eligibility</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
