/**
 * UPSC vs SSC Comparison Page
 *
 * Keyword Target: "UPSC vs SSC" (3,200 searches/month)
 * Most popular government exam comparison
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import ComparisonPageTemplate from "@/components/comparison-page-template";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "UPSC vs SSC: Which Exam Should You Take? Difficulty, Salary, Career",
  description:
    "UPSC vs SSC comparison: IAS (₹56,100+) vs CHSL clerk (₹21,000). Difficulty, preparation time, salary growth, job security, which is better for your career.",
  ...pageSeo(`${SITE_URL}/comparisons/upsc-vs-ssc`, { index: true }),
};

const pageContent = {
  title: "UPSC vs SSC: Complete Comparison",
  exam1: {
    name: "UPSC (Union Public Service Commission)",
    description: "IAS, IFS, and other Group A services - India's most prestigious government exams",
  },
  exam2: {
    name: "SSC (Staff Selection Commission)",
    description: "CHSL, CGL, and other Group B/C jobs - accessible entry-level government positions",
  },
  comparisonTable: [
    {
      aspect: "Entry Salary",
      exam1: "₹56,100/month (IAS)",
      exam2: "₹21,000/month (CHSL)",
    },
    {
      aspect: "Peak Salary",
      exam1: "₹300,000+ (Chief Secretary)",
      exam2: "₹75,000+ (Senior Officer)",
    },
    {
      aspect: "Difficulty",
      exam1: "Very Hard (0.1% selection)",
      exam2: "Moderate (5-10% selection)",
    },
    {
      aspect: "Preparation Time",
      exam1: "18-24 months",
      exam2: "6-12 months",
    },
    {
      aspect: "Job Security",
      exam1: "Highest (constitutional position)",
      exam2: "High (permanent government)",
    },
    {
      aspect: "Prestige",
      exam1: "Highest in India",
      exam2: "Good, widely respected",
    },
    {
      aspect: "Best For",
      exam1: "Ambitious, long-term planning",
      exam2: "Quick government job entry",
    },
  ],
  sections: [
    {
      id: "exam-overview",
      title: "Quick Overview: UPSC vs SSC",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">UPSC (Union Public Service Commission)</h3>
          <p>
            UPSC conducts India's most competitive civil service exam. Selects 1,000-1,500 officers annually for IAS (administrative), IFS (foreign service), and other Group A positions.
          </p>
          <p>
            <strong>Prestige:</strong> IAS officers directly become district administrators, control government budget and policy. Highest authority below elected officials.
          </p>

          <h3 className="font-bold text-lg mt-4">SSC (Staff Selection Commission)</h3>
          <p>
            SSC conducts CHSL, CGL, and other exams for Group B/C government jobs. Selects 50,000+ candidates annually across various government ministries and departments.
          </p>
          <p>
            <strong>Accessibility:</strong> Much easier entry, 5-10% pass rate vs 0.1% for UPSC. Most accessible path to government job for graduates.
          </p>
        </div>
      ),
    },
    {
      id: "difficulty-comparison",
      title: "Difficulty & Competition: Which is Harder?",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">UPSC Difficulty</h3>
          <div className="bg-red-50 p-4 rounded">
            <p className="text-sm">
              <strong>Selection Rate:</strong> 0.05-0.1% (1 in 1,000-2,000 candidates)<br/>
              <strong>Applicants:</strong> 12+ lakh apply, only 1,000 selected<br/>
              <strong>Difficulty Level:</strong> Extremely high<br/>
              <strong>Typical Preparation:</strong> 18-24 months full-time<br/>
              <strong>Attempts Needed:</strong> 2-3 attempts on average (few succeed first time)
            </p>
          </div>

          <h3 className="font-bold text-lg mt-4">SSC Difficulty</h3>
          <div className="bg-green-50 p-4 rounded">
            <p className="text-sm">
              <strong>Selection Rate:</strong> 5-10% (1 in 10-20 candidates)<br/>
              <strong>Applicants:</strong> 50 lakh+ apply, 50,000+ selected<br/>
              <strong>Difficulty Level:</strong> Moderate<br/>
              <strong>Typical Preparation:</strong> 6-12 months<br/>
              <strong>Attempts Needed:</strong> 1-2 attempts (many succeed first time)
            </p>
          </div>

          <h3 className="font-bold text-lg mt-4">Verdict: SSC is 50x easier</h3>
          <p className="text-sm">
            UPSC is exponentially harder. Requires intellectual capability, deep knowledge across multiple subjects, current affairs, and exceptional consistency. SSC requires basic to moderate preparation.
          </p>
        </div>
      ),
    },
    {
      id: "salary-career",
      title: "Salary & Career Growth Comparison",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Entry Level Salary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-red-50 p-3 rounded font-bold">
              <span>UPSC (IAS):</span>
              <span>₹56,100/month</span>
            </div>
            <div className="flex justify-between items-center bg-green-50 p-3 rounded font-bold">
              <span>SSC (CHSL):</span>
              <span>₹21,000/month</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">💡 UPSC starts at 2.7x higher salary</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Year 20 Salary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-red-50 p-3 rounded font-bold">
              <span>UPSC (Additional Secretary):</span>
              <span>₹200,000+/month</span>
            </div>
            <div className="flex justify-between items-center bg-green-50 p-3 rounded font-bold">
              <span>SSC (Senior Officer):</span>
              <span>₹75,000/month</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">💡 UPSC salary 2.7x higher even after 20 years</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Career Scope</h3>
          <p className="text-sm">
            <strong>UPSC:</strong> IAS officer becomes district collector (controls entire district), then chief secretary (runs entire state government). Unlimited upward mobility. Some become chief ministers, union ministers.
          </p>
          <p className="text-sm mt-2">
            <strong>SSC:</strong> CHSL officer can reach senior officer level but ceiling is ₹75,000. Cannot become chief secretary. Limited upward mobility after ₹75,000 level.
          </p>
        </div>
      ),
    },
    {
      id: "which-should-choose",
      title: "Which Should You Choose?",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Choose UPSC If:</h3>
          <ul className="list-disc pl-6 space-y-2 text-sm">
            <li>👨‍🎓 <strong>Exceptional academics:</strong> Top 1% student throughout schooling</li>
            <li>🧠 <strong>Intellectual interest:</strong> Genuinely interested in history, geography, political science</li>
            <li>⏰ <strong>Patient:</strong> Willing to prepare for 18-24 months without guarantee</li>
            <li>💰 <strong>Not money-focused initially:</strong> Can live on ₹20,000-30,000 during preparation</li>
            <li>🎯 <strong>Administrative ambition:</strong> Want to become district collector, chief secretary, CM</li>
            <li>🏆 <strong>Peak performance goal:</strong> Want maximum career ceiling (₹300,000+)</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">Choose SSC If:</h3>
          <ul className="list-disc pl-6 space-y-2 text-sm">
            <li>⚡ <strong>Need quick job:</strong> Want government job within 1 year</li>
            <li>📚 <strong>Moderate academics:</strong> Good student, but not exceptional</li>
            <li>💼 <strong>Career security first:</strong> Prefer guaranteed job over uncertain preparation</li>
            <li>🏠 <strong>Family responsibility:</strong> Need steady income to support family</li>
            <li>✅ <strong>Content with ₹75,000:</strong> Happy with senior officer level (not chief secretary)</li>
            <li>📊 <strong>Lower stress:</strong> Want moderate difficulty exam with good success rate</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">The Real Decision Factor</h3>
          <p className="text-sm font-bold bg-amber-50 p-3 rounded">
            💡 <strong>Can you afford 18-24 months of study without income while risking failure?</strong><br/>
            YES → Try UPSC<br/>
            NO → Take SSC (guaranteed result within 1 year)
          </p>
        </div>
      ),
    },
    {
      id: "job-security-benefits",
      title: "Job Security & Benefits Comparison",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Job Security</h3>
          <p className="text-sm">
            <strong>UPSC (IAS):</strong> Constitutional position, cannot be removed except by impeachment. Lifetime employment guaranteed.
          </p>
          <p className="text-sm mt-2">
            <strong>SSC (CHSL):</strong> Government employee, permanent after probation. Equally secure, cannot be fired arbitrarily.
          </p>
          <p className="text-sm mt-2 font-bold">✅ Both equally secure - no difference here</p>

          <h3 className="font-bold text-lg mt-4">Pension Benefits</h3>
          <p className="text-sm">
            <strong>Both offer:</strong> 50% of average salary for entire lifetime. No difference.
          </p>
          <p className="text-sm mt-2">
            <strong>IAS pension example:</strong> Average salary ₹150,000 → Pension ₹75,000/month for life<br/>
            <strong>CHSL pension example:</strong> Average salary ₹60,000 → Pension ₹30,000/month for life
          </p>

          <h3 className="font-bold text-lg mt-4">Other Benefits</h3>
          <p className="text-sm">
            <strong>IAS advantages:</strong> Government bungalow, official car, personal security (senior ranks), international postings
          </p>
          <p className="text-sm mt-2">
            <strong>SSC advantages:</strong> Simpler lifestyle, less administrative burden, stable local posting
          </p>
        </div>
      ),
    },
    {
      id: "preparation-time",
      title: "Preparation Time & Strategy",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">UPSC Preparation Timeline</h3>
          <ul className="space-y-2 text-sm">
            <li><strong>Months 0-6:</strong> Foundation building (NCERT books, basics)</li>
            <li><strong>Months 6-12:</strong> Prelims syllabus (history, geography, polity, economy)</li>
            <li><strong>Months 12-18:</strong> Mains preparation (deep study, essays)</li>
            <li><strong>Months 18-24:</strong> Interview coaching, final revision</li>
            <li><strong>Total:</strong> 18-24 months minimum (many take 2-3 years)</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">SSC Preparation Timeline</h3>
          <ul className="space-y-2 text-sm">
            <li><strong>Months 0-3:</strong> Quantitative ability, reasoning basics</li>
            <li><strong>Months 3-6:</strong> English, general awareness</li>
            <li><strong>Months 6-9:</strong> Full syllabus mock tests</li>
            <li><strong>Months 9-12:</strong> Final revision, interview prep</li>
            <li><strong>Total:</strong> 6-12 months (4-6 months if already prepared)</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">Verdict</h3>
          <p className="text-sm">
            <strong>UPSC takes 2-3x longer</strong> and requires much deeper knowledge. SSC can be completed faster with standard coaching materials.
          </p>
        </div>
      ),
    },
  ],
  whichShouldYouChoose: (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
      <h3 className="text-lg font-semibold text-amber-900 mb-2">Which should you choose?</h3>
      <p className="text-amber-800">Choose <strong>UPSC</strong> if you have 18-24 months to prepare and want the highest career ceiling. Choose <strong>SSC</strong> if you need a job quickly with guaranteed success and steady growth. Many candidates do SSC first, work for 5-10 years, then attempt UPSC.</p>
    </div>
  ),
  relatedPages: [
    { title: "SSC CHSL Government Jobs", slug: "b-a-government-jobs" },
    { title: "IAS Government Jobs", slug: "engineering-government-jobs" },
    { title: "Government Job Salary by Grade", slug: "government-job-salary-by-grade" },
  ],
  faqs: [
    {
      question: "Should I attempt UPSC or go for SSC directly?",
      answer:
        "If you're exceptional student with financial support for 18-24 months, attempt UPSC. If you need job urgently or have financial constraints, go SSC. SSC has 10x better success probability while UPSC offers higher ceiling.",
    },
    {
      question: "Is UPSC worth the effort vs SSC?",
      answer:
        "UPSC is worth if you want peak career ceiling (₹300,000+ + administrative power). SSC is worth if you want guaranteed job fast (₹21,000 → ₹75,000 steady growth). Neither is objectively better—depends on priorities.",
    },
    {
      question: "Can I do both—first SSC then UPSC?",
      answer:
        "Yes, many do this. Join as SSC officer, work for 5-10 years, then attempt UPSC. You'll have more maturity + financial security. However, UPSC prefers younger candidates (age limit 32).",
    },
    {
      question: "What if I fail UPSC after 2 years of preparation?",
      answer:
        "You'll have wasted 2 years and missed SSC opportunity. This is the real risk. Many UPSC aspirants end up with nothing because they spent 3-4 years on UPSC, exceeded age limit (32), couldn't do SSC.",
    },
    {
      question: "Is IAS salary really 3x higher than CHSL?",
      answer:
        "Yes, entry salary IAS ₹56,100 vs CHSL ₹21,000 = 2.7x. And this gap increases over time. By year 20: IAS ₹200,000+ vs CHSL ₹75,000. The gap never closes.",
    },
    {
      question: "What is the realistic pass rate for each exam?",
      answer:
        "UPSC: 0.1% pass rate (1 in 1,000). Most sincere candidates fail. SSC: 5-10% pass rate (1 in 10-20). Much higher success rate.",
    },
    {
      question: "Which exam has better career growth—IAS or SSC?",
      answer:
        "IAS has unlimited growth (can become Chief Minister, Minister). SSC has ceiling at ₹75,000 (senior officer level). IAS career scope is 10x broader.",
    },
  ],
};

export default function UPSCVsSSCPage() {
  return <ComparisonPageTemplate {...pageContent} />;
}
