import { pageSeo } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { recruitments, postings } from "@/db/schema";
import { absoluteUrl } from "@/lib/site";
import { eq, inArray } from "drizzle-orm";
import { safeQuery } from "@/lib/safe-query";

export const revalidate = 300; // 5 minutes

type Props = { params: Promise<{ slug: string }> };

async function getRecruitmentBySlug(slug: string) {
  const db = getDb();
  if (!db) return null;

  const result = await db.query.recruitments.findFirst({
    where: eq(recruitments.slug, slug),
    with: {
      organization: true,
      exam: true,
      posts: {
        with: {
          position: true,
        },
      },
    },
  });

  return result || null;
}

// Expanded posting fields needed for per-post content on this page.
type PostingSlot = {
  slug: string;
  title: string;
  eligibility: string | null;
  ageLimitMin: number | null;
  ageLimitMax: number | null;
  ageRelaxationNotes: string | null;
  officialNotificationUrl: string | null;
  applyUrl: string | null;
  applicationFeeGeneral: number | null;
  applicationFeeReserved: number | null;
  datePosted: Date;
  updatedAt: Date;
};

async function getPostingSlugsForPosts(postIds: number[]) {
  if (postIds.length === 0) return new Map<number, PostingSlot & { postId: number }>();
  const db = getDb();
  if (!db) return new Map<number, PostingSlot & { postId: number }>();

  const rows = await db
    .select({
      inferredPostId: postings.inferredPostId,
      slug: postings.slug,
      title: postings.title,
      eligibility: postings.eligibility,
      ageLimitMin: postings.ageLimitMin,
      ageLimitMax: postings.ageLimitMax,
      ageRelaxationNotes: postings.ageRelaxationNotes,
      officialNotificationUrl: postings.officialNotificationUrl,
      applyUrl: postings.applyUrl,
      applicationFeeGeneral: postings.applicationFeeGeneral,
      applicationFeeReserved: postings.applicationFeeReserved,
      datePosted: postings.datePosted,
      updatedAt: postings.updatedAt,
    })
    .from(postings)
    .where(inArray(postings.inferredPostId, postIds));

  const map = new Map<number, PostingSlot & { postId: number }>();
  for (const row of rows) {
    if (row.inferredPostId != null) {
      map.set(row.inferredPostId, {
        postId: row.inferredPostId,
        slug: row.slug,
        title: row.title,
        eligibility: row.eligibility,
        ageLimitMin: row.ageLimitMin,
        ageLimitMax: row.ageLimitMax,
        ageRelaxationNotes: row.ageRelaxationNotes,
        officialNotificationUrl: row.officialNotificationUrl,
        applyUrl: row.applyUrl,
        applicationFeeGeneral: row.applicationFeeGeneral,
        applicationFeeReserved: row.applicationFeeReserved,
        datePosted: row.datePosted,
        updatedAt: row.updatedAt,
      });
    }
  }
  return map;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const recruitment = await safeQuery(() => getRecruitmentBySlug(slug), null);

  if (!recruitment) return {};

  const title = `${recruitment.name} — Government Job Recruitment`;
  const description =
    recruitment.description ||
    `${recruitment.name} recruitment - ${recruitment.posts?.length || 0} posts, vacancies, eligibility, application dates, and official notification.`;

  return {
    title,
    description,
    ...pageSeo(`/recruitments/${recruitment.slug}`),
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

function formatPayLevel(payLevel: Record<string, unknown> | null | undefined): string | null {
  if (!payLevel) return null;
  const level = payLevel.level as string | undefined;
  const scheme = payLevel.scheme as string | undefined;
  const min = payLevel.min as number | undefined;
  const max = payLevel.max as number | undefined;
  if (min && max) {
    const range = `₹${min.toLocaleString("en-IN")} – ₹${max.toLocaleString("en-IN")}`;
    if (level && scheme) return `Level-${level} (${scheme}) · ${range}`;
    return range;
  }
  if (level && scheme) return `Level-${level} (${scheme})`;
  return null;
}

export default async function RecruitmentPage({ params }: Props) {
  const { slug } = await params;
  const recruitment = await safeQuery(() => getRecruitmentBySlug(slug), null);

  if (!recruitment) {
    notFound();
  }

  const posts_data = recruitment.posts || [];
  const totalVacancies = posts_data.reduce((sum, p) => sum + (p.vacancyTotal || 0), 0);
  const postingBySlotId = await safeQuery(
    () => getPostingSlugsForPosts(posts_data.map((p) => p.id)),
    new Map<number, PostingSlot & { postId: number }>(),
  );

  const org = (recruitment.organization as any);
  const exam = (recruitment as any).exam;

  // Calculate days to closing from applicationEndDate
  const daysToClosing = recruitment.applicationEndDate
    ? Math.ceil((recruitment.applicationEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isClosingSoon = daysToClosing !== null && daysToClosing <= 3 && daysToClosing > 0;
  const isClosed = daysToClosing !== null && daysToClosing <= 0;

  // Collect a representative apply URL and notification URL from postings when
  // the recruitment-level fields are absent.
  const anyPosting = postingBySlotId.size > 0 ? [...postingBySlotId.values()][0] : null;
  const notificationUrl = recruitment.notificationUrl || anyPosting?.officialNotificationUrl || null;
  const applyUrl = anyPosting?.applyUrl || null;

  // Last verified date: most recent updatedAt across all linked postings.
  const lastVerified: Date | null = [...postingBySlotId.values()]
    .map((p) => p.updatedAt)
    .reduce<Date | null>((latest, d) => (!latest || d > latest ? d : latest), null)
    ?? (recruitment.updatedAt ? new Date(recruitment.updatedAt) : null);

  // FAQs: generate only where data gives a meaningful answer.
  const faqs: { q: string; a: string }[] = [];

  // How to apply — only if there is an actual apply URL.
  if (applyUrl) {
    faqs.push({
      q: `How do I apply for ${recruitment.name}?`,
      a: `Submit the online application through the official portal before ${formatDate(recruitment.applicationEndDate)}. Verify all details in the official notification before applying.`,
    });
  }

  // Total vacancies — only when we have a non-zero number.
  if (totalVacancies > 0) {
    faqs.push({
      q: `How many vacancies are there in ${recruitment.name}?`,
      a: `There are ${totalVacancies} total vacancies across ${posts_data.length} post${posts_data.length > 1 ? "s" : ""}.`,
    });
  }

  // Last date — only when applicationEndDate is set.
  if (recruitment.applicationEndDate) {
    faqs.push({
      q: `What is the last date to apply for ${recruitment.name}?`,
      a: `The application deadline is ${formatDate(recruitment.applicationEndDate)}.`,
    });
  }

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
              isClosingSoon ? 'bg-orange-500' :
              isClosed ? 'bg-red-500' :
              recruitment.status === 'UPCOMING' ? 'bg-blue-500' :
              recruitment.status === 'ACTIVE' ? 'bg-green-500' :
              'bg-gray-400'
            }`}></span>
            <span className="font-medium">{isClosingSoon ? 'CLOSING SOON' : isClosed ? 'CLOSED' : recruitment.status}</span>
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
              ⚠️ Applications close in {daysToClosing} day{daysToClosing! > 1 ? 's' : ''}. Apply now.
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
            <div className="text-lg font-semibold">{org?.name || 'Organization'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 font-medium mb-1">Total Vacancies</div>
            <div className="text-lg font-semibold text-green-600">{totalVacancies > 0 ? totalVacancies : '—'}</div>
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
          {recruitment.officialNotificationNumber && (
            <div>
              <div className="text-sm text-gray-600 font-medium mb-1">Advertisement No.</div>
              <div className="text-lg font-semibold">{recruitment.officialNotificationNumber}</div>
            </div>
          )}
        </div>
      </div>

      {/* Entity Graph — Position → Recruitment → Organization → Exam */}
      {(org || exam || posts_data.some((p) => (p as any).position)) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">About this Recruitment</h2>
          <div className="flex flex-wrap gap-2 items-center text-sm">
            {org && (
              <>
                {org.slug ? (
                  <Link href={`/commissions/${org.slug}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-full hover:bg-blue-100 font-medium">
                    🏛️ {org.name}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full font-medium">
                    🏛️ {org.name}
                  </span>
                )}
                <span className="text-gray-400">›</span>
              </>
            )}
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-800 rounded-full font-medium">
              📋 {recruitment.name}
            </span>
            {exam && (
              <>
                <span className="text-gray-400">›</span>
                {exam.slug ? (
                  <Link href={`/exams/${exam.slug}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-800 rounded-full hover:bg-purple-100 font-medium">
                    📝 {exam.name}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full font-medium">
                    📝 {exam.name}
                  </span>
                )}
              </>
            )}
          </div>
          {posts_data.length > 0 && posts_data.some((p) => (p as any).position) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {posts_data.map((post) => {
                const pos = (post as any).position;
                if (!pos) return null;
                return (
                  <Link
                    key={post.id}
                    href={`/positions/${pos.slug}`}
                    className="text-xs px-2 py-1 bg-green-50 text-green-800 rounded hover:bg-green-100"
                  >
                    {pos.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

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

      {/* Posts Available — per-post detail where data exists */}
      {posts_data.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">Posts Available</h2>
          <div className="space-y-6">
            {posts_data.map((post) => {
              const livePosting = postingBySlotId.get(post.id);
              const payLabel = formatPayLevel((post as any).payLevel);

              return (
                <div key={post.id} className="border border-gray-100 rounded-lg p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      {livePosting ? (
                        <Link
                          href={`/jobs/${livePosting.slug}`}
                          className="font-semibold text-blue-600 hover:underline text-lg"
                        >
                          {post.name}
                        </Link>
                      ) : (
                        <h3 className="font-semibold text-gray-900 text-lg">{post.name}</h3>
                      )}
                      {(post as any).position?.name && (
                        <div className="text-xs text-gray-500 mt-1">
                          Position:{" "}
                          <Link href={`/positions/${(post as any).position.slug}`} className="hover:underline">
                            {(post as any).position.name}
                          </Link>
                        </div>
                      )}
                    </div>
                    {post.vacancyTotal ? (
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-2xl font-bold text-green-600">{post.vacancyTotal}</div>
                        <div className="text-xs text-gray-600">Vacancies</div>
                      </div>
                    ) : null}
                  </div>

                  {/* Per-post facts from linked posting */}
                  {livePosting && (
                    <div className="mt-3 space-y-2 text-sm text-gray-700">
                      {livePosting.eligibility && (
                        <div>
                          <span className="font-medium text-gray-800">Eligibility: </span>
                          {livePosting.eligibility}
                        </div>
                      )}
                      {(livePosting.ageLimitMin || livePosting.ageLimitMax) && (
                        <div>
                          <span className="font-medium text-gray-800">Age Limit: </span>
                          {livePosting.ageLimitMin && livePosting.ageLimitMax
                            ? `${livePosting.ageLimitMin}–${livePosting.ageLimitMax} years`
                            : livePosting.ageLimitMax
                              ? `Up to ${livePosting.ageLimitMax} years`
                              : `Min ${livePosting.ageLimitMin} years`}
                          {livePosting.ageRelaxationNotes && (
                            <span className="text-gray-500"> ({livePosting.ageRelaxationNotes})</span>
                          )}
                        </div>
                      )}
                      {payLabel && (
                        <div>
                          <span className="font-medium text-gray-800">Pay Scale: </span>
                          {payLabel}
                        </div>
                      )}
                      {(livePosting.applicationFeeGeneral != null) && (
                        <div>
                          <span className="font-medium text-gray-800">Application Fee: </span>
                          {livePosting.applicationFeeGeneral === 0
                            ? "No fee"
                            : `₹${livePosting.applicationFeeGeneral} (General)`}
                          {livePosting.applicationFeeReserved != null && livePosting.applicationFeeReserved !== livePosting.applicationFeeGeneral && (
                            <span className="text-gray-500">
                              {livePosting.applicationFeeReserved === 0
                                ? " · Nil (SC/ST/PH)"
                                : ` · ₹${livePosting.applicationFeeReserved} (SC/ST/PH)`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {livePosting && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <Link href={`/jobs/${livePosting.slug}`} className="text-sm text-blue-600 hover:underline">
                        View full details, eligibility &amp; apply →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Source & Verification */}
      <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-green-900 mb-4">Source &amp; Verification</h3>
        <p className="text-sm text-gray-700 mb-4">
          All information on this page is drawn from the official government notification. Verify details there before applying.
        </p>

        <div className="space-y-3">
          {org && (
            <div className="flex items-start gap-3 p-3 bg-white border border-green-100 rounded text-sm">
              <span className="text-green-700 mt-0.5">🏛️</span>
              <div>
                <span className="font-medium text-gray-800">Issuing Authority: </span>
                <span className="text-gray-700">{org.name}</span>
              </div>
            </div>
          )}

          {recruitment.officialNotificationNumber && (
            <div className="flex items-start gap-3 p-3 bg-white border border-green-100 rounded text-sm">
              <span className="text-green-700 mt-0.5">🔖</span>
              <div>
                <span className="font-medium text-gray-800">Advertisement No.: </span>
                <span className="text-gray-700">{recruitment.officialNotificationNumber}</span>
              </div>
            </div>
          )}

          {notificationUrl && (
            <a
              href={notificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-white border border-green-200 rounded hover:bg-green-50"
            >
              <span>📄</span>
              <div>
                <div className="font-medium text-green-900">Official Notification</div>
                <div className="text-xs text-green-700">PDF — {org?.name || 'Issuing authority'}</div>
              </div>
              <span className="ml-auto">→</span>
            </a>
          )}

          {applyUrl && (
            <a
              href={applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-white border border-blue-200 rounded hover:bg-blue-50"
            >
              <span>✏️</span>
              <div>
                <div className="font-medium text-blue-900">Apply Online</div>
                <div className="text-xs text-blue-700">Official application portal</div>
              </div>
              <span className="ml-auto">→</span>
            </a>
          )}

          {org?.website && (
            <a
              href={org.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-white border border-blue-200 rounded hover:bg-blue-50"
            >
              <span>🌐</span>
              <div>
                <div className="font-medium text-blue-900">Official Website</div>
                <div className="text-xs text-blue-700">{org.name}</div>
              </div>
              <span className="ml-auto">→</span>
            </a>
          )}
        </div>

        {lastVerified && (
          <p className="text-xs text-gray-500 mt-4">
            Last verified: {lastVerified.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}
      </div>

      {/* FAQs — only when data supports a meaningful answer */}
      {faqs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <div className="font-semibold text-gray-900 mb-1">{faq.q}</div>
                <div className="text-sm text-gray-700">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trust Statement */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <p className="text-sm text-amber-900">
          <strong>JobOye is an independent job information platform.</strong> Always verify details in the official notification before applying.
        </p>
        {lastVerified && (
          <p className="text-xs text-amber-700 mt-2">
            Last updated: {lastVerified.toLocaleDateString("en-IN")}
          </p>
        )}
      </div>
    </div>
  );
}
