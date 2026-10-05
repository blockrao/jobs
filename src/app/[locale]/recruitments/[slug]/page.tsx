// /hi/recruitments/[slug] — locale-aware recruitment detail page.
// Mirrors (default)/recruitments/[slug]/page.tsx. Canonical remains
// /recruitments/[slug]; this is noindex.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { recruitments, postings } from "@/db/schema";
import { absoluteUrl } from "@/lib/site";
import { eq, inArray } from "drizzle-orm";
import { safeQuery } from "@/lib/safe-query";

export const revalidate = 300;

type Props = { params: Promise<{ locale: string; slug: string }> };

async function getRecruitmentBySlug(slug: string) {
  const db = getDb();
  if (!db) return null;
  return (
    (await db.query.recruitments.findFirst({
      where: eq(recruitments.slug, slug),
      with: {
        organization: true,
        posts: { with: { position: true } },
      },
    })) || null
  );
}

async function getPostingSlugsForPosts(postIds: number[]) {
  if (postIds.length === 0) return new Map<number, { slug: string; title: string; titleHi?: string | null }>();
  const db = getDb();
  if (!db) return new Map<number, { slug: string; title: string; titleHi?: string | null }>();

  const rows = await db
    .select({
      inferredPostId: postings.inferredPostId,
      slug: postings.slug,
      title: postings.title,
      titleHi: postings.titleHi,
    })
    .from(postings)
    .where(inArray(postings.inferredPostId, postIds));

  const map = new Map<number, { slug: string; title: string; titleHi?: string | null }>();
  for (const row of rows) {
    if (row.inferredPostId != null)
      map.set(row.inferredPostId, { slug: row.slug, title: row.title, titleHi: row.titleHi });
  }
  return map;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const isHi = locale === "hi";
  const recruitment = await safeQuery(() => getRecruitmentBySlug(slug), null);
  if (!recruitment) return {};

  const nameHi = (recruitment as any).nameHi as string | null;
  const name = isHi && nameHi ? nameHi : recruitment.name;
  const title = isHi
    ? `${name} — सरकारी भर्ती`
    : `${name} — Government Job Recruitment`;

  return {
    title,
    description: isHi
      ? `${name} भर्ती — पद, रिक्तियां, पात्रता, आवेदन तिथियां और आधिकारिक अधिसूचना।`
      : `${recruitment.name} recruitment - ${recruitment.posts?.length || 0} posts, vacancies, eligibility, application dates, and official notification.`,
    robots: { index: false, follow: true },
    alternates: { canonical: `/recruitments/${slug}` },
  };
}

