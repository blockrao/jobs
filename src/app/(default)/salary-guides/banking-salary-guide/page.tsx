/**
 * Banking Salary Guide Page
 *
 * Keyword Target: "Banking Salary Guide" (1,600 searches/month)
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import SalaryGuideTemplate from "@/components/salary-guide-template";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbSchema, buildFAQSchema, jsonLdGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Banking Salary Guide India 2025 - Clerk to Manager Pay Scale",
  description:
    "Banking salary guide: Clerk (₹18,000-25,000) → Officer (₹50,000) → Manager (₹100,000+). SBI, IBPS, public bank salary structure and growth.",
  ...pageSeo(`${SITE_URL}/salary-guides/banking-salary-guide`, { index: true }),
};

const pageContent = {
  title: "Banking Salary Guide in India",
  description:
    "Complete banking sector salary guide from clerk to senior management. Understand pay scales, benefits, and 25-year career progression.",
  sections: [
    {
      id: "banking-overview",
      title: "Banking Job Salary Overview",
      content: (
        <div className="space-y-4">
          <p>
            Banking is one of the best government sectors for salary growth. Start at ₹18,000 as clerk, reach ₹150,000+ as senior manager in 25-30 years. Clear progression with high job security.
          </p>
          <h3 className="font-bold text-lg mt-4">Key Banking Advantages:</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ Entry-level jobs widely available (10,000+ annually)</li>
            <li>✓ Fastest salary growth among government sectors</li>
            <li>✓ Promotion by merit (not just seniority)</li>
            <li>✓ Defined benefit pension (50% salary for life)</li>
            <li>✓ Good work environment and facilities</li>
          </ul>
        </div>
      ),
    },
    {
      id: "clerk-to-officer",
      title: "Banking Job Positions & Salaries",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Banking Clerk (Entry Level)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span><strong>Salary Range</strong></span>
              <span className="font-bold">₹18,000-25,000</span>
            </div>
            <div className="flex justify-between">
              <span>Positions</span>
              <span className="font-bold">10,000+ annually</span>
            </div>
            <div className="flex justify-between">
              <span>Experience to Officer</span>
              <span className="font-bold">5-7 years</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">Counter operations, customer service, data entry</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Probationary Officer (PO) / Junior Officer</h3>
          <div className="bg-green-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span><strong>Salary Range</strong></span>
              <span className="font-bold">₹35,000-50,000</span>
            </div>
            <div className="flex justify-between">
              <span>Requirements</span>
              <span className="font-bold">Graduate + IBPS exam</span>
            </div>
            <div className="flex justify-between">
              <span>Faster Route</span>
              <span className="font-bold">Skip clerk, enter directly</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">Loan disbursement, credit analysis, customer relationship</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Senior Officer / Manager</h3>
          <div className="bg-yellow-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span><strong>Salary Range</strong></span>
              <span className="font-bold">₹70,000-100,000</span>
            </div>
            <div className="flex justify-between">
              <span>Years to Reach</span>
              <span className="font-bold">10-15 years from clerk</span>
            </div>
            <div className="flex justify-between">
              <span>From PO</span>
              <span className="font-bold">5-8 years</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">Branch management, credit portfolio, team leadership</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Senior Manager / Circle Manager</h3>
          <div className="bg-purple-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span><strong>Salary Range</strong></span>
              <span className="font-bold">₹100,000-150,000</span>
            </div>
            <div className="flex justify-between">
              <span>Years to Reach</span>
              <span className="font-bold">20-25 years from clerk</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">Multi-branch supervision, revenue targets, strategy</p>
          </div>
        </div>
      ),
    },
    {
      id: "30-year-progression",
      title: "Complete 30-Year Salary Progression",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Path 1: Clerk → Officer (Traditional)</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-blue-50 p-2">
              <span><strong>Year 0-2: Probation</strong></span>
              <span className="font-bold">₹18,000-20,000</span>
            </div>
            <div className="flex justify-between items-center bg-blue-100 p-2">
              <span>Year 2-7: Confirmed Clerk</span>
              <span className="font-bold">₹22,000-32,000</span>
            </div>
            <div className="flex justify-between items-center bg-green-50 p-2">
              <span>Year 7-12: Officer (Promoted)</span>
              <span className="font-bold">₹40,000-60,000</span>
            </div>
            <div className="flex justify-between items-center bg-green-100 p-2">
              <span>Year 12-20: Senior Officer</span>
              <span className="font-bold">₹70,000-100,000</span>
            </div>
            <div className="flex justify-between items-center bg-purple-50 p-2">
              <span>Year 20-30: Manager/Circle Manager</span>
              <span className="font-bold">₹110,000-160,000</span>
            </div>
            <div className="flex justify-between items-center bg-purple-100 p-2 font-bold">
              <span>Retirement Pension (50%):</span>
              <span>₹55,000-80,000/mo (life)</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Path 2: Direct Officer Entry (Graduate)</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-green-50 p-2">
              <span><strong>Year 0-2: Probationary Officer</strong></span>
              <span className="font-bold">₹35,000-45,000</span>
            </div>
            <div className="flex justify-between items-center bg-green-100 p-2">
              <span>Year 2-10: Officer</span>
              <span className="font-bold">₹50,000-75,000</span>
            </div>
            <div className="flex justify-between items-center bg-yellow-50 p-2">
              <span>Year 10-18: Senior Officer</span>
              <span className="font-bold">₹85,000-120,000</span>
            </div>
            <div className="flex justify-between items-center bg-yellow-100 p-2">
              <span>Year 18-28: Manager/Circle Manager</span>
              <span className="font-bold">₹130,000-170,000</span>
            </div>
            <div className="flex justify-between items-center bg-purple-100 p-2 font-bold">
              <span>Retirement Pension (50%):</span>
              <span>₹65,000-85,000/mo (life)</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Total Lifetime Earnings (30 years)</h3>
          <p className="text-sm">
            <strong>Clerk path:</strong> ₹1.5 crore salary + ₹1.5 crore pension = ₹3 crore total<br/>
            <strong>PO path:</strong> ₹2.2 crore salary + ₹1.8 crore pension = ₹4 crore total
          </p>
        </div>
      ),
    },
    {
      id: "sbi-vs-other-banks",
      title: "SBI vs IBPS vs Private Banks Salary",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">SBI (State Bank of India)</h3>
          <p className="text-sm">
            <strong>Clerk Entry:</strong> ₹20,000-23,000<br/>
            <strong>PO Entry:</strong> ₹40,000-50,000<br/>
            <strong>Reason:</strong> Largest bank (50M+ customers), stable revenue, government owned
          </p>

          <h3 className="font-bold text-lg mt-4">IBPS Banks (SBI, PNB, BOI, Union)</h3>
          <p className="text-sm">
            <strong>Clerk Entry:</strong> ₹18,000-22,000<br/>
            <strong>PO Entry:</strong> ₹35,000-48,000<br/>
            <strong>Reason:</strong> Government banks unified under IBPS, standardized salaries
          </p>

          <h3 className="font-bold text-lg mt-4">Private Banks (ICICI, HDFC, Axis)</h3>
          <p className="text-sm">
            <strong>Clerk Entry:</strong> ₹22,000-30,000 (higher initially)<br/>
            <strong>PO Entry:</strong> ₹50,000-65,000<br/>
            <strong>Tradeoff:</strong> Higher salary but NO pension after retirement. No job security guarantee.
          </p>

          <h3 className="font-bold text-lg mt=4">Which is Better?</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>💡 <strong>Government Banks:</strong> Lower entry but lifetime security + 50% pension</li>
            <li>💰 <strong>Private Banks:</strong> Higher entry but retirement risk (need savings discipline)</li>
            <li>✅ <strong>Recommendation:</strong> Government banks win long-term (lifetime value ₹3-4 crore)</li>
          </ul>
        </div>
      ),
    },
    {
      id: "benefits",
      title: "Banking Benefits Beyond Salary",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. Dearness Allowance (DA)</h3>
          <p>Currently 20-25% of basic pay, increased every 6 months. Adds ₹4,000-7,000/month for officers.</p>

          <h3 className="font-bold text-lg mt-4">2. House Rent Allowance (HRA)</h3>
          <p>10-35% depending on city. ₹1,800-8,000/month for clerks, ₹3,500-17,500/month for officers.</p>

          <h3 className="font-bold text-lg mt-4">3. Banking Facility (Personal Loan)</h3>
          <p>Employees get special interest rates (3-6%) for personal/home loans. Saves ₹20,000-50,000 in interest annually.</p>

          <h3 className="font-bold text-lg mt-4">4. Medical Coverage</h3>
          <p>Health insurance for self + family, usually ₹50 lakh+ coverage. Essentially free healthcare.</p>

          <h3 className="font-bold text-lg mt-4">5. Bonus & Performance Pay</h3>
          <p>2-3 months bonus annually. Additional ₹30,000-90,000 depending on position.</p>

          <h3 className="font-bold text-lg mt-4">6. Leave Benefits</h3>
          <p>30 casual + 15 sick days per year = 45 days paid leave.</p>

          <h3 className="font-bold text-lg mt-4">7. Pension (50%)</h3>
          <p>Most valuable benefit: 50% of average salary for entire retirement. If you earned ₹80,000 average, pension is ₹40,000/month for life.</p>

          <h3 className="font-bold text-lg mt-4">Total Annual Benefits Value</h3>
          <p className="text-sm font-bold">₹2-4 lakhs beyond salary (DA + HRA + medical + loans + bonus)</p>
        </div>
      ),
    },
    {
      id: "how-to-join",
      title: "How to Join Banking & Get Best Salary",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Path 1: Clerk (12th Pass) - Slower but Available</h3>
          <div className="space-y-2 text-sm">
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-bold">Step 1: Complete 12th Pass</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-bold">Step 2: Appear for IBPS Clerk Exam (Easiest)</p>
              <p className="text-xs text-gray-700">Multiple choice online test, pass rate 10-15%</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-bold">Step 3: Selection & Training (1-2 months)</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-bold">Step 4: Join as Clerk (₹18,000-25,000)</p>
              <p className="text-xs text-gray-700">After 5-7 years, promote to officer</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Path 2: Officer (Graduate) - Faster, Higher Entry</h3>
          <div className="space-y-2 text-sm">
            <div className="bg-green-50 p-3 rounded">
              <p className="font-bold">Step 1: Complete Bachelor's Degree</p>
              <p className="text-xs text-gray-700">Any stream (Commerce, Science, Arts)</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="font-bold">Step 2: IBPS PO Exam (Moderate difficulty)</p>
              <p className="text-xs text-gray-700">Prelims + Mains + Interview. 5% pass rate.</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="font-bold">Step 3: Training (3-6 months)</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="font-bold">Step 4: Join as PO (₹35,000-50,000)</p>
              <p className="text-xs text-gray-700">2-year probation, then promotion prospects</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Which Path to Choose?</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>💡 <strong>Clerk:</strong> If you only have 12th pass, available immediately, grows to ₹100,000+ eventually</li>
            <li>💡 <strong>PO:</strong> If you're graduate, start at ₹35,000-50,000, reach ₹150,000+ faster (10 years sooner)</li>
          </ul>
        </div>
      ),
    },
  ],
  relatedQualifications: [
    { title: "B.Com Government Jobs", slug: "b-com-government-jobs" },
    { title: "12th Pass Government Jobs", slug: "12th-pass-government-jobs" },
    { title: "MBA Government Jobs", slug: "mba-government-jobs" },
  ],
  relatedComparisons: [
    { title: "IBPS vs SBI", slug: "ibps-vs-sbi" },
  ],
  faqs: [
    {
      question: "What is the entry salary for banking clerk?",
      answer:
        "Banking clerk entry salary is ₹18,000-25,000 per month (across SBI, IBPS, PNB, etc.). After probation (2 years), salary increases to ₹22,000-32,000.",
    },
    {
      question: "How long does it take to become a banking officer from clerk?",
      answer:
        "5-7 years. Work as clerk, then appear for officer promotion exam. Once promoted, you become junior officer at ₹40,000-50,000 salary.",
    },
    {
      question: "Is banking clerk job permanent?",
      answer:
        "Yes. After probation (2 years), you get permanent government job status with lifetime security and pension benefits.",
    },
    {
      question: "What is the maximum salary a bank employee can reach?",
      answer:
        "Typically ₹150,000-180,000+ as senior manager/circle manager (25+ years experience). Bank chairman/MD can reach ₹250,000-300,000+ but that's rare.",
    },
    {
      question: "Is banking career secure for 30 years?",
      answer:
        "Yes. Banking is essential service, guaranteed employment for lifetime. No layoff risk. 50% pension after retirement provides additional security.",
    },
  ],
};

export default function BankingSalaryGuidePage() {
  return <SalaryGuideTemplate {...pageContent} />;
}
