/**
 * IBPS vs SBI Comparison Page
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import ComparisonPageTemplate from "@/components/comparison-page-template";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "IBPS vs SBI: Which Bank Job is Better? Salary, Selection, Growth",
  description:
    "IBPS vs SBI comparison: IBPS recruits for 25+ banks, SBI is single largest bank. Entry salary, career growth, difficulty, which is easier to get hired.",
  ...pageSeo(`${SITE_URL}/comparisons/ibps-vs-sbi`, { index: true }),
};

const pageContent = {
  title: "IBPS vs SBI: Which Banking Exam to Choose?",
  exam1: {
    name: "IBPS (Institute of Banking Personnel Selection)",
    description: "Conducts recruitment for 25+ public sector banks (SBI, PNB, BOI, Union, Canara, etc.)",
  },
  exam2: {
    name: "SBI (State Bank of India)",
    description: "India's largest bank with its own independent recruitment process",
  },
  comparisonTable: [
    {
      aspect: "Employer",
      exam1Value: "25+ different banks",
      exam2Value: "Single bank (largest)",
    },
    {
      aspect: "Hiring Scale",
      exam1Value: "10,000+ positions",
      exam2Value: "5,000+ positions",
    },
    {
      aspect: "Entry Salary",
      exam1Value: "₹18,000-22,000",
      exam2Value: "₹20,000-23,000 (slightly higher)",
    },
    {
      aspect: "Difficulty",
      exam1Value: "Moderate",
      exam2Value: "Moderate (similar)",
    },
    {
      aspect: "Bank Stability",
      exam1Value: "Varies by bank",
      exam2Value: "Safest (largest)",
    },
    {
      aspect: "Career Path",
      exam1Value: "Inter-bank transfer possible",
      exam2Value: "Single bank growth",
    },
    {
      aspect: "Best For",
      exam1Value: "Flexibility (choose bank)",
      exam2Value: "Prestige (largest bank)",
    },
  ],
  sections: [
    {
      id: "overview",
      title: "IBPS vs SBI: Key Differences",
      content: (
        <div className="space-y-4">
          <p>
            Both IBPS and SBI recruit bank clerks with similar salary and benefits. Main difference: IBPS recruits for 25 different banks, SBI only for itself.
          </p>
          <h3 className="font-bold text-lg mt-4">IBPS (Multi-Bank)</h3>
          <p>
            Conducts common exam for State Bank of India, Punjab National Bank, Bank of India, Union Bank, Canara Bank, Syndicate Bank, Allahabad Bank, Corporation Bank, Oriental Bank, Central Bank, etc.
          </p>

          <h3 className="font-bold text-lg mt-4">SBI (Single Bank)</h3>
          <p>
            Conducts its own separate recruitment. India's largest bank (50M+ customers, 2000+ branches). Most prestigious among public sector banks.
          </p>
        </div>
      ),
    },
    {
      id: "salary-benefits",
      title: "Salary & Benefits Comparison",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Entry Salary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded">
              <span><strong>IBPS Clerk:</strong></span>
              <span className="font-bold">₹18,000-22,000</span>
            </div>
            <div className="flex justify-between items-center bg-blue-100 p-3 rounded">
              <span><strong>SBI Clerk:</strong></span>
              <span className="font-bold">₹20,000-23,000</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">SBI pays ₹1,000-2,000 more initially</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Benefits (Both same):</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>✓ Dearness Allowance (DA): 20-25% of salary</li>
            <li>✓ House Rent Allowance (HRA): 10-35% by city</li>
            <li>✓ 50% pension for life after retirement</li>
            <li>✓ Medical coverage for self + family</li>
            <li>✓ 30 casual + 15 sick days leave</li>
          </ul>
        </div>
      ),
    },
    {
      id: "difficulty-selection",
      title: "Exam Difficulty & Selection Process",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Pass Rate</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-green-50 p-3 rounded">
              <span><strong>IBPS:</strong></span>
              <span className="font-bold">10-15% pass rate</span>
            </div>
            <div className="flex justify-between items-center bg-green-100 p-3 rounded">
              <span><strong>SBI:</strong></span>
              <span className="font-bold">10-15% pass rate (same)</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Selection Process</h3>
          <p className="text-sm">
            <strong>IBPS:</strong> Prelim exam → Main exam → Interview. Then assigned to one of 25 banks based on preference + merit.
          </p>
          <p className="text-sm mt-2">
            <strong>SBI:</strong> Prelim exam → Main exam → Interview. Selected candidates join only SBI.
          </p>

          <h3 className="font-bold text-lg mt-4">Interview Difficulty</h3>
          <p className="text-sm">
            <strong>IBPS:</strong> Moderate (many banks, various interview styles)<br/>
            <strong>SBI:</strong> Moderate (SBI conducts all, more standardized)
          </p>
        </div>
      ),
    },
    {
      id: "which-choose",
      title: "Which Should You Choose?",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Choose IBPS If:</h3>
          <ul className="list-disc pl-6 space-y-2 text-sm">
            <li>🏦 Want flexibility (choose from 25 banks)</li>
            <li>🎯 Have bank preference (PNB, BOI, Union)</li>
            <li>📍 Want posting in specific city</li>
            <li>🔄 Interested in bank-to-bank transfer later</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">Choose SBI If:</h3>
          <ul className="list-disc pl-6 space-y-2 text-sm">
            <li>👑 Want largest bank prestige</li>
            <li>🏆 Want single most trusted employer</li>
            <li>💼 Prefer career in largest financial institution</li>
            <li>✅ Want slightly higher starting salary</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">Honest Verdict</h3>
          <p className="text-sm font-bold bg-amber-50 p-3 rounded">
            💡 Both are equally good. Attempt IBPS (easier to get selected from 25 banks), and if you want SBI specifically, attempt SBI later separately.
          </p>
        </div>
      ),
    },
    {
      id: "career-growth",
      title: "Career Growth Comparison",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Growth Path (Clerk → Officer)</h3>
          <p className="text-sm">
            <strong>Both IBPS & SBI:</strong> Entry as clerk (₹20,000) → Officer in 5-7 years (₹50,000) → Senior manager in 20 years (₹100,000+). Same progression.
          </p>

          <h3 className="font-bold text-lg mt-4">Maximum Salary</h3>
          <p className="text-sm">
            <strong>IBPS:</strong> Depends on bank. SBI goes up to ₹200,000+, smaller banks cap at ₹120,000<br/>
            <strong>SBI:</strong> ₹200,000-250,000+ (highest among public banks)
          </p>

          <h3 className="font-bold text-lg mt-4">Job Security</h3>
          <p className="text-sm">
            <strong>Both equally secure:</strong> Public sector banks are government-owned. Permanent job, impossible to fire.
          </p>
        </div>
      ),
    },
  ],
  whichShouldYouChoose: (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
      <h3 className="text-lg font-semibold text-amber-900 mb-2">Which should you choose?</h3>
      <p className="text-amber-800">Both offer identical salary and benefits. Choose <strong>IBPS</strong> for flexibility across multiple banks and better career mobility. Choose <strong>SBI</strong> if you prefer the prestige and stability of India's largest bank. Your salary will be the same either way.</p>
    </div>
  ),
  relatedPages: [
    { title: "Banking Salary Guide", slug: "banking-salary-guide" },
    { title: "B.Com Government Jobs", slug: "b-com-government-jobs" },
  ],
  faqs: [
    {
      question: "Is SBI better than IBPS banks?",
      answer:
        "SBI is largest bank so more prestige. But salary and benefits are same as IBPS banks. Career growth same. If you don't have bank preference, IBPS offers more flexibility (choose from 25 banks).",
    },
    {
      question: "Can I attempt both IBPS and SBI?",
      answer:
        "Yes. Attempt IBPS first (easier due to 25 bank options). If selected, join. If not, attempt SBI separately. Many candidates do this.",
    },
    {
      question: "Which bank pays highest after SBI in IBPS?",
      answer:
        "Indian Bank, PNB, Bank of India pay similar to SBI (₹200,000+ peak). Smaller banks cap at ₹120,000-150,000.",
    },
    {
      question: "Is bank transfer possible between IBPS banks?",
      answer:
        "Yes. After 5 years, you can request transfer to another IBPS bank. This flexibility is IBPS advantage over SBI.",
    },
  ],
};

export default function IBPSVsSBIPage() {
  return <ComparisonPageTemplate {...pageContent} />;
}
