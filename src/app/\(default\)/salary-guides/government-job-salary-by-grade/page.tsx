/**
 * Government Job Salary by Grade Page
 *
 * Keyword Target: "Government Job Salary by Grade" (4,200 searches/month)
 * Master reference for all government salary structures
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import SalaryGuideTemplate from "@/components/salary-guide-template";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Government Job Salary by Grade in India 2025 - SSC, Railway, Banking Pay Scale",
  description:
    "Government job salary by grade: SSC, Railway, Banking, PSU pay scales. Entry-level ₹20,000-35,000, senior ₹100,000+, with benefits, pension, DA, HRA breakdown.",
  ...pageSeo(`${SITE_URL}/salary-guides/government-job-salary-by-grade`, { index: true }),
};

const pageContent = {
  title: "Government Job Salary by Grade in India",
  description:
    "Complete government job salary structure across all grades and organizations. Understand entry-level to senior-level compensation, benefits, and career earning potential.",
  sections: [
    {
      id: "salary-structure-overview",
      title: "Government Job Salary Structure Overview",
      content: (
        <div className="space-y-4">
          <p>
            Government job salaries in India follow a standardized pay scale system with multiple grades. Your salary depends on: job category (Group A/B/C/D), experience level, qualification, and organization (Central/State).
          </p>
          <p>
            <strong>Salary Components:</strong> Basic Pay + Dearness Allowance (DA) + House Rent Allowance (HRA) + Other Allowances = Total Monthly Salary
          </p>
          <h3 className="font-bold text-lg mt-4">Key Facts About Government Salaries:</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ Fixed pay scales ensure transparency and predictability</li>
            <li>✓ DA (Dearness Allowance) increases every 6 months with inflation</li>
            <li>✓ HRA varies by city (10-35% of basic pay)</li>
            <li>✓ Annual increments guaranteed (₹2,000-3,000 per year)</li>
            <li>✓ Defined benefit pension: 50% of average salary for life</li>
            <li>✓ 13th month bonus: 2-3 months salary annually</li>
          </ul>
        </div>
      ),
    },
    {
      id: "salary-by-grade",
      title: "Salary by Grade Level (Central Government)",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Group D (Lowest Entry Level)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Basic Pay</span>
              <span className="font-bold">₹18,000-22,000</span>
            </div>
            <div className="flex justify-between">
              <span>DA (20%)</span>
              <span className="font-bold">₹3,600-4,400</span>
            </div>
            <div className="flex justify-between">
              <span>HRA (10-15%)</span>
              <span className="font-bold">₹1,800-3,300</span>
            </div>
            <hr />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Monthly</span>
              <span>₹23,400-30,000</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Railway workers, postal staff, LDC (Lower Division Clerk) positions
            </p>
          </div>

          <h3 className="font-bold text-lg mt-6">Group C (Middle Level)</h3>
          <div className="bg-green-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Basic Pay</span>
              <span className="font-bold">₹25,000-35,000</span>
            </div>
            <div className="flex justify-between">
              <span>DA (20%)</span>
              <span className="font-bold">₹5,000-7,000</span>
            </div>
            <div className="flex justify-between">
              <span>HRA (15-20%)</span>
              <span className="font-bold">₹3,750-7,000</span>
            </div>
            <hr />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Monthly</span>
              <span>₹33,750-49,000</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Senior assistants, head clerks, junior engineers, teachers
            </p>
          </div>

          <h3 className="font-bold text-lg mt-6">Group B (Senior Middle)</h3>
          <div className="bg-yellow-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Basic Pay</span>
              <span className="font-bold">₹40,000-65,000</span>
            </div>
            <div className="flex justify-between">
              <span>DA (20%)</span>
              <span className="font-bold">₹8,000-13,000</span>
            </div>
            <div className="flex justify-between">
              <span>HRA (20-25%)</span>
              <span className="font-bold">₹8,000-16,250</span>
            </div>
            <hr />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Monthly</span>
              <span>₹56,000-94,250</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Deputy collectors, section officers, senior engineers, principals
            </p>
          </div>

          <h3 className="font-bold text-lg mt-6">Group A (Senior Executive)</h3>
          <div className="bg-purple-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Basic Pay</span>
              <span className="font-bold">₹56,100-90,000</span>
            </div>
            <div className="flex justify-between">
              <span>DA (20%)</span>
              <span className="font-bold">₹11,220-18,000</span>
            </div>
            <div className="flex justify-between">
              <span>HRA (25-30%)</span>
              <span className="font-bold">₹14,025-27,000</span>
            </div>
            <hr />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Monthly</span>
              <span>₹81,345-135,000</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              IAS officers, senior bureaucrats, additional secretaries, chief executives
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "salary-progression",
      title: "30-Year Salary Progression by Category",
      content: (
        <div className="space-y-6">
          <h3 className="font-bold text-lg">Railway Worker Path (Group D → Group C)</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span><strong>Year 0-3:</strong> Group D Worker</span>
              <span className="font-bold">₹25,000-28,000/mo</span>
            </div>
            <div className="flex justify-between items-center">
              <span><strong>Year 3-10:</strong> Senior Worker</span>
              <span className="font-bold">₹35,000-45,000/mo</span>
            </div>
            <div className="flex justify-between items-center">
              <span><strong>Year 10-20:</strong> Group C (Inspector/Supervisor)</span>
              <span className="font-bold">₹50,000-70,000/mo</span>
            </div>
            <div className="flex justify-between items-center bg-green-100 p-2 rounded">
              <span><strong>Year 20+ Retirement:</strong> Pension</span>
              <span className="font-bold">₹30,000-40,000/mo (50% salary)</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">SSC CHSL Path (Group C → Group B)</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span><strong>Year 0-5:</strong> Lower Division Clerk</span>
              <span className="font-bold">₹28,000-33,000/mo</span>
            </div>
            <div className="flex justify-between items-center">
              <span><strong>Year 5-12:</strong> Head Clerk</span>
              <span className="font-bold">₹40,000-55,000/mo</span>
            </div>
            <div className="flex justify-between items-center">
              <span><strong>Year 12+:</strong> Section Officer (Group B)</span>
              <span className="font-bold">₹60,000-85,000/mo</span>
            </div>
            <div className="flex justify-between items-center bg-green-100 p-2 rounded">
              <span><strong>Retirement Pension:</strong></span>
              <span className="font-bold">₹40,000-50,000/mo (50% salary)</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Banking Clerk Path (₹18,000 → ₹150,000+)</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span><strong>Year 0-2:</strong> Probationary Clerk</span>
              <span className="font-bold">₹18,000-23,000/mo</span>
            </div>
            <div className="flex justify-between items-center">
              <span><strong>Year 2-7:</strong> Confirmed Clerk</span>
              <span className="font-bold">₹25,000-40,000/mo</span>
            </div>
            <div className="flex justify-between items-center">
              <span><strong>Year 7-15:</strong> Officer (PO/SO)</span>
              <span className="font-bold">₹45,000-75,000/mo</span>
            </div>
            <div className="flex justify-between items-center">
              <span><strong>Year 15+:</strong> Senior Officer/Manager</span>
              <span className="font-bold">₹80,000-150,000+/mo</span>
            </div>
            <div className="flex justify-between items-center bg-green-100 p-2 rounded">
              <span><strong>Retirement Pension:</strong></span>
              <span className="font-bold">₹50,000-75,000/mo (50% salary)</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">IAS Officer Path (₹56,100 → ₹300,000+)</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span><strong>Year 0-3:</strong> IAS Grade (Entry)</span>
              <span className="font-bold">₹56,100-70,000/mo</span>
            </div>
            <div className="flex justify-between items-center">
              <span><strong>Year 3-10:</strong> IAS Senior Grade</span>
              <span className="font-bold">₹80,000-120,000/mo</span>
            </div>
            <div className="flex justify-between items-center">
              <span><strong>Year 10+:</strong> Additional Secretary/Chief Secretary</span>
              <span className="font-bold">₹150,000-300,000+/mo</span>
            </div>
            <div className="flex justify-between items-center bg-green-100 p-2 rounded">
              <span><strong>Retirement Pension:</strong></span>
              <span className="font-bold">₹100,000-150,000+/mo (50% salary)</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "benefits-breakdown",
      title: "Government Job Benefits (Beyond Base Salary)",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. Dearness Allowance (DA)</h3>
          <p>
            Currently 20-25% of basic pay, increased every 6 months based on inflation. This is a guaranteed benefit that compounds your salary.
          </p>

          <h3 className="font-bold text-lg mt-4">2. House Rent Allowance (HRA)</h3>
          <p>
            10-35% of basic pay depending on city tier (10% in tier-3 cities → 35% in metros). Essentially free housing compensation.
          </p>

          <h3 className="font-bold text-lg mt-4">3. Annual Bonus (13th Month)</h3>
          <p>
            2-3 months bonus salary every year (usually around Diwali). Additional ₹40,000-90,000 per year.
          </p>

          <h3 className="font-bold text-lg mt-4">4. Defined Benefit Pension</h3>
          <p>
            <strong>50% of average salary for life:</strong> If you earn ₹60,000/month average, your pension is ₹30,000/month for rest of your life.
          </p>

          <h3 className="font-bold text-lg mt-4">5. Medical Coverage</h3>
          <p>
            CGHS (Central Government Health Scheme) covers self + family. Essentially free healthcare at government hospitals.
          </p>

          <h3 className="font-bold text-lg mt-4">6. Leave Benefits</h3>
          <p>
            30 casual days + 15 sick days per year. Teachers get additional summer/winter breaks (2-3 months total).
          </p>

          <h3 className="font-bold text-lg mt-4">7. Government Housing</h3>
          <p>
            Subsidized government quarters or housing loan at 0-2% interest. Saves ₹20,000-50,000/month in rent.
          </p>

          <h3 className="font-bold text-lg mt-4">8. Children's Education Scholarship</h3>
          <p>
            ₹3,000-5,000 per child per year for education expenses.
          </p>

          <h3 className="font-bold text-lg mt-4">Total Benefits Value: ₹500,000+ annually (beyond salary)</h3>
          <p>
            When you add pension, medical, housing, leave, and bonuses, government jobs offer ₹500,000+ additional annual value beyond base salary.
          </p>
        </div>
      ),
    },
    {
      id: "salary-comparison",
      title: "Government vs Private Sector Salary Comparison",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Entry Level (Year 0-3)</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded">
              <span><strong>Government (Group D/C):</strong></span>
              <span className="font-bold">₹25,000-35,000</span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
              <span><strong>Private IT/Finance:</strong></span>
              <span className="font-bold">₹30,000-50,000</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              💡 Private pays more initially, but government has better benefits + pension
            </p>
          </div>

          <h3 className="font-bold text-lg mt-6">Mid Career (Year 7-12)</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-green-50 p-3 rounded">
              <span><strong>Government (Group B/C):</strong></span>
              <span className="font-bold">₹50,000-85,000</span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
              <span><strong>Private IT Manager:</strong></span>
              <span className="font-bold">₹80,000-150,000</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              💡 Private still leads, but government provides security + predictable growth
            </p>
          </div>

          <h3 className="font-bold text-lg mt-6">Senior Level (Year 15+)</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-purple-50 p-3 rounded">
              <span><strong>Government (Senior Officer):</strong></span>
              <span className="font-bold">₹100,000-200,000</span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
              <span><strong>Private VP/Senior Manager:</strong></span>
              <span className="font-bold">₹150,000-400,000+</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              💡 Private ceiling higher, but government pension (₹50,000-100,000/month) lifetime adds up faster
            </p>
          </div>

          <h3 className="font-bold text-lg mt-6">Lifetime Earnings (Including Pension)</h3>
          <div className="space-y-2 text-sm">
            <p className="bg-green-100 p-3 rounded font-bold">
              Government: ₹2-3 crore total (salary 30yr + pension 25yr)
            </p>
            <p className="bg-gray-100 p-3 rounded">
              Private (with retirement savings): ₹1.5-4 crore (depends on savings discipline)
            </p>
            <p className="text-xs text-gray-600 mt-2">
              ✅ Government tends to win long-term due to guaranteed pension + benefits security
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "salary-by-organization",
      title: "Salary Ranges by Major Government Organizations",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Railways (Entry: ₹18,000-28,000)</h3>
          <p>Group D (Worker) → Group C (Clerk) → Senior positions. Promotion every 3-5 years possible.</p>

          <h3 className="font-bold text-lg mt-4">Banking (Entry: ₹18,000-25,000)</h3>
          <p>
            Clerk → Officer → Manager progression. Private banks pay slightly more (₹20,000-30,000) but public banks offer better pension.
          </p>

          <h3 className="font-bold text-lg mt-4">PSU (₹20,000-40,000+ Entry)</h3>
          <p>
            NTPC, Indian Oil, BHEL typically pay 10-20% more than central government. Higher salary but same pension structure.
          </p>

          <h3 className="font-bold text-lg mt-4">SSC (₹20,000-35,000 Entry)</h3>
          <p>
            CHSL entry at ₹21,000 → reaches ₹75,000+ by year 20. One of the fastest-growing salary paths in government.
          </p>

          <h3 className="font-bold text-lg mt-4">UPSC IAS (₹56,100 Entry)</h3>
          <p>
            Highest government salary starting at ₹56,100. Reaches ₹300,000+ with Chief Secretary positions. Most competitive entry.
          </p>

          <h3 className="font-bold text-lg mt-4">Postal Services (₹18,000-30,000)</h3>
          <p>Postal Worker → Postal Assistant → Manager roles. Slower growth than railways/banking but still reliable.</p>

          <h3 className="font-bold text-lg mt-4">Teaching (₹28,000-50,000 Entry)</h3>
          <p>School teacher → Senior teacher → Principal. Lowest entry salary but good work-life balance and long vacation benefits.</p>
        </div>
      ),
    },
  ],
  relatedQualifications: [
    { title: "B.Tech Government Jobs", slug: "b-tech-government-jobs" },
    { title: "Engineering Government Jobs", slug: "engineering-government-jobs" },
    { title: "B.Com Government Jobs", slug: "b-com-government-jobs" },
    { title: "SSC CHSL Government Jobs", slug: "b-a-government-jobs" },
  ],
  relatedComparisons: [
    { title: "UPSC vs SSC Salary", slug: "upsc-vs-ssc" },
    { title: "PSU vs Government Jobs", slug: "psu-vs-government" },
  ],
  faqs: [
    {
      question: "What is the highest paying government job in India?",
      answer:
        "IAS (Indian Administrative Service) officers earn highest government salaries: ₹56,100 entry → ₹300,000+ as Chief Secretary (25+ years). IFS (Foreign Service) and other Group A services also offer similar compensation.",
    },
    {
      question: "How much do government employees earn after retirement?",
      answer:
        "Government pension is 50% of average salary for life. If you earned ₹80,000/month average, your monthly pension is ₹40,000 for rest of your life. This continues even after 25+ years of retirement.",
    },
    {
      question: "Do government salaries increase every year?",
      answer:
        "Yes. Annual increment (₹2,000-3,000 per year minimum). Plus DA increases every 6 months with inflation. So total salary compounds regularly. No company can match government job security on salary increases.",
    },
    {
      question: "Is government salary enough for middle class lifestyle in India?",
      answer:
        "Yes. Entry-level (₹25,000-35,000) supports basic middle-class lifestyle in tier-2 cities. Senior positions (₹100,000+) support comfortable upper-middle-class living. Add benefits (housing, medical) and it's very sufficient.",
    },
    {
      question: "Which government job gives highest salary growth percentage?",
      answer:
        "SSC CHSL shows fastest growth: ₹21,000 (entry) → ₹75,000+ (year 20) = 3.5x growth. Banking clerk also strong: ₹18,000 → ₹150,000 = 8x growth over 25 years.",
    },
    {
      question: "Are government salaries taxable?",
      answer:
        "Yes, government salaries are taxable under income tax rules. However, certain allowances (HRA, DA components) have different tax treatment. Overall, tax burden is 5-15% depending on income level.",
    },
    {
      question: "How does government salary compare with MBA graduate private salary?",
      answer:
        "MBA entry in private sector: ₹50,000-80,000. Government job entry: ₹20,000-35,000. But in 15 years: Government can reach ₹100,000-200,000 with pension, while private may reach ₹150,000-300,000. Government wins long-term due to pension.",
    },
    {
      question: "What happens to government salary if you take leave?",
      answer:
        "No salary deduction for casual/sick leave (30+15 days per year). Leave beyond that causes deduction. This is much better than private sector where unpaid leave costs money.",
    },
    {
      question: "Can government employees take salary advance?",
      answer:
        "Yes. Most government organizations allow salary advance of 1-2 months for emergencies, repaid within 3-6 months. No interest charges.",
    },
  ],
};

export default function GovernmentJobSalaryByGradePage() {
  return <SalaryGuideTemplate {...pageContent} />;
}
