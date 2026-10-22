/**
 * Comparison Page Template
 *
 * Reusable template for comparison pages
 * (UPSC vs SSC, IBPS vs SBI, Railway vs UPSC, etc.)
 */

import type { ReactNode } from "react";

interface ComparisonPageProps {
  title: string;
  exam1: {
    name: string;
    description: string;
  };
  exam2: {
    name: string;
    description: string;
  };
  comparisonTable: Array<{
    aspect: string;
    exam1Value?: string;
    exam2Value?: string;
    exam1?: string;
    exam2?: string;
  }>;
  sections: Array<{
    id: string;
    title: string;
    content: ReactNode;
  }>;
  whichShouldYouChoose: ReactNode;
  relatedPages: Array<{
    title: string;
    slug: string;
    type: "qualification" | "comparison" | "salary";
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

export default function ComparisonPageTemplate({
  title,
  exam1,
  exam2,
  comparisonTable,
  sections,
  whichShouldYouChoose,
  relatedPages,
  faqs,
}: ComparisonPageProps) {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-50 to-pink-100 rounded-lg p-8 mb-8">
        <h1 className="text-4xl font-bold mb-4 text-purple-900">{title}</h1>
        <p className="text-lg text-purple-800 mb-6">
          A comprehensive comparison to help you choose the right path for your government job career.
        </p>
      </section>

      {/* Quick Comparison Table */}
      <section className="mb-8 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-purple-100">
              <th className="border p-3 text-left font-bold">Aspect</th>
              <th className="border p-3 text-left font-bold">{exam1.name}</th>
              <th className="border p-3 text-left font-bold">{exam2.name}</th>
            </tr>
          </thead>
          <tbody>
            {comparisonTable.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                <td className="border p-3 font-semibold">{row.aspect}</td>
                <td className="border p-3">{row.exam1Value ?? row.exam1}</td>
                <td className="border p-3">{row.exam2Value ?? row.exam2}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Exam Details */}
          <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-600">
              <h2 className="text-xl font-bold mb-2 text-blue-900">{exam1.name}</h2>
              <p className="text-gray-700">{exam1.description}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-6 border-l-4 border-green-600">
              <h2 className="text-xl font-bold mb-2 text-green-900">{exam2.name}</h2>
              <p className="text-gray-700">{exam2.description}</p>
            </div>
          </section>

          {/* Content Sections */}
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="mb-8">
              <h2 className="text-2xl font-bold mb-4 border-b-2 border-purple-600 pb-2">
                {section.title}
              </h2>
              <div className="prose prose-sm max-w-none">
                {section.content}
              </div>
            </section>
          ))}

          {/* Which Should You Choose */}
          <section className="bg-amber-50 rounded-lg p-6 mb-8 border-l-4 border-amber-600">
            <h2 className="text-2xl font-bold mb-4 text-amber-900">Which Should You Choose?</h2>
            <div className="prose prose-sm max-w-none">
              {whichShouldYouChoose}
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-2xl font-bold mb-6 border-b-2 border-purple-600 pb-2">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <details key={idx} className="bg-gray-50 rounded p-4 cursor-pointer hover:bg-gray-100">
                  <summary className="font-semibold">{faq.question}</summary>
                  <p className="mt-3 text-gray-700">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div>
          <div className="bg-purple-50 rounded-lg p-6 sticky top-24">
            <h3 className="font-bold mb-4">Related Content</h3>
            <div className="space-y-2 text-sm">
              {relatedPages.map((page, idx) => (
                <a
                  key={idx}
                  href={
                    page.type === "qualification"
                      ? `/qualifications/${page.slug}`
                      : page.type === "comparison"
                      ? `/comparisons/${page.slug}`
                      : `/salary-guides/${page.slug}`
                  }
                  className="block text-blue-600 hover:underline p-2 bg-white rounded"
                >
                  {page.type === "qualification" && "👨‍🎓 "}
                  {page.type === "comparison" && "⚖️ "}
                  {page.type === "salary" && "💰 "}
                  {page.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
