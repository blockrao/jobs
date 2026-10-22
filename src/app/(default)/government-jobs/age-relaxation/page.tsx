/**
 * Government Jobs Age Relaxation Page
 *
 * Keyword Target: "Government jobs age relaxation" (950 searches/month)
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbSchema, buildFAQSchema, jsonLdGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Government Jobs Age Relaxation | SC/ST/OBC/PWD Category Wise Relaxation",
  description:
    "Age relaxation for government jobs by category. SC (5 years), ST (5 years), OBC (3 years), PWD (10 years), ex-servicemen (5-10 years). Claim age relaxation benefits.",
  ...pageSeo(`${SITE_URL}/government-jobs/age-relaxation`, { index: true }),
};

const pageContent = {
  title: "Government Jobs Age Relaxation by Category",
  sections: [
    {
      id: "overview",
      title: "Age Relaxation in Government Exams",
      content: (
        <div className="space-y-4">
          <p>
            Government exams provide age relaxation for certain categories to ensure equal opportunity. If you belong to SC/ST/OBC/PWD or are an ex-serviceman, you get additional years added to the upper age limit.
          </p>
          <p>
            This relaxation varies by exam and category. Understanding your eligibility is crucial for planning which exams you can attempt.
          </p>
        </div>
      ),
    },
    {
      id: "category-wise",
      title: "Age Relaxation by Category (Exam-wise)",
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-600">
            <h3 className="font-bold text-lg mb-3">SC (Scheduled Caste)</h3>
            <p className="text-sm mb-2"><strong>Standard Relaxation:</strong> 5 years</p>
            <table className="text-sm w-full">
              <tbody>
                <tr className="border-b">
                  <td className="py-1">UPSC Civil Service</td>
                  <td className="font-semibold">5 years (37 years total)</td>
                </tr>
                <tr className="border-b">
                  <td className="py-1">SSC CGL</td>
                  <td className="font-semibold">5 years (37 years total)</td>
                </tr>
                <tr>
                  <td className="py-1">Most Central Exams</td>
                  <td className="font-semibold">5 years relaxation</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-600">
            <h3 className="font-bold text-lg mb-3">ST (Scheduled Tribe)</h3>
            <p className="text-sm mb-2"><strong>Standard Relaxation:</strong> 5 years (same as SC)</p>
            <p className="text-sm">Most exams provide identical relaxation to both SC and ST categories.</p>
          </div>

          <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-600">
            <h3 className="font-bold text-lg mb-3">OBC (Other Backward Classes)</h3>
            <p className="text-sm mb-2"><strong>Standard Relaxation:</strong> 3 years</p>
            <table className="text-sm w-full">
              <tbody>
                <tr className="border-b">
                  <td className="py-1">UPSC Civil Service</td>
                  <td className="font-semibold">3 years (35 years total)</td>
                </tr>
                <tr className="border-b">
                  <td className="py-1">SSC Exams</td>
                  <td className="font-semibold">3 years</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 p-6 rounded-lg border-l-4 border-amber-600">
            <h3 className="font-bold text-lg mb-3">PWD (Person With Disability)</h3>
            <p className="text-sm mb-2"><strong>Standard Relaxation:</strong> 10 years</p>
            <p className="text-sm"><strong>Note:</strong> PWD relaxation is the highest and applies across almost all exams. Recognized disabilities include physical, visual, hearing, and locomotor disabilities.</p>
          </div>
        </div>
      ),
    },
    {
      id: "ex-servicemen",
      title: "Age Relaxation for Ex-Servicemen",
      content: (
        <div className="space-y-4">
          <p className="font-semibold">Ex-servicemen get additional age relaxation:</p>
          <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-600">
            <p className="text-sm mb-2"><strong>Ex-Servicemen (ES):</strong> 5 years relaxation</p>
            <p className="text-sm mb-2"><strong>Commissioned Officers from Defence Service (DOS):</strong> 10 years relaxation</p>
            <p className="text-sm"><strong>Note:</strong> Maximum age limit can go beyond 50 for DOS category in some exams.</p>
          </div>
        </div>
      ),
    },
    {
      id: "how-to-claim",
      title: "How to Claim Age Relaxation",
      content: (
        <div className="space-y-4">
          <ol className="list-decimal pl-6 space-y-3">
            <li>
              <strong>Verify Category Eligibility:</strong> Check your community certificate (for SC/ST/OBC) or disability certificate (for PWD)
            </li>
            <li>
              <strong>Check Exam Notification:</strong> Read the official age limit clause in exam notification
            </li>
            <li>
              <strong>Mention in Application:</strong> Clearly mention your category during online registration
            </li>
            <li>
              <strong>Upload Proof:</strong> Attach community/disability certificate as per exam requirement
            </li>
            <li>
              <strong>Verification:</strong> During interview/document verification, present original certificates
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: "combined-relaxation",
      title: "Can I Combine Multiple Relaxations?",
      content: (
        <div className="space-y-4">
          <p className="font-semibold mb-2">This is a common question. Answer varies:</p>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm mb-2"><strong>Generally:</strong> You get ONE relaxation (the highest applicable to you)</p>
            <p className="text-sm mb-2">Example: If you're both OBC (3 years) and PWD (10 years), you get 10 years relaxation, not 13.</p>
            <p className="text-sm"><strong>Exception:</strong> Some states or specific exams may have cumulative relaxation. Always check notification.</p>
          </div>
        </div>
      ),
    },
  ],
  faqs: [
    {
      question: "Can I use age relaxation for any government exam?",
      answer:
        "Not all exams offer age relaxation for all categories. Central exams (UPSC, SSC, Railway) typically offer SC/ST (5 years), OBC (3 years), PWD (10 years). Always verify specific exam notification.",
    },
    {
      question: "How do I prove I'm eligible for age relaxation?",
      answer:
        "You need official community/caste certificate from your district administration (for SC/ST/OBC) or medical certificate from authorized physician (for PWD). Upload during registration and present during verification.",
    },
    {
      question: "If I'm OBC but the exam is over, can I still apply with relaxation?",
      answer:
        "No. Age relaxation means the upper age limit is increased. If the increased limit is also crossed, you're ineligible. Plan your applications considering the relaxed age limit.",
    },
    {
      question: "Does age relaxation apply to interview selection criteria?",
      answer:
        "No. Age relaxation is only for written exam eligibility. In interviews and selection, candidates are judged equally. Your age doesn't give marks advantage in interviews.",
    },
    {
      question: "Can I claim EWS (Economically Weaker Section) relaxation?",
      answer:
        "EWS is a separate category introduced in 2019. Generally, EWS doesn't come with age relaxation for most exams. Check specific exam notification for clarity.",
    },
  ],
};

export default function AgeRelaxationPage() {
  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Government Jobs", path: "/government-jobs" },
      { name: "Age Relaxation", path: "/government-jobs/age-relaxation" },
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
        <nav className="text-sm text-gray-600 mb-4">
          <a href="/" className="hover:underline">Home</a> / <a href="/government-jobs" className="hover:underline">Government Jobs</a> / <span>{pageContent.title}</span>
        </nav>

        <h1 className="text-4xl font-bold mb-6">{pageContent.title}</h1>

        {pageContent.sections.map((section) => (
          <section key={section.id} id={section.id} className="mb-12">
            <h2 className="text-2xl font-bold mb-4 border-b-2 border-purple-600 pb-2">{section.title}</h2>
            <div className="prose prose-lg max-w-none">
              {section.content}
            </div>
          </section>
        ))}

        {/* FAQs */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6 border-b-2 border-purple-600 pb-2">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {pageContent.faqs.map((faq, idx) => (
              <details key={idx} className="bg-gray-100 rounded-lg p-4 cursor-pointer hover:bg-gray-200">
                <summary className="font-semibold">{faq.question}</summary>
                <p className="mt-3 text-gray-700">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
