/**
 * Railway Salary Guide Page
 *
 * Keyword Target: "Railway Salary Guide" (1,400 searches/month)
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import SalaryGuideTemplate from "@/components/salary-guide-template";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Railway Salary Guide India 2025 - RRB Group D to Officer Pay Scale",
  description:
    "Railway salary guide: Group D (₹18,000-25,000) → Group C (₹35,000-50,000) → Senior (₹80,000+). RRB NTPC, promotion, 30-year career progression.",
  ...pageSeo(`${SITE_URL}/salary-guides/railway-salary-guide`, { index: true }),
};

const pageContent = {
  title: "Railway Salary Guide in India",
  description:
    "Complete railway sector salary guide from Group D worker to senior officer. Understand pay scales, promotion paths, and 30-year career earnings.",
  sections: [
    {
      id: "railway-overview",
      title: "Railway Jobs Overview & Salary Structure",
      content: (
        <div className="space-y-4">
          <p>
            Indian Railways employ 1.2 million+ people with clear hierarchical salary structure. Most accessible government sector with 50,000+ positions annually. Start at ₹18,000 as worker, reach ₹100,000+ as senior officer.
          </p>
          <h3 className="font-bold text-lg mt-4">Railway Advantages:</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ 50,000+ positions annually (highest hiring)</li>
            <li>✓ Clear promotion hierarchy (Group D → C → B → A)</li>
            <li>✓ Guaranteed salary increments every year</li>
            <li>✓ Defined benefit pension (50% for life)</li>
            <li>✓ Good work-life balance (regular hours)</li>
          </ul>
        </div>
      ),
    },
    {
      id: "job-positions",
      title: "Railway Job Positions & Salaries",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Group D (Entry Level)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span><strong>Salary Range</strong></span>
              <span className="font-bold">₹18,000-25,000</span>
            </div>
            <div className="flex justify-between">
              <span>Positions</span>
              <span className="font-bold">30,000+ annually</span>
            </div>
            <div className="flex justify-between">
              <span>Roles</span>
              <span className="font-bold">Worker, porter, cleaner, laborer</span>
            </div>
            <div className="flex justify-between">
              <span>Exam</span>
              <span className="font-bold">RRB Group D (Easiest)</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">Pass rate 20-30%, most accessible government exam</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Group C (Middle Level)</h3>
          <div className="bg-green-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span><strong>Salary Range</strong></span>
              <span className="font-bold">₹35,000-50,000</span>
            </div>
            <div className="flex justify-between">
              <span>Positions</span>
              <span className="font-bold">10,000+ annually</span>
            </div>
            <div className="flex justify-between">
              <span>Roles</span>
              <span className="font-bold">Clerk, assistant, technician, inspector</span>
            </div>
            <div className="flex justify-between">
              <span>Entry Path</span>
              <span className="font-bold">RRB NTPC or promotion from Group D</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">7-10 years promotion from Group D OR direct via RRB NTPC exam</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Group B (Senior Level)</h3>
          <div className="bg-yellow-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span><strong>Salary Range</strong></span>
              <span className="font-bold">₹60,000-85,000</span>
            </div>
            <div className="flex justify-between">
              <span>Roles</span>
              <span className="font-bold">Senior officer, supervisor, section officer</span>
            </div>
            <div className="flex justify-between">
              <span>Years to Reach</span>
              <span className="font-bold">15-18 years from Group D</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">Management responsibility for departments</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Group A (Executive Level)</h3>
          <div className="bg-purple-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span><strong>Salary Range</strong></span>
              <span className="font-bold">₹80,000-150,000+</span>
            </div>
            <div className="flex justify-between">
              <span>Roles</span>
              <span className="font-bold">Chief, general manager, director</span>
            </div>
            <div className="flex justify-between">
              <span>Years to Reach</span>
              <span className="font-bold">20-30 years from Group D</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">Top railway management positions</p>
          </div>
        </div>
      ),
    },
    {
      id: "30-year-progression",
      title: "30-Year Railway Career Progression",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Group D Worker Path</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-blue-50 p-2">
              <span><strong>Year 0-3: Group D Worker</strong></span>
              <span className="font-bold">₹18,000-22,000</span>
            </div>
            <div className="flex justify-between items-center bg-blue-100 p-2">
              <span>Year 3-8: Senior Worker</span>
              <span className="font-bold">₹24,000-35,000</span>
            </div>
            <div className="flex justify-between items-center bg-green-50 p-2">
              <span>Year 8-15: Group C (Promoted)</span>
              <span className="font-bold">₹40,000-55,000</span>
            </div>
            <div className="flex justify-between items-center bg-green-100 p-2">
              <span>Year 15-25: Senior Officer</span>
              <span className="font-bold">₹60,000-85,000</span>
            </div>
            <div className="flex justify-between items-center bg-purple-50 p-2">
              <span>Year 25-30: Group B/A Officer</span>
              <span className="font-bold">₹80,000-120,000</span>
            </div>
            <div className="flex justify-between items-center bg-purple-100 p-2 font-bold">
              <span>Retirement Pension (50%):</span>
              <span>₹40,000-60,000/mo (life)</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">RRB NTPC Direct Entry Path</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-green-50 p-2">
              <span><strong>Year 0-3: Group C (Direct Entry)</strong></span>
              <span className="font-bold">₹35,000-45,000</span>
            </div>
            <div className="flex justify-between items-center bg-green-100 p-2">
              <span>Year 3-10: Senior Clerk</span>
              <span className="font-bold">₹50,000-65,000</span>
            </div>
            <div className="flex justify-between items-center bg-yellow-50 p-2">
              <span>Year 10-18: Group B (Senior Officer)</span>
              <span className="font-bold">₹70,000-90,000</span>
            </div>
            <div className="flex justify-between items-center bg-yellow-100 p-2">
              <span>Year 18-28: Senior Management</span>
              <span className="font-bold">₹100,000-140,000</span>
            </div>
            <div className="flex justify-between items-center bg-purple-100 p-2 font-bold">
              <span>Retirement Pension (50%):</span>
              <span>₹50,000-70,000/mo (life)</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Total Lifetime Earnings</h3>
          <p className="text-sm">
            <strong>Group D Worker:</strong> ₹1.2 crore salary + ₹1.2 crore pension = ₹2.4 crore<br/>
            <strong>NTPC Direct:</strong> ₹1.8 crore salary + ₹1.5 crore pension = ₹3.3 crore
          </p>
        </div>
      ),
    },
    {
      id: "exams",
      title: "Railway Exams for Entry",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">RRB Group D (Easiest)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span><strong>Difficulty</strong></span>
              <span className="font-bold">Very Easy</span>
            </div>
            <div className="flex justify-between">
              <span>Pass Rate</span>
              <span className="font-bold">20-30%</span>
            </div>
            <div className="flex justify-between">
              <span>Positions</span>
              <span className="font-bold">50,000+ annually</span>
            </div>
            <div className="flex justify-between">
              <span>Salary</span>
              <span className="font-bold">₹18,000-25,000</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">Most accessible government exam, easiest entry to secure job</p>
          </div>

          <h3 className="font-bold text-lg mt-4">RRB NTPC (Moderate)</h3>
          <div className="bg-green-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span><strong>Difficulty</strong></span>
              <span className="font-bold">Moderate</span>
            </div>
            <div className="flex justify-between">
              <span>Pass Rate</span>
              <span className="font-bold">5-8%</span>
            </div>
            <div className="flex justify-between">
              <span>Positions</span>
              <span className="font-bold">10,000+ annually</span>
            </div>
            <div className="flex justify-between">
              <span>Salary</span>
              <span className="font-bold">₹35,000-50,000 (Higher start)</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">For 12th pass: Clerk/assistant roles. Better entry salary than Group D.</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Which to Choose?</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>💡 <strong>Group D:</strong> If you have only 10th pass, easiest and fastest to job</li>
            <li>💡 <strong>NTPC:</strong> If you're 12th pass, better starting salary (₹35,000 vs ₹18,000)</li>
            <li>💡 <strong>Comparison:</strong> Group D + 7 years promotion = same as NTPC direct, but takes longer</li>
          </ul>
        </div>
      ),
    },
    {
      id: "benefits",
      title: "Railway Employee Benefits",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. Dearness Allowance (DA)</h3>
          <p>20-25% of basic pay, increased every 6 months. ₹3,600-6,000/month for workers, ₹8,000-17,500/month for officers.</p>

          <h3 className="font-bold text-lg mt-4">2. House Rent Allowance (HRA)</h3>
          <p>10-35% of basic pay depending on city. ₹1,800-8,000/month for workers, ₹3,500-17,500/month for officers.</p>

          <h3 className="font-bold text-lg mt-4">3. Railway Pass (Free Travel)</h3>
          <p>
            <strong>Free unlimited travel:</strong> Employee + family can travel anywhere in India for free using railway pass. Saves ₹20,000-50,000 annually.
          </p>

          <h3 className="font-bold text-lg mt-4">4. Medical Benefits</h3>
          <p>CGHS coverage for self + family. Free healthcare at government hospitals nationwide.</p>

          <h3 className="font-bold text-lg mt-4">5. Pension (50%)</h3>
          <p>Defined benefit pension: 50% of average salary for entire lifetime. This is worth crores over retirement.</p>

          <h3 className="font-bold text-lg mt-4">6. Leave Benefits</h3>
          <p>30 casual + 15 sick days = 45 days paid leave per year. Plus optional unpaid leave available.</p>

          <h3 className="font-bold text-lg mt-4">7. Bonus & Performance Pay</h3>
          <p>2-3 months bonus annually. Additional ₹30,000-75,000 depending on grade.</p>

          <h3 className="font-bold text-lg mt-4">8. Government Housing</h3>
          <p>Subsidized railway quarters in main cities OR housing loan at 0-2% interest.</p>

          <h3 className="font-bold text-lg mt-4">9. Children's Education Allowance</h3>
          <p>₹3,000-5,000 per child per year for education.</p>

          <h3 className="font-bold text-lg mt-4">Total Benefit Value</h3>
          <p className="font-bold text-sm">₹1.5-3 lakhs annually beyond salary (DA + HRA + pass + medical + housing + bonus)</p>
        </div>
      ),
    },
    {
      id: "how-to-join",
      title: "How to Join Indian Railways",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Path 1: RRB Group D (10th Pass)</h3>
          <div className="space-y-2 text-sm">
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-bold">Step 1: Complete 10th Pass</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-bold">Step 2: Apply for RRB Group D Exam</p>
              <p className="text-xs text-gray-700">Conducted by respective regional railways</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-bold">Step 3: Appear Online Test (2-3 months)</p>
              <p className="text-xs text-gray-700">Multiple choice, 90 minutes, basic knowledge required</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-bold">Step 4: Selection & Medical (1-2 months)</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-bold">Step 5: Join as Group D Worker (₹18,000-25,000)</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Path 2: RRB NTPC (12th Pass)</h3>
          <div className="space-y-2 text-sm">
            <div className="bg-green-50 p-3 rounded">
              <p className="font-bold">Step 1: Complete 12th Pass</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="font-bold">Step 2: Apply for RRB NTPC Exam</p>
              <p className="text-xs text-gray-700">Prelim + Main + Interview (3 stages)</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="font-bold">Step 3: Preparation (3-6 months)</p>
              <p className="text-xs text-gray-700">Competitive but moderate difficulty</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="font-bold">Step 4: Selection (2-3 months after exam)</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="font-bold">Step 5: Join as Group C (₹35,000-50,000)</p>
              <p className="text-xs text-gray-700">Direct entry at higher salary</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Fastest Route Recommendation</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>🏃 <strong>Fastest to Job:</strong> RRB Group D (3-4 months from exam to joining)</li>
            <li>💰 <strong>Best Salary:</strong> RRB NTPC (₹35,000 entry vs ₹18,000)</li>
            <li>⚖️ <strong>Best Choice:</strong> Group D if need job urgently, NTPC if patient for better salary</li>
          </ul>
        </div>
      ),
    },
  ],
  relatedQualifications: [
    { title: "10th Pass Government Jobs", slug: "10th-pass-government-jobs" },
    { title: "12th Pass Government Jobs", slug: "12th-pass-government-jobs" },
    { title: "Engineering Government Jobs", slug: "engineering-government-jobs" },
  ],
  faqs: [
    {
      question: "What is the entry salary for railway Group D worker?",
      answer:
        "₹18,000-25,000 per month. This includes basic pay (₹18,000) + DA (₹3,600) + HRA (₹1,800-3,000). After 3 years, salary becomes ₹20,000-28,000.",
    },
    {
      question: "How many positions are available in RRB Group D?",
      answer:
        "50,000+ positions annually. This makes it the most accessible government job. With 20-30% pass rate, lakhs of candidates get selected every year.",
    },
    {
      question: "Can Group D worker become officer after 10 years?",
      answer:
        "Yes. After 7-10 years as Group D worker, you can appear for Group C promotion exam. Once promoted, you become officer at ₹35,000-50,000 salary.",
    },
    {
      question: "What is the maximum salary in railways?",
      answer:
        "Group A officers (chief, general manager) earn ₹100,000-150,000+ monthly after 25+ years experience. Railway board members can reach ₹200,000+.",
    },
    {
      question: "Is railway job more secure than banking job?",
      answer:
        "Both are equally secure with 50% pension guarantee. Railways has better work-life balance (8-hour shifts). Banking has faster salary growth (₹18,000 → ₹150,000 in 25 years vs railways ₹18,000 → ₹100,000).",
    },
  ],
};

export default function RailwaySalaryGuidePage() {
  return <SalaryGuideTemplate {...pageContent} />;
}
