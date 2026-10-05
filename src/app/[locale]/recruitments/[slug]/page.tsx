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
        exam: true,
        posts: { with: { position: true } },
      },
    })) || null
  );
}

type PostingSlot = {
  slug: string;
  title: string;
  titleHi?: string | null;
  eligibility: string | null;
  eligibilityHi?: string | null;
  ageLimitMin: number | null;
  ageLimitMax: number | null;
  ageRelaxationNotes: string | null;
  officialNotificationUrl: string | null;
  applyUrl: string | null;
  applicationFeeGeneral: number | null;
  applicationFeeReserved: number | null;
  updatedAt: Date;
};

async function getPostingSlugsForPosts(postIds: number[]) {
  if (postIds.length === 0) return new Map<number, PostingSlot>();
  const db = getDb();
  if (!db) return new Map<number, PostingSlot>();

  const rows = await db
    .select({
      inferredPostId: postings.inferredPostId,
      slug: postings.slug,
      title: postings.title,
      titleHi: postings.titleHi,
      eligibility: postings.eligibility,
      eligibilityHi: postings.eligibilityHi,
      ageLimitMin: postings.ageLimitMin,
      ageLimitMax: postings.ageLimitMax,
      ageRelaxationNotes: postings.ageRelaxationNotes,
      officialNotificationUrl: postings.officialNotificationUrl,
      applyUrl: postings.applyUrl,
      applicationFeeGeneral: postings.applicationFeeGeneral,
      applicationFeeReserved: postings.applicationFeeReserved,
      updatedAt: postings.updatedAt,
    })
    .from(postings)
    .where(inArray(postings.inferredPostId, postIds));

  const map = new Map<number, PostingSlot>();
  for (const row of rows) {
    if (row.inferredPostId != null) {
      map.set(row.inferredPostId, {
        slug: row.slug,
        title: row.title,
        titleHi: row.titleHi,
        eligibility: row.eligibility,
        eligibilityHi: row.eligibilityHi,
        ageLimitMin: row.ageLimitMin,
        ageLimitMax: row.ageLimitMax,
        ageRelaxationNotes: row.ageRelaxationNotes,
        officialNotificationUrl: row.officialNotificationUrl,
        applyUrl: row.applyUrl,
        applicationFeeGeneral: row.applicationFeeGeneral,
        applicationFeeReserved: row.applicationFeeReserved,
        updatedAt: row.updatedAt,
      });
    }
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
    new Map<number, PostingSlot>(),
  );

  const daysToClosing = recruitment.applicationEndDate
    ? Math.ceil((recruitment.applicationEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isClosingSoon = daysToClosing !== null && daysToClosing <= 3 && daysToClosing > 0;
  const isClosed = daysToClosing !== null && daysToClosing <= 0;

  const nameHi = (recruitment as any).nameHi as string | null;
  const displayName = isHi && nameHi ? nameHi : recruitment.name;

  const org = recruitment.organization as any;
  const exam = (recruitment as any).exam;

  const anyPosting = postingBySlotId.size > 0 ? [...postingBySlotId.values()][0] : null;
  const notificationUrl = recruitment.notificationUrl || anyPosting?.officialNotificationUrl || null;
  const applyUrl = anyPosting?.applyUrl || null;

  const lastVerified: Date | null = [...postingBySlotId.values()]
    .map((p) => p.updatedAt)
    .reduce<Date | null>((latest, d) => (!latest || d > latest ? d : latest), null)
    ?? (recruitment.updatedAt ? new Date(recruitment.updatedAt) : null);

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
    advertNo: isHi ? "विज्ञापन सं." : "Advertisement No.",
    importantDates: isHi ? "महत्वपूर्ण तिथियां" : "Important Dates",
    notification: isHi ? "अधिसूचना" : "Notification",
    applicationStarts: isHi ? "आवेदन शुरू" : "Application Starts",
    lastDate: isHi ? "अंतिम तिथि" : "Last Date to Apply",
    examDate: isHi ? "परीक्षा तिथि" : "Exam Date",
    resultDate: isHi ? "परिणाम तिथि" : "Result Date",
    postsAvailable: isHi ? "उपलब्ध पद" : "Posts Available",
    position: isHi ? "पद" : "Position",
    eligibilityLabel: isHi ? "पात्रता" : "Eligibility",
    ageLabel: isHi ? "आयु सीमा" : "Age Limit",
    payLabel: isHi ? "वेतन" : "Pay Scale",
    feeLabel: isHi ? "आवेदन शुल्क" : "Application Fee",
    noFee: isHi ? "कोई शुल्क नहीं" : "No fee",
    years: isHi ? "वर्ष" : "years",
    viewDetails: isHi ? "पूरी जानकारी देखें →" : "View full details, eligibility & apply →",
    aboutRecruitment: isHi ? "इस भर्ती के बारे में" : "About this Recruitment",
    sourceVerification: isHi ? "स्रोत एवं सत्यापन" : "Source & Verification",
    issuingAuthority: isHi ? "जारी करने वाली संस्था" : "Issuing Authority",
    verifyNote: isHi
      ? "इस पृष्ठ पर सभी जानकारी आधिकारिक सरकारी अधिसूचना से ली गई है। आवेदन करने से पहले वहां सत्यापित करें।"
      : "All information on this page is drawn from the official government notification. Verify details there before applying.",
    officialNotification: isHi ? "आधिकारिक अधिसूचना" : "Official Notification",
    applyOnline: isHi ? "ऑनलाइन आवेदन करें" : "Apply Online",
    officialPortal: isHi ? "आधिकारिक आवेदन पोर्टल" : "Official application portal",
    officialWebsite: isHi ? "आधिकारिक वेबसाइट" : "Official Website",
    lastVerified: isHi ? "अंतिम सत्यापित" : "Last verified",
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
              {(isHi && org?.nameHi) ? org.nameHi : org?.name || "Organization"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 font-medium mb-1">{L.totalVacancies}</div>
            <div className="text-lg font-semibold text-green-600">
              {totalVacancies > 0 ? totalVacancies.toLocaleString(dateLocale) : "—"}
            </div>
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
          {recruitment.officialNotificationNumber && (
            <div>
              <div className="text-sm text-gray-600 font-medium mb-1">{L.advertNo}</div>
              <div className="text-lg font-semibold">{recruitment.officialNotificationNumber}</div>
            </div>
          )}
        </div>
      </div>

      {/* Entity Graph — Organization → Recruitment → Exam */}
      {(org || exam || posts_data.some((p) => (p as any).position)) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">{L.aboutRecruitment}</h2>
          <div className="flex flex-wrap gap-2 items-center text-sm">
            {org && (
              <>
                {org.slug ? (
                  <Link
                    href={`/${locale}/commissions/${org.slug}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-full hover:bg-blue-100 font-medium"
                  >
                    🏛️ {(isHi && org.nameHi) ? org.nameHi : org.name}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full font-medium">
                    🏛️ {(isHi && org.nameHi) ? org.nameHi : org.name}
                  </span>
                )}
                <span className="text-gray-400">›</span>
              </>
            )}
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-800 rounded-full font-medium">
              📋 {displayName}
            </span>
            {exam && (
              <>
                <span className="text-gray-400">›</span>
                {exam.slug ? (
                  <Link
                    href={`/${locale}/exams/${exam.slug}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-800 rounded-full hover:bg-purple-100 font-medium"
                  >
                    📝 {(isHi && exam.nameHi) ? exam.nameHi : exam.name}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full font-medium">
                    📝 {(isHi && exam.nameHi) ? exam.nameHi : exam.name}
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
                    href={`/${locale}/positions/${pos.slug}`}
                    className="text-xs px-2 py-1 bg-green-50 text-green-800 rounded hover:bg-green-100"
                  >
                    {(isHi && pos.nameHi) ? pos.nameHi : pos.name}
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

      {/* Posts Available — per-post detail where data exists */}
      {posts_data.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">{L.postsAvailable}</h2>
          <div className="space-y-6">
            {posts_data.map((post) => {
              const livePosting = postingBySlotId.get(post.id);
              const postName = isHi
                ? (post as any).nameHi || post.name
                : post.name;
              const jobHref = livePosting
                ? isHi && livePosting.titleHi
                  ? `/hi/jobs/${livePosting.slug}`
                  : `/jobs/${livePosting.slug}`
                : null;
              const payLabel = formatPayLevel((post as any).payLevel);
              const eligText = livePosting
                ? isHi && livePosting.eligibilityHi
                  ? livePosting.eligibilityHi
                  : livePosting.eligibility
                : null;

              return (
                <div key={post.id} className="border border-gray-100 rounded-lg p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      {jobHref ? (
                        <Link href={jobHref} className="font-semibold text-blue-600 hover:underline text-lg">
                          {postName}
                        </Link>
                      ) : (
                        <h3 className="font-semibold text-gray-900 text-lg">{postName}</h3>
                      )}
                      {(post as any).position?.name && (
                        <div className="text-xs text-gray-500 mt-1">
                          {L.position}:{" "}
                          <Link href={`/${locale}/positions/${(post as any).position.slug}`} className="hover:underline">
                            {isHi ? (post as any).position.nameHi || (post as any).position.name : (post as any).position.name}
                          </Link>
                        </div>
                      )}
                    </div>
                    {(post as any).vacancyTotal ? (
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-2xl font-bold text-green-600">
                          {((post as any).vacancyTotal as number).toLocaleString(dateLocale)}
                        </div>
                        <div className="text-xs text-gray-600">{L.vacancies}</div>
                      </div>
                    ) : null}
                  </div>

                  {livePosting && (
                    <div className="mt-3 space-y-2 text-sm text-gray-700">
                      {eligText && (
                        <div>
                          <span className="font-medium text-gray-800">{L.eligibilityLabel}: </span>
                          {eligText}
                        </div>
                      )}
                      {(livePosting.ageLimitMin || livePosting.ageLimitMax) && (
                        <div>
                          <span className="font-medium text-gray-800">{L.ageLabel}: </span>
                          {livePosting.ageLimitMin && livePosting.ageLimitMax
                            ? `${livePosting.ageLimitMin}–${livePosting.ageLimitMax} ${L.years}`
                            : livePosting.ageLimitMax
                              ? `${isHi ? "अधिकतम" : "Up to"} ${livePosting.ageLimitMax} ${L.years}`
                              : `${isHi ? "न्यूनतम" : "Min"} ${livePosting.ageLimitMin} ${L.years}`}
                          {livePosting.ageRelaxationNotes && (
                            <span className="text-gray-500"> ({livePosting.ageRelaxationNotes})</span>
                          )}
                        </div>
                      )}
                      {payLabel && (
                        <div>
                          <span className="font-medium text-gray-800">{L.payLabel}: </span>
                          {payLabel}
                        </div>
                      )}
                      {livePosting.applicationFeeGeneral != null && (
                        <div>
                          <span className="font-medium text-gray-800">{L.feeLabel}: </span>
                          {livePosting.applicationFeeGeneral === 0
                            ? L.noFee
                            : `₹${livePosting.applicationFeeGeneral} (${isHi ? "सामान्य" : "General"})`}
                          {livePosting.applicationFeeReserved != null &&
                            livePosting.applicationFeeReserved !== livePosting.applicationFeeGeneral && (
                              <span className="text-gray-500">
                                {livePosting.applicationFeeReserved === 0
                                  ? isHi ? " · निःशुल्क (SC/ST/PH)" : " · Nil (SC/ST/PH)"
                                  : ` · ₹${livePosting.applicationFeeReserved} (SC/ST/PH)`}
                              </span>
                            )}
                        </div>
                      )}
                    </div>
                  )}

                  {jobHref && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
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

      {/* Source & Verification */}
      <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-green-900 mb-4">{L.sourceVerification}</h3>
        <p className="text-sm text-gray-700 mb-4">{L.verifyNote}</p>

        <div className="space-y-3">
          {org && (
            <div className="flex items-start gap-3 p-3 bg-white border border-green-100 rounded text-sm">
              <span className="text-green-700 mt-0.5">🏛️</span>
              <div>
                <span className="font-medium text-gray-800">{L.issuingAuthority}: </span>
                <span className="text-gray-700">{(isHi && org.nameHi) ? org.nameHi : org.name}</span>
              </div>
            </div>
          )}

          {recruitment.officialNotificationNumber && (
            <div className="flex items-start gap-3 p-3 bg-white border border-green-100 rounded text-sm">
              <span className="text-green-700 mt-0.5">🔖</span>
              <div>
                <span className="font-medium text-gray-800">{L.advertNo}: </span>
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
                <div className="font-medium text-green-900">{L.officialNotification}</div>
                <div className="text-xs text-green-700">
                  PDF — {(isHi && org?.nameHi) ? org.nameHi : org?.name || ""}
                </div>
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
                <div className="font-medium text-blue-900">{L.applyOnline}</div>
                <div className="text-xs text-blue-700">{L.officialPortal}</div>
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
                <div className="font-medium text-blue-900">{L.officialWebsite}</div>
                <div className="text-xs text-blue-700">
                  {(isHi && org.nameHi) ? org.nameHi : org.name}
                </div>
              </div>
              <span className="ml-auto">→</span>
            </a>
          )}
        </div>

        {lastVerified && (
          <p className="text-xs text-gray-500 mt-4">
            {L.lastVerified}: {lastVerified.toLocaleDateString(dateLocale, { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}
      </div>

      {/* Trust Statement */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <p className="text-sm text-amber-900">
          <strong>JobOye</strong> — {L.trustStatement}
        </p>
        {lastVerified && (
          <p className="text-xs text-amber-700 mt-2">
            {L.lastUpdated}: {lastVerified.toLocaleDateString(dateLocale)}
          </p>
        )}
      </div>
    </div>
  );
}
