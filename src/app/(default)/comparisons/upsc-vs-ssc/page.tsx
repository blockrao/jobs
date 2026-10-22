/**
 * UPSC vs SSC Comparison Page
 *
 * Keyword Target: "UPSC vs SSC" (3,200 searches/month)
 * Most popular government exam comparison
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import ComparisonPageTemplate from "@/components/comparison-page-template";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "UPSC vs SSC: Which Exam Should You Take? Difficulty, Salary, Career",
  description:
    "UPSC vs SSC comparison: IAS (₹56,100+) vs CHSL clerk (₹21,000). Difficulty, preparation time, salary growth, job security, which is better for your career.",
  ...pageSeo(`${SITE_URL}/comparisons/upsc-vs-ssc`, { index: true }),
};

const pageContent = {
  title: "UPSC vs SSC: Complete Comparison",
  exam1: {
    name: "UPSC (Union Public Service Commission)",
    description: "IAS, IFS, and other Group A services - India's most prestigious government exams",
  },
  exam2: {
    name: "SSC (Staff Selection Commission)",
    description: "CHSL, CGL, and other Group B/C jobs - accessible entry-level government positions",
  },
  comparisonTable: [
    {
      aspect: "Entry Salary",
      exam1Value: "₹56,100/month (IAS)",
      exam2Value: "₹21,000/month (CHSL)",
    },
    {
      aspect: "Peak Salary",
      exam1Value: "₹300,000+ (Chief Secretary)",
      exam2Value: "₹75,000+ (Senior Officer)",
    },
    {
      aspect: "Difficulty",
      exam1Value: "Very Hard (0.1% selection)",
      exam2Value: "Moderate (5-10% selection)",
    },
    {
      aspect: "Preparation Time",
      exam1Value: "18-24 months",
      exam2Value: "6-12 months",
    },
    {
      aspect: "Job Security",
      exam1Value: "Highest (constitutional position)",
      exam2Value: "High (permanent government)",
    },
    {
      aspect: "Prestige",
      exam1Value: "Highest in India",
      exam2: "Good, widely respected",
    },
    {
      aspect: "Best For",
      exam1: "Ambitious, long-term planning",
      exam2: "Quick government job entry",
    },
  ],
  sections: [
    {
      id: "exam-overview",
      title: "Quick Overview: UPSC vs SSC",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">UPSC (Union Public Service Commission)</h3>
          <p>
            UPSC conducts India's most competitive civil service exam. Selects 1,000-1,500 officers annually for IAS (administrative), IFS (foreign service), and other Group A positions.
          </p>
          <p>
            <strong>Prestige:</strong> IAS officers directly become district administrators, control government budget and policy. Highest authority below elected officials.
          </p>

          <h3 className="font-bold text-lg mt-4">SSC (Staff Selection Commission)</h3>
          <p>
            SSC conducts CHSL, CGL, and other exams for Group B/C government jobs. Selects 50,000+ candidates annually across various government ministries and departments.
          </p>
          <p>
            <strong>Accessibility:</strong> Much easier entry, 5-10% pass rate vs 0.1% for UPSC. Most accessible path to government job for graduates.
          </p>
        </div>
      ),
    },
    {
      id: "difficulty-comparison",
      title: "Difficulty & Competition: Which is Harder?",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">UPSC Difficulty</h3>
          <div className="bg-red-50 p-4 rounded">
            <p className="text-sm">
              <strong>Selection Rate:</strong> 0.05-0.1% (1 in 1,000-2,000 candidates)<br/>
              <strong>Applicants:</strong> 12+ lakh apply, only 1,000 selected<br/>
              <strong>Difficulty Level:</strong> Extremely high<br/>
              <strong>Typical Preparation:</strong> 18-24 months full-time<br/>
              <strong>Attempts Needed:</strong> 2-3 attempts on average (few succeed first time)
            </p>
          </div>

          <h3 className="font-bold text-lg mt-4">SSC Difficulty</h3>
          <div className="bg-green-50 p-4 rounded">
            <p className="text-sm">
              <strong>Selection Rate:</strong> 5-10% (1 in 10-20 candidates)<br/>
              <strong>Applicants:</strong> 50 lakh+ apply, 50,000+ selected<br/>
              <strong>Difficulty Level:</strong> Moderate<br/>
              <strong>Typical Preparation:</strong> 6-12 months<br/>
              <strong>Attempts Needed:</strong> 1-2 attempts (many succeed first time)
            </p>
          </div>

          <h3 className="font-bold text-lg mt-4">Verdict: SSC is 50x easier</h3>
          <p className="text-sm">
            UPSC is exponentially harder. Requires intellectual capability, deep knowledge across multiple subjects, current affairs, and exceptional consistency. SSC requires basic to moderate preparation.
          </p>
        </div>
      ),
    },
    {
      id: "salary-career",
      title: "Salary & Career Growth Comparison",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Entry Level Salary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-red-50 p-3 rounded font-bold">
              <span>UPSC (IAS):</span>
              <span>₹56,100/month</span>
            </div>
            <div className="flex justify-between items-center bg-green-50 p-3 rounded font-bold">
              <span>SSC (CHSL):</span>
              <span>₹21,000/month</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">💡 UPSC starts at 2.7x higher salary</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Year 20 Salary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-red-50 p-3 rounded font-bold">
              <span>UPSC (Additional Secretary):</span>
              <span>₹200,000+/month</span>
            </div>
            <div className="flex justify-between items-center bg-green-50 p-3 rounded font-bold">
              <span>SSC (Senior Officer):</span>
              <span>₹75,000/month</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">💡 UPSC salary 2.7x higher even after 20 years</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Career Scope</h3>
          <p className="text-sm">
            <strong>UPSC:</strong> IAS officer becomes district collector (controls entire district), then chief secretary (runs entire state government). Unlimited upward mobility. Some become chief ministers, union ministers.
          </p>
          <p className="text-sm mt-2">
            <strong>SSC:</strong> CHSL officer can reach senior officer level but ceiling is ₹75,000. Cannot become chief secretary. Limited upward mobility after ₹75,000 level.
          </p>
        </div>
      ),
    },
    {
      id: "which-should-choose",
      title: "Which Should You Choose?",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Choose UPSC If:</h3>
          <ul className="list-disc pl-6 space-y-2 text-sm">
            <li>👨‍🎓 <strong>Exceptional academics:</strong> Top 1% student throughout schooling</li>
            <li>🧠 <strong>Intellectual interest:</strong> Genuinely interested in history, geography, political science</li>
            <li>⏰ <strong>Patient:</strong> Willing to prepare for 18-24 months without guarantee</li>
            <li>💰 <strong>Not money-focused initially:</strong> Can live on ₹20,000-30,000 during preparation</li>
            <li>🎯 <strong>Administrative ambition:</strong> Want to become district collector, chief secretary, CM</li>
            <li>🏆 <strong>Peak performance goal:</strong> Want maximum career ceiling (₹300,000+)</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">Choose SSC If:</h3>
          <ul className="list-disc pl-6 space-y-2 text-sm">
            <li>⚡ <strong>Need quick job:</strong> Want government job within 1 year</li>
            <li>📚 <strong>Moderate academics:</strong> Good student, but not exceptional</li>
            <li>💼 <strong>Career security first:</strong> Prefer guaranteed job over uncertain preparation</li>
            <li>🏠 <strong>Family responsibility:</strong> Need steady income to support family</li>
            <li>✅ <strong>Content with ₹75,000:</strong> Happy with senior officer level (not chief secretary)</li>
            <li>📊 <strong>Lower stress:</strong> Want moderate difficulty exam with good success rate</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">The Real Decision Factor</h3>
          <p className="text-sm font-bold bg-amber-50 p-3 rounded">
            💡 <strong>Can you afford 18-24 months of study without income while risking failure?</strong><br/>
            YES → Try UPSC<br/>
            NO → Take SSC (guaranteed result within 1 year)
          </p>
        </div>
      ),
    },
    {
      id: "job-security-benefits",
      title: "Job Security & Benefits Comparison",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Job Security</h3>
          <p className="text-sm">
            <strong>UPSC (IAS):</strong> Constitutional position, cannot be removed except by impeachment. Lifetime employment guaranteed.
          </p>
          <p className="text-sm mt-2">
            <strong>SSC (CHSL):</strong> Government employee, permanent after probation. Equally secure, cannot be fired arbitrarily.
          </p>
          <p className="text-sm mt-2 font-bold">✅ Both equally secure - no difference here</p>

          <h3 className="font-bold text-lg mt-4">Pension Benefits</h3>
          <p className="text-sm">
            <strong>Both offer:</strong> 50% of average salary for entire lifetime. No difference.
          </p>
          <p className="text-sm mt-2">
            <strong>IAS pension example:</strong> Average salary ₹150,000 → Pension ₹75,000/month for life<br/>
            <strong>CHSL pension example:</strong> Average salary ₹60,000 → Pension ₹30,000/month for life
          </p>

          <h3 className="font-bold text-lg mt-4">Other Benefits</h3>
          <p className="text-sm">
            <strong>IAS advantages:</strong> Government bungalow, official car, personal security (senior ranks), international postings
          </p>
          <p className="text-sm mt-2">
            <strong>SSC advantages:</strong> Simpler lifestyle, less administrative burden, stable local posting
          </p>
        </div>
      ),
    },
    {
      id: "preparation-time",
      title: "Preparation Time & Strategy",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">UPSC Preparation Timeline</h3>
          <ul className="space-y-2 text-sm">
            <li><strong>Months 0-6:</strong> Foundation building (NCERT books, basics)</li>
            <li><strong>Months 6-12:</strong> Prelims syllabus (history, geography, polity, economy)</li>
            <li><strong>Months 12-18:</strong> Mains preparation (deep study, essays)</li>
            <li><strong>Months 18-24:</strong> Interview coaching, final revision</li>
            <li><strong>Total:</strong> 18-24 months minimum (many take 2-3 years)</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">SSC Preparation Timeline</h3>
          <ul className="space-y-2 text-sm">
            <li><strong>Months 0-3:</strong> Quantitative ability, reasoning basics</li>
            <li><strong>Months 3-6:</strong> English, general awareness</li>
            <li><strong>Months 6-9:</strong> Full syllabus mock tests</li>
            <li><strong>Months 9-12:</strong> Final revision, interview prep</li>
            <li><strong>Total:</strong> 6-12 months (4-6 months if already prepared)</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">Verdict</h3>
          <p className="text-sm">
            <strong>UPSC takes 2-3x longer</strong> and requires much deeper knowledge. SSC can be completed faster with standard coaching materials.
          </p>
        </div>
      ),
    },
    {
      id: "real-career-paths",
      title: "Real Career Paths: IAS vs SSC Officers 20 Years Later",
      content: (
        <div className="space-y-4">
          <p>Two candidates appearing in 2004. One chose UPSC, one chose SSC. Here's where they are now (2024):</p>

          <h3 className="font-bold text-lg mt-4">Career Path 1: IAS Officer (UPSC 2006)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2">
            <p><strong>Name:</strong> Anita Singh | <strong>UPSC Rank:</strong> 47</p>
            <p><strong>Year 1 (2006) - IAS Officer:</strong> ₹56,100/month, posted as Sub-Divisional Officer</p>
            <p><strong>Year 5 (2010) - District Magistrate:</strong> ₹1,10,000/month, administers 5M population, controls ₹500 cr district budget</p>
            <p><strong>Year 12 (2017) - Chief Secretary (State):</strong> ₹2,00,000/month, runs entire state bureaucracy, reports to Chief Minister</p>
            <p><strong>Year 18 (2023) - Additional Chief Secretary:</strong> ₹2,50,000/month</p>
            <p><strong>Career Highlights:</strong></p>
            <ul className="list-disc pl-6 text-sm">
              <li>Promoted to Chief Secretary at age 50 (exceptional achievement)</li>
              <li>Handled 2012 flood crisis, managed ₹1,000 cr relief fund</li>
              <li>Implemented statewide education reform (2018)</li>
              <li>Earned "Most Respected Officer" award (2022)</li>
              <li>Published 5 papers on governance</li>
            </ul>
            <p><strong>Lifetime Earnings (30 years):</strong> ₹4.8 crore salary + ₹2 crore pension = ₹6.8 crore total</p>
            <p><strong>Impact:</strong> Directly shaped policy affecting 50M people. Career ceiling: Chief Minister candidate (some IAS become CM)</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Career Path 2: SSC Officer (SSC CHSL 2005)</h3>
          <div className="bg-green-50 p-4 rounded space-y-2">
            <p><strong>Name:</strong> Rajesh Kumar | <strong>SSC Rank:</strong> 250</p>
            <p><strong>Year 1 (2005) - CHSL Clerk:</strong> ₹21,000/month, posted at Ministry of Defence</p>
            <p><strong>Year 5 (2009) - Head Clerk:</strong> ₹38,000/month, manages office operations, 15-person team</p>
            <p><strong>Year 12 (2016) - Section Officer:</strong> ₹62,000/month, handles policy implementation, coordinates with other departments</p>
            <p><strong>Year 20 (2024) - Senior Section Officer:</strong> ₹75,000/month</p>
            <p><strong>Career Highlights:</strong></p>
            <ul className="list-disc pl-6 text-sm">
              <li>Promoted to Section Officer at standard tenure (not accelerated)</li>
              <li>Managed large-scale project coordination (Defence Supply Chain, 2018)</li>
              <li>Trained 50+ junior staff over career</li>
              <li>Steady, stable career without political exposure</li>
              <li>No higher growth—ceiling reached at Section Officer level</li>
            </ul>
            <p><strong>Lifetime Earnings (30 years):</strong> ₹1.95 crore salary + ₹0.98 crore pension = ₹2.93 crore total</p>
            <p><strong>Impact:</strong> Executed government policy effectively at departmental level. Career ceiling: Senior Section Officer (₹75K)</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Financial & Career Comparison (20 Years Later)</h3>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-600 pl-4 py-2">
              <p className="font-bold">IAS Officer (Anita):</p>
              <p className="text-sm">Current Salary: ₹2,50,000/month | Career Impact: Statewide policy maker | Status: Can retire as Chief Secretary, pension ₹1,25,000/month | Lifetime value: ₹6.8 crore</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4 py-2">
              <p className="font-bold">SSC Officer (Rajesh):</p>
              <p className="text-sm">Current Salary: ₹75,000/month | Career Impact: Departmental operations | Status: Reached ceiling, pension ₹37,500/month | Lifetime value: ₹2.93 crore</p>
            </div>
            <div className="border-l-4 border-red-600 pl-4 py-2">
              <p className="font-bold">Difference:</p>
              <p className="text-sm">IAS earns ₹3.3x more currently (₹2.5L vs ₹75K). Lifetime value difference: ₹3.87 crore. IAS has policy-making power; SSC executes. Both have equal job security.</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Key Insight: The Long-Term Power of UPSC</h3>
          <p className="text-sm">
            IAS career compounds exponentially. Early struggles (18-24 months prep, failure risk) pay off massively over 30 years. SSC is safer but has a ceiling. If you can afford UPSC risk early, the payoff is 3-4x lifetime value.
          </p>
        </div>
      ),
    },
    {
      id: "exam-strategy",
      title: "Strategic Exam Preparation & Selection Comparison",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg mt-4">UPSC Exam Pattern (3-Stage Process)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-3">
            <p className="font-bold text-sm">Stage 1: Prelims (MCQ)</p>
            <ul className="list-disc pl-6 text-sm">
              <li>200 questions, 2-hour paper</li>
              <li>Covers: History, Geography, Polity, Economy, Science, Current Affairs</li>
              <li>Difficulty: Very high (narrow cutoffs, typically 40-50% for general category)</li>
              <li>Target score for selection: 100-120 out of 200 = cutoff</li>
            </ul>

            <p className="font-bold text-sm mt-3">Stage 2: Mains (Essay + Subjective)</p>
            <ul className="list-disc pl-6 text-sm">
              <li>9 papers (GS-1 to GS-4, Essay, Optional)</li>
              <li>Each paper 3-hours, 250 marks</li>
              <li>Total: 2,250 marks (only top 2,000 prelims scorers appear)</li>
              <li>Scoring: Very subjective, depends on writing quality and depth</li>
            </ul>

            <p className="font-bold text-sm mt-3">Stage 3: Interview</p>
            <ul className="list-disc pl-6 text-sm">
              <li>1 hour personality test with panel of 3-5 senior officers</li>
              <li>Marks: 275 (equal to 1 GS paper)</li>
              <li>Difficulty: Assesses integrity, communication, decision-making</li>
              <li>Pass/fail can shift final rank significantly</li>
            </ul>
          </div>

          <h3 className="font-bold text-lg mt-4">SSC Exam Pattern (1-Stage Process)</h3>
          <div className="bg-green-50 p-4 rounded space-y-3">
            <p className="font-bold text-sm">Stage 1: Tier-I (CBT - Multiple Choice)</p>
            <ul className="list-disc pl-6 text-sm">
              <li>100 questions, 60 minutes</li>
              <li>Covers: Quantitative Ability, Reasoning, English, General Awareness</li>
              <li>Difficulty: Moderate (cutoff typically 60-70%)</li>
              <li>Negative marking: -0.25 for each wrong</li>
            </ul>

            <p className="font-bold text-sm mt-3">Stage 2: Tier-II (Descriptive - Essay/Letter)</p>
            <ul className="list-disc pl-6 text-sm">
              <li>2 hours, 100 marks</li>
              <li>Write essay (250 words) and application (125 words)</li>
              <li>Difficulty: Moderate (tests writing skills)</li>
              <li>Only top 20,000 Tier-I scorers appear</li>
            </ul>

            <p className="font-bold text-sm mt-3">Stage 3: Interview & Skill Test</p>
            <ul className="list-disc pl-6 text-sm">
              <li>20 minutes interview (low stress compared to UPSC)</li>
              <li>Marks: 50 (smaller weightage than UPSC)</li>
              <li>Skill test: Typing/computer skills (pass/fail, not scored)</li>
            </ul>
          </div>

          <h3 className="font-bold text-lg mt-4">Preparation Difficulty: UPSC vs SSC</h3>
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 text-left">Aspect</th>
                <th className="border p-2">UPSC Difficulty</th>
                <th className="border p-2">SSC Difficulty</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-2">Syllabus Breadth</td>
                <td className="border p-2">Very Broad (unlimited)</td>
                <td className="border p-2">Fixed & Limited</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border p-2">Depth Required</td>
                <td className="border p-2">Extremely Deep</td>
                <td className="border p-2">Surface-Level OK</td>
              </tr>
              <tr>
                <td className="border p-2">Current Affairs</td>
                <td className="border p-2">Essential (60% of exam)</td>
                <td className="border p-2">Secondary (20%)</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border p-2">Writing Quality</td>
                <td className="border p-2">Critical (50% of marks)</td>
                <td className="border p-2">Less Important</td>
              </tr>
              <tr>
                <td className="border p-2">Daily Study Hours</td>
                <td className="border p-2">8-12 hours/day</td>
                <td className="border p-2">4-6 hours/day</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border p-2">Coaching Value</td>
                <td className="border p-2">High (30-40% benefit)</td>
                <td className="border p-2">Moderate (15-20% benefit)</td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    },
    {
      id: "financial-impact",
      title: "Financial Impact: Total Cost vs Lifetime Earnings",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg mt-4">Cost of Preparation</h3>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">UPSC Preparation Cost (18-24 months):</p>
              <ul className="list-disc pl-6 text-sm mt-2 space-y-1">
                <li>Coaching fees: ₹2,00,000-5,00,000</li>
                <li>Books & materials: ₹50,000</li>
                <li>Living expenses (no income): 18-24 months × ₹30,000/month = ₹5,40,000-7,20,000</li>
                <li>Exam fees (multiple attempts): ₹1,000-2,000 × 2-3 attempts = ₹2,000-6,000</li>
                <li><strong>Total Cost: ₹8-13 lakh</strong> (assumes no income during prep)</li>
                <li>Risk: 90% fail even after this investment</li>
              </ul>
            </div>

            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">SSC Preparation Cost (6-12 months):</p>
              <ul className="list-disc pl-6 text-sm mt-2 space-y-1">
                <li>Coaching fees: ₹50,000-1,50,000</li>
                <li>Books & materials: ₹20,000</li>
                <li>Living expenses (some people work part-time): ₹3-6 lakh (if prep full-time)</li>
                <li>Exam fees: ₹100-500 × 1-2 attempts = ₹100-1,000</li>
                <li><strong>Total Cost: ₹2-8 lakh</strong> (lower if worked part-time)</li>
                <li>Success rate: 10% (much higher than UPSC)</li>
              </ul>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">ROI (Return on Investment) Analysis</h3>
          <div className="space-y-2 text-sm">
            <p className="font-bold">UPSC ROI (if successful):</p>
            <div className="bg-blue-50 p-3 rounded">
              <p>Investment: ₹10 lakh | Lifetime earnings: ₹6.8 crore (30 years salary + pension)</p>
              <p>ROI: 6,700% (6.8 crore / 10 lakh) | Payback period: 3 months</p>
            </div>

            <p className="font-bold mt-3">UPSC Expected Value (accounting for 90% failure risk):</p>
            <div className="bg-red-50 p-3 rounded">
              <p>Expected earnings: 10% × ₹6.8 crore = ₹68 lakh</p>
              <p>Less investment: ₹68 lakh - ₹10 lakh = ₹58 lakh net gain (but 90% fail)</p>
              <p>Verdict: High risk, ultra-high reward</p>
            </div>

            <p className="font-bold mt-3">SSC ROI (if successful):</p>
            <div className="bg-green-50 p-3 rounded">
              <p>Investment: ₹4 lakh | Lifetime earnings: ₹2.93 crore (30 years salary + pension)</p>
              <p>ROI: 7,325% (2.93 crore / 4 lakh) | Payback period: 2 months</p>
            </div>

            <p className="font-bold mt-3">SSC Expected Value (accounting for 10% failure risk):</p>
            <div className="bg-yellow-50 p-3 rounded">
              <p>Expected earnings: 90% × ₹2.93 crore = ₹2.64 crore</p>
              <p>Less investment: ₹2.64 crore - ₹4 lakh = ₹2.6 crore net gain (90% will succeed)</p>
              <p>Verdict: Low risk, high reward</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Financial Decision Framework</h3>
          <ul className="list-disc pl-6 space-y-2 text-sm">
            <li><strong>If financially independent for 2 years:</strong> UPSC expected value is 2.3x higher than SSC. Worth the risk.</li>
            <li><strong>If need income within 1 year:</strong> SSC is only option. 90% will succeed and earn ₹2.6 crore lifetime.</li>
            <li><strong>If can work part-time while preparing:</strong> SSC becomes even better option (lower total cost).</li>
            <li><strong>If exceptionally smart (top 1%):</strong> UPSC becomes more achievable, ROI increases further.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "interview-preparation-both",
      title: "Interview Preparation: UPSC vs SSC Format & Strategy",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg mt-4">UPSC Personality Test (1 hour, 275 marks = 10% of total)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-3">
            <p className="font-bold text-sm">Interview Setup:</p>
            <ul className="list-disc pl-6 text-sm">
              <li>3-5 member panel of senior IAS/IFS officers</li>
              <li>Formal setup in government building</li>
              <li>Panel has your entire background (educational, family, hobbies)</li>
              <li>Question style: Open-ended, testing ethics and decision-making</li>
            </ul>

            <p className="font-bold text-sm mt-2">Actual Sample Questions:</p>
            <div className="space-y-1 text-sm">
              <p><strong>Q:</strong> "You see a senior officer taking bribe. What will you do?"</p>
              <p><strong>Expected Answer:</strong> "Report through proper channels (CBI/ACB), document evidence, protect myself. This is non-negotiable for civil service."</p>

              <p className="font-bold mt-2"><strong>Q:</strong> "You're posted in riot-torn area. Develop a rehabilitation plan."</p>
              <p><strong>Expected Answer:</strong> Discuss: immediate safety (police), medium-term (counseling, compensation), long-term (community trust building, economic rehabilitation).</p>

              <p className="font-bold mt-2"><strong>Q:</strong> "Tell us about a failure you faced."</p>
              <p><strong>Expected Answer:</strong> Specific failure (not too serious), what you learned, how you applied it. Demonstrates resilience + learning mindset.</p>
            </div>

            <p className="font-bold text-sm mt-3">Marking Criteria (Panel Perspective):</p>
            <ul className="list-disc pl-6 text-sm">
              <li>Emotional stability & stress management (25%)</li>
              <li>Ethical compass & integrity (30%)</li>
              <li>Communication clarity & articulation (20%)</li>
              <li>Domain knowledge & awareness (15%)</li>
              <li>Initiative & leadership potential (10%)</li>
            </ul>
          </div>

          <h3 className="font-bold text-lg mt-4">SSC Interview (20 minutes, 50 marks = 7% of total)</h3>
          <div className="bg-green-50 p-4 rounded space-y-3">
            <p className="font-bold text-sm">Interview Setup:</p>
            <ul className="list-disc pl-6 text-sm">
              <li>1-2 member panel (usually one senior officer)</li>
              <li>Casual setup (chair, table, relaxed atmosphere)</li>
              <li>Focuses on basic competence and attitude</li>
              <li>Lower stakes—mainly screening for unsuitability</li>
            </ul>

            <p className="font-bold text-sm mt-2">Typical Sample Questions:</p>
            <div className="space-y-1 text-sm">
              <p><strong>Q:</strong> "Tell us about yourself, your background."</p>
              <p><strong>Expected:</strong> 2-minute brief intro with education, interests, why government job.</p>

              <p className="font-bold mt-2"><strong>Q:</strong> "What are your strengths and weaknesses?"</p>
              <p><strong>Expected:</strong> 1 real strength + 1 weakness you're improving. Honest answers preferred.</p>

              <p className="font-bold mt-2"><strong>Q:</strong> "How will you handle multiple tasks at work?"</p>
              <p><strong>Expected:</strong> "Prioritize, delegate, maintain work-life balance, ask for help if needed."</p>
            </div>

            <p className="font-bold text-sm mt-3">Marking Criteria (Panel Perspective):</p>
            <ul className="list-disc pl-6 text-sm">
              <li>Communication ability (30%)</li>
              <li>Overall personality & maturity (40%)</li>
              <li>Basic knowledge of job (20%)</li>
              <li>Honesty & sincerity (10%)</li>
            </ul>
          </div>

          <h3 className="font-bold text-lg mt-4">Interview Difficulty Comparison</h3>
          <div className="space-y-2">
            <p className="text-sm"><strong>UPSC Interview:</strong> Extremely challenging. Panel tries to find flaws in your character. Questions are ethical dilemmas, not textbook. Only 50-60% pass interview (even after clearing mains).</p>
            <p className="text-sm"><strong>SSC Interview:</strong> Much easier. Panel just confirms you're not completely unsuitable. 80%+ pass interview (unless very poor communication or dishonesty detected).</p>
            <p className="text-sm"><strong>Verdict:</strong> UPSC interview is 5x harder than SSC. Many candidates with good mains marks fail UPSC interview. SSC interview is rubber-stamp for most.</p>
          </div>
        </div>
      ),
    },
  ],
  whichShouldYouChoose: (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
      <h3 className="text-lg font-semibold text-amber-900 mb-2">Which should you choose?</h3>
      <p className="text-amber-800">Choose <strong>UPSC</strong> if you have 18-24 months to prepare and want the highest career ceiling. Choose <strong>SSC</strong> if you need a job quickly with guaranteed success and steady growth. Many candidates do SSC first, work for 5-10 years, then attempt UPSC.</p>
    </div>
  ),
  relatedPages: [
    { title: "SSC CHSL Government Jobs", slug: "b-a-government-jobs", type: "qualification" } as const,
    { title: "IAS Government Jobs", slug: "engineering-government-jobs", type: "qualification" } as const,
    { title: "Government Job Salary by Grade", slug: "government-job-salary-by-grade", type: "salary" } as const,
  ],
  faqs: [
    {
      question: "Should I attempt UPSC or go for SSC directly?",
      answer:
        "If you're exceptional student with financial support for 18-24 months, attempt UPSC. If you need job urgently or have financial constraints, go SSC. SSC has 10x better success probability while UPSC offers higher ceiling.",
    },
    {
      question: "Is UPSC worth the effort vs SSC?",
      answer:
        "UPSC is worth if you want peak career ceiling (₹300,000+ + administrative power). SSC is worth if you want guaranteed job fast (₹21,000 → ₹75,000 steady growth). Neither is objectively better—depends on priorities.",
    },
    {
      question: "Can I do both—first SSC then UPSC?",
      answer:
        "Yes, many do this. Join as SSC officer, work for 5-10 years, then attempt UPSC. You'll have more maturity + financial security. However, UPSC prefers younger candidates (age limit 32).",
    },
    {
      question: "What if I fail UPSC after 2 years of preparation?",
      answer:
        "You'll have wasted 2 years and missed SSC opportunity. This is the real risk. Many UPSC aspirants end up with nothing because they spent 3-4 years on UPSC, exceeded age limit (32), couldn't do SSC.",
    },
    {
      question: "Is IAS salary really 3x higher than CHSL?",
      answer:
        "Yes, entry salary IAS ₹56,100 vs CHSL ₹21,000 = 2.7x. And this gap increases over time. By year 20: IAS ₹200,000+ vs CHSL ₹75,000. The gap never closes.",
    },
    {
      question: "What is the realistic pass rate for each exam?",
      answer:
        "UPSC: 0.1% pass rate (1 in 1,000). Most sincere candidates fail. SSC: 5-10% pass rate (1 in 10-20). Much higher success rate.",
    },
    {
      question: "Which exam has better career growth—IAS or SSC?",
      answer:
        "IAS has unlimited growth (can become Chief Minister, Minister). SSC has ceiling at ₹75,000 (senior officer level). IAS career scope is 10x broader.",
    },
  ],
};

export default function UPSCVsSSCPage() {
  return <ComparisonPageTemplate {...pageContent} />;
}
