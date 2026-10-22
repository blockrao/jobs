/**
 * Highest Paying Government Jobs Page
 *
 * Keyword Target: "Highest Paying Government Jobs" (2,100 searches/month)
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import SalaryGuideTemplate from "@/components/salary-guide-template";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Highest Paying Government Jobs in India 2025 - Top Salary Positions",
  description:
    "Highest paying government jobs: IAS, IFS, PSU executives, senior officers. Salary ₹150,000-300,000+ per month with pension, benefits, career guide.",
  ...pageSeo(`${SITE_URL}/salary-guides/highest-paying-government-jobs`, { index: true }),
};

const pageContent = {
  title: "Highest Paying Government Jobs in India",
  description: "Discover the most lucrative government positions in India with salary ₹150,000-300,000+ monthly, plus benefits, pension, and career progression.",
  sections: [
    {
      id: "top-paying-jobs",
      title: "Top 10 Highest Paying Government Jobs",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. IAS Officer (Indian Administrative Service)</h3>
          <p>
            <strong>Salary:</strong> ₹56,100 (entry) → ₹300,000+ (Chief Secretary)<br />
            <strong>Experience:</strong> 20-25 years to peak salary<br />
            <strong>Prestige:</strong> Highest government position in states
          </p>

          <h3 className="font-bold text-lg mt-4">2. IFS Officer (Indian Foreign Service)</h3>
          <p>
            <strong>Salary:</strong> ₹56,100 (entry) → ₹280,000+ (Ambassador)<br />
            <strong>Benefit:</strong> International postings, housing allowance, diplomatic privileges
          </p>

          <h3 className="font-bold text-lg mt-4">3. RBI Deputy Governor</h3>
          <p>
            <strong>Salary:</strong> ₹250,000-300,000+<br />
            <strong>Requirements:</strong> IAS/IFS with finance expertise, 15+ years experience
          </p>

          <h3 className="font-bold text-lg mt-4">4. Banking Governor / Chairman RBI/SBI</h3>
          <p>
            <strong>Salary:</strong> ₹200,000-350,000+<br />
            <strong>Requirements:</strong> Executive experience, finance background
          </p>

          <h3 className="font-bold text-lg mt-4">5. PSU Executive Director / CMD</h3>
          <p>
            <strong>Salary:</strong> ₹180,000-250,000+<br />
            <strong>Organizations:</strong> NTPC, Indian Oil, BHEL, HAL, GAIL
          </p>

          <h3 className="font-bold text-lg mt-4">6. CAG (Comptroller & Auditor General)</h3>
          <p>
            <strong>Salary:</strong> ₹200,000-220,000+<br />
            <strong>Prestige:</strong> Constitutional authority position, audits entire government
          </p>

          <h3 className="font-bold text-lg mt-4">7. Judge (High Court & Supreme Court)</h3>
          <p>
            <strong>Salary:</strong> ₹140,000-300,000+ (Supreme Court judges highest)<br />
            <strong>Prestige:</strong> Constitutional position with lifetime security
          </p>

          <h3 className="font-bold text-lg mt-4">8. ISRO / DRDO Director</h3>
          <p>
            <strong>Salary:</strong> ₹160,000-200,000+<br />
            <strong>Prestige:</strong> Scientific leadership, international recognition
          </p>

          <h3 className="font-bold text-lg mt=4">9. Police Commissioner / Police Chief</h3>
          <p>
            <strong>Salary:</strong> ₹120,000-180,000+<br />
            <strong>Experience:</strong> IPS officer with 20+ years
          </p>

          <h3 className="font-bold text-lg mt-4">10. University Vice-Chancellor</h3>
          <p>
            <strong>Salary:</strong> ₹100,000-180,000+<br />
            <strong>Requirements:</strong> Academic credentials, administrative experience
          </p>
        </div>
      ),
    },
    {
      id: "ias-progression",
      title: "IAS Salary Progression (Highest Path)",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Year-by-Year IAS Salary Growth</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded">
              <span><strong>Year 0-3: IAS Grade</strong></span>
              <span className="font-bold">₹56,100-70,000/mo</span>
            </div>
            <div className="flex justify-between items-center bg-blue-100 p-3 rounded">
              <span><strong>Year 3-8: IAS Senior Grade</strong></span>
              <span className="font-bold">₹80,000-110,000/mo</span>
            </div>
            <div className="flex justify-between items-center bg-green-50 p-3 rounded">
              <span><strong>Year 8-15: Joint Secretary</strong></span>
              <span className="font-bold">₹120,000-160,000/mo</span>
            </div>
            <div className="flex justify-between items-center bg-green-100 p-3 rounded">
              <span><strong>Year 15-20: Additional Secretary</strong></span>
              <span className="font-bold">₹170,000-220,000/mo</span>
            </div>
            <div className="flex justify-between items-center bg-purple-50 p-3 rounded">
              <span><strong>Year 20+: Chief Secretary</strong></span>
              <span className="font-bold">₹250,000-300,000+/mo</span>
            </div>
            <div className="flex justify-between items-center bg-purple-100 p-3 rounded font-bold">
              <span><strong>Retirement Pension (50%):</strong></span>
              <span>₹125,000-150,000/mo for life</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Total IAS Lifetime Earnings</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>30 years salary: ₹3.5-4 crore</li>
            <li>25 years pension: ₹3.75-4.5 crore</li>
            <li>Benefits (housing, medical, etc.): ₹50 lakhs</li>
            <li><strong>Total Lifetime Value: ₹8-9 crore</strong></li>
          </ul>
        </div>
      ),
    },
    {
      id: "psu-senior-positions",
      title: "PSU Senior Executive Salaries",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">PSU CMD (Chairman & Managing Director) Salary</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Basic Pay</span>
              <span className="font-bold">₹120,000-160,000</span>
            </div>
            <div className="flex justify-between">
              <span>Performance Bonus</span>
              <span className="font-bold">₹40,000-80,000</span>
            </div>
            <div className="flex justify-between">
              <span>Stock Dividend / Benefits</span>
              <span className="font-bold">₹20,000-40,000</span>
            </div>
            <hr />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Monthly</span>
              <span>₹180,000-280,000</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Companies: NTPC, Indian Oil, BHEL, HAL, Sterlite</h3>
          <p className="text-sm">Plus housing, car allowance, medical, international travel benefits.</p>

          <h3 className="font-bold text-lg mt-6">Path to PSU CMD</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Engineering degree required</li>
            <li>Entry as Officer (Grade A) - ₹40,000-50,000</li>
            <li>15-20 years experience to reach Director level</li>
            <li>Another 5 years to CMD position</li>
            <li>Total: 20-25 years to peak salary</li>
          </ul>
        </div>
      ),
    },
    {
      id: "banking-sector",
      title: "Banking Sector Senior Positions",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">SBI Chairman & MD</h3>
          <p>
            <strong>Salary:</strong> ₹220,000-280,000+<br />
            <strong>Bonus:</strong> 2-3 months additional annually<br />
            <strong>Prestige:</strong> Leads India's largest bank (2000+ branches, 50M+ customers)
          </p>

          <h3 className="font-bold text-lg mt-4">RBI Deputy Governor</h3>
          <p>
            <strong>Salary:</strong> ₹250,000-300,000+<br />
            <strong>Authority:</strong> Controls monetary policy, interest rates<br />
            <strong>Requirements:</strong> IAS/IFS + finance expertise, 15+ years
          </p>

          <h3 className="font-bold text-lg mt-4">Bank CEO / Executive Director</h3>
          <p>
            <strong>Salary:</strong> ₹150,000-220,000+<br />
            <strong>Companies:</strong> SBI, ICICI, PNB, BOI, Union Bank, etc.
          </p>

          <h3 className="font-bold text-lg mt-4">Progression: Clerk → Officer → Senior Manager → ED → CMD</h3>
          <p className="text-sm">
            Takes 25-30 years. Entry at ₹18,000, peak at ₹280,000+ = 15x salary growth. Among fastest growth in government sector.
          </p>
        </div>
      ),
    },
    {
      id: "comparison-vs-private",
      title: "Highest Government vs Private CEO Salaries",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Monthly Salary Comparison</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-green-50 p-3 rounded">
              <span><strong>IAS Chief Secretary (Government):</strong></span>
              <span className="font-bold">₹300,000+</span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
              <span><strong>Private Tech CEO:</strong></span>
              <span className="font-bold">₹400,000-800,000</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Lifetime Earnings</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-green-100 p-3 rounded">
              <span><strong>Government IAS + Pension:</strong></span>
              <span className="font-bold">₹8-9 crore</span>
            </div>
            <div className="flex justify-between items-center bg-gray-100 p-3 rounded">
              <span><strong>Private CEO (without savings):</strong></span>
              <span className="font-bold">₹4-6 crore</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              💡 Government wins due to guaranteed 50% pension for life. Private CEO needs disciplined ₹30-40% savings to match.
            </p>
          </div>

          <h3 className="font-bold text-lg mt-4">Stability & Security</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Government: Job security, no layoff risk, guaranteed pension</li>
            <li>Private: Higher current salary, but job security depends on company performance</li>
          </ul>
        </div>
      ),
    },
    {
      id: "how-to-reach",
      title: "How to Reach Highest Paying Government Jobs",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Path 1: IAS Route (Most Prestigious)</h3>
          <div className="space-y-2 text-sm">
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-bold">Step 1: Engineering/Law Degree (4-5 years)</p>
              <p className="text-xs text-gray-700">Any stream works, but engineering/economics help</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-bold">Step 2: UPSC Civil Service Exam (Preparation 1-2 years)</p>
              <p className="text-xs text-gray-700">Most competitive exam in India (0.1-0.2% selection rate)</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-bold">Step 3: IAS Training (2 years)</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-bold">Step 4: Start as IAS Grade (₹56,100/month)</p>
              <p className="text-xs text-gray-700">20-25 years progression to Chief Secretary (₹300,000+)</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Path 2: Banking Clerk → Senior (Fast Track)</h3>
          <p className="text-sm">Entry at ₹18,000 → Officer in 7 years (₹50,000) → Senior Officer in 15 years (₹100,000+) → CEO in 25 years (₹280,000+)</p>

          <h3 className="font-bold text-lg mt-4">Path 3: Engineering → PSU Executive (Technical Track)</h3>
          <p className="text-sm">Entry as Engineer (₹40,000) → 20-25 years → Senior Director/CMD (₹200,000+)</p>

          <h3 className="font-bold text-lg mt-4">Time to Peak Salary</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>IAS: 20-25 years (very competitive to enter)</li>
            <li>Banking CEO: 25-30 years (easier entry, gradual growth)</li>
            <li>PSU CMD: 20-25 years (requires engineering degree)</li>
          </ul>
        </div>
      ),
    },
  ],
  relatedQualifications: [
    { title: "Engineering Government Jobs", slug: "engineering-government-jobs" },
    { title: "MBA Government Jobs", slug: "mba-government-jobs" },
    { title: "B.Com Government Jobs", slug: "b-com-government-jobs" },
  ],
  relatedComparisons: [
    { title: "Government vs Private Salary", slug: "government-vs-private" },
  ],
  faqs: [
    {
      question: "What is the highest starting salary in government jobs?",
      answer:
        "IAS/IFS offers highest starting salary: ₹56,100 per month. After UPSC, officers directly start at senior level. This is higher than most private sector entry-level salaries.",
    },
    {
      question: "How long does it take to reach ₹200,000+ government salary?",
      answer:
        "IAS: 15-20 years (year 0 ₹56,100 → year 20 ₹200,000+). Banking: 20-25 years (year 0 ₹18,000 → year 25 ₹200,000+). PSU Executive: 15-20 years for senior positions.",
    },
    {
      question: "Which government job reaches ₹300,000+ salary?",
      answer:
        "IAS Chief Secretary, Chief of Police, RBI Deputy Governor, Bank Chairman, PSU CMD can all reach ₹250,000-₹300,000+ monthly salary after 20-25 years of experience.",
    },
    {
      question: "Is government salary or private sector salary higher?",
      answer:
        "Private sector entry usually higher (₹50,000 vs ₹25,000). But government catches up after 15-20 years and eventually surpasses private due to guaranteed pension. Long-term government wins.",
    },
    {
      question: "Do IAS officers get additional benefits beyond salary?",
      answer:
        "Yes. Housing, car allowance, security (for senior ranks), international travel, 50% pension for life, medical coverage, children's education allowance. Total additional value: ₹50,000-100,000/month.",
    },
  ],
};

export default function HighestPayingGovernmentJobsPage() {
  return <SalaryGuideTemplate {...pageContent} />;
}
