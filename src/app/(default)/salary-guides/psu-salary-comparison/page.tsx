/**
 * PSU Salary Comparison Page
 *
 * Keyword Target: "PSU Salary Comparison" (1,800 searches/month)
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import SalaryGuideTemplate from "@/components/salary-guide-template";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbSchema, buildFAQSchema, jsonLdGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "PSU Salary Comparison India 2025 - NTPC vs Indian Oil vs BHEL vs HAL",
  description:
    "PSU salary comparison: NTPC, Indian Oil, BHEL, HAL, GAIL salaries. ₹40,000-60,000 entry, best PSU for salary, benefits, pension, growth opportunities.",
  ...pageSeo(`${SITE_URL}/salary-guides/psu-salary-comparison`, { index: true }),
};

const pageContent = {
  title: "PSU Salary Comparison in India",
  description: "Compare salaries across India's largest PSUs - NTPC, Indian Oil, BHEL, HAL. Find highest-paying government companies with benefits and growth.",
  sections: [
    {
      id: "overview",
      title: "PSU Salary Overview & Why They Pay More",
      content: (
        <div className="space-y-4">
          <p>
            PSUs (Public Sector Undertakings) are government companies that typically pay 10-25% more than central government jobs. Why? Because they compete with private sector for talent while maintaining government benefits.
          </p>
          <p>
            <strong>Example:</strong> Government bank clerk earns ₹25,000. PSU bank assistant earns ₹35,000. Same benefits, higher salary.
          </p>
          <h3 className="font-bold text-lg mt-4">PSU Advantages:</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ 10-25% higher salary than government</li>
            <li>✓ Same pension (50% for life)</li>
            <li>✓ Better medical coverage</li>
            <li>✓ International postings possible</li>
            <li>✓ Faster promotion (merit-based)</li>
          </ul>
        </div>
      ),
    },
    {
      id: "major-psus",
      title: "Top 5 Highest-Paying PSUs Compared",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. Indian Oil Corporation (IOC)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span><strong>Entry Level Salary</strong></span>
              <span className="font-bold">₹50,000-65,000</span>
            </div>
            <div className="flex justify-between">
              <span>5-Year Salary</span>
              <span className="font-bold">₹70,000-90,000</span>
            </div>
            <div className="flex justify-between">
              <span>Senior Level (15+ yrs)</span>
              <span className="font-bold">₹120,000-180,000</span>
            </div>
            <hr />
            <p className="text-xs text-gray-600"><strong>Why High:</strong> Oil price linked earnings, dividend sharing, international operations</p>
          </div>

          <h3 className="font-bold text-lg mt-4">2. NTPC Limited (Power Generation)</h3>
          <div className="bg-green-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span><strong>Entry Level Salary</strong></span>
              <span className="font-bold">₹45,000-60,000</span>
            </div>
            <div className="flex justify-between">
              <span>5-Year Salary</span>
              <span className="font-bold">₹65,000-85,000</span>
            </div>
            <div className="flex justify-between">
              <span>Senior Level (15+ yrs)</span>
              <span className="font-bold">₹110,000-160,000</span>
            </div>
            <hr />
            <p className="text-xs text-gray-600"><strong>Why High:</strong> Essential services monopoly, stable revenue, nationwide presence</p>
          </div>

          <h3 className="font-bold text-lg mt-4">3. BHEL (Bharat Heavy Electricals)</h3>
          <div className="bg-yellow-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span><strong>Entry Level Salary</strong></span>
              <span className="font-bold">₹42,000-55,000</span>
            </div>
            <div className="flex justify-between">
              <span>5-Year Salary</span>
              <span className="font-bold">₹60,000-80,000</span>
            </div>
            <div className="flex justify-between">
              <span>Senior Level (15+ yrs)</span>
              <span className="font-bold">₹100,000-150,000</span>
            </div>
            <hr />
            <p className="text-xs text-gray-600"><strong>Why High:</strong> Manufacturing leader, export reputation, project-based earnings</p>
          </div>

          <h3 className="font-bold text-lg mt-4">4. HAL (Hindustan Aeronautics)</h3>
          <div className="bg-purple-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span><strong>Entry Level Salary</strong></span>
              <span className="font-bold">₹48,000-62,000</span>
            </div>
            <div className="flex justify-between">
              <span>5-Year Salary</span>
              <span className="font-bold">₹68,000-88,000</span>
            </div>
            <div className="flex justify-between">
              <span>Senior Level (15+ yrs)</span>
              <span className="font-bold">₹115,000-170,000</span>
            </div>
            <hr />
            <p className="text-xs text-gray-600"><strong>Why High:</strong> Defense contracts, high-skill manufacturing, prestige factor</p>
          </div>

          <h3 className="font-bold text-lg mt-4">5. GAIL (Gas Authority of India)</h3>
          <div className="bg-red-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span><strong>Entry Level Salary</strong></span>
              <span className="font-bold">₹44,000-58,000</span>
            </div>
            <div className="flex justify-between">
              <span>5-Year Salary</span>
              <span className="font-bold">₹62,000-82,000</span>
            </div>
            <div className="flex justify-between">
              <span>Senior Level (15+ yrs)</span>
              <span className="font-bold">₹105,000-155,000</span>
            </div>
            <hr />
            <p className="text-xs text-gray-600"><strong>Why High:</strong> Energy monopoly, commodity-linked earnings, critical infrastructure</p>
          </div>
        </div>
      ),
    },
    {
      id: "salary-progression",
      title: "30-Year PSU Salary Progression",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Indian Oil: Entry ₹50,000 → Retirement ₹180,000</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-blue-50 p-2">
              <span>Year 0-3: Entry Officer</span>
              <span className="font-bold">₹50,000-60,000</span>
            </div>
            <div className="flex justify-between items-center bg-blue-100 p-2">
              <span>Year 3-8: Senior Officer</span>
              <span className="font-bold">₹70,000-90,000</span>
            </div>
            <div className="flex justify-between items-center bg-green-50 p-2">
              <span>Year 8-15: Manager</span>
              <span className="font-bold">₹100,000-130,000</span>
            </div>
            <div className="flex justify-between items-center bg-green-100 p-2">
              <span>Year 15-25: Senior Manager/Director</span>
              <span className="font-bold">₹140,000-180,000</span>
            </div>
            <div className="flex justify-between items-center bg-purple-100 p-2 font-bold">
              <span>Retirement Pension (50%):</span>
              <span>₹70,000-90,000/mo (life)</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">NTPC: Entry ₹45,000 → Retirement ₹80,000</h3>
          <p className="text-sm">More gradual growth but still reaches excellent senior salaries by year 25.</p>

          <h3 className="font-bold text-lg mt-4">Which PSU has Fastest Salary Growth?</h3>
          <p className="text-sm">
            <strong>Indian Oil & HAL:</strong> Fastest growth (₹50,000 → ₹180,000 in 25-30 years)<br/>
            <strong>NTPC & GAIL:</strong> Steady growth (₹45,000 → ₹160,000 in 25-30 years)<br/>
            <strong>BHEL:</strong> Moderate growth (₹42,000 → ₹150,000 in 25-30 years)
          </p>
        </div>
      ),
    },
    {
      id: "benefits-comparison",
      title: "PSU Benefits Comparison",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Medical Benefits</h3>
          <p>
            <strong>NTPC, Indian Oil, HAL:</strong> All family members covered, international treatment allowed<br/>
            <strong>BHEL, GAIL:</strong> Self + family covered at government/private hospitals
          </p>

          <h3 className="font-bold text-lg mt-4">Housing Benefits</h3>
          <p>
            <strong>IOC & HAL:</strong> Company accommodations in metro cities OR ₹50,000-100,000/mo housing allowance<br/>
            <strong>NTPC:</strong> Housing allowance or company quarters (depending on posting)<br/>
            <strong>BHEL & GAIL:</strong> Subsidized housing loan + allowance
          </p>

          <h3 className="font-bold text-lg mt-4">Bonus & Performance Pay</h3>
          <p>
            <strong>IOC:</strong> 4-6 months additional salary annually (profit-linked)<br/>
            <strong>HAL:</strong> 3-5 months bonus<br/>
            <strong>NTPC:</strong> 2-4 months bonus<br/>
            <strong>BHEL & GAIL:</strong> 2-3 months bonus
          </p>

          <h3 className="font-bold text-lg mt-4">Pension</h3>
          <p>
            <strong>All PSUs:</strong> 50% of average salary for life (same as government)<br/>
            <strong>Some PSUs:</strong> Additional gratuity (₹5-10 lakhs for senior officers)
          </p>
        </div>
      ),
    },
    {
      id: "vs-government",
      title: "PSU vs Government Job Salary Comparison",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Entry Level Comparison</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-green-50 p-3">
              <span><strong>PSU (IOC/HAL):</strong></span>
              <span className="font-bold">₹50,000-65,000</span>
            </div>
            <div className="flex justify-between items-center bg-blue-50 p-3">
              <span><strong>Government (SSC/Railway):</strong></span>
              <span className="font-bold">₹25,000-35,000</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">💡 PSU pays 50-100% more at entry!</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Year 20 Comparison</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-green-50 p-3">
              <span><strong>PSU Senior:</strong></span>
              <span className="font-bold">₹140,000-180,000</span>
            </div>
            <div className="flex justify-between items-center bg-blue-50 p-3">
              <span><strong>Government Senior:</strong></span>
              <span className="font-bold">₹100,000-130,000</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">💡 PSU still ahead by ₹30,000-50,000/month</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Security & Growth</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li><strong>PSU:</strong> Higher salary, same job security, merit-based faster promotion</li>
            <li><strong>Government:</strong> Lower salary, same job security, promotion by seniority</li>
          </ul>
        </div>
      ),
    },
    {
      id: "how-to-join",
      title: "How to Get PSU Jobs with Best Salary",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Path 1: Engineering Graduate (Highest Salary)</h3>
          <div className="space-y-2 text-sm">
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-bold">Step 1: B.Tech Engineering Degree</p>
              <p className="text-xs text-gray-700">Any discipline (Mechanical, Electrical, Civil, etc.)</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-bold">Step 2: GATE Exam (or Direct Application)</p>
              <p className="text-xs text-gray-700">GATE score not always required; many PSUs accept diploma/degree holders</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-bold">Step 3: Apply to PSU Recruitment (Officer Grade)</p>
              <p className="text-xs text-gray-700">Entry directly at ₹45,000-65,000 for engineers</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Path 2: 12th Pass (Technician Track)</h3>
          <p className="text-sm">ITI/Diploma → Apprenticeship (₹10,000 stipend) → Permanent technician (₹25,000-35,000)</p>

          <h3 className="font-bold text-lg mt-4">Path 3: MBA (Management Track)</h3>
          <p className="text-sm">MBA + Work experience → Senior management roles (₹80,000-150,000+)</p>

          <h3 className="font-bold text-lg mt-4">Which PSU to Target for Best Salary?</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>🥇 <strong>Indian Oil:</strong> Highest entry (₹50,000-65,000) + highest growth (₹180,000+)</li>
            <li>🥈 <strong>HAL:</strong> High entry (₹48,000-62,000) + defense prestige</li>
            <li>🥉 <strong>NTPC:</strong> Good entry (₹45,000-60,000) + job security (power monopoly)</li>
          </ul>
        </div>
      ),
    },
  ],
  relatedQualifications: [
    { title: "Engineering Government Jobs", slug: "engineering-government-jobs" },
    { title: "B.Tech Government Jobs", slug: "b-tech-government-jobs" },
    { title: "MBA Government Jobs", slug: "mba-government-jobs" },
  ],
  relatedComparisons: [
    { title: "GATE vs Civil Service", slug: "gate-vs-civil-service" },
  ],
  faqs: [
    {
      question: "Which PSU pays the highest salary in India?",
      answer:
        "Indian Oil (IOC) and HAL pay highest: ₹50,000-65,000 entry → ₹180,000+ as senior officer. NTPC, BHEL, and GAIL also pay well (₹45,000-160,000+).",
    },
    {
      question: "Do PSUs have better salary than central government?",
      answer:
        "Yes. PSUs pay 10-25% more than central government jobs. Entry: PSU ₹50,000 vs Govt ₹25,000. Both have same pension (50%) and job security.",
    },
    {
      question: "Is IOC better than NTPC for salary?",
      answer:
        "IOC has higher entry salary (₹50,000-65,000 vs ₹45,000-60,000) and slightly faster growth. But NTPC has better job stability (power monopoly). Both are excellent.",
    },
    {
      question: "How much can you earn in PSU in 25 years?",
      answer:
        "Total salary over 25 years: ₹2.5-3.5 crore depending on PSU. Plus pension (₹70,000-90,000/mo) adds another ₹2-2.5 crore. Total lifetime: ₹5-6 crore.",
    },
  ],
};

export default function PSUSalaryComparisonPage() {
  return <SalaryGuideTemplate {...pageContent} />;
}
