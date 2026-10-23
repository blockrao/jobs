/**
 * Comparisons Hub Page
 * Lists all government exam comparisons
 */

import type { Metadata } from "next";
import Link from "next/link";
import { pageSeo } from "@/lib/seo";
import { buildBreadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";
import HubFAQ from "@/components/hub-faq";

export const metadata: Metadata = {
  title: "Government Exam Comparisons | UPSC vs SSC vs GATE vs Railway",
  description: "Compare government exams: UPSC vs SSC, IBPS vs SBI, Railway vs UPSC, and more. Find the best exam for your career.",
  ...pageSeo("/comparisons", { index: true }),
};

const comparisons = [
  {
    title: "UPSC vs SSC",
    slug: "upsc-vs-ssc",
    searches: "3,200/month",
    description: "Compare IAS (UPSC) vs CHSL (SSC) - difficulty, salary, and career scope",
  },
  {
    title: "IBPS vs SBI",
    slug: "ibps-vs-sbi",
    searches: "1,800/month",
    description: "Banking exam comparison - multi-bank IBPS vs single-bank SBI",
  },
  {
    title: "Railway vs UPSC",
    slug: "railway-vs-upsc",
    searches: "1,400/month",
    description: "Choose between quick RRB jobs or prestigious UPSC positions",
  },
  {
    title: "State PSC vs UPSC",
    slug: "state-psc-vs-upsc",
    searches: "1,200/month",
    description: "State officer vs national administrator - scope and difficulty",
  },
  {
    title: "GATE vs Civil Service",
    slug: "gate-vs-civil-service",
    searches: "950/month",
    description: "Engineering PSU jobs (GATE) vs government administrative roles",
  },
];

export default function ComparisonsPage() {
  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Comparisons", path: "/comparisons" },
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
        <h1 className="text-4xl font-bold mb-4">Government Exam Comparisons</h1>
        <p className="text-xl text-gray-600 mb-12">
          Compare different government exams to find the best path for your career. Understand difficulty, salary potential, and career scope.
        </p>

        <div className="grid gap-6">
          {comparisons.map((comparison) => (
            <Link
              key={comparison.slug}
              href={`/comparisons/${comparison.slug}/`}
              className="block p-6 border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-2xl font-bold text-blue-600 hover:underline">
                  {comparison.title}
                </h2>
                <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded">
                  {comparison.searches}
                </span>
              </div>
              <p className="text-gray-600">{comparison.description}</p>
            </Link>
          ))}
        </div>

        <section className="mt-16 pt-8 border-t">
          <h2 className="text-2xl font-bold mb-6">Why Compare Exams?</h2>
          <p className="text-gray-700 mb-4">
            Choosing the right government exam is one of the most important decisions for your career. Each exam has:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li><strong>Different difficulty levels</strong> - UPSC (0.1% pass rate) vs SSC (5-10% pass rate)</li>
            <li><strong>Varying salaries</strong> - Entry salary ₹21,000 to ₹56,100+ depending on exam</li>
            <li><strong>Different career scopes</strong> - Administrative roles vs technical roles vs banking</li>
            <li><strong>Distinct preparation time</strong> - 6 months to 24 months depending on exam</li>
            <li><strong>Unique job security</strong> - Constitutional positions vs permanent government jobs</li>
          </ul>
          <p className="text-gray-700">
            Use our detailed comparisons to understand which exam aligns with your goals, capabilities, and timeline.
          </p>
        </section>

        {/* Cross-Hub Navigation */}
        <section className="mt-16 pt-8 border-t">
          <h2 className="text-2xl font-bold mb-8">Related Government Job Resources</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <Link
              href="/qualifications"
              className="block p-6 border border-indigo-200 rounded-lg hover:shadow-lg hover:bg-indigo-50 transition-all"
            >
              <h3 className="text-xl font-bold text-indigo-600 mb-2">By Qualification</h3>
              <p className="text-gray-600">Find which exams match your education level and career interests</p>
            </Link>
            <Link
              href="/salary-guides"
              className="block p-6 border border-green-200 rounded-lg hover:shadow-lg hover:bg-green-50 transition-all"
            >
              <h3 className="text-xl font-bold text-green-600 mb-2">Salary Guides</h3>
              <p className="text-gray-600">Compare salary potential and career earnings for each exam path</p>
            </Link>
          </div>
        </section>

        {/* FAQ Section */}
        <HubFAQ
          title="Government Exam Comparison Questions"
          items={[
            {
              question: "Which government exam is the easiest to crack?",
              answer: "SSC (Staff Selection Commission) exams like CHSL and CGL have the easiest pass rate (5-10%) among major exams. Railway Group D is also relatively easier with moderate competition. UPSC (0.1% pass rate) is the hardest. Difficulty depends on your preparation and competition levels.",
            },
            {
              question: "Which exam has the highest salary potential?",
              answer: "UPSC (IAS/IFS) offers the highest peak salary (₹200,000+/month). GATE exam for PSU jobs offers ₹80,000-₹100,000/month. SSC reaches maximum ₹75,000/month. IFS (through UPSC) offers international postings with additional allowances.",
            },
            {
              question: "Should I take UPSC or SSC?",
              answer: "Take UPSC if you're exceptional academically, can study 18-24 months, and want administrative power. Choose SSC if you want a government job within 1 year, prefer stability over risk, and are a good (but not exceptional) student. Both are secure, but UPSC has higher ceiling.",
            },
            {
              question: "What's the pass rate for each major government exam?",
              answer: "UPSC: 0.05-0.1% (1 in 1,000 candidates), SSC CGL: 5-10%, SSC CHSL: 8-12%, Railway Group D: 10-15%, Banking: 3-5%, GATE: 15-20%. The lower the pass rate, the more difficult the exam.",
            },
            {
              question: "How long should I prepare for each government exam?",
              answer: "UPSC requires 18-24 months (or longer for first attempt). SSC/CGL requires 6-12 months. Railway Group D requires 3-6 months. GATE requires 6-9 months. Banking exams require 4-6 months. Longer preparation time increases success probability but requires discipline.",
            },
            {
              question: "Can I attempt multiple exams while preparing for one?",
              answer: "Yes, many candidates prepare for SSC while attempting UPSC simultaneously (they have different timelines). However, UPSC alone requires full focus. Recommended strategy: Prepare for SSC (shorter timeline), crack it, and continue UPSC preparation if still interested in administrative career.",
            },
            {
              question: "What is the age limit for different government exams?",
              answer: "UPSC: 21-32 years (relaxations available), SSC: 18-30 years, Railway: 18-33 years, GATE: No upper age limit, Banking: 21-30 years. Age limits have relaxations for reserved categories and state candidates.",
            },
            {
              question: "Is there a guarantee of getting a job after passing any exam?",
              answer: "Passing the exam qualifies you to apply for positions, but doesn't guarantee a job. Final selection depends on merit rank, document verification, and vacancy positions. UPSC ranks 1,000 annually but offers 1,000+ positions across services. SSC has larger selection pools.",
            },
            {
              question: "Can I choose my posting location after passing the exam?",
              answer: "Location choice is limited and merit-based. UPSC officers get their preferred state cadre after all selections. SSC employees are posted based on merit rank and vacancy. Railways can transfer across regions. First posting is usually based on all-India demand.",
            },
            {
              question: "What happens if I don't pass an exam after many attempts?",
              answer: "You can attempt most exams multiple times (age limit applies). Many successful officers took 3-5 attempts. Each attempt provides learning and refinement. Some exams have unlimited attempts (UPSC till age limit), while banking exams have limited attempts.",
            },
          ]}
        />
      </div>
    </main>
    </>
  );
}
