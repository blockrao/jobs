/**
 * GATE vs Civil Service Comparison Page
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import ComparisonPageTemplate from "@/components/comparison-page-template";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "GATE vs Civil Service: Which Should Engineers Choose?",
  description:
    "GATE vs Civil Service for engineers: GATE (PSU job ₹40,000-60,000) vs IES/UPSC (₹56,100+ administrative role). Salary, job security, career scope.",
  ...pageSeo(`${SITE_URL}/comparisons/gate-vs-civil-service`, { index: true }),
};

const pageContent = {
  title: "GATE vs Civil Service: Engineer's Dilemma",
  exam1: { name: "GATE", description: "Graduate Aptitude Test in Engineering - PSU recruitment" },
  exam2: { name: "Civil Service (IES/UPSC)", description: "Engineering Services or IAS administrative roles" },
  comparisonTable: [
    { aspect: "Entry Salary", exam1Value: "₹40,000-60,000", exam2Value: "₹56,100+ (IAS)" },
    { aspect: "Employer", exam1Value: "PSU (NTPC, IOC, BHEL, etc.)", exam2Value: "Government (all India)" },
    { aspect: "Difficulty", exam1Value: "Very Hard", exam2Value: "Even Harder" },
    { aspect: "Pass Rate", exam1Value: "5-10%", exam2Value: "0.1-1%" },
    { aspect: "Job Type", exam1Value: "Technical engineering role", exam2Value: "Administrative service" },
    { aspect: "Career Ceiling", exam1Value: "CMD/Director (₹150,000+)", exam2Value: "IAS Secretary (₹300,000+)" },
    { aspect: "Best For", exam1Value: "Engineering enthusiasts", exam2Value: "Administrative ambition" },
  ],
  sections: [
    {
      id: "overview",
      title: "GATE vs Civil Service for Engineers",
      content: (
        <div className="space-y-4">
          <p>
            Both offer prestigious government roles. GATE leads to PSU jobs (technical roles). Civil Service (IES/UPSC) leads to administrative government posts.
          </p>
          <p className="text-sm">
            <strong>GATE:</strong> Engineer in power plant, manufacturing, oil company<br/>
            <strong>Civil Service:</strong> Administrator managing government ministries
          </p>
        </div>
      ),
    },
    {
      id: "career-paths",
      title: "Career Paths Explained",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">GATE → PSU Jobs</h3>
          <p className="text-sm">
            GATE score → Join PSU (NTPC, Indian Oil, BHEL, HAL) as engineer → 25-30 years growth → Become CMD (Chief Managing Director) earning ₹150,000-250,000+
          </p>

          <h3 className="font-bold text-lg mt-4">IES (Civil Service) Path</h3>
          <p className="text-sm">
            IES exam → Join government as engineer → Promotion → Officer roles → Administrative responsibility → Become joint secretary/additional secretary earning ₹200,000-300,000+
          </p>

          <h3 className="font-bold text-lg mt-4">UPSC IAS Path</h3>
          <p className="text-sm">
            Engineering background helps in UPSC → Become IAS → Administrative service (any field, not technical) → Chief secretary earning ₹300,000+
          </p>
        </div>
      ),
    },
    {
      id: "difficulty",
      title: "Difficulty & Preparation",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">GATE (Moderate-Hard)</h3>
          <div className="text-sm bg-blue-50 p-3 rounded">
            <p><strong>Pass Rate:</strong> 5-10%</p>
            <p><strong>Difficulty:</strong> Very hard (engineering concepts)</p>
            <p><strong>Prep Time:</strong> 6-12 months</p>
            <p><strong>Salary:</strong> ₹40,000-60,000 (better than most)</p>
          </div>

          <h3 className="font-bold text-lg mt-4">IES (Very Hard)</h3>
          <div className="text-sm bg-green-50 p-3 rounded">
            <p><strong>Pass Rate:</strong> 1-2%</p>
            <p><strong>Difficulty:</strong> Extremely hard</p>
            <p><strong>Prep Time:</strong> 12-18 months</p>
            <p><strong>Salary:</strong> ₹40,000-56,100 (slightly lower entry)</p>
          </div>

          <h3 className="font-bold text-lg mt-4">UPSC IAS (Hardest)</h3>
          <div className="text-sm bg-red-50 p-3 rounded">
            <p><strong>Pass Rate:</strong> 0.1%</p>
            <p><strong>Difficulty:</strong> Extremely hard</p>
            <p><strong>Prep Time:</strong> 18-24 months</p>
            <p><strong>Salary:</strong> ₹56,100 (highest entry)</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Verdict: GATE is easiest of three</h3>
        </div>
      ),
    },
    {
      id: "which-choose",
      title: "Which Should Engineers Choose?",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Choose GATE If:</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>⚡ Want job quickly (6-12 months prep)</li>
            <li>⚡ Love engineering (power, manufacturing, oil)</li>
            <li>⚡ Want better salary (₹40,000-60,000 entry)</li>
            <li>⚡ Prefer technical roles over administration</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">Choose IES If:</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>🎯 Administrative interest</li>
            <li>🎯 Want government engineer role</li>
            <li>🎯 Lower salary tolerance (₹40,000 entry)</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">Choose UPSC IAS If:</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>👑 Peak career ceiling goal (₹300,000+)</li>
            <li>👑 Exceptional engineer (top 1%)</li>
            <li>👑 Administrative ambition</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">Recommendation</h3>
          <p className="text-sm font-bold bg-amber-50 p-3 rounded">
            💡 Most engineers should choose GATE. It's easiest (5-10% pass vs 0.1% for UPSC), fastest job (6 months), best salary (₹40,000-60,000), and PSU growth is excellent (₹150,000+ peak). Reserve UPSC/IES only if you want administration + have exceptional academics.
          </p>
        </div>
      ),
    },
    {
      id: "salary-growth",
      title: "Salary Growth Comparison",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">30-Year Growth</h3>
          <p className="text-sm">
            <strong>GATE PSU:</strong> ₹40,000 → ₹60,000 (yr 5) → ₹100,000 (yr 15) → ₹150,000-250,000 as CMD (yr 25-30)<br/>
            <strong>IES:</strong> ₹40,000 → ₹70,000 (yr 10) → ₹120,000 (yr 20) → ₹180,000+ as senior officer (yr 25+)<br/>
            <strong>UPSC IAS:</strong> ₹56,100 → ₹100,000 (yr 10) → ₹200,000 (yr 20) → ₹300,000+ as chief secretary (yr 25)
          </p>

          <h3 className="font-bold text-lg mt-4">Lifetime Earnings</h3>
          <p className="text-sm">
            GATE: ₹4-5 crore | IES: ₹3.5-4.5 crore | IAS: ₹8-9 crore
          </p>
        </div>
      ),
    },
  ],
  whichShouldYouChoose: (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
      <h3 className="text-lg font-semibold text-amber-900 mb-2">Which should you choose?</h3>
      <p className="text-amber-800">Choose <strong>GATE</strong> if you prefer technical careers with high salary in PSUs. Choose <strong>Civil Service</strong> if you want administrative power and government authority. Both lead to ₹1+ crore lifetime earnings; GATE is technical, Civil Service is administrative.</p>
    </div>
  ),
  relatedPages: [
    { title: "Engineering Government Jobs", slug: "engineering-government-jobs", type: "qualification" },
    { title: "PSU Salary Comparison", slug: "psu-salary-comparison", type: "salary" },
  ],
  faqs: [
    {
      question: "Is GATE or Civil Service better for engineers?",
      answer:
        "GATE is better for most engineers: easier (5-10% pass rate), faster job (6 months), better salary (₹40,000-60,000). Reserve Civil Service only if you want administration + have exceptional academics.",
    },
    {
      question: "Can engineers do GATE and UPSC together?",
      answer:
        "Yes. Attempt GATE first (easier, faster result). If selected, join PSU. Meanwhile, prepare for UPSC. Few succeed at UPSC but it's good backup.",
    },
    {
      question: "Which PSU pays highest for GATE engineers?",
      answer:
        "IOC and HAL pay highest: ₹50,000-65,000 entry. NTPC, BHEL also pay well. PSU peak salary (CMD) reaches ₹150,000-250,000.",
    },
    {
      question: "Is engineer career in PSU or government better?",
      answer:
        "PSU offers better salary growth (₹150,000+ peak CMD). Government IES caps around ₹180,000. PSU also allows private sector transition later. PSU is generally better for engineers.",
    },
  ],
};

export default function GATEVsCivilServicePage() {
  return <ComparisonPageTemplate {...pageContent} />;
}
