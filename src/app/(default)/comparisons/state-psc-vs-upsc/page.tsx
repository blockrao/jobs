/**
 * State PSC vs UPSC Comparison Page
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import ComparisonPageTemplate from "@/components/comparison-page-template";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbSchema, buildFAQSchema, jsonLdGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "State PSC vs UPSC: Which Civil Service Exam is Better?",
  description:
    "State PSC vs UPSC: State officer (₹40,000-60,000) vs IAS (₹56,100+). Difficulty, job scope, salary, which exam is easier.",
  ...pageSeo(`${SITE_URL}/comparisons/state-psc-vs-upsc`, { index: true }),
};

const pageContent = {
  title: "State PSC vs UPSC: Complete Comparison",
  exam1: { name: "State PSC", description: "State civil service - administrative officers for one state" },
  exam2: { name: "UPSC", description: "Union civil service - administrative officers for entire India" },
  comparisonTable: [
    { aspect: "Entry Salary", exam1Value: "₹40,000-60,000", exam2Value: "₹56,100" },
    { aspect: "Job Scope", exam1Value: "Single state", exam2Value: "All India postings" },
    { aspect: "Difficulty", exam1Value: "Moderate", exam2Value: "Very Hard" },
    { aspect: "Pass Rate", exam1Value: "2-5%", exam2Value: "0.1%" },
    { aspect: "Preparation", exam1Value: "12-18 months", exam2Value: "18-24 months" },
    { aspect: "Career Ceiling", exam1Value: "Chief Secretary (state)", exam2Value: "Chief Secretary (national)" },
    { aspect: "Best For", exam1Value: "State posting preference", exam2Value: "National administration" },
  ],
  sections: [
    {
      id: "overview",
      title: "State PSC vs UPSC Overview",
      content: (
        <div className="space-y-4">
          <p>
            State PSC is easier (2-5% pass rate) but job is limited to one state. UPSC is harder (0.1%) but officer serves entire India.
          </p>
          <p className="text-sm">
            <strong>State PSC:</strong> Chief Secretary (head of state government)<br/>
            <strong>UPSC IAS:</strong> Chief Secretary (national cadre, can be chief secretary of any state)
          </p>
        </div>
      ),
    },
    {
      id: "difficulty",
      title: "Difficulty Comparison",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">State PSC (Easier)</h3>
          <p className="text-sm">Pass rate 2-5%. State-level competition. Questions focused on state affairs, local governance.</p>

          <h3 className="font-bold text-lg mt-4">UPSC (Very Hard)</h3>
          <p className="text-sm">Pass rate 0.1%. National competition. All-India topics, international affairs, advanced knowledge.</p>

          <h3 className="font-bold text-lg mt-4">Verdict: State PSC is 20-50x easier</h3>
        </div>
      ),
    },
    {
      id: "salary-benefits",
      title: "Salary & Career Scope",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Entry Salary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded font-bold">
              <span>State PSC:</span>
              <span>₹40,000-60,000</span>
            </div>
            <div className="flex justify-between items-center bg-red-50 p-3 rounded font-bold">
              <span>UPSC:</span>
              <span>₹56,100</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Career Scope</h3>
          <p className="text-sm">
            <strong>State PSC:</strong> Serves only your state. Cannot be transferred to other states. Promotions within state cadre.<br/>
            <strong>UPSC:</strong> Serves entire India. Can be posted to any state. Much broader scope.
          </p>

          <h3 className="font-bold text-lg mt-4">Peak Position</h3>
          <p className="text-sm">
            <strong>State PSC:</strong> Chief Secretary of your state (₹200,000+)<br/>
            <strong>UPSC:</strong> Chief Secretary of any state OR joint secretary at center (₹220,000+)
          </p>
        </div>
      ),
    },
    {
      id: "which-choose",
      title: "Which Should You Choose?",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Choose State PSC If:</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>✅ Want to stay in your home state</li>
            <li>✅ Less competition (easier pass)</li>
            <li>✅ Good student (not exceptional)</li>
            <li>✅ Happy with state-level administration</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">Choose UPSC If:</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>🎯 Want all-India postings</li>
            <li>🎯 Exceptional student</li>
            <li>🎯 National ambition</li>
            <li>🎯 Want maximum career scope</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">Smart Strategy</h3>
          <p className="text-sm font-bold bg-amber-50 p-3 rounded">
            💡 Attempt State PSC first (easier, 2-5% pass rate). Simultaneously prepare for UPSC. If State PSC passes (likely), you get guaranteed chief secretary position in your state. If UPSC passes (unlikely), you get national cadre.
          </p>
        </div>
      ),
    },
  ],
  whichShouldYouChoose: (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
      <h3 className="text-lg font-semibold text-amber-900 mb-2">Which should you choose?</h3>
      <p className="text-amber-800">Choose <strong>State PSC</strong> if you want to serve your state and have 2-5x higher success rate. Choose <strong>UPSC</strong> if you want national-level administration and peak career ceiling. Both are good options; State PSC has better success probability.</p>
    </div>
  ),
  relatedPages: [
    { title: "UPSC vs SSC", slug: "upsc-vs-ssc", type: "comparison" } as const,
  ],
  faqs: [
    {
      question: "Is State PSC easier than UPSC?",
      answer:
        "Yes, State PSC is 20-50x easier (2-5% vs 0.1% pass rate). Same syllabus largely, but state-focused questions are easier. State competition is lower.",
    },
    {
      question: "Can I do both State PSC and UPSC?",
      answer:
        "Yes, absolutely. Attempt State PSC first (easier), then UPSC. Many toppers do this strategy. If State PSC succeeds, you're secure. If UPSC succeeds later, you get premium posting.",
    },
    {
      question: "Is State PSC as good as UPSC?",
      answer:
        "Salary same (₹200,000+ peak). But UPSC gives all-India postings while State PSC limits you to home state. Depends if you value state stability or national scope.",
    },
    {
      question: "What if I fail State PSC but pass UPSC?",
      answer:
        "You become IAS with all-India posting (better than state service). But this is rare (0.1% UPSC vs 2-5% State PSC pass rate).",
    },
  ],
};

export default function StatePSCVsUPSCPage() {
  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Comparisons", path: "/comparisons" },
      { name: "State PSC vs UPSC", path: "/comparisons/state-psc-vs-upsc" },
    ]),
    buildFAQSchema(pageContent.faqs),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <ComparisonPageTemplate {...pageContent} />
    </>
  );
}
