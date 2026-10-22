import type { Metadata } from "next";
import Link from "next/link";
import { pageSeo } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { QUALIFICATIONS, qualificationHref } from "@/lib/qualifications";
import { countLivePostsByAllQualifications } from "@/lib/queries";
import { safeQuery } from "@/lib/safe-query";
import { buildBreadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";
import ExamMatcherQuiz from "@/components/exam-matcher-quiz";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Government Jobs by Qualification 2026 — 10th Pass, Graduate, B.Tech, MBBS",
  description:
    "Browse central and state government job vacancies by your education level. Find 10th pass, 12th pass, graduate, diploma, ITI, B.Tech, MBBS and law jobs — updated daily.",
  ...pageSeo("/qualifications"),
  openGraph: {
    title: "Government Jobs by Qualification 2026",
    description:
      "Browse government job vacancies by education level — 10th pass, graduate, B.Tech, MBBS and more.",
    url: absoluteUrl("/qualifications"),
    type: "website",
  },
};

export default async function QualificationsIndexPage() {
  const counts = await safeQuery(
    () => countLivePostsByAllQualifications(QUALIFICATIONS),
    {} as Record<string, number>,
  );

  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Jobs by Qualification", path: "/qualifications" },
    ]),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav aria-label="Breadcrumb" className="text-sm text-neutral-500">
          <Link href="/" className="hover:underline">Home</Link>
          {" / "}
          <span className="text-neutral-800">Jobs by Qualification</span>
        </nav>

        <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
          Government Jobs by Qualification
        </h1>
        <p className="mt-2 max-w-2xl text-neutral-600">
          Every government vacancy organised by the minimum education required.
          Select your qualification to see matching central and state government jobs.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUALIFICATIONS.map((hub) => {
            const count = counts[hub.slug] ?? 0;
            return (
              <Link
                key={hub.slug}
                href={qualificationHref(hub.slug)}
                className="group flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm hover:border-red-400 hover:shadow-md transition-all"
              >
                <span className="text-base font-semibold text-neutral-900 group-hover:text-red-600">
                  {hub.label}
                </span>
                <span className="text-sm text-neutral-500 line-clamp-2">
                  {hub.description}
                </span>
                {count > 0 && (
                  <span className="mt-1 text-xs font-medium text-green-700">
                    {count.toLocaleString("en-IN")} live{" "}
                    {count === 1 ? "vacancy" : "vacancies"}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Interactive Exam Matcher Quiz */}
        <section className="mt-16 py-12 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-center">Not Sure Which Government Job is Right for You?</h2>
          <p className="text-center text-gray-600 mb-8">Take our 5-question quiz to find your perfect government exam match based on your goals and abilities</p>
          <ExamMatcherQuiz />
        </section>
      </div>
    </>
  );
}
