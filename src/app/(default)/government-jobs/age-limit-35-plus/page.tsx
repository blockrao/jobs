/**
 * Government Jobs for Age 35-40 Page
 *
 * Keyword Target: "Government jobs age 35" (1,200 searches/month)
 * Focus: Exams and positions open to candidates age 35-40
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbSchema, buildFAQSchema, jsonLdGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Government Jobs for Age 35-40 | High Age Limit Exams & Positions",
  description:
    "Government jobs for age 35-40. SSC, state exams, PSU, banking, railway positions with age limits 35-40+. Career shift opportunities for mid-career professionals.",
  ...pageSeo(`${SITE_URL}/government-jobs/age-limit-35-plus`, { index: true }),
};

const pageContent = {
  title: "Government Jobs for Age 35-40 Candidates",
  sections: [
    {
      id: "intro",
      title: "Government Job Opportunities at Age 35-40",
      content: (
        <div className="space-y-4">
          <p>
            Age 35-40 is a sweet spot for government job careers. You're experienced enough to be valuable, but not too old for major exams. Multiple central and state government positions have upper age limits between 35-40, and many sectors offer even higher limits for experienced professionals.
          </p>
          <p>
            This age range has some of the highest success rates because candidates have real-world skills, maturity, and often strong motivation for stability.
          </p>
        </div>
      ),
    },
    {
      id: "exams-35-40",
      title: "Government Exams Open to Age 35-40",
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-600">
            <h3 className="font-bold text-lg mb-2">SSC JE (Junior Engineer)</h3>
            <p className="text-sm mb-2">Upper Age Limit: 32 years (relaxation up to 37 for ex-servicemen)</p>
            <p className="text-sm">
              <strong>Salary:</strong> ₹35,000-45,000/month<br/>
              <strong>Best For:</strong> Engineering graduates at any age (diploma considered too)<br/>
              <strong>Advantage:</strong> Technical skills valued; ex-servicemen can apply until 37
            </p>
          </div>

          <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-600">
            <h3 className="font-bold text-lg mb-2">Banking Officer (IBPS/SBI PO)</h3>
            <p className="text-sm mb-2">Upper Age Limit: 30-32 years (SC/ST/OBC get 5-year relaxation)</p>
            <p className="text-sm">
              <strong>Salary:</strong> ₹50,000-70,000/month starting<br/>
              <strong>Advantage:</strong> Reserved categories can apply until 37-40<br/>
              <strong>Growth:</strong> Manager/Senior Manager roles ₹100,000+/month
            </p>
          </div>

          <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-600">
            <h3 className="font-bold text-lg mb-2">Railway Positions (Group A/B)</h3>
            <p className="text-sm mb-2">Upper Age Limit: 35-40 depending on position</p>
            <p className="text-sm">
              <strong>Scope:</strong> Officer level, technical specialists, administrative roles<br/>
              <strong>Salary:</strong> ₹45,000-80,000/month<br/>
              <strong>Note:</strong> Experience is strong bonus in interview
            </p>
          </div>

          <div className="bg-amber-50 p-6 rounded-lg border-l-4 border-amber-600">
            <h3 className="font-bold text-lg mb-2">State PSC Exams</h3>
            <p className="text-sm mb-2">Upper Age Limit: 40-45 years (varies by state)</p>
            <p className="text-sm">
              <strong>Best Part:</strong> Highest age limits in government recruitment<br/>
              <strong>Salary:</strong> ₹35,000-60,000/month<br/>
              <strong>Benefit:</strong> Local preference, familiarity advantage
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "best-exams",
      title: "Best Exams for Age 35-40 Candidates (Strategic Choices)",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Tier 1: Highest Success Probability (Age 35-40)</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>SSC MTS:</strong> Age 40, multiple vacancies, moderate difficulty</li>
            <li><strong>State PSC:</strong> Age limit often 45, local advantage, thorough exams</li>
            <li><strong>Insurance Company Officers:</strong> No upper age limit often, lateral entry valued</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">Tier 2: Good Opportunities (Age 35-38)</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>IBPS/SBI Officer (Reserved):</strong> SC/ST/OBC can apply until 37-40</li>
            <li><strong>Railway Group B:</strong> Age 40, technical positions value experience</li>
            <li><strong>PSU Recruitment:</strong> Many PSUs have flexible age (35-45 depending on position)</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">Tier 3: Last Chance Exams (Age 35-37)</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>UPSC (last attempt possible at 37):</strong> Most competitive but possible</li>
            <li><strong>SSC CGL:</strong> Last attempt window closing (age 32 limit)</li>
            <li><strong>Banking PO (SC/ST/OBC):</strong> Final year of eligibility</li>
          </ul>
        </div>
      ),
    },
    {
      id: "multi-exam-strategy",
      title: "Multi-Exam Strategy for Age 35-40",
      content: (
        <div className="space-y-4">
          <p className="font-semibold text-lg">Simultaneous Exam Approach (Recommended)</p>
          <p>
            Don't wait for one exam result. Apply to multiple exams simultaneously:
          </p>
          <div className="bg-blue-100 p-4 rounded-lg mt-2">
            <p className="text-sm">
              <strong>Month 1-2:</strong> Apply to SSC MTS, State PSC, Railway recruitment notifications<br/>
              <strong>Month 2-4:</strong> Prepare for all exams with overlapping syllabus<br/>
              <strong>Month 5-8:</strong> Appear for exams as they are scheduled<br/>
              <strong>Month 8-12:</strong> Interviews for whichever clears (likely 1-2)<br/>
              <strong>Result:</strong> High probability of selection in at least one exam
            </p>
          </div>

          <p className="mt-4 font-semibold">Why This Works Better Than Single-Exam Focus</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Reduced pressure (not banking on one exam)</li>
            <li>Better success rate (multiple chances)</li>
            <li>Overlapping prep (SSC, Railway, State PSC have 60% common syllabus)</li>
            <li>Negotiation power (if multiple selections, choose best offer)</li>
          </ul>
        </div>
      ),
    },
    {
      id: "interview-advantage",
      title: "Interview Advantage at Age 35-40",
      content: (
        <div className="space-y-4">
          <p>
            Your age and experience are significant advantages in interviews. Here's how to leverage them:
          </p>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Strengths to Highlight</h3>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li>Decision-making maturity and responsibility</li>
              <li>Work ethics and discipline (interview boards value stability)</li>
              <li>Problem-solving from real experience</li>
              <li>Leadership skills if you've managed people</li>
              <li>Stability motivation (not job-hopping mentality)</li>
            </ul>
          </div>

          <h3 className="font-semibold mt-4">Sample Interview Narrative</h3>
          <p className="text-sm italic">
            "I've had 10 years of experience in [field], which has taught me discipline, systematic thinking, and the value of stable employment. Government service appeals to me because I want to contribute to public good with my experience while building a secure future for my family. My background in [specific skills] will be directly applicable to [position name]."
          </p>
        </div>
      ),
    },
  ],
  faqs: [
    {
      question: "Can I still attempt UPSC at age 38?",
      answer:
        "General category: No (upper limit 32). SC/ST: Yes until 39 (49 limit). OBC: Yes until 39 (43 limit). Ex-servicemen/defence service: Yes until 50. Check your category eligibility.",
    },
    {
      question: "Is SSC JE still viable at age 37?",
      answer:
        "Yes, if you're an ex-serviceman (37 is limit with relaxation). Otherwise, general category is 32. Regular SSC exams also offer post-exam career paths. Consult current notification for exact age eligibility.",
    },
    {
      question: "Which exam has the easiest preparation at age 35-40?",
      answer:
        "SSC MTS (basic 10th-level, 3-month prep), State PSC (longer prep but straightforward), Railway (technical if engineering background). Choose based on your qualification level, not difficulty.",
    },
    {
      question: "Will interview board be biased against my age?",
      answer:
        "No. Government interview boards are trained to evaluate qualification and personality, not age. Your maturity and experience are often perceived positively for civil service roles.",
    },
    {
      question: "Can I change my career field at age 38?",
      answer:
        "Yes, absolutely. Government exams don't require field continuity. A doctor, engineer, artist, or banker can all appear for SSC/State PSC. Your existing skills are a bonus.",
    },
    {
      question: "How much time should I dedicate to preparation?",
      answer:
        "3-4 months full-time or 6-8 months part-time is typical for SSC/Railway. State PSC requires 6-12 months. You need less time than younger candidates due to better focus and study discipline.",
    },
  ],
};

export default function Age35PlusGovernmentJobsPage() {
  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Government Jobs", path: "/government-jobs" },
      { name: "Jobs for Age 35-40", path: "/government-jobs/age-limit-35-plus" },
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
            <h2 className="text-2xl font-bold mb-4 border-b-2 border-green-600 pb-2">{section.title}</h2>
            <div className="prose prose-lg max-w-none">
              {section.content}
            </div>
          </section>
        ))}

        {/* FAQs */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6 border-b-2 border-green-600 pb-2">Frequently Asked Questions</h2>
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
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-green-600 underline">
            <li><a href="/government-jobs/age-limit-40-plus">Government Jobs for Age 40+</a></li>
            <li><a href="/government-jobs/age-relaxation">Age Relaxation by Category</a></li>
            <li><a href="/comparisons/upsc-vs-ssc">UPSC vs SSC Comparison</a></li>
            <li><a href="/salary-guides/banking-salary-guide">Banking Salary Guide</a></li>
          </ul>
        </section>
      </main>
    </>
  );
}
