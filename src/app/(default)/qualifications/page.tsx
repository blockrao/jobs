import type { Metadata } from "next";
import Link from "next/link";
import { pageSeo } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { QUALIFICATIONS, qualificationHref } from "@/lib/qualifications";
import { countLivePostsByAllQualifications } from "@/lib/queries";
import { safeQuery } from "@/lib/safe-query";
import { buildBreadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";
import ExamMatcherQuiz from "@/components/exam-matcher-quiz";
import HubFAQ from "@/components/hub-faq";

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

        {/* Cross-Hub Navigation */}
        <section className="mt-16 pt-8 border-t">
          <h2 className="text-2xl font-bold mb-8">Explore Government Job Paths</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <Link
              href="/salary-guides"
              className="block p-6 border border-green-200 rounded-lg hover:shadow-lg hover:bg-green-50 transition-all"
            >
              <h3 className="text-xl font-bold text-green-600 mb-2">Salary Guides</h3>
              <p className="text-gray-600">See salary potential by qualification level, from entry to peak earnings</p>
            </Link>
            <Link
              href="/comparisons"
              className="block p-6 border border-blue-200 rounded-lg hover:shadow-lg hover:bg-blue-50 transition-all"
            >
              <h3 className="text-xl font-bold text-blue-600 mb-2">Exam Comparisons</h3>
              <p className="text-gray-600">Compare exams to find the right path for your qualification and goals</p>
            </Link>
          </div>
        </section>

        {/* FAQ Section */}
        <HubFAQ
          title="Frequently Asked Questions"
          items={[
            {
              question: "How many qualification categories are available for government jobs?",
              answer: "Government jobs in India are open to candidates with 11 different qualification levels, from 10th pass to post-graduation (MBA, M.Tech, M.Sc). Each qualification has multiple job opportunities across various sectors including civil services, banking, railways, and state governments.",
            },
            {
              question: "Which qualification has the highest salary for government jobs?",
              answer: "Engineering qualifications (B.Tech/BE) and professional degrees (MBA, MBBS) typically lead to the highest salaries in government jobs. IAS/IFS positions (civil services) offer the highest peak salaries (₹200,000+/month), but require an undergraduate degree and clearing the UPSC exam.",
            },
            {
              question: "Can I switch qualifications in a government job career?",
              answer: "Most government jobs require a specific qualification for entry. However, after joining, many officers pursue further education and certifications. For example, an engineer might pursue an MBA while working, or a bachelor's degree holder might pursue a master's. The primary role doesn't change, but career growth can be enhanced with additional qualifications.",
            },
            {
              question: "Is B.Tech better than MBA for government jobs?",
              answer: "Both have different advantages. B.Tech graduates qualify for technical positions in PSUs, GATE exams, and engineering roles in government. MBA graduates are suited for administrative, management, and policy roles in civil services and government organizations. The choice depends on your interests and career goals.",
            },
            {
              question: "What's the salary progression for each qualification?",
              answer: "Salary progression in government jobs follows a fixed pay scale based on grade and experience level. A 10th pass government employee starts at ₹18,000/month and can reach ₹40,000/month. B.Tech graduates start at ₹35,000+/month and can reach ₹100,000+. IAS officers start at ₹56,100/month and can reach ₹200,000+/month.",
            },
            {
              question: "How many government job notifications are available for each qualification?",
              answer: "Notifications vary by year and qualification. B.Tech and Engineering have 8,000-10,000 vacancies annually across UPSC, PSUs, railways, and state governments. Commerce (B.Com) has 5,000+ vacancies. Arts and Science graduates have even more opportunities through SSC, banking, and state exams.",
            },
            {
              question: "Are there more government jobs for technical or non-technical qualifications?",
              answer: "Non-technical qualifications (B.A, B.Com) have significantly more opportunities overall because they qualify for administrative and general posts across all sectors. However, technical qualifications (B.Tech, ITI) have higher salary ceilings and more specialized roles in PSUs and technical departments.",
            },
            {
              question: "Can I apply for government jobs with just 10th or 12th pass?",
              answer: "Yes, there are hundreds of government job categories exclusively for 10th and 12th pass candidates. Railway Group D, SSC Stenographer, various state government posts, and bank clerk positions accept 10th/12th pass applications. These roles typically start at ₹18,000-₹21,000/month.",
            },
            {
              question: "Which government exams accept each qualification?",
              answer: "Different exams have different qualification requirements: UPSC requires graduation, SSC accepts 10th pass (Group D) and graduation (CGL), Banking accepts graduation, Railway Group D accepts 10th pass, State PSCs vary by state. Each qualification opens doors to specific exams and job categories.",
            },
            {
              question: "What's the difference between Group A, B, C, and D government jobs?",
              answer: "Government jobs are classified by grade: Group A (highest salary ₹56,100+/month, requires graduation, 0.1% pass rate), Group B (₹44,900+/month), Group C (₹21,000+/month, requires 10th/12th pass), and Group D (entry level ₹18,000/month). Your qualification determines which group you can qualify for.",
            },
          ]}
        />
      </div>
    </>
  );
}
