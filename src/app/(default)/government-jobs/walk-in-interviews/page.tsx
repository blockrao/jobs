import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbSchema, buildFAQSchema, jsonLdGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Government Jobs Walk-In Interviews | Immediate Government Recruitment",
  description: "Government walk-in interview jobs. Current openings, how to prepare, eligibility, and tips. Get government job without exam.",
  ...pageSeo(`${SITE_URL}/government-jobs/walk-in-interviews`, { index: true }),
};

const faqs = [
  {
    question: "What are government walk-in interviews?",
    answer: "Walk-in means you can directly appear for interview without prior online application. You just show up on the specified date with required documents.",
  },
  {
    question: "Are walk-in government jobs permanent?",
    answer: "Usually temporary/contract (6-12 months). Some convert to permanent after performance. Read notification for exact terms.",
  },
  {
    question: "How do I find government walk-in opportunities?",
    answer: "Check official websites of government departments, Ministry of Personnel & Public Grievances (DOPT), individual organization websites, and job portals daily.",
  },
  {
    question: "What should I bring to walk-in interview?",
    answer: "Original certificates (education, birth, caste), ID proof, resume, admit card (if provided), and any specific documents mentioned in notification.",
  },
];

export default function WalkInInterviewsPage() {
  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Government Jobs", path: "/government-jobs" },
      { name: "Walk-In Interviews", path: "/government-jobs/walk-in-interviews" },
    ]),
    buildFAQSchema(faqs),
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Government Walk-In Interview Jobs</h1>
        
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-purple-600 pb-2">What Are Walk-In Interviews?</h2>
          <p className="mb-4">Walk-in interviews are recruitment drives where candidates can appear directly without prior online application. Government offices announce a specific date, time, and location. You show up with documents and appear for interview on the spot.</p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-purple-600 pb-2">Where to Find Government Walk-In Opportunities</h2>
          <div className="space-y-3">
            <div className="bg-blue-50 p-4 rounded">
              <p className="font-semibold text-sm">Official Government Portals</p>
              <p className="text-sm">UPSC website, SSC website, Ministry websites, State Government employment portals</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <p className="font-semibold text-sm">Individual Organization Websites</p>
              <p className="text-sm">DRDO, CSIR, ISRO, Railways, Banks post walk-in notifications regularly</p>
            </div>
            <div className="bg-purple-50 p-4 rounded">
              <p className="font-semibold text-sm">Job Portals</p>
              <p className="text-sm">Check daily. Walk-in opportunities fill within hours sometimes.</p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-purple-600 pb-2">Walk-In Interview Preparation</h2>
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Before the Interview Day</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Read notification completely 2-3 times</li>
                <li>Prepare documents list (no rushing on interview day)</li>
                <li>Practice typical government interview questions</li>
                <li>Get comfortable clothes ready</li>
                <li>Plan route and timing to reach early</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">On Interview Day</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Reach 30 minutes early (waiting is common)</li>
                <li>Carry original + photocopy of all documents</li>
                <li>Dress professionally (formal attire)</li>
                <li>Turn off phone, keep only essentials</li>
                <li>Be confident and clear in answers</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-purple-600 pb-2">Common Walk-In Positions</h2>
          <ul className="list-disc pl-6 text-sm space-y-2">
            <li><strong>Research Scientist (CSIR, DRDO):</strong> ₹35,000-60,000/month</li>
            <li><strong>Technical Officer (Government Labs):</strong> ₹25,000-40,000/month</li>
            <li><strong>Contract Faculty (Government Colleges):</strong> ₹20,000-35,000/month</li>
            <li><strong>Project Consultant (Ministries):</strong> ₹30,000-80,000/month</li>
            <li><strong>Temporary Assistant (Government Offices):</strong> ₹18,000-25,000/month</li>
          </ul>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-purple-600 pb-2">FAQs</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details key={idx} className="bg-gray-100 rounded-lg p-4 cursor-pointer">
                <summary className="font-semibold">{faq.question}</summary>
                <p className="mt-2 text-sm text-gray-700">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
