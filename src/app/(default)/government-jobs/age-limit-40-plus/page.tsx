/**
 * Government Jobs for Age 40+ Page
 *
 * Keyword Target: "Government jobs for 40+ age" (800 searches/month)
 * Focus: Exams and positions open to candidates above 40 years
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbSchema, buildFAQSchema, jsonLdGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Government Jobs for 40+ Age Candidates | Exams Without Upper Age Limit",
  description:
    "Government jobs for age 40+. SSC, PSU, state exams, and positions with no upper age limit or 40+ relaxation. Career change opportunities for mature candidates.",
  ...pageSeo(`${SITE_URL}/government-jobs/age-limit-40-plus`, { index: true }),
};

const pageContent = {
  title: "Government Jobs for Candidates Age 40+ | Low Age Restrictions",
  sections: [
    {
      id: "intro",
      title: "Government Jobs Opportunities for Age 40+",
      content: (
        <div className="space-y-4">
          <p>
            Age should not stop your government job dreams. While some exams have upper age limits of 32, there are multiple government job avenues for candidates age 40 and above. These include SSC exams with higher age limits, PSU positions, state-level recruitments, and many others.
          </p>
          <p>
            Many government organizations actively recruit experienced professionals. Your work experience, maturity, and stability are valued. Some positions actually prefer candidates 40+ due to leadership capabilities needed.
          </p>
        </div>
      ),
    },
    {
      id: "exams-40plus",
      title: "Government Exams Open to Age 40+",
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-600">
            <h3 className="font-bold text-lg mb-2">SSC MTS (Multi-Tasking Staff)</h3>
            <p className="text-sm mb-2">Upper Age Limit: 40 years (with relaxation for reserved categories)</p>
            <p className="text-sm">
              <strong>Positions:</strong> MTS, Havaldar (Multi-Tasking), various ministry roles<br/>
              <strong>Salary:</strong> ₹21,000-25,000/month<br/>
              <strong>Search Volume:</strong> High demand across government offices
            </p>
          </div>

          <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-600">
            <h3 className="font-bold text-lg mb-2">Public Sector Undertakings (PSU)</h3>
            <p className="text-sm mb-2">Upper Age Limit: Varies 35-50+ depending on experience</p>
            <p className="text-sm">
              <strong>Organizations:</strong> NTPC, IOC, BHEL, GAIL, HAL, SAIL<br/>
              <strong>Salary:</strong> ₹35,000-60,000/month depending on position<br/>
              <strong>Requirements:</strong> Technical qualifications + experience valued
            </p>
          </div>

          <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-600">
            <h3 className="font-bold text-lang mb-2">State Government Exams</h3>
            <p className="text-sm mb-2">Upper Age Limit: Typically 45-50 years</p>
            <p className="text-sm">
              <strong>Scope:</strong> State PSC exams, state police, state departments<br/>
              <strong>Salary:</strong> ₹25,000-50,000/month<br/>
              <strong>Advantage:</strong> Higher age limits, local opportunities
            </p>
          </div>

          <div className="bg-amber-50 p-6 rounded-lg border-l-4 border-amber-600">
            <h3 className="font-bold text-lg mb-2">Central Departmental Exams</h3>
            <p className="text-sm mb-2">Upper Age Limit: 40-50 years depending on exam</p>
            <p className="text-sm">
              <strong>Examples:</strong> Postal, Railways (group D/C), CDS (for specific roles)<br/>
              <strong>Salary:</strong> ₹20,000-45,000/month<br/>
              <strong>Note:</strong> Check specific exam notification for age limit
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "sector-opportunities",
      title: "Best Sectors for 40+ Candidates",
      content: (
        <div className="space-y-4">
          <p>
            Certain government sectors actively prefer or welcome candidates above 40 years:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Public Sector Banks:</strong> Officer positions, management roles (age 40-50 common for lateral entry)
            </li>
            <li>
              <strong>Insurance Corporations:</strong> LIC, GIC - officer and management cadre positions
            </li>
            <li>
              <strong>Railways:</strong> Contract positions, specialist roles don't have strict age limits
            </li>
            <li>
              <strong>Defense Organizations:</strong> Technical positions in DRDO, BEL, etc. value experience
            </li>
            <li>
              <strong>State PSUs:</strong> Often more flexible age limits than central positions
            </li>
            <li>
              <strong>Autonomous Bodies:</strong> Various government councils and boards value mature professionals
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "career-change",
      title: "Career Change After 40: Planning Your Transition",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Realistic Expectations</h3>
          <p>
            It's absolutely possible to switch to government jobs at 40+. Here's what to expect:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Preparation Time:</strong> 3-6 months for SSC exams (shorter than younger candidate norms due to experience)
            </li>
            <li>
              <strong>Competition:</strong> Less intense for 40+ exams compared to civil service (SSC CGL, UPSC)
            </li>
            <li>
              <strong>Advantages:</strong> Your work experience counts; stability and discipline are strengths
            </li>
            <li>
              <strong>Salary Reset:</strong> Expect to restart at entry salary, but your maturity can lead to faster promotions
            </li>
          </ul>

          <h3 className="font-bold text-lg mt-4">Step-by-Step Plan</h3>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Identify exams within your age limit (check specific notification)</li>
            <li>Assess qualification requirements (10th, 12th, or graduate level)</li>
            <li>Dedicate 3-6 months focused preparation</li>
            <li>Apply to all matching notifications simultaneously</li>
            <li>Prepare for interviews (your experience becomes an advantage)</li>
            <li>Once selected, focus on becoming essential in first 2 years</li>
          </ol>
        </div>
      ),
    },
    {
      id: "salary-impact",
      title: "Salary & Career Progression After 40",
      content: (
        <div className="space-y-4">
          <p>
            A common concern: Will I get full benefits at 40+?
          </p>
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="font-semibold mb-2">Yes, fully. Here's the breakdown:</p>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li>
                <strong>Starting Salary:</strong> Same as any other candidate. Grade is based on exam, not age.
              </li>
              <li>
                <strong>Pension:</strong> Calculated from your joining date. If you join at 40, pension is from 40 to 60.
              </li>
              <li>
                <strong>Increments:</strong> You get full increments annually like everyone else (₹2,400-5,400/year depending on grade).
              </li>
              <li>
                <strong>Promotion:</strong> Same eligibility norms apply. Your experience can actually help (better performance, quick rise).
              </li>
              <li>
                <strong>Career Ceiling:</strong> You may retire as senior officer (₹80,000-120,000/month) instead of very top positions, which is still excellent.
              </li>
            </ul>
          </div>

          <h3 className="font-bold text-lg mt-4">20-Year Salary Progression Example (SSC Clerk at 40)</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Age 40, Year 1:</span>
              <span className="font-bold">₹22,000/month</span>
            </div>
            <div className="flex justify-between p-2">
              <span>Age 45, Year 6:</span>
              <span className="font-bold">₹32,000/month (with DA, allowances)</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Age 50, Year 11:</span>
              <span className="font-bold">₹45,000/month</span>
            </div>
            <div className="flex justify-between p-2">
              <span>Age 55, Year 16:</span>
              <span className="font-bold">₹60,000/month</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Age 58, Year 18 (retirement eligible):</span>
              <span className="font-bold">₹70,000+ with pension</span>
            </div>
          </div>
        </div>
      ),
    },
  ],
  faqs: [
    {
      question: "Can I apply for government jobs at age 42?",
      answer:
        "Yes, if the exam's upper age limit is 42 or higher. SSC MTS (40), Railway MTS (40), State exams (45-50), and PSU positions (35-50) are options. Check specific exam notification for exact limit.",
    },
    {
      question: "Is age relaxation available for 40+ candidates?",
      answer:
        "Relaxation is category-based (SC/ST/OBC/PWD), not age-based. However, some states offer age relaxation for candidates from that state or disadvantaged groups. Check state government notifications.",
    },
    {
      question: "Will my work experience help in government job interview?",
      answer:
        "Absolutely. For group D and C positions, your stability, discipline, and maturity are huge advantages. For group B positions, your professional experience is directly valuable. Use it effectively in interviews.",
    },
    {
      question: "How long is the selection process for 40+ candidates?",
      answer:
        "Same as others. SSC/Railway exams: 6-8 months from notification to joining. PSU: 3-4 months. You don't face delayed selection due to age; the timeline is uniform.",
    },
    {
      question: "Will my pension be lower if I join at 40?",
      answer:
        "Your pension is calculated from your joining date. If you join at 40 with 20 service years until 60, you get 20-year pension. It's not based on age of joining, but years of service.",
    },
    {
      question: "Which sectors have no upper age limit?",
      answer:
        "PSUs often have 40-55 upper limits depending on position. State departments typically 45-50. Railways contract roles flexible. Insurance and banking offer officer entry up to 50. Check specific notification as it varies.",
    },
    {
      question: "Should I attempt UPSC at 40?",
      answer:
        "UPSC has 32-year upper age limit (with relaxation). At 40, you're ineligible for UPSC unless you belong to SC/ST/OBC (49 years) or defense service (50 years). Focus on SSC, PSU, and state exams instead.",
    },
  ],
};

export default function Age40PlusGovernmentJobsPage() {
  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Government Jobs", path: "/government-jobs" },
      { name: "Jobs for Age 40+", path: "/government-jobs/age-limit-40-plus" },
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
          <a href="/" className="hover:underline">Home</a> / <a href="/jobs" className="hover:underline">Government Jobs</a> / <span>{pageContent.title}</span>
        </nav>

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
          <h2 className="text-2xl font-bold mb-6 border-b-2 border-blue-600 pb-2">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {pageContent.faqs.map((faq, idx) => (
              <details key={idx} className="bg-gray-100 rounded-lg p-4 cursor-pointer hover:bg-gray-200">
                <summary className="font-semibold">{faq.question}</summary>
                <p className="mt-3 text-gray-700">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Related Links */}
        <section className="mt-16 pt-8 border-t">
          <h2 className="text-2xl font-bold mb-6">Related Resources</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-600 underline">
            <li><a href="/government-jobs/age-limit-35-plus">Government Jobs for Age 35-40</a></li>
            <li><a href="/government-jobs/age-relaxation">Age Relaxation for SC/ST/OBC</a></li>
            <li><a href="/salary-guides/government-job-salary-by-grade">Government Salary by Grade</a></li>
            <li><a href="/comparisons">SSC vs UPSC Comparison</a></li>
          </ul>
        </section>
      </main>
    </>
  );
}
