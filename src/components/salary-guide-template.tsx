/**
 * Salary Guide Page Template
 *
 * Reusable template for salary guide pages
 * (Government Job Salary by Grade, Highest Paying Jobs, etc.)
 */

import type { ReactNode } from "react";

interface SalaryGuideProps {
  title: string;
  description: string;
  sections: Array<{
    id: string;
    title: string;
    content: ReactNode;
  }>;
  salaryTable?: Array<{
    category: string;
    value: string;
  }>;
  relatedQualifications: Array<{
    title: string;
    slug: string;
  }>;
  relatedComparisons: Array<{
    title: string;
    slug: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

export default function SalaryGuideTemplate({
  title,
  description,
  sections,
  salaryTable,
  relatedQualifications,
  relatedComparisons,
  faqs,
}: SalaryGuideProps) {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-50 to-emerald-100 rounded-lg p-8 mb-8">
        <h1 className="text-4xl font-bold mb-4 text-green-900">{title}</h1>
        <p className="text-lg text-green-800">{description}</p>
      </section>

      {/* Table of Contents */}
      <section className="bg-gray-50 rounded p-6 mb-8">
        <h2 className="font-bold mb-4">Contents</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="text-blue-600 hover:underline">
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="mb-8">
              <h2 className="text-2xl font-bold mb-4 border-b-2 border-green-600 pb-2">
                {section.title}
              </h2>
              <div className="prose prose-sm max-w-none">
                {section.content}
              </div>
            </section>
          ))}

          {/* FAQ */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-6 border-b-2 border-green-600 pb-2">
              FAQs
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
          {/* Quick Reference */}
          {salaryTable && (
            <div className="bg-green-50 rounded-lg p-6 mb-6 sticky top-24">
              <h3 className="font-bold mb-4">Quick Reference</h3>
              <div className="space-y-2 text-sm">
                {salaryTable.map((item, idx) => (
                  <div key={idx} className="flex justify-between p-2 bg-white rounded">
                    <span className="font-semibold">{item.category}</span>
                    <span className="text-green-600 font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Qualifications */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-bold mb-4">By Qualification</h3>
            <div className="space-y-2 text-sm">
              {relatedQualifications.map((qual, idx) => (
                <a
                  key={idx}
                  href={`/qualifications/${qual.slug}`}
                  className="block text-blue-600 hover:underline"
                >
                  → {qual.title}
                </a>
              ))}
            </div>
          </div>

          {/* Related Comparisons */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-bold mb-4">Compare</h3>
            <div className="space-y-2 text-sm">
              {relatedComparisons.map((comp, idx) => (
                <a
                  key={idx}
                  href={`/comparisons/${comp.slug}`}
                  className="block text-blue-600 hover:underline"
                >
                  → {comp.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
