/**
 * Salary Guides Hub Page
 * Lists all government job salary guides
 */

import type { Metadata } from "next";
import Link from "next/link";
import { pageSeo } from "@/lib/seo";
import { buildBreadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";
import HubFAQ from "@/components/hub-faq";

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

        {/* Cross-Hub Navigation */}
        <section className="mt-16 pt-8 border-t">
          <h2 className="text-2xl font-bold mb-8">Find Your Government Job Path</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <Link
              href="/qualifications"
              className="block p-6 border border-indigo-200 rounded-lg hover:shadow-lg hover:bg-indigo-50 transition-all"
            >
              <h3 className="text-xl font-bold text-indigo-600 mb-2">By Qualification</h3>
              <p className="text-gray-600">Browse government jobs by your education level and see matching opportunities</p>
            </Link>
            <Link
              href="/comparisons"
              className="block p-6 border border-blue-200 rounded-lg hover:shadow-lg hover:bg-blue-50 transition-all"
            >
              <h3 className="text-xl font-bold text-blue-600 mb-2">Exam Comparisons</h3>
              <p className="text-gray-600">Compare different exams to understand salary potential before choosing</p>
            </Link>
          </div>
        </section>

        {/* FAQ Section */}
        <HubFAQ
          title="Salary & Career Growth Questions"
          items={[
            {
              question: "What's the average government job salary in India?",
              answer: "Government job salaries vary by grade and level. Group D (entry level) starts at ₹18,000/month, Group C at ₹21,000/month, Group B at ₹44,900/month, and Group A (IAS/IFS) at ₹56,100/month. Average across all government jobs is approximately ₹35,000-₹50,000/month for mid-level positions.",
            },
            {
              question: "Do all government jobs have the same salary?",
              answer: "No. Government salaries are structured by grade (A, B, C, D) and position level. An IAS officer earns 10x more than a Group D worker. Additionally, salaries vary by department (defence gets higher allowances), state (tier-1 cities get HRA), and seniority level.",
            },
            {
              question: "How much salary growth can I expect over 30 years?",
              answer: "Typically, a government employee's salary grows 3-4x over 30 years through regular increments and promotions. A Group C clerk starting at ₹21,000/month can reach ₹60,000-₹70,000/month at peak. An IAS officer can grow from ₹56,100 to ₹200,000+/month.",
            },
            {
              question: "Which government job pays the highest salary?",
              answer: "IAS (Indian Administrative Service) officers earn the highest salaries, reaching ₹200,000-₹250,000/month at senior levels. Other high-paying positions include IFS (Indian Foreign Service), IPS (Indian Police Service), and senior bureaucratic positions. Engineering positions in PSUs (NTPC, IOC) also pay ₹100,000+/month.",
            },
            {
              question: "Are government salaries different by state?",
              answer: "Yes, significantly. States like Delhi, Mumbai, and Bangalore offer higher HRA (House Rent Allowance) and dearness allowance (DA) than smaller states. A Group C position in Delhi might earn ₹28,000/month while the same position in a smaller state earns ₹22,000/month. Both are under the same grade but different allowances apply.",
            },
            {
              question: "What is the difference between basic pay and total salary in government jobs?",
              answer: "Basic pay is only 40-50% of total salary. Total salary includes basic pay + dearness allowance (DA, currently 50% of basic) + house rent allowance (HRA, 8-24% depending on city tier) + other allowances + performance bonus. A ₹30,000 basic pay results in ₹45,000-₹50,000 total monthly salary.",
            },
            {
              question: "Do government jobs offer performance bonuses or incentives?",
              answer: "Government salaries are mostly fixed with annual increments. However, some sectors offer performance bonuses: Railways offer productivity-linked bonuses, Defence gets special allowances, and senior positions get policy impact bonuses. Private sector jobs offer higher variable pay, but government offers job security.",
            },
            {
              question: "What is the pension benefit in government jobs?",
              answer: "Most government employees receive a pension equal to 50% of average salary for their entire lifetime after retirement. An employee with average salary of ₹80,000/month receives ₹40,000/month pension for life. This is calculated and paid monthly by the government.",
            },
            {
              question: "How long does it take to reach peak salary in government jobs?",
              answer: "Typically 25-30 years of service. A Group C employee reaching peak salary (₹65,000+/month) takes 25-30 years. Group A (IAS) officers reach peak salary (₹200,000+/month) within 20-25 years when they become Chief Secretary. Promotions and seniority accelerate salary growth.",
            },
            {
              question: "Is government job salary better than private sector?",
              answer: "Government jobs offer lower entry salary but superior job security, pension, and guaranteed increments. At entry level, private sector pays 30-50% more. At peak, government (IAS) can earn more with pension benefits. The choice depends on whether you prefer security (govt) or growth potential (private).",
            },
          ]}
        />
      </div>
    </main>
    </>
  );
}
