import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbSchema, buildFAQSchema, jsonLdGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Government Jobs Without Exam | Direct Recruitment, Sports Quota, PWD Jobs",
  description: "Government jobs without exam requirement. Direct recruitment, walk-in, sports quota, disability quota, lateral entry. Alternative paths to government jobs.",
  ...pageSeo(`${SITE_URL}/government-jobs/no-exam-required`, { index: true }),
};

const faqs = [
  {
    question: "What government jobs don't require exams?",
    answer: "Direct recruitment (non-gazetted posts), walk-in interviews, sports quota, disability quota, defense service lateral entry. Each has specific eligibility.",
  },
  {
    question: "Is direct recruitment easier than competitive exams?",
    answer: "Different criteria. Direct recruitment has document verification and interview. No competition at written exam stage, but interview is more rigorous.",
  },
  {
    question: "Can I apply for sports quota if I'm not a professional athlete?",
    answer: "Sports quota is for exceptional athletes with national/state level recognition. Requires proof of achievements. Very limited vacancies (2-5% of total).",
  },
];

export default function NoExamRequiredPage() {
  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Government Jobs", path: "/government-jobs" },
      { name: "Jobs Without Exam", path: "/government-jobs/no-exam-required" },
    ]),
    buildFAQSchema(faqs),
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Government Jobs Without Exam Requirement</h1>
        
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-blue-600 pb-2">Alternative Paths to Government Jobs</h2>
          
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-600">
              <h3 className="font-bold text-lg mb-2">Direct Recruitment (Non-Gazetted Posts)</h3>
              <p className="text-sm">Government offices hire for non-officer positions (clerk, assistant, staff) through direct recruitment. Merit-based selection on education and interview.</p>
              <p className="text-sm mt-2"><strong>Salary:</strong> ₹20,000-35,000/month | <strong>Process:</strong> Document verification → Interview</p>
            </div>

            <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-600">
              <h3 className="font-bold text-lg mb-2">Sports Quota / Sports Category</h3>
              <p className="text-sm">Government reserves 2-5% positions for athletes with national/state level achievements. Open in IAS, IPS, and group B/C positions.</p>
              <p className="text-sm mt-2"><strong>Requirements:</strong> National/state championship medal, fitness certificate | <strong>Selection:</strong> Interview only, no written exam</p>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-600">
              <h3 className="font-bold text-lg mb-2">PWD (Person With Disability) Quota</h3>
              <p className="text-sm">4% government positions reserved for PWD candidates. Disability certificate from recognized medical authority required.</p>
              <p className="text-sm mt-2"><strong>Benefits:</strong> Relaxed eligibility, sometimes optional written exam, special interview provisions</p>
            </div>

            <div className="bg-amber-50 p-6 rounded-lg border-l-4 border-amber-600">
              <h3 className="font-bold text-lg mb-2">Walk-In Interviews / Recruitment Drives</h3>
              <p className="text-sm">Government organizations occasionally conduct walk-in recruitment for contract/temporary positions. No prior application needed.</p>
              <p className="text-sm mt-2"><strong>Duration:</strong> Temporary (6-12 months usually) | <strong>Salary:</strong> ₹18,000-30,000/month</p>
            </div>

            <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-600">
              <h3 className="font-bold text-lg mb-2">Lateral Entry / Direct Entry to Group B</h3>
              <p className="text-sm">Professionals with 10+ years experience in private sector can apply directly for senior positions without exam. Common in PSU, banking.</p>
              <p className="text-sm mt-2"><strong>Eligibility:</strong> 10+ years experience + relevant qualifications | <strong>Salary:</strong> ₹60,000-100,000/month</p>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-blue-600 pb-2">Pros & Cons of Exam-Free Paths</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Advantages</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>No written exam stress</li>
                <li>Shorter selection timeline</li>
                <li>Direct interview (your strength)</li>
                <li>Less competition</li>
              </ul>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Disadvantages</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Lower positions (group C/D)</li>
                <li>Fewer vacancies available</li>
                <li>Limited career growth</li>
                <li>Less job security (contract roles)</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-blue-600 pb-2">FAQs</h2>
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
