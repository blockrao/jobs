// /hi/positions/[slug] — locale-aware position page.
// Mirrors (default)/positions/[slug]/page.tsx. Canonical stays at
// /positions/[slug] (which is itself noindex per SEO-001 D2); this is also noindex.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { positions, posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { safeQuery } from "@/lib/safe-query";
import { pageSeo } from "@/lib/seo";

export const revalidate = 3600;

type Props = { params: Promise<{ locale: string; slug: string }> };

async function getPositionBySlug(slug: string) {
  const db = getDb();
  if (!db) return null;
  return (await db.query.positions.findFirst({ where: eq(positions.slug, slug) })) || null;
}

async function getRecruitmentsByPosition(positionId: number) {
  const db = getDb();
  if (!db) return [];
  const postsList = await db.query.posts.findMany({
    where: eq(posts.positionId, positionId),
    with: { recruitment: true },
  });
  return Array.from(
    new Map(postsList.map((p: any) => [p.recruitment.id, p.recruitment])).values(),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const isHi = locale === "hi";
  const position = await safeQuery(() => getPositionBySlug(slug), null);
  if (!position) return {};

  const nameHi = (position as any).nameHi as string | null;
  const displayName = isHi && nameHi ? nameHi : position.name;
  const title = isHi
    ? `${displayName} - सरकारी नौकरी पद, वेतन, आयु, योग्यता`
    : `${position.name} - Government Job Position, Salary, Age, Qualifications`;

  return {
    title,
    description: isHi
      ? `${displayName}: वेतन, आयु सीमा, भर्तियां और पात्रता जानकारी।`
      : (position.description ||
          `${position.name}: Find recruitments, eligibility, and how to apply.`),
    ...pageSeo(`/positions/${slug}`, { index: false }),
  };
}

export default async function LocalePositionPage({ params }: Props) {
  const { locale, slug } = await params;
  const isHi = locale === "hi";
  const dateLocale = isHi ? "hi-IN" : "en-IN";

  const position = await safeQuery(() => getPositionBySlug(slug), null);
  if (!position) notFound();

  const recruitmentsList = await safeQuery(
    () => getRecruitmentsByPosition(position.id),
    [],
  );

  const nameHi = (position as any).nameHi as string | null;
  const descriptionHi = (position as any).descriptionHi as string | null;
  const displayName = isHi && nameHi ? nameHi : position.name;
  const displayDescription = isHi && descriptionHi ? descriptionHi : position.description;

  const L = {
    breadcrumb: isHi ? "पद" : "Positions",
    salary: isHi ? "वेतन पैकेज" : "Salary Package",
    salaryUnit: isHi ? "प्रति वर्ष (सामान्य)" : "Per year (typical)",
    ageLimit: isHi ? "आयु सीमा" : "Age Limit",
    ageUnit: isHi ? "आवेदन के समय" : "At time of application",
    activeRecruitments: isHi ? "सक्रिय भर्तियां" : "Active Recruitments",
    activeUnit: isHi ? "इस पद के लिए" : "For this position",
    about: isHi ? "इस पद के बारे में" : "About This Position",
    aboutText: (name: string, cat: string) =>
      isHi
        ? `${name} ${cat} क्षेत्र का एक स्थायी पद है। यह पद केंद्र, राज्य और स्वायत्त निकायों द्वारा नियमित भर्ती अभियानों के माध्यम से प्रदान किया जाता है।`
        : `${name} is an evergreen position in the ${cat} sector. This role is offered regularly through various government recruitment campaigns across central, state, and autonomous bodies.`,
    campaigns: isHi ? "भर्ती अभियान" : "Recruitment Campaigns",
    noCampaigns: isHi
      ? "इस पद के लिए अभी कोई सक्रिय भर्ती नहीं है।"
      : "No active recruitments for this position at the moment.",
    applicationPeriod: isHi ? "आवेदन अवधि" : "Application Period",
    howToApply: isHi ? "आवेदन कैसे करें" : "How to Apply",
    applySteps: isHi
      ? [
          "पात्रता और आवेदन प्रक्रिया के लिए भर्ती अधिसूचना जांचें",
          "आधिकारिक भर्ती पोर्टल पर अपने विवरण के साथ पंजीकरण करें",
          "आवेदन पत्र भरें और आवश्यक दस्तावेज अपलोड करें",
          "आवेदन शुल्क (यदि लागू हो) का भुगतान करें और सबमिट करें",
          "परीक्षा और उसके बाद के चरणों में उपस्थित हों",
        ]
      : [
          "Check the recruitment notification for eligibility and application process",
          "Register on the official recruitment portal with your details",
          "Fill the application form and upload required documents",
          "Pay the application fee (if applicable) and submit",
          "Appear for the examination and subsequent rounds",
        ],
    benefits: isHi ? "लाभ और पात्रता" : "Benefits & Eligibility",
    benefitsList: isHi
      ? [
          "नियमित वेतन वृद्धि के साथ प्रतिस्पर्धी सरकारी वेतन",
          "व्यापक चिकित्सा और पेंशन लाभ",
          "नौकरी सुरक्षा और करियर उन्नति के अवसर",
          "आरक्षित वर्गों के लिए आयु में छूट",
          "विशिष्ट पात्रता के लिए व्यक्तिगत भर्ती अधिसूचना जांचें",
        ]
      : [
          "Competitive government salary with regular increments",
          "Comprehensive medical and pension benefits",
          "Job security and career advancement opportunities",
          "Age relaxation for reserved categories",
          "Check individual recruitment notification for specific eligibility",
        ],
  };

  const categoryDisplay = position.category.toLowerCase().replace("_", " ");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
          <Link href={`/${locale}/positions`} className="hover:text-blue-600">
            {L.breadcrumb}
          </Link>
          <span>/</span>
          <span className="text-gray-900">{displayName}</span>
        </div>

        <h1 className="text-4xl font-bold mb-2">{displayName}</h1>
        <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          {position.category}
        </div>
      </div>

      {displayDescription && (
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <p className="text-gray-700 text-lg">{displayDescription}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {position.typicalSalaryMin && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-sm text-gray-600 font-medium mb-2">{L.salary}</div>
            <div className="text-2xl font-bold text-green-600">
              ₹{(position.typicalSalaryMin / 100000).toFixed(1)}L –{" "}
              ₹{(position.typicalSalaryMax! / 100000).toFixed(1)}L
            </div>
            <div className="text-xs text-gray-500 mt-1">{L.salaryUnit}</div>
          </div>
        )}

        {position.typicalAgeMin && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-sm text-gray-600 font-medium mb-2">{L.ageLimit}</div>
            <div className="text-2xl font-bold text-blue-600">
              {position.typicalAgeMin} – {position.typicalAgeMax} {isHi ? "वर्ष" : "years"}
            </div>
            <div className="text-xs text-gray-500 mt-1">{L.ageUnit}</div>
          </div>
        )}

        {recruitmentsList.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-sm text-gray-600 font-medium mb-2">{L.activeRecruitments}</div>
            <div className="text-2xl font-bold text-purple-600">{recruitmentsList.length}</div>
            <div className="text-xs text-gray-500 mt-1">{L.activeUnit}</div>
          </div>
        )}
      </div>

      <div className="bg-white border-l-4 border-blue-500 p-6 rounded mb-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{L.about}</h3>
        <p className="text-gray-700">{L.aboutText(displayName, categoryDisplay)}</p>
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">{L.campaigns}</h2>

        {recruitmentsList.length === 0 ? (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <p className="text-gray-600">{L.noCampaigns}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recruitmentsList.map((recruitment: any) => {
              const recNameHi = recruitment.nameHi as string | null;
              const displayRecName = isHi && recNameHi ? recNameHi : recruitment.name;
              return (
                <Link
                  key={recruitment.id}
                  href={`/jobs/${recruitment.slug}`}
                  className="block"
                >
                  <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-400 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-grow">
                        <h3 className="text-xl font-semibold text-blue-600 hover:underline mb-2">
                          {displayRecName}
                        </h3>
                        {recruitment.description && (
                          <p className="text-sm text-gray-600 mb-3">
                            {recruitment.description.substring(0, 150)}…
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 whitespace-nowrap ml-4 ${
                          recruitment.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : recruitment.status === "RESULTS"
                            ? "bg-blue-100 text-blue-800"
                            : recruitment.status === "UPCOMING"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {recruitment.status}
                      </span>
                    </div>
                    {recruitment.applicationStartDate && (
                      <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
                        <span className="font-medium">{L.applicationPeriod}:</span>{" "}
                        {new Date(recruitment.applicationStartDate).toLocaleDateString(dateLocale)}{" "}
                        –{" "}
                        {recruitment.applicationEndDate
                          ? new Date(recruitment.applicationEndDate).toLocaleDateString(dateLocale)
                          : isHi ? "घोषित होगा" : "TBD"}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">{L.howToApply}</h3>
          <ol className="space-y-3 text-sm text-blue-900">
            {L.applySteps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-bold text-blue-600">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4">{L.benefits}</h3>
          <ul className="space-y-2 text-sm text-green-900">
            {L.benefitsList.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-green-600">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
