/**
 * Railway vs UPSC Comparison Page
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import ComparisonPageTemplate from "@/components/comparison-page-template";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Railway vs UPSC: Which Government Job is Better? Difficulty, Salary, Career",
  description:
    "Railway vs UPSC: RRB Group D (₹18,000, easy) vs IAS (₹56,100, hard). Difficulty, salary growth, job security, which career is better.",
  ...pageSeo(`${SITE_URL}/comparisons/railway-vs-upsc`, { index: true }),
};

const pageContent = {
  title: "Railway vs UPSC: Complete Comparison",
  exam1: { name: "Railway (RRB Group D)", description: "50,000+ worker/technician positions annually" },
  exam2: { name: "UPSC (IAS)", description: "1,000-1,500 administrative officer positions annually" },
  comparisonTable: [
    { aspect: "Entry Salary", exam1Value: "₹18,000-25,000", exam2Value: "₹56,100+" },
    { aspect: "Peak Salary", exam1Value: "₹80,000-100,000", exam2Value: "₹300,000+" },
    { aspect: "Difficulty", exam1Value: "Very Easy", exam2Value: "Very Hard" },
    { aspect: "Positions", exam1Value: "50,000+ annually", exam2Value: "1,000 annually" },
    { aspect: "Pass Rate", exam1Value: "20-30%", exam2Value: "0.1%" },
    { aspect: "Selection Speed", exam1Value: "4-6 months", exam2Value: "24+ months" },
    { aspect: "Career Scope", exam1Value: "Limited (max ₹100,000)", exam2Value: "Unlimited (₹300,000+)" },
  ],
  sections: [
    {
      id: "overview",
      title: "Railway vs UPSC Overview",
      content: (
        <div className="space-y-4">
          <p>
            Railway is accessible (50,000 positions, 20% pass rate), quick (job in 6 months). UPSC is elite (0.1% pass rate), slow (2 years prep), but highest ceiling (₹300,000+).
          </p>
          <p className="text-sm">
            <strong>Railway:</strong> Guaranteed job if you pass, starts immediately<br/>
            <strong>UPSC:</strong> Uncertain outcome, can take 2-3 attempts, but massive career ceiling
          </p>
        </div>
      ),
    },
    {
      id: "difficulty",
      title: "Difficulty & Effort Required",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Railway RRB Group D</h3>
          <p className="text-sm">Pass rate 20-30%, preparation 2-4 months, basic 10th level knowledge sufficient.</p>

          <h3 className="font-bold text-lg mt-4">UPSC IAS</h3>
          <p className="text-sm">Pass rate 0.1%, preparation 18-24 months, graduate + advanced knowledge, extremely competitive.</p>

          <h3 className="font-bold text-lg mt-4">Verdict: Railway is 100x easier</h3>
        </div>
      ),
    },
    {
      id: "salary",
      title: "Salary & Growth",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Starting Salary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded font-bold">
              <span>Railway:</span>
              <span>₹18,000-25,000</span>
            </div>
            <div className="flex justify-between items-center bg-red-50 p-3 rounded font-bold">
              <span>UPSC (IAS):</span>
              <span>₹56,100</span>
            </div>
            <p className="text-xs text-gray-600">💡 IAS starts at 2.2x higher</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Peak Salary (Year 25)</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded font-bold">
              <span>Railway:</span>
              <span>₹80,000-100,000</span>
            </div>
            <div className="flex justify-between items-center bg-red-50 p-3 rounded font-bold">
              <span>UPSC (IAS):</span>
              <span>₹250,000-300,000+</span>
            </div>
            <p className="text-xs text-gray-600">💡 IAS ends at 3x higher</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Lifetime Value</h3>
          <p className="text-sm">Railway: ₹2.5 crore | UPSC: ₹8-9 crore. UPSC offers 3.5x more lifetime wealth.</p>
        </div>
      ),
    },
    {
      id: "which-choose",
      title: "Which Should You Choose?",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Choose Railway If:</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>✅ Need job in 6 months urgently</li>
            <li>✅ Financial constraints (can't study 2 years)</li>
            <li>✅ Average student (not exceptional)</li>
            <li>✅ Want stable ₹20,000-80,000 income</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">Choose UPSC If:</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>🎯 Exceptional student (top 1%)</li>
            <li>🎯 Can afford 2 years study without income</li>
            <li>🎯 Want peak career ceiling (₹300,000+)</li>
            <li>🎯 Ambitious for administrative power</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">Smart Strategy</h3>
          <p className="text-sm font-bold bg-amber-50 p-3 rounded">
            💡 Take Railway Group D (guaranteed job). Then attempt UPSC while working. If you pass (few do), you've secured both options. If you don't, you already have ₹80,000+ career secured.
          </p>
        </div>
      ),
    },
  ],
  whichShouldYouChoose: (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
      <h3 className="text-lg font-semibold text-amber-900 mb-2">Which should you choose?</h3>
      <p className="text-amber-800">Choose <strong>Railway</strong> if you want a job quickly with minimal competition (easier exams, faster recruitment). Choose <strong>UPSC</strong> if you want the highest career ceiling and administrative power. Railway is the faster path; UPSC is the higher ceiling.</p>
    </div>
  ),
  relatedPages: [
    { title: "UPSC vs SSC", slug: "upsc-vs-ssc", type: "comparison" },
    { title: "Railway Salary Guide", slug: "railway-salary-guide", type: "salary" },
  ],
  faqs: [
    {
      question: "Is it better to do Railway then UPSC, or UPSC directly?",
      answer:
        "Railway then UPSC is safer. You get guaranteed ₹80,000 career if UPSC doesn't work out. Direct UPSC is higher risk (fail after 2 years prep). Recommended: Railway first, then attempt UPSC while working.",
    },
    {
      question: "Can I do Railway while preparing for UPSC?",
      answer:
        "Yes. Join Railway job, work part-time, study part-time for UPSC. Many UPSC toppers started from Railway/banking jobs and cracked exam while working. This is actually preferred strategy.",
    },
    {
      question: "Is UPSC career 100% better than Railway?",
      answer:
        "Financially yes (3-4x more money). But Railway offers work-life balance, less stress. UPSC offers power and prestige. Different values suit different people.",
    },
    {
      question: "What if I can't pass either exam?",
      answer:
        "Railway has 20% pass rate, very likely you'll pass. UPSC has 0.1% pass rate, unlikely first attempt. If neither works, return to regular jobs (private sector).",
    },
  ],
};

export default function RailwayVsUPSCPage() {
  return <ComparisonPageTemplate {...pageContent} />;
}
