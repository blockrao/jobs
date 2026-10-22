/**
 * Qualification Hub Page Template
 *
 * Reusable template for all qualification hub pages
 * (B.Tech, MBA, B.Com, M.Sc, etc.)
 *
 * Structure:
 * 1. Hero section with quick facts
 * 2. Table of contents
 * 3. Main content sections
 * 4. Related jobs widget
 * 5. FAQ section
 * 6. Related content
 * 7. Dynamic job notifications
 */

import type { ReactNode } from "react";
import FAQPageSchema from "@/components/structured-data/faqpage-schema";

interface QualificationHubProps {
  title: string; // "B.Tech Government Jobs"
  qualification: string; // "B.Tech"
  heroDescription: string; // 50-word introduction
  quickFacts: {
    avgSalary: string; // "₹35,000-45,000"
    topRecruiters: string[]; // ["ISRO", "DRDO", "IIT"]
    topExams: string[]; // ["GATE", "UPSC", "SSC"]
    jobCount: number; // Number of current openings
  };
  sections: Array<{
    id: string;
    title: string;
    content: ReactNode;
  }>;
  relatedJobs: Array<{
    title: string;
    recruitmentSlug: string;
    postSlug: string;
    vacancies: number;
    deadline: string;
  }>;
  relatedQualifications: Array<{
    title: string;
    slug: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

export default function QualificationHubTemplate({
  title,
  qualification,
  heroDescription,
  quickFacts,
  sections,
  relatedJobs,
  relatedQualifications,
  faqs,
}: QualificationHubProps) {
  return (
    <>
      {/* Schema Markup */}
      <FAQPageSchema faqs={faqs} />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-8 mb-8">
        <h1 className="text-4xl font-bold mb-4 text-blue-900">{title}</h1>
        <p className="text-lg text-blue-800 mb-6">{heroDescription}</p>

        {/* Quick Facts Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded p-4">
            <div className="text-xs text-gray-600 font-semibold">AVG SALARY</div>
            <div className="text-xl font-bold text-blue-600">{quickFacts.avgSalary}</div>
            <div className="text-xs text-gray-500">Per Month</div>
          </div>

          <div className="bg-white rounded p-4">
            <div className="text-xs text-gray-600 font-semibold">CURRENT JOBS</div>
            <div className="text-xl font-bold text-blue-600">{quickFacts.jobCount}+</div>
            <div className="text-xs text-gray-500">Openings</div>
          </div>

          <div className="bg-white rounded p-4">
            <div className="text-xs text-gray-600 font-semibold">TOP EXAMS</div>
            <div className="text-sm font-bold text-blue-600">{quickFacts.topExams.slice(0, 2).join(", ")}</div>
            <div className="text-xs text-gray-500">And more</div>
          </div>

          <div className="bg-white rounded p-4">
            <div className="text-xs text-gray-600 font-semibold">TOP RECRUITERS</div>
            <div className="text-sm font-bold text-blue-600">{quickFacts.topRecruiters.slice(0, 2).join(", ")}</div>
            <div className="text-xs text-gray-500">And more</div>
          </div>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="bg-gray-50 rounded p-6 mb-8">
        <h2 className="font-bold mb-4">Quick Navigation</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-blue-600 hover:underline"
              >
                {section.title}
              </a>
            </li>
          ))}
          <li>
            <a href="#faq" className="text-blue-600 hover:underline">
              Frequently Asked Questions
            </a>
          </li>
        </ul>
      </section>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="mb-8">
              <h2 className="text-2xl font-bold mb-4 border-b-2 border-blue-600 pb-2">
                {section.title}
              </h2>
              <div className="prose prose-sm max-w-none">
                {section.content}
              </div>
            </section>
          ))}

          {/* FAQ Section */}
          <section id="faq" className="mt-12">
            <h2 className="text-2xl font-bold mb-6 border-b-2 border-blue-600 pb-2">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <details key={index} className="bg-gray-50 rounded p-4 cursor-pointer hover:bg-gray-100">
                  <summary className="font-semibold text-gray-900">
                    {faq.question}
                  </summary>
                  <p className="mt-3 text-gray-700">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Related Jobs Widget */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6 sticky top-24">
            <h3 className="font-bold mb-4 text-lg">Related Job Openings</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {relatedJobs.slice(0, 5).map((job, idx) => (
                <a
                  key={idx}
                  href={`/jobs/${job.recruitmentSlug}/${job.postSlug}`}
                  className="block p-3 bg-white rounded border border-blue-200 hover:border-blue-600 hover:shadow-md transition"
                >
                  <div className="font-semibold text-sm text-blue-900 line-clamp-2">
                    {job.title}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {job.vacancies} Vacancies • Apply by {job.deadline}
                  </div>
                </a>
              ))}
            </div>
            <a
              href={`/jobs?qualification=${qualification}`}
              className="block mt-4 text-center bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700"
            >
              View All {qualification} Jobs
            </a>
          </div>

          {/* Related Qualifications */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-bold mb-4">Related Qualifications</h3>
            <div className="space-y-2">
              {relatedQualifications.map((qual, idx) => (
                <a
                  key={idx}
                  href={`/qualifications/${qual.slug}`}
                  className="block text-blue-600 hover:underline text-sm"
                >
                  → {qual.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Latest Notifications */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-6 border-b-2 border-blue-600 pb-2">
          Latest Job Notifications for {qualification}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {relatedJobs.map((job, idx) => (
            <a
              key={idx}
              href={`/jobs/${job.recruitmentSlug}/${job.postSlug}`}
              className="block p-4 border rounded-lg hover:shadow-lg hover:border-blue-600 transition"
            >
              <h3 className="font-semibold text-blue-900 mb-2">{job.title}</h3>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{job.vacancies} Vacancies</span>
                <span>Apply by {job.deadline}</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
