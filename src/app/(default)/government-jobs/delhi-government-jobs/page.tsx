/**
 * Delhi Government Jobs Page
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbSchema, buildFAQSchema, jsonLdGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Delhi Government Jobs 2025 | UPSC, DSSSB, SSC, Delhi PSC Recruitment",
  description: "Delhi government jobs, UPSC (CSE cadre), DSSSB teacher/clerk, Delhi Police, MCD recruitment. Salary, exam details, eligibility for Delhi-based government positions.",
  ...pageSeo(`${SITE_URL}/government-jobs/delhi-government-jobs`, { index: true }),
};

const pageContent = {
  title: "Government Jobs in Delhi",
  sections: [
    {
      id: "intro",
      title: "Government Job Opportunities in Delhi",
      content: (
        <div className="space-y-4">
          <p>Delhi offers the highest concentration of government jobs in India. Being the capital, all central government offices, courts, commissions, and ministries are headquartered here. Plus unique state/UT opportunities through DSSSB, MCD, DJB, and Delhi-specific recruitment.</p>
          <p>Whether UPSC Civil Service, SSC, DSSSB, Delhi Police, or autonomous bodies, Delhi is the epicenter for government careers.</p>
        </div>
      ),
    },
    {
      id: "exams",
      title: "Government Exams for Delhi-Based Jobs",
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-600">
            <h3 className="font-bold text-lg mb-2">UPSC Civil Service (IAS, IFS)</h3>
            <p className="text-sm">Most prestigious. IAS (IAS) officers are DCOs (Deputy Chief Minister equivalent) and run districts. IFS for Indian Foreign Service.</p>
            <p className="text-sm mt-2"><strong>Salary:</strong> ₹56,100-250,000+/month | <strong>Difficulty:</strong> Extremely High (0.1%)</p>
          </div>

          <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-600">
            <h3 className="font-bold text-lg mb-2">DSSSB (Delhi Subordinate Services)</h3>
            <p className="text-sm">Teacher, clerk, sub-inspector, accountant in Delhi schools, police, municipalities. Largest Delhi-specific recruitment.</p>
            <p className="text-sm mt-2"><strong>Salary:</strong> ₹25,000-50,000/month | <strong>Vacancies:</strong> 10,000+/year</p>
          </div>

          <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-600">
            <h3 className="font-bold text-lg mb-2">Delhi Police</h3>
            <p className="text-sm">Constable, SI (Sub-Inspector), ASI. High-demand recruitment in Delhi.</p>
            <p className="text-sm mt-2"><strong>Salary:</strong> ₹21,000-40,000/month | <strong>Selection Rate:</strong> 5-10%</p>
          </div>

          <div className="bg-amber-50 p-6 rounded-lg border-l-4 border-amber-600">
            <h3 className="font-bold text-lg mb-2">SSC (Central Exams)</h3>
            <p className="text-sm">SSC CGL, CHSL, JE for all-India recruitment. Candidates in Delhi compete but can get posted across India.</p>
            <p className="text-sm mt-2"><strong>Salary:</strong> ₹22,000-45,000/month | <strong>Vacancies:</strong> High</p>
          </div>

          <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-600">
            <h3 className="font-bold text-lg mb-2">Delhi Jal Board (DJB) & MCD</h3>
            <p className="text-sm">Municipal Corporation of Delhi and Water Board recruitment for engineers, technicians, workers.</p>
            <p className="text-sm mt-2"><strong>Salary:</strong> ₹20,000-60,000/month | <strong>Frequency:</strong> Regular</p>
          </div>
        </div>
      ),
    },
    {
      id: "location-advantage",
      title: "Why Delhi for Government Jobs?",
      content: (
        <div className="space-y-4">
          <ul className="list-disc pl-6 space-y-2 text-sm">
            <li><strong>Highest Salaries:</strong> Delhi-based positions often pay highest allowances (HRA, DA)</li>
            <li><strong>Career Hub:</strong> All ministries, commission headquarters based in Delhi</li>
            <li><strong>Promotion Opportunities:</strong> Large cadre size means more senior positions available</li>
            <li><strong>Competitive Environment:</strong> Best preparation resources, coaching, libraries</li>
            <li><strong>Living Cost:</strong> Higher but salaries compensate adequately</li>
          </ul>
        </div>
      ),
    },
  ],
  faqs: [
    {
      question: "Can non-Delhi residents apply for Delhi government jobs?",
      answer: "Yes, absolutely. Most central exams (UPSC, SSC) are open to all Indians. DSSSB and state exams may have domicile requirements. Check specific notification.",
    },
    {
      question: "Is Delhi posting guaranteed in SSC?",
      answer: "No. SSC posts candidates across India based on preference and merit. Many get posted outside Delhi even if they applied from Delhi.",
    },
    {
      question: "What's the best exam for Delhi-based jobs?",
      answer: "DSSSB for maximum Delhi-specific vacancies. SSC/UPSC for all-India opportunities. Delhi Police if interested in law enforcement.",
    },
    {
      question: "Do I need to be Delhi resident for DSSSB?",
      answer: "DSSSB doesn't require domicile anymore. Anyone can apply. Preference given to Delhi residents in some reservations, but open to all qualified candidates.",
    },
  ],
};

export default function DelhiGovernmentJobsPage() {
  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Government Jobs", path: "/government-jobs" },
      { name: "Delhi Government Jobs", path: "/government-jobs/delhi-government-jobs" },
    ]),
    buildFAQSchema(pageContent.faqs),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">{pageContent.title}</h1>

        {pageContent.sections.map((section) => (
          <section key={section.id} id={section.id} className="mb-12">
            <h2 className="text-2xl font-bold mb-4 border-b-2 border-blue-600 pb-2">{section.title}</h2>
            <div className="prose prose-lg max-w-none">
              {section.content}
            </div>
          </section>
        ))}

        {/* FAQs */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6 border-b-2 border-blue-600 pb-2">FAQs</h2>
          <div className="space-y-4">
            {pageContent.faqs.map((faq, idx) => (
              <details key={idx} className="bg-gray-100 rounded-lg p-4 cursor-pointer">
                <summary className="font-semibold">{faq.question}</summary>
                <p className="mt-3 text-sm text-gray-700">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
