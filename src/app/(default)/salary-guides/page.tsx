/**
 * Salary Guides Hub Page
 * Lists all government job salary guides
 */

import type { Metadata } from "next";
import Link from "next/link";
import { pageSeo } from "@/lib/seo";
import { buildBreadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Government Job Salary Guides | Pay Scale by Grade & Role",
  description: "Complete salary guides for government jobs. Compare salaries by grade, role, and organization. Includes 30-year salary progression.",
  ...pageSeo("/salary-guides", { index: true }),
};

const salaryGuides = [
  {
    title: "Government Job Salary by Grade",
    slug: "government-job-salary-by-grade",
    searches: "4,200/month",
    description: "Master reference for all government salary structures - Group D to Group A",
  },
  {
    title: "Highest Paying Government Jobs",
    slug: "highest-paying-government-jobs",
    searches: "2,100/month",
    description: "Top 10 highest-paying positions including IAS, IFS, and senior government roles",
  },
  {
    title: "PSU Salary Comparison",
    slug: "psu-salary-comparison",
    searches: "1,800/month",
    description: "Compare salaries across major PSUs - IOC, NTPC, BHEL, HAL, GAIL",
  },
  {
    title: "Banking Salary Guide",
    slug: "banking-salary-guide",
    searches: "1,600/month",
    description: "Bank clerk to manager progression - SBI, IBPS, and other bank salaries",
  },
  {
    title: "Railway Salary Guide",
    slug: "railway-salary-guide",
    searches: "1,400/month",
    description: "RRB Group D to officer progression - 30-year career path and benefits",
  },
];

export default function SalaryGuidesPage() {
  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Salary Guides", path: "/salary-guides" },
    ]),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <main className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Government Job Salary Guides</h1>
        <p className="text-xl text-gray-600 mb-12">
          Comprehensive salary guides for government jobs. Compare pay scales across grades, organizations, and positions. Includes 30-year career progression.
        </p>

        <div className="grid gap-6">
          {salaryGuides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/salary-guides/${guide.slug}/`}
              className="block p-6 border border-gray-200 rounded-lg hover:shadow-lg hover:border-green-300 transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-2xl font-bold text-green-600 hover:underline">
                  {guide.title}
                </h2>
                <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded">
                  {guide.searches}
                </span>
              </div>
              <p className="text-gray-600">{guide.description}</p>
            </Link>
          ))}
        </div>

        <section className="mt-16 pt-8 border-t">
          <h2 className="text-2xl font-bold mb-6">Understanding Government Salaries</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Entry Salary vs Peak Salary</h3>
              <p className="text-gray-700">
                Government salaries follow a fixed structure based on grade and experience. A Group D entry salary starts around ₹18,000/month, while peak IAS salaries reach ₹200,000+ per month.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Components of Government Salary</h3>
              <p className="text-gray-700">
                Government salaries include: basic pay, dearness allowance (DA), house rent allowance (HRA), other allowances, and pension benefits. Total compensation is 30-50% higher than just the basic pay.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">30-Year Career Progression</h3>
              <p className="text-gray-700">
                Most guides include 30-year salary progression showing how your salary grows from entry to retirement. This is crucial for understanding lifetime earnings potential across different career paths.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Sector Comparisons</h3>
              <p className="text-gray-700">
                Compare salaries across different sectors: Government (Group A/B/C/D), PSUs (NTPC, IOC, BHEL, etc.), Banks (SBI, IBPS), and Railways (RRB). Find the sector that offers the best salary growth for your qualification.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
    </>
  );
}
