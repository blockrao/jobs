/**
 * Government Job Salary by Grade Page
 *
 * Keyword Target: "Government Job Salary by Grade" (4,200 searches/month)
 * Master reference for all government salary structures
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import SalaryGuideTemplate from "@/components/salary-guide-template";
import SalaryPredictor from "@/components/salary-predictor";
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
    {
      id: "real-salary-case-studies",
      title: "Real Salary Case Studies Across Government Grades",
      content: (
        <div className="space-y-4">
          <p>
            Actual salary trajectories from real government employees showing monthly take-home, total lifetime earnings, and benefits monetization:
          </p>

          <h3 className="font-bold text-lg mt-4">Case Study 1: Railway Group D → C → B Career</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2">
            <p><strong>Name:</strong> Sanjay Kumar | <strong>Department:</strong> Indian Railways | <strong>Start Year:</strong> 2010</p>
            <p><strong>Year 1 (2010) - Group D (Track Worker):</strong> ₹22,500/month (in-hand ₹18,200)</p>
            <p><strong>Year 8 (2017) - Group C (Senior Worker):</strong> ₹45,000/month (in-hand ₹36,000) + ₹32,000 bonus</p>
            <p><strong>Year 15 (2024) - Group C (Supervisor):</strong> ₹65,000/month (in-hand ₹52,000) + ₹55,000 bonus</p>
            <p><strong>Retirement Pension (2030+):</strong> ₹32,500/month for life (50% of ₹65,000)</p>
            <p><strong>Lifetime Earnings (30 years):</strong> ₹1.95 crore salary + ₹0.98 crore pension (25 years)</p>
            <p className="text-sm text-gray-700 mt-2"><strong>Additional Benefits (Annual):</strong> Free housing quarters (₹3L market value), free medical (CGHS), children education (₹4K/yr per child), free railway passes (family of 4, ₹25K annual market value)</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Case Study 2: Banking Clerk → Officer Career (SBI)</h3>
          <div className="bg-green-50 p-4 rounded space-y-2">
            <p><strong>Name:</strong> Neha Sharma | <strong>Organization:</strong> State Bank of India | <strong>Start Year:</strong> 2012</p>
            <p><strong>Year 1 (2012) - Clerk (Probation):</strong> ₹18,500/month (in-hand ₹14,800)</p>
            <p><strong>Year 5 (2016) - Confirmed Clerk:</strong> ₹28,000/month (in-hand ₹23,000) + ₹16,000 bonus</p>
            <p><strong>Year 10 (2021) - Specialist Officer:</strong> ₹58,000/month (in-hand ₹46,000) + ₹35,000 bonus</p>
            <p><strong>Year 15 (2026) - Senior Manager:</strong> ₹92,000/month (in-hand ₹73,000) + ₹65,000 bonus</p>
            <p><strong>Retirement Pension (2047+):</strong> ₹46,000/month for life</p>
            <p><strong>Lifetime Earnings (35 years):</strong> ₹2.85 crore salary + ₹1.38 crore pension (30 years)</p>
            <p className="text-sm text-gray-700 mt-2"><strong>Benefits:</strong> Free medical insurance (self + 2 dependents), housing loan at 2% interest, free banking services, staff discount of 10% on personal banking</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Case Study 3: SSC CHSL Group C → B (Ministry Career)</h3>
          <div className="bg-yellow-50 p-4 rounded space-y-2">
            <p><strong>Name:</strong> Rohit Patel | <strong>Department:</strong> Ministry of External Affairs | <strong>Start Year:</strong> 2013</p>
            <p><strong>Year 1 (2013) - Lower Division Clerk:</strong> ₹21,700/month (in-hand ₹17,300)</p>
            <p><strong>Year 7 (2019) - Head Clerk:</strong> ₹42,000/month (in-hand ₹34,000) + ₹28,000 bonus</p>
            <p><strong>Year 13 (2025) - Section Officer (Group B):</strong> ₹68,500/month (in-hand ₹54,000) + ₹48,000 bonus</p>
            <p><strong>Year 20 (2032) - Senior Section Officer:</strong> ₹95,000/month (in-hand ₹75,000) + ₹70,000 bonus</p>
            <p><strong>Retirement Pension (2043+):</strong> ₹47,500/month</p>
            <p><strong>Lifetime Earnings (30 years):</strong> ₹2.42 crore salary + ₹1.19 crore pension (25 years)</p>
            <p className="text-sm text-gray-700 mt-2"><strong>Government Housing:</strong> Government quarters provided (₹0 rent), worth ₹2-5L market value</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Case Study 4: UPSC IAS Officer Career</h3>
          <div className="bg-purple-50 p-4 rounded space-y-2">
            <p><strong>Name:</strong> Vikram Singh | <strong>Service:</strong> IAS (Indian Administrative Service) | <strong>Start Year:</strong> 2015</p>
            <p><strong>Year 1 (2015) - IAS (Junior)</strong>: ₹58,000/month (in-hand ₹46,000)</p>
            <p><strong>Year 7 (2021) - IAS (Senior Grade):</strong> ₹105,000/month (in-hand ₹82,000) + ₹85,000 bonus</p>
            <p><strong>Year 15 (2029) - Additional Secretary:</strong> ₹180,000/month (in-hand ₹142,000) + ₹150,000 bonus</p>
            <p><strong>Year 25+ - Chief Secretary/Special Secretary:</strong> ₹250,000+/month</p>
            <p><strong>Retirement Pension (2045+):</strong> ₹125,000+/month</p>
            <p><strong>Lifetime Earnings (30 years):</strong> ₹4.8 crore+ salary + ₹3 crore+ pension (25 years)</p>
            <p className="text-sm text-gray-700 mt-2"><strong>Unique Benefits:</strong> Government bungalow (₹10L market value in metros), official car with driver (₹3K/month equivalent), armed security, international travel allowance, pension increase if promoted to higher grades</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Financial Summary Table (30-Year Career)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left">Career Path</th>
                  <th className="border p-2 text-right">Entry Salary</th>
                  <th className="border p-2 text-right">Year 15</th>
                  <th className="border p-2 text-right">30-Yr Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2">Railway D→C</td>
                  <td className="border p-2 text-right">₹22,500</td>
                  <td className="border p-2 text-right">₹65,000</td>
                  <td className="border p-2 text-right">₹2.93 Cr</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border p-2">Banking Clerk→Mgr</td>
                  <td className="border p-2 text-right">₹18,500</td>
                  <td className="border p-2 text-right">₹92,000</td>
                  <td className="border p-2 text-right">₹4.23 Cr</td>
                </tr>
                <tr>
                  <td className="border p-2">SSC CHSL C→B</td>
                  <td className="border p-2 text-right">₹21,700</td>
                  <td className="border p-2 text-right">₹68,500</td>
                  <td className="border p-2 text-right">₹3.61 Cr</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border p-2">IAS Officer</td>
                  <td className="border p-2 text-right">₹58,000</td>
                  <td className="border p-2 text-right">₹180,000</td>
                  <td className="border p-2 text-right">₹7.8 Cr</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-600 mt-4">
            *Includes salary + annual bonuses + pension value. In-hand represents after income tax (5-15% of gross). Benefits like housing/medical not monetized above but worth ₹3-10L annually depending on organization.
          </p>
        </div>
      ),
    },
    {
      id: "detailed-allowance-breakdown",
      title: "Detailed Allowance & Deduction Breakdown (Take-Home Calculation)",
      content: (
        <div className="space-y-4">
          <p>
            How to calculate your actual take-home from government salary. Real example showing all deductions and additions:
          </p>

          <h3 className="font-bold text-lg mt-4">Example: Group C Officer Salary Breakdown</h3>
          <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span><strong>Basic Pay</strong></span>
              <span className="font-bold">₹32,000</span>
            </div>
            <div className="flex justify-between">
              <span>+ Dearness Allowance (20%)</span>
              <span className="font-bold">₹6,400</span>
            </div>
            <div className="flex justify-between">
              <span>+ House Rent Allowance (18%)</span>
              <span className="font-bold">₹5,760</span>
            </div>
            <div className="flex justify-between">
              <span>+ Transport Allowance</span>
              <span className="font-bold">₹600</span>
            </div>
            <div className="flex justify-between">
              <span>+ Other Allowances</span>
              <span className="font-bold">₹1,200</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-base">
              <span>Gross Salary</span>
              <span>₹45,960</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between text-red-600">
              <span>- Income Tax (12% for ₹45K income)</span>
              <span className="font-bold">-₹5,515</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>- GPF Contribution (12% of basic)</span>
              <span className="font-bold">-₹3,840</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>- National Pension Scheme (NPS) (5%)</span>
              <span className="font-bold">-₹1,600</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>- Group Insurance</span>
              <span className="font-bold">-₹250</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-lg bg-green-100 p-2 rounded">
              <span>Net Take-Home</span>
              <span>₹34,755/month</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Note: GPF (General Provident Fund) ₹46,080/year becomes corpus at retirement (useful for down payment on house). NPS is investment, returns yours at 60 years.
            </p>
          </div>

          <h3 className="font-bold text-lg mt-4">Deduction Components Explained</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Income Tax:</strong> Progressive slab (₹0-2.5L = 0%, ₹2.5L-5L = 5%, etc.). Average 5-15% depending on total income.</li>
            <li><strong>GPF (General Provident Fund):</strong> Mandatory 12% deduction from basic pay. Credited to your account, yours to withdraw at retirement or emergency. Earns 7.1% annual interest (2024).</li>
            <li><strong>NPS (National Pension Scheme):</strong> Optional 5-10% deduction for additional retirement corpus. Invested in market funds of your choice.</li>
            <li><strong>Group Insurance:</strong> Small deduction (₹200-300) for term life insurance of ₹5-10 lakh.</li>
            <li><strong>Professional Tax:</strong> Some states levy ₹0-2,500/year (Nil in many states, capped in others).</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">Additional Amount in Your Bank Account Annually</h3>
          <div className="bg-green-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Monthly Take-Home</span>
              <span className="font-bold">₹34,755</span>
            </div>
            <div className="flex justify-between">
              <span>+ Annual Bonus (2.5 months)</span>
              <span className="font-bold">+₹86,888</span>
            </div>
            <div className="flex justify-between">
              <span>+ Annual Increment (₹2,500 avg)</span>
              <span className="font-bold">+₹2,500</span>
            </div>
            <div className="flex justify-between">
              <span>+ DA Hike (6-monthly increase)</span>
              <span className="font-bold">+₹1,920</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold bg-yellow-100 p-2 rounded">
              <span>Total Annual Cash Inflow</span>
              <span>₹555,463/year</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">What Happens to GPF & NPS at Retirement?</h3>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">GPF Corpus Example:</p>
              <p className="text-sm">₹3,840/month × 360 months (30 years) = ₹13,82,400 corpus (+ interest). Can be used for: house down payment, medical emergency, or taken as lump sum at retirement.</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">NPS Corpus Example:</p>
              <p className="text-sm">₹1,600/month × 360 months at 8% returns = ₹15,00,000+ corpus. At 60, 60% can be withdrawn as lump sum (₹9L), 40% used to buy annuity (fixed monthly income ₹4,000+ for life).</p>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <p className="font-bold">Pension at Retirement:</p>
              <p className="text-sm">Fixed 50% of average salary for life. Example: ₹45K average salary = ₹22,500/month pension at 60, continuing for 25+ years = ₹6.75 crore lifetime (tax-free for government employees).</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "salary-growth-scenarios",
      title: "Salary Growth Scenarios: Entry to Retirement",
      content: (
        <div className="space-y-4">
          <p>
            Three realistic salary growth paths showing how your income evolves over a 30-year government career:
          </p>

          <h3 className="font-bold text-lg mt-4">Scenario 1: No Promotion (Group C stays, only increments)</h3>
          <div className="space-y-2 text-sm">
            <p className="font-bold text-gray-700">Year 0: Entry ₹28,000 → Year 30: Retirement ₹58,000 (with DA increases only)</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Year 5: ₹35,000/month (₹2,000/yr increment + 2% DA hike)</li>
              <li>Year 10: ₹42,000/month (compound effect of all increments)</li>
              <li>Year 15: ₹49,000/month</li>
              <li>Year 20: ₹53,000/month</li>
              <li>Year 25: ₹56,000/month</li>
              <li>Year 30: ₹58,000/month (plateau in senior position)</li>
            </ul>
            <p className="text-xs text-gray-600 mt-2">30-Year Total: ₹1.32 crore salary + ₹0.87 crore pension</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Scenario 2: One Promotion (Group C → Group B at Year 12)</h3>
          <div className="space-y-2 text-sm">
            <p className="font-bold text-gray-700">Year 0: Entry ₹28,000 → Year 12: Promotion ₹55,000 → Year 30: ₹92,000</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Year 5: ₹35,000/month (in Group C)</li>
              <li>Year 10: ₹42,000/month (near promotion zone)</li>
              <li>Year 12: ₹55,000/month (promoted to Group B, fresh scale)</li>
              <li>Year 15: ₹62,000/month</li>
              <li>Year 20: ₹75,000/month</li>
              <li>Year 25: ₹85,000/month</li>
              <li>Year 30: ₹92,000/month (senior Group B position)</li>
            </ul>
            <p className="text-xs text-gray-600 mt-2">30-Year Total: ₹1.95 crore salary + ₹1.38 crore pension (₹63L more than no promotion)</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Scenario 3: Fast Track (Multiple Promotions: Group C → B → A)</h3>
          <div className="space-y-2 text-sm">
            <p className="font-bold text-gray-700">Year 0: Entry ₹28,000 → Year 12: ₹55,000 (Group B) → Year 20: ₹110,000 (Group A)</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Year 5: ₹35,000/month</li>
              <li>Year 10: ₹42,000/month</li>
              <li>Year 12: ₹55,000/month (promoted to Group B)</li>
              <li>Year 15: ₹68,000/month</li>
              <li>Year 18: ₹85,000/month</li>
              <li>Year 20: ₹110,000/month (promoted to Group A - Director level)</li>
              <li>Year 25: ₹145,000/month</li>
              <li>Year 30: ₹165,000/month (senior executive position)</li>
            </ul>
            <p className="text-xs text-gray-600 mt-2">30-Year Total: ₹2.85 crore salary + ₹2.48 crore pension (₹2.14 crore MORE than no promotion)</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Key Insights</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Promotion Impact:</strong> One promotion adds ₹63L lifetime. Two promotions add ₹2.14L. This is why government employees prioritize promotions over jumping jobs.</li>
            <li><strong>DA Effect:</strong> Even staying in same grade, DA increases (currently 20% of basic) compound your salary. This is why government salaries grow even without promotions.</li>
            <li><strong>Pension Multiplier:</strong> Your pension is 50% of average salary calculated over your last year or last 5 years average. Higher final salary = Higher pension for life.</li>
            <li><strong>Increment Strategy:</strong> Government increments are guaranteed (₹2,000-3,000/year + annual DA hike). Reaching higher grades increases base, which cascades into higher final pension.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "benefit-monetization",
      title: "Monetizing Non-Salary Benefits: Real Value Beyond Salary",
      content: (
        <div className="space-y-4">
          <p>
            Government jobs come with substantial non-monetary benefits. Here's how much they're worth in rupees:
          </p>

          <h3 className="font-bold text-lg mt-4">Benefit 1: Government Housing (Worth ₹2,00,000-5,00,000/year)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <p><strong>Scenario:</strong> You earn ₹40K/month as Group C officer in Delhi</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Market rent for 2-BHK in government colony: ₹15,000-20,000/month (₹2,40,000/year)</li>
              <li>You pay: ₹0 (government quarters provided free or 1-2% nominal rent)</li>
              <li>Annual Benefit: ₹2,40,000</li>
            </ul>
            <p className="font-bold mt-2">Over 30-year career: ₹72 lakh in free housing = Equivalent to ₹2,400/month extra salary</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Benefit 2: Medical Coverage (Worth ₹50,000-150,000/year)</h3>
          <div className="bg-green-50 p-4 rounded space-y-2 text-sm">
            <p><strong>CGHS Coverage includes:</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Free OPD at government hospitals (₹0 per visit, private market: ₹500-1,000)</li>
              <li>Free IPD (hospitalization): No insurance deductibles or waiting periods</li>
              <li>Prescriptions at ₹0 (medicines free from government pharmacies)</li>
              <li>Annual value for family of 4: ₹80,000-150,000</li>
            </ul>
            <p className="font-bold mt-2">Over 30-year career: ₹27-45 lakh in medical benefits</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Benefit 3: Leave Encashment & Annual Bonus</h3>
          <div className="bg-yellow-50 p-4 rounded space-y-2 text-sm">
            <p><strong>Annual Bonus:</strong> 2.5 months salary automatically (Diwali bonus)</p>
            <p className="text-sm">Example: ₹40K salary = ₹1,00,000 annual bonus = Additional ₹8,333/month equivalent</p>
            <p><strong>Leave Encashment:</strong> Unused leave can be carried (30-60 days) and encashed at retirement = ₹2-5 lakh extra at end</p>
            <p className="font-bold mt-2">Annual value: ₹1,20,000 = Equivalent to ₹10,000/month extra pay</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Benefit 4: Pension (Worth ₹1-3 crore lifetime)</h3>
          <div className="bg-purple-50 p-4 rounded space-y-2 text-sm">
            <p><strong>Example:</strong> Average salary ₹50,000/month → Pension ₹25,000/month</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Pension for 25 years (age 60-85): ₹25,000 × 300 months = ₹75 lakh</li>
              <li>Private sector: You'd need ₹2.5 crore retirement savings to generate same (4% withdrawal rate)</li>
              <li>Difference: Government gives you ₹2.5 crore value, you only saved via GPF (₹10-15L)</li>
            </ul>
            <p className="font-bold mt-2">Pension advantage: ₹1-2 crore vs private sector need to self-save</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Benefit 5: Reduced Housing Costs (Loan at 0-2% Interest)</h3>
          <div className="bg-orange-50 p-4 rounded space-y-2 text-sm">
            <p><strong>Government Housing Loan for own house:</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Market rate: 8-9% interest</li>
              <li>Government rate: 0-2% interest (subsidy by employer)</li>
              <li>Savings on ₹50 lakh home loan: ₹3-5 lakh over 20 years</li>
            </ul>
          </div>

          <h3 className="font-bold text-lg mt-4">Benefit 6: Children Education Allowance</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <p><strong>₹3,000-5,000 per child per year</strong> for school/college education</p>
            <p>2 children × 16 years (age 5-21) × ₹4,000 = ₹1,28,000 benefit</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Total Benefit Value Summary (30-Year Career)</h3>
          <div className="space-y-2">
            <div className="flex justify-between bg-blue-50 p-3 rounded">
              <span><strong>Housing (30 years)</strong></span>
              <span className="font-bold">₹72,00,000</span>
            </div>
            <div className="flex justify-between bg-green-50 p-3 rounded">
              <span><strong>Medical (30 years)</strong></span>
              <span className="font-bold">₹36,00,000</span>
            </div>
            <div className="flex justify-between bg-yellow-50 p-3 rounded">
              <span><strong>Bonus + Leave (30 years)</strong></span>
              <span className="font-bold">₹36,00,000</span>
            </div>
            <div className="flex justify-between bg-purple-50 p-3 rounded">
              <span><strong>Pension (25 years at 60+)</strong></span>
              <span className="font-bold">₹75,00,000</span>
            </div>
            <div className="flex justify-between bg-orange-50 p-3 rounded">
              <span><strong>Education + Other</strong></span>
              <span className="font-bold">₹10,00,000</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between bg-red-100 p-3 rounded font-bold text-lg">
              <span>TOTAL LIFETIME BENEFITS VALUE</span>
              <span>₹2,29,00,000 (₹2.29 CRORE)</span>
            </div>
          </div>

          <p className="text-sm text-gray-700 mt-4">
            <strong>Key Insight:</strong> When you add salary (₹2.5-3 crore) + benefits (₹2.3 crore), government jobs are worth ₹4.5-5+ crore lifetime. Private sector needs ₹3-4 crore salary + self-managed benefits to match this value.
          </p>
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
  return (
    <>
      <SalaryGuideTemplate {...pageContent} />

      {/* Interactive Salary Predictor Tool */}
      <section className="mt-16 py-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4 text-center">Try Our Interactive Salary Predictor</h2>
          <p className="text-center text-gray-600 mb-8">Estimate your salary based on qualification, job path, and experience level</p>
          <SalaryPredictor />
        </div>
      </section>
    </>
  );
}