function formatDate(date: Date | null | undefined, locale: string = "en-IN"): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function LocaleRecruitmentPage({ params }: Props) {
  const { locale, slug } = await params;
  const isHi = locale === "hi";
  const dateLocale = isHi ? "hi-IN" : "en-IN";

  const recruitment = await safeQuery(() => getRecruitmentBySlug(slug), null);
  if (!recruitment) notFound();

  const posts_data = recruitment.posts || [];
  const totalVacancies = posts_data.reduce((sum, p) => sum + ((p as any).vacancyTotal || 0), 0);
  const postingBySlotId = await safeQuery(
    () => getPostingSlugsForPosts(posts_data.map((p) => p.id)),
    new Map<number, { slug: string; title: string; titleHi?: string | null }>(),
  );

  const daysToClosing = recruitment.applicationEndDate
    ? Math.ceil((recruitment.applicationEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isClosingSoon = daysToClosing !== null && daysToClosing <= 3 && daysToClosing > 0;
  const isClosed = daysToClosing !== null && daysToClosing <= 0;

  const nameHi = (recruitment as any).nameHi as string | null;
  const displayName = isHi && nameHi ? nameHi : recruitment.name;

  const L = {
    breadcrumb: isHi ? "भर्तियां" : "Recruitments",
    vacancies: isHi ? "रिक्तियां" : "Vacancies",
    closingSoon: (d: number) =>
      isHi
        ? `⚠️ आवेदन ${d} दिन में बंद होंगे। अभी आवेदन करें।`
        : `⚠️ Applications close in ${d} day${d > 1 ? "s" : ""}. Apply now.`,
    closed: isHi ? "यह भर्ती बंद हो गई है।" : "This recruitment has closed.",
    quickOverview: isHi ? "संक्षिप्त विवरण" : "Quick Overview",
    organization: isHi ? "संस्था" : "Organization",
    totalVacancies: isHi ? "कुल रिक्तियां" : "Total Vacancies",
    posts: isHi ? "पद" : "Posts",
    year: isHi ? "वर्ष" : "Year",
    importantDates: isHi ? "महत्वपूर्ण तिथियां" : "Important Dates",
    notification: isHi ? "अधिसूचना" : "Notification",
    applicationStarts: isHi ? "आवेदन शुरू" : "Application Starts",
    lastDate: isHi ? "अंतिम तिथि" : "Last Date to Apply",
    examDate: isHi ? "परीक्षा तिथि" : "Exam Date",
    resultDate: isHi ? "परिणाम तिथि" : "Result Date",
    postsAvailable: isHi ? "उपलब्ध पद" : "Posts Available",
    viewDetails: isHi ? "पूरी जानकारी देखें →" : "View full details, eligibility & apply →",
    selectionProcess: isHi ? "चयन प्रक्रिया" : "Selection Process",
    selectionSteps: isHi
      ? [
          "आधिकारिक अधिसूचना में पात्रता जांचें",
          "आधिकारिक पोर्टल पर पंजीकरण करें",
          "आवेदन पत्र भरें",
          "आवेदन शुल्क भुगतान करें (यदि लागू हो)",
          "परीक्षा में उपस्थित हों",
        ]
      : [
          "Check the official notification for eligibility",
          "Register on the official portal",
          "Fill the application form",
          "Pay application fee (if applicable)",
          "Appear for examination",
        ],
    officialSources: isHi ? "आधिकारिक स्रोत" : "Official Sources",
    verifyNote: isHi
      ? "आवेदन करने से पहले आधिकारिक अधिसूचना में सभी विवरण सत्यापित करें।"
      : "Verify all details in the official notification before applying.",
    officialNotification: isHi ? "आधिकारिक अधिसूचना" : "Official Notification",
    officialWebsite: isHi ? "आधिकारिक वेबसाइट" : "Official Website",
    trustStatement: isHi
      ? "JobOye एक स्वतंत्र रोजगार सूचना मंच है। आवेदन करने से पहले आधिकारिक अधिसूचना में विवरण सत्यापित करें।"
      : "JobOye is an independent job information platform. Always verify details in the official notification before applying.",
    lastUpdated: isHi ? "अंतिम अपडेट" : "Last updated",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
          <Link href={`/${locale}/recruitments`} className="hover:text-blue-600">
            {L.breadcrumb}
          </Link>
          <span>/</span>
          <span>{displayName}</span>
        </div>

        <h1 className="text-4xl font-bold mb-4">{displayName}</h1>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-3 h-3 rounded-full ${
                isClosingSoon
                  ? "bg-orange-500"
                  : isClosed
                  ? "bg-red-500"
                  : recruitment.status === "UPCOMING"
                  ? "bg-blue-500"
                  : recruitment.status === "ACTIVE"
                  ? "bg-green-500"
                  : "bg-gray-400"
              }`}
            />
            <span className="font-medium">
              {isClosingSoon
                ? isHi ? "जल्द बंद" : "CLOSING SOON"
                : isClosed
                ? isHi ? "बंद" : "CLOSED"
                : recruitment.status}
            </span>
          </div>

          {totalVacancies > 0 && (
            <div className="text-lg font-semibold text-blue-600">
              {totalVacancies.toLocaleString(dateLocale)} {L.vacancies}
            </div>
          )}

          {recruitment.applicationEndDate && (
            <div className="text-sm">
              <span className="font-medium">{L.lastDate}:</span>{" "}
              {formatDate(recruitment.applicationEndDate, dateLocale)}
            </div>
          )}
        </div>

        {isClosingSoon && daysToClosing !== null && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <p className="text-orange-900 font-medium">{L.closingSoon(daysToClosing)}</p>
          </div>
        )}
        {isClosed && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-900 font-medium">{L.closed}</p>
          </div>
        )}
      </div>

      {/* Quick Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-6">{L.quickOverview}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-600 font-medium mb-1">{L.organization}</div>
            <div className="text-lg font-semibold">
              {(() => {
                const org = recruitment.organization as any;
                return (isHi && org?.nameHi) ? org.nameHi : org?.name || "Organization";
              })()}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 font-medium mb-1">{L.totalVacancies}</div>
            <div className="text-lg font-semibold text-green-600">{totalVacancies.toLocaleString(dateLocale)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 font-medium mb-1">{L.posts}</div>
            <div className="text-lg font-semibold">{posts_data.length}</div>
          </div>
          {recruitment.year && (
            <div>
              <div className="text-sm text-gray-600 font-medium mb-1">{L.year}</div>
              <div className="text-lg font-semibold">{recruitment.year}</div>
            </div>
          )}
        </div>
      </div>

      {/* Important Dates */}
      {(recruitment.notificationDate || recruitment.applicationStartDate || recruitment.applicationEndDate || recruitment.examDate) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">{L.importantDates}</h2>
          <table className="w-full text-sm">
            <tbody>
              {recruitment.notificationDate && (
                <tr className="border-b border-gray-100">
                  <td className="py-3 font-medium text-gray-700">{L.notification}</td>
                  <td className="py-3">{formatDate(recruitment.notificationDate, dateLocale)}</td>
                </tr>
              )}
              {recruitment.applicationStartDate && (
                <tr className="border-b border-gray-100">
                  <td className="py-3 font-medium text-gray-700">{L.applicationStarts}</td>
                  <td className="py-3">{formatDate(recruitment.applicationStartDate, dateLocale)}</td>
                </tr>
              )}
              {recruitment.applicationEndDate && (
                <tr className={`border-b border-gray-100 ${isClosingSoon || isClosed ? "bg-orange-50" : ""}`}>
                  <td className="py-3 font-medium text-gray-700">{L.lastDate}</td>
                  <td className="py-3 font-semibold">{formatDate(recruitment.applicationEndDate, dateLocale)}</td>
                </tr>
              )}
              {recruitment.examDate && (
                <tr className="border-b border-gray-100">
                  <td className="py-3 font-medium text-gray-700">{L.examDate}</td>
                  <td className="py-3">{formatDate(recruitment.examDate, dateLocale)}</td>
                </tr>
              )}
              {recruitment.resultDate && (
                <tr>
                  <td className="py-3 font-medium text-gray-700">{L.resultDate}</td>
                  <td className="py-3">{formatDate(recruitment.resultDate, dateLocale)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Posts */}
      {posts_data.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">{L.postsAvailable}</h2>
          <div className="space-y-4">
            {posts_data.map((post) => {
              const livePosting = postingBySlotId.get(post.id);
              const postName = isHi
                ? (post as any).nameHi || post.name
                : post.name;
              // Link into the locale-prefixed detail page when Hindi content exists
              const jobHref =
                livePosting
                  ? isHi && livePosting.titleHi
                    ? `/hi/jobs/${livePosting.slug}`
                    : `/jobs/${livePosting.slug}`
                  : null;
              return (
                <div key={post.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      {jobHref ? (
                        <Link href={jobHref} className="font-semibold text-blue-600 hover:underline">
                          {postName}
                        </Link>
                      ) : (
                        <h3 className="font-semibold text-blue-600">{postName}</h3>
                      )}
                      {(post as any).position?.name && (
                        <div className="text-xs text-gray-500 mt-1">
                          <Link href={`/${locale}/positions/${(post as any).position.slug}`} className="hover:underline">
                            {isHi ? (post as any).position.nameHi || (post as any).position.name : (post as any).position.name}
                          </Link>
                        </div>
                      )}
                    </div>
                    {(post as any).vacancyTotal && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {((post as any).vacancyTotal as number).toLocaleString(dateLocale)}
                        </div>
                        <div className="text-xs text-gray-600">{L.vacancies}</div>
                      </div>
                    )}
                  </div>
                  {jobHref && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <Link href={jobHref} className="text-sm text-blue-600 hover:underline">
                        {L.viewDetails}
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selection Process */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">{L.selectionProcess}</h3>
        <ol className="space-y-3 text-sm text-blue-900">
          {L.selectionSteps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-bold">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Official Sources */}
      <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-green-900 mb-4">{L.officialSources}</h3>
        <p className="text-sm text-gray-700 mb-4">{L.verifyNote}</p>
        <div className="space-y-3">
          {recruitment.notificationUrl && (
            <a
              href={recruitment.notificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-white border border-green-200 rounded hover:bg-green-50"
            >
              <span>📄</span>
              <div>
                <div className="font-medium text-green-900">{L.officialNotification}</div>
                <div className="text-xs text-green-700">PDF</div>
              </div>
              <span className="ml-auto">→</span>
            </a>
          )}
          {recruitment.organization && (recruitment.organization as any)?.website && (
            <a
              href={(recruitment.organization as any).website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-white border border-blue-200 rounded hover:bg-blue-50"
            >
              <span>🌐</span>
              <div>
                <div className="font-medium text-blue-900">{L.officialWebsite}</div>
                <div className="text-xs text-blue-700">
                  {(() => {
                    const org = recruitment.organization as any;
                    return isHi && org?.nameHi ? org.nameHi : org?.name || "Organization";
                  })()}
                </div>
              </div>
              <span className="ml-auto">→</span>
            </a>
          )}
        </div>
      </div>

      {/* Trust Statement */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <p className="text-sm text-amber-900">
          <strong>JobOye</strong> — {L.trustStatement}
        </p>
        {recruitment.updatedAt && (
          <p className="text-xs text-amber-700 mt-2">
            {L.lastUpdated}: {new Date(recruitment.updatedAt).toLocaleDateString(dateLocale)}
          </p>
        )}
      </div>
    </div>
  );
}
