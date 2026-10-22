/**
 * Comparisons Hub Page
 * Lists all government exam comparisons
 */

import type { Metadata } from "next";
import Link from "next/link";
import { pageSeo } from "@/lib/seo";

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
  return (
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
      </div>
    </main>
  );
}
