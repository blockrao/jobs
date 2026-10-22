/**
 * ICWA Government Jobs Page
 *
 * Keyword Target: "ICWA Government Jobs" (650 searches/month)
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import QualificationHubTemplate from "@/components/qualification-hub-template";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbSchema, buildFAQSchema, jsonLdGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "ICWA Government Jobs in India 2025 - Auditor, Finance, Cost Accounting Roles",
  description: "ICWA government jobs: auditor, finance officer, cost accountant roles. Salary ₹35,000-60,000, CAG recruitment, state audit offices, PSU finance positions.",
  ...pageSeo(`${SITE_URL}/qualifications/icwa-government-jobs`, { index: true }),
};

const pageContent = {
  title: "ICWA Government Jobs in India",
  qualification: "ICWA",
  heroDescription: "ICWA (Cost Management Accountant) qualification opens excellent government opportunities in audit, finance, and accounting roles. Explore salary, exams, and career progression.",
  quickFacts: {
    avgSalary: "₹35,000-60,000",
    topRecruiters: ["Comptroller & Auditor General (CAG)", "State Audit", "Finance Ministry", "PSU Finance", "Banks"],
    topExams: ["CAG Recruitment", "State Finance Jobs", "UPSC (Finance)", "SSC (Audit)"],
    jobCount: 2100,
  },
  sections: [
    {
      id: "what-is-icwa",
      title: "What is ICWA and Government Job Opportunities",
      content: (
        <div className="space-y-4">
          <p>
            ICWA (Institute of Cost and Management Accountants) is a professional certification for cost accounting and financial management. Government organizations heavily recruit ICWA professionals for audit, finance, and accounting roles due to their specialized expertise.
          </p>
          <p>
            Government audit bodies (CAG, State Audit) and finance ministries actively seek ICWA professionals. ICWA is more specialized than CA, leading to higher government demand for internal audit and cost management roles.
          </p>
        </div>
      ),
    },
    {
      id: "government-jobs",
      title: "Top Government Jobs for ICWA",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. CAG (Comptroller & Auditor General) Auditor</h3>
          <p>
            <strong>Most Prestigious:</strong> Central government's audit body. Salary: ₹40,000-70,000 entry, reaching ₹150,000+ as senior auditor. Permanent, pension-eligible position.
          </p>

          <h3 className="font-bold text-lg mt-4">2. State Audit Office (State Accountant General)</h3>
          <p>
            <strong>State Government:</strong> State-level audit positions. Salary: ₹35,000-55,000. Direct appointment at officer level.
          </p>

          <h3 className="font-bold text-lg mt-4">3. Finance Ministry/Department</h3>
          <p>
            <strong>Government Finance Division:</strong> Budget analysis, finance officer roles. Salary: ₹40,000-65,000.
          </p>

          <h3 className="font-bold text-lg mt-4">4. PSU Finance Officer</h3>
          <p>
            <strong>NTPC, Indian Oil, BHEL Finance Departments:</strong> Internal audit, cost accounting. Salary: ₹38,000-60,000.
          </p>

          <h3 className="font-bold text-lg mt-4">5. Banking Finance Officer</h3>
          <p>
            <strong>All Government Banks:</strong> Internal audit, compliance roles. Salary: ₹35,000-55,000.
          </p>

          <h3 className="font-bold text-lg mt-4">6. Civil Service (UPSC IAS)</h3>
          <p>
            <strong>IAS with Finance Specialization:</strong> ICWA + UPSC opens finance/revenue administrative roles. Salary: ₹56,100-177,500.
          </p>
        </div>
      ),
    },
    {
      id: "salary",
      title: "ICWA Government Job Salary and Career Progression",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Entry Level Salary (CAG/State Audit)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Basic Salary</span>
              <span className="font-bold">₹28,000-35,000</span>
            </div>
            <div className="flex justify-between">
              <span>DA + HRA</span>
              <span className="font-bold">₹8,000-15,000</span>
            </div>
            <div className="flex justify-between">
              <span>Other Allowances</span>
              <span className="font-bold">₹3,000-5,000</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Monthly</span>
              <span>₹40,000-70,000</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Career Progression (35+ years)</h3>
          <ul className="space-y-2 text-sm">
            <li><strong>0-5 Years:</strong> ₹40,000-55,000 (Junior Auditor/Officer)</li>
            <li><strong>5-15 Years:</strong> ₹60,000-90,000 (Senior Auditor/Principal Officer)</li>
            <li><strong>15+ Years:</strong> ₹100,000-150,000+ (Head of Department/Director)</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">CAG Career Example</h3>
          <p className="text-sm">
            Junior Auditor (₹40,000) → Senior Auditor (₹70,000) → Principal Auditor (₹90,000) → Chief Auditor (₹150,000+) over 25-30 years
          </p>

          <h3 className="font-bold text-lg mt-6">Benefits</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>✓ Defined benefit pension: 50% salary for life</li>
            <li>✓ Medical coverage for self + family</li>
            <li>✓ Government housing/loan</li>
            <li>✓ Leave: 30 casual + 15 sick days</li>
            <li>✓ Annual bonus: 2-3 months salary</li>
          </ul>
        </div>
      ),
    },
    {
      id: "exams",
      title: "Government Exams and Pathways for ICWA",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. CAG Recruitment (BEST OPTION)</h3>
          <p>
            <strong>Difficulty:</strong> Moderate | <strong>Positions:</strong> 200-500 annually | <strong>Salary:</strong> ₹40,000-70,000
          </p>
          <p className="text-sm">
            Comptroller & Auditor General directly recruits ICWA professionals. Prestigious government position. Competitive but higher starting salary than most government roles.
          </p>

          <h3 className="font-bold text-lg mt-4">2. State Accountant General</h3>
          <p>
            <strong>Difficulty:</strong> Easy-Moderate | <strong>Positions:</strong> 100+ annually per state | <strong>Salary:</strong> ₹35,000-55,000
          </p>
          <p className="text-sm">State-level audit recruitment. Less competitive than CAG but good salary and benefits.</p>

          <h3 className="font-bold text-lg mt-4">3. UPSC Civil Service</h3>
          <p>
            <strong>Difficulty:</strong> Very High | <strong>Salary:</strong> ₹56,100-177,500 | <strong>Prestige:</strong> Highest
          </p>
          <p className="text-sm">ICWA + UPSC IAS gives finance administration advantage. However, extremely competitive.</p>

          <h3 className="font-bold text-lg mt-4">4. PSU Finance Recruitment</h3>
          <p>
            <strong>Difficulty:</strong> Moderate | <strong>Positions:</strong> 200+ annually | <strong>Salary:</strong> ₹38,000-60,000
          </p>
        </div>
      ),
    },
    {
      id: "career-path",
      title: "Career Path for ICWA Professionals",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Government Career Progression</h3>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 0-5: Junior Auditor (CAG/State Audit)</p>
              <p className="text-sm text-gray-600">₹40,000-55,000 | Audit, compliance work, fieldwork</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 5-15: Senior Auditor / Principal Officer</p>
              <p className="text-sm text-gray-600">₹60,000-90,000 | Audit leadership, report writing, training juniors</p>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <p className="font-bold">Year 15+: Chief Auditor / Directorate Level</p>
              <p className="text-sm text-gray-600">₹100,000-150,000+ | Department head, policy making</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Advancement Options</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>CA + ICWA combination → Premium positions in CAG (₹150,000+)</li>
            <li>ICWA + MBA part-time → Finance ministry senior roles</li>
            <li>ICWA + UPSC → IAS with finance specialization</li>
          </ul>
        </div>
      ),
    },
    {
      id: "how-to-apply",
      title: "How to Apply for ICWA Government Jobs",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Path: Bachelor's → ICWA → CAG Recruitment (5-7 years)</h3>
          <div className="space-y-2">
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 1: Complete Bachelor's (B.Com, B.A, B.Sc - any stream)</p>
              <p className="text-xs text-gray-700">Finance/Accounting background helpful but not required</p>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 2: Register for ICWA Course (Foundation)</p>
              <p className="text-xs text-gray-700">4.5-5 year professional course</p>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 3: Complete ICWA Intermediate & Final</p>
              <p className="text-xs text-gray-700">Pass exams, gain practical experience (3+ years required)</p>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 4: Apply for CAG or State Audit Recruitment</p>
              <p className="text-xs text-gray-700">Monitor CAG website for auditor recruitment notifications</p>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 5: Selection & Joining</p>
              <p className="text-xs text-gray-700">Document verification, medical, appointment letter</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Documents Required</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>✓ ICWA membership certificate (Full member status)</li>
            <li>✓ Bachelor's degree certificate</li>
            <li>✓ Experience certificate (3+ years required for CAG)</li>
            <li>✓ Character certificate</li>
            <li>✓ Medical fitness certificate</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">Eligibility</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>✓ ICWA membership (Full member)</li>
            <li>✓ Bachelor's degree from recognized university</li>
            <li>✓ 3+ years practical experience (varies by role)</li>
            <li>✓ Indian citizen</li>
            <li>✓ Age: 21-40 years (varies by role)</li>
            <li>✓ No criminal convictions</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">ICWA Advantage for Government</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>✓ Higher starting salary than most graduates (₹40,000-70,000)</li>
            <li>✓ Specialized qualification → better growth (₹150,000+ as director)</li>
            <li>✓ Fewer candidates compete (less saturated field)</li>
            <li>✓ Prestige in government (specialized expertise valued)</li>
            <li>✓ Direct officer-level entry in some positions</li>
          </ul>
        </div>
      ),
    },
  ],
  relatedJobs: [
    {
      title: "CAG Auditor Recruitment 2025",
      recruitmentSlug: "cag-recruitment-2025",
      postSlug: "auditor-positions",
      vacancies: 300,
      deadline: "2025-12-31",
    },
    {
      title: "State Audit Office 2025",
      recruitmentSlug: "state-audit-2025",
      postSlug: "auditor-officer",
      vacancies: 100,
      deadline: "2025-11-30",
    },
    {
      title: "Finance Ministry Recruitment 2025",
      recruitmentSlug: "finance-ministry-2025",
      postSlug: "finance-officer",
      vacancies: 50,
      deadline: "2025-10-31",
    },
    {
      title: "PSU Finance Officer 2025",
      recruitmentSlug: "psu-finance-2025",
      postSlug: "finance-positions",
      vacancies: 200,
      deadline: "2025-11-30",
    },
  ],
  relatedQualifications: [
    { title: "B.Com Government Jobs", slug: "b-com-government-jobs" },
    { title: "MBA Government Jobs", slug: "mba-government-jobs" },
    { title: "Engineering Government Jobs", slug: "engineering-government-jobs" },
  ],
  faqs: [
    {
      question: "What is the difference between CA and ICWA for government jobs?",
      answer: "CA: General accounting, broader scope. ICWA: Cost management & internal audit specialist. For government CAG recruitment, ICWA is specifically preferred. Both are valued but ICWA has edge in government audit roles.",
    },
    {
      question: "How long does it take to become ICWA?",
      answer: "4.5-5 years from completion of bachelor's degree. Includes Foundation (6 months), Intermediate (8 months), Final (8 months) + 3 years practical experience required for government recruitment.",
    },
    {
      question: "Is ICWA harder than CA?",
      answer: "ICWA and CA have similar difficulty levels. ICWA focuses on cost management/audit. Both are professional qualifications requiring rigorous study. Pass rates are comparable (15-20%).",
    },
    {
      question: "Can ICWA graduate work in private sector or only government?",
      answer: "ICWA can work in both. Government (CAG, audit, finance ministry) offers pension and security. Private sector offers higher salary (₹60,000-150,000+). Government jobs more stable, private more lucrative.",
    },
    {
      question: "What is the maximum salary for ICWA in government?",
      answer: "Entry: ₹40,000-70,000 → Senior Auditor: ₹80,000-120,000 → Chief Auditor/Director: ₹150,000-200,000+. Maximum around ₹200,000+ for top positions (20+ years experience).",
    },
    {
      question: "Is experience required to apply for CAG jobs?",
      answer: "Yes, CAG requires 3-5 years practical experience as chartered accountant or cost accountant. Fresh ICWA graduates cannot directly apply; they need relevant work experience first.",
    },
    {
      question: "Can ICWA become IAS officer through UPSC?",
      answer: "Yes. ICWA + UPSC IAS qualifies with finance/accounts specialization advantage. However, UPSC is extremely competitive regardless of qualification.",
    },
  ],
};

export default function ICWAGovernmentJobsPage() {
  return <QualificationHubTemplate {...pageContent} />;
}
