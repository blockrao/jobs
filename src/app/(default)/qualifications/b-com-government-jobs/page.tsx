/**
 * B.Com Government Jobs Page
 *
 * Keyword Target: "B.Com Government Jobs" (3,600 searches/month)
 * Related Keywords: Commerce, Accounts, Finance, Bank, PSU, Auditor, Tax
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import QualificationHubTemplate from "@/components/qualification-hub-template";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbSchema, buildFAQSchema, jsonLdGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "B.Com Government Jobs in India 2025 - Banking, Finance, Auditor Roles",
  description:
    "B.Com government jobs: CA/CS preparation pathway, banking roles, auditor positions, salary ₹28,000-45,000. Bank exams (IBPS, SBI), SSC, UPSC - complete guide.",
  ...pageSeo(`${SITE_URL}/qualifications/b-com-government-jobs`, { index: true }),
};

const pageContent = {
  title: "B.Com Government Jobs in India",
  qualification: "B.Com",
  heroDescription:
    "B.Com graduates have strong opportunities in government banking, finance, audit, and accounting roles. Explore careers in government banks, financial institutions, auditor positions, and tax agencies with competitive salaries.",
  quickFacts: {
    avgSalary: "₹28,000-45,000",
    topRecruiters: ["SBI", "Bank of India", "Income Tax", "CAG", "Railway Finance"],
    topExams: ["IBPS Clerk", "IBPS PO", "SSC CGL", "SSC CHSL", "Income Tax"],
    jobCount: 1432,
  },
  sections: [
    {
      id: "what-is-bcom",
      title: "What is B.Com and Government Job Opportunities",
      content: (
        <div className="space-y-4">
          <p>
            B.Com (Bachelor of Commerce) is a 3-year undergraduate degree focusing on accounting, finance, business law, and financial management. Government organizations actively recruit B.Com graduates for financial administration, banking, auditing, and regulatory roles.
          </p>
          <p>
            B.Com graduates are particularly valued in government banking sector, income tax department, auditor general office, and financial regulation agencies. The degree directly prepares students for banking exams and audit-related careers.
          </p>
          <h3 className="font-bold text-lg mt-4">Why B.Com for Government Jobs?</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Direct Path to Banking:</strong> B.Com specifically prepares for banking careers. Graduates outperform other streams in banking exams.
            </li>
            <li>
              <strong>Audit Eligibility:</strong> B.Com is foundation for Chartered Accountancy (CA), which opens premium government audit roles.
            </li>
            <li>
              <strong>Financial Knowledge:</strong> Strong foundation in accounting and finance makes B.Com graduates ideal for finance government roles.
            </li>
            <li>
              <strong>Abundant Positions:</strong> Thousands of positions in government banks, tax departments, and financial institutions annually.
            </li>
            <li>
              <strong>Job Security:</strong> Government banking and finance roles provide permanent employment with strong pension benefits.
            </li>
            <li>
              <strong>Scope for Advancement:</strong> B.Com + professional certifications (CA, CS, ICWA) opens senior positions.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "government-jobs-bcom",
      title: "Top Government Jobs for B.Com Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. Government Banking Sector</h3>
          <p>
            <strong>SBI, Bank of India, PNB, Central Bank, Union Bank:</strong> Recruit B.Com graduates for Clerk and Officer positions. Clerk starting salary: ₹21,000-30,000, Officer (PO) salary: ₹35,000-50,000.
          </p>
          <p>
            <strong>Roles:</strong> Teller, Account Manager, Operations Officer, Credit Analyst, Foreign Exchange Officer.
          </p>

          <h3 className="font-bold text-lg mt-4">2. Auditor & Accounting Roles</h3>
          <p>
            <strong>Auditor General of India (CAG), State Auditor General Offices:</strong> Recruit B.Com graduates as Junior Auditors and later as Auditors. Salary: ₹35,400-45,000 entry level, ₹100,000+ as senior auditor.
          </p>
          <p>
            <strong>Chartered Accountancy (CA):</strong> B.Com + CA examination opens private practice and government consultant roles in Ministry of Finance, NITI Aayog.
          </p>

          <h3 className="font-bold text-lg mt-4">3. Income Tax Department</h3>
          <p>
            <strong>Income Tax Clerk, Investigation Officer:</strong> B.Com graduates preferred for Income Tax Department roles. Salary: ₹25,500-40,000 as Clerk, ₹45,000+ as Investigation Officer.
          </p>

          <h3 className="font-bold text-lg mt-4">4. Railway Finance</h3>
          <p>
            <strong>Railway Accounts & Finance:</strong> Railway Finance Service (RFS) recruits B.Com graduates for accounts management. Salary: ₹35,000-50,000, scope to reach senior management roles.
          </p>

          <h3 className="font-bold text-lg mt-4">5. Insurance Companies (Government)</h3>
          <p>
            <strong>LIC, General Insurance, NIACL:</strong> Recruit B.Com graduates for finance, accounts, and management roles. Salary: ₹28,000-40,000 entry, ₹80,000+ as manager.
          </p>

          <h3 className="font-bold text-lg mt-4">6. Securities & Exchange Board (SEBI)</h3>
          <p>
            <strong>SEBI Recruitment:</strong> B.Com graduates eligible for officer and assistant positions in market regulation. Salary: ₹35,000-60,000 entry level.
          </p>

          <h3 className="font-bold text-lg mt-4">7. Civil Service - Finance Cadre</h3>
          <p>
            <strong>UPSC Civil Service:</strong> B.Com graduates eligible for IAS/IFS with advantage for finance-related postings and revenue administration.
          </p>
        </div>
      ),
    },
    {
      id: "salary-bcom",
      title: "B.Com Government Job Salary and Benefits",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Entry Level Salary (Banking Clerk)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Basic Salary</span>
              <span className="font-bold">₹16,000-19,000</span>
            </div>
            <div className="flex justify-between">
              <span>Dearness Allowance (DA)</span>
              <span className="font-bold">₹4,800-7,200</span>
            </div>
            <div className="flex justify-between">
              <span>House Rent Allowance (HRA)</span>
              <span className="font-bold">₹2,400-4,800</span>
            </div>
            <div className="flex justify-between">
              <span>Other Allowances</span>
              <span className="font-bold">₹1,000-2,000</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Monthly Salary</span>
              <span>₹21,000-30,000</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Salary Progression (30 Year Banking Career)</h3>
          <ul className="space-y-2">
            <li>
              <strong>0-5 Years (Clerk):</strong> ₹21,000-32,000 per month
            </li>
            <li>
              <strong>5-10 Years (Senior Clerk/Officer):</strong> ₹35,000-55,000 per month
            </li>
            <li>
              <strong>10-15 Years (Manager/Senior Manager):</strong> ₹60,000-100,000 per month
            </li>
            <li>
              <strong>15-20 Years (Senior Manager/Chief Manager):</strong> ₹100,000-150,000 per month
            </li>
            <li>
              <strong>20+ Years (Branch Manager/Executive):</strong> ₹150,000-250,000+ per month
            </li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Additional Benefits (All Government Banking)</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Annual Bonus:</strong> Productivity Linked Bonus (PLB) 2-3 months salary
            </li>
            <li>
              <strong>Pension:</strong> Defined Benefit Pension: 50% of average salary for life + family pension
            </li>
            <li>
              <strong>Medical:</strong> CGHS/ESI coverage for employee and dependents
            </li>
            <li>
              <strong>Housing:</strong> Government housing provided or housing loan @ 4-6% interest
            </li>
            <li>
              <strong>Leave:</strong> 30 days casual leave + 15 days sick leave annually
            </li>
            <li>
              <strong>Professional Development:</strong> Sponsorship for CA/CS/ICWA exams (if pursuing)
            </li>
            <li>
              <strong>Gratuity:</strong> Retirement bonus equivalent to 15 days salary for each year of service
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "exams-bcom",
      title: "Government Exams for B.Com Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. IBPS Clerk (Institute of Banking Personnel Selection)</h3>
          <p>
            <strong>Difficulty:</strong> Easy-Moderate | <strong>Positions:</strong> 5,000+ annually | <strong>Salary:</strong> ₹21,000-30,000
          </p>
          <p>
            Most popular for B.Com graduates. Entry point to banking sector. B.Com students have 25%+ better performance than other streams due to accounting knowledge.
          </p>

          <h3 className="font-bold text-lg mt-4">2. IBPS PO (Probationary Officer)</h3>
          <p>
            <strong>Difficulty:</strong> Medium | <strong>Positions:</strong> 1,000+ annually | <strong>Salary:</strong> ₹35,000-50,000
          </p>
          <p>
            Direct entry to officer grade. B.Com graduates eligible without experience. Fast track to management roles compared to clerk promotion.
          </p>

          <h3 className="font-bold text-lg mt-4">3. SSC CGL (Combined Graduate Level) & CHSL</h3>
          <p>
            <strong>Difficulty:</strong> High (CGL) / Medium (CHSL) | <strong>Positions:</strong> 10,000+ annually | <strong>Salary:</strong> ₹25,500-45,000+
          </p>
          <p>
            Opens administrative roles in government departments, income tax, and audit offices. B.Com knowledge helps in finance-related postings.
          </p>

          <h3 className="font-bold text-lg mt-4">4. Income Tax Recruitment</h3>
          <p>
            <strong>Income Tax Clerk, Auditor, Inspector:</strong> Direct recruitment by Income Tax Department. B.Com preferred qualification for these roles. Salary: ₹28,000-60,000.
          </p>

          <h3 className="font-bold text-lg mt-4">5. CAG (Comptroller & Auditor General) Recruitment</h3>
          <p>
            <strong>Auditor, Assistant Auditor:</strong> Entry to prestigious audit career. B.Com + Chartered Accountancy (CA) ideal combination. Salary: ₹35,400-100,000+.
          </p>

          <h3 className="font-bold text-lg mt-4">6. UPSC Civil Service (IAS/IFS)</h3>
          <p>
            <strong>Difficulty:</strong> Very High | <strong>Salary:</strong> ₹56,100-177,500 | <strong>Advantage:</strong> Finance/Revenue administration
          </p>
          <p>
            B.Com graduates can appear for UPSC CSS. Finance/accounting knowledge valuable for economics and revenue-related postings.
          </p>

          <h3 className="font-bold text-lg mt-4">Exam Difficulty Ranking for B.Com</h3>
          <ol className="list-decimal pl-6 space-y-1">
            <li>IBPS Clerk (Easiest - B.Com advantage)</li>
            <li>SSC CHSL (Easy-Moderate)</li>
            <li>IBPS PO (Moderate)</li>
            <li>SSC CGL (Moderate-Hard)</li>
            <li>UPSC Civil Service (Hardest)</li>
          </ol>
        </div>
      ),
    },
    {
      id: "career-path",
      title: "Career Path for B.Com in Government",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Banking Sector Career Progression</h3>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 0-3: Clerk / Junior Officer</p>
              <p className="text-sm text-gray-600">₹21,000-30,000 | Counter operations, customer service, basic accounting</p>
            </div>
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 3-8: Senior Clerk / Officer</p>
              <p className="text-sm text-gray-600">₹35,000-50,000 | Branch operations, credit assessment, team supervision</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 8-15: Manager / Senior Manager</p>
              <p className="text-sm text-gray-600">₹60,000-100,000 | Branch manager potential, 50+ staff management</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 15-20: Senior Manager / Chief Manager</p>
              <p className="text-sm text-gray-600">₹100,000-150,000 | Regional responsibilities, strategic planning</p>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <p className="font-bold">Year 20+: Executive Director / General Manager</p>
              <p className="text-sm text-gray-600">₹150,000-300,000+ | Organization-wide role, board participation</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Audit Career Path (B.Com + CA)</h3>
          <ul className="space-y-2">
            <li><strong>Assistant Auditor:</strong> ₹35,400-45,000 (Entry after CA)</li>
            <li><strong>Auditor:</strong> ₹50,000-80,000 (After 4-5 years)</li>
            <li><strong>Senior Auditor / DG:</strong> ₹100,000-150,000 (After 12-15 years)</li>
            <li><strong>Director General / Principal Auditor:</strong> ₹180,000-300,000+ (Peak career)</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Specialized Roles for B.Com</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Financial Analyst (PSU finance departments)</li>
            <li>Internal Auditor (Large organizations)</li>
            <li>Tax Compliance Officer (Tax offices)</li>
            <li>Investment Manager (Insurance/pension boards)</li>
          </ul>
        </div>
      ),
    },
    {
      id: "how-to-apply",
      title: "How to Apply for B.Com Government Jobs",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Step-by-Step Application (6-10 months)</h3>
          <div className="space-y-3">
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 1: Register for Exams (1-2 weeks)</p>
              <p className="text-sm text-gray-700 mt-1">
                Register for IBPS Clerk, SSC CHSL, or income tax exams on official websites
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 2: Preparation (2-4 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                B.Com knowledge gives head start. Focus on quantitative aptitude, reasoning, English. Practice mock tests.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 3: Exam & Interview (3-5 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Take written exam → If shortlisted, attend interview/personality test
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 4: Document Verification (1-2 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Submit B.Com degree, character certificates, medical fitness report
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 5: Joining & Training (2-4 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Receive joining letter → Complete induction training → Posted to branch/location
              </p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Documents Checklist</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ B.Com degree certificate</li>
            <li>✓ All semester mark sheets</li>
            <li>✓ 12th & 10th pass certificates</li>
            <li>✓ Character certificate from college</li>
            <li>✓ Medical fitness certificate</li>
            <li>✓ Address proof (Aadhaar, voter ID)</li>
            <li>✓ Caste certificate (if applicable)</li>
            <li>✓ Passport-size photographs</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Eligibility Criteria</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ Bachelor's degree in Commerce (B.Com)</li>
            <li>✓ Indian citizen</li>
            <li>✓ Age: 18-35 years (varies by exam and SC/ST/OBC categories)</li>
            <li>✓ No criminal convictions</li>
            <li>✓ Medical fitness (as per government standards)</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">B.Com Advantages in Government Exams</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ Subject knowledge advantage in quantitative sections (accounting, finance)</li>
            <li>✓ Preferred qualification for banking and finance government roles</li>
            <li>✓ Better suited for B.Com candidates (IBPS, Income Tax, CAG offices)</li>
            <li>✓ Foundation for pursuing CA/CS/ICWA for premium government roles</li>
            <li>✓ Can leverage B.Com to quickly transition to officer roles from clerk</li>
          </ul>
        </div>
      ),
    },
  ],
  relatedJobs: [
    {
      title: "IBPS Clerk Recruitment 2025",
      recruitmentSlug: "ibps-clerk-2025",
      postSlug: "clerk-notification",
      vacancies: 5000,
      deadline: "2025-10-30",
    },
    {
      title: "SBI Clerk 2025 Exam Notification",
      recruitmentSlug: "sbi-clerk-2025",
      postSlug: "clerk-recruitment",
      vacancies: 2000,
      deadline: "2025-09-30",
    },
    {
      title: "SSC CHSL 2025 Notification",
      recruitmentSlug: "ssc-chsl-2025",
      postSlug: "combined-higher-secondary-level",
      vacancies: 3000,
      deadline: "2025-11-15",
    },
    {
      title: "Income Tax Clerk Recruitment 2025",
      recruitmentSlug: "income-tax-2025",
      postSlug: "tax-clerk-recruitment",
      vacancies: 500,
      deadline: "2025-10-15",
    },
    {
      title: "CAG Auditor Recruitment 2025",
      recruitmentSlug: "cag-2025",
      postSlug: "auditor-positions",
      vacancies: 200,
      deadline: "2025-09-30",
    },
  ],
  relatedQualifications: [
    { title: "MBA Government Jobs", slug: "mba-government-jobs" },
    { title: "CA Government Jobs", slug: "ca-government-jobs" },
    { title: "CS Government Jobs", slug: "cs-government-jobs" },
    { title: "B.A Government Jobs", slug: "b-a-government-jobs" },
  ],
  faqs: [
    {
      question: "Is B.Com degree enough for government banking jobs?",
      answer:
        "Yes, B.Com degree is sufficient for IBPS Clerk and banking exams. Most banking clerk positions are filled by B.Com graduates. For officer roles (IBPS PO), MBA is preferred but B.Com alone is acceptable with competitive exam performance.",
    },
    {
      question: "Should I pursue CA after B.Com for government jobs?",
      answer:
        "CA is highly recommended for government career advancement. B.Com + CA opens doors to auditor positions (CAG office, government audits) and finance roles in ministries. CA is professional qualification valued by government employers.",
    },
    {
      question: "What is the difference between IBPS Clerk and SSC CHSL?",
      answer:
        "IBPS Clerk is for government banking jobs with ₹21,000-30,000 salary. SSC CHSL is for general government administration (post offices, ministry, departments) with slightly lower salary but wider career options. IBPS Clerk is preferable for B.Com due to banking content.",
    },
    {
      question: "How many attempts allowed for IBPS Clerk exam?",
      answer:
        "No maximum age limit for repeated attempts, but age eligibility requires 18-28 years (with SC/ST/OBC relaxations up to 33 years). You can attempt IBPS Clerk every year until age limit expires. Most candidates get selected by 2-3 attempts.",
    },
    {
      question: "Can I transition from IBPS Clerk to Officer role?",
      answer:
        "Yes, fully possible. IBPS Clerk after 5-6 years can apply for IBPS Officer (PO) exam through internal selection. Alternatively, pursue MBA part-time and apply for direct officer recruitment. Clerk to officer transition is common.",
    },
    {
      question: "What is the scope for career growth in Income Tax Department?",
      answer:
        "Income Tax Department offers significant growth from Clerk → Auditor → Inspector → Superintendent → Chief Commissioner level. B.Com holders can accelerate growth with CA qualification. Final salary can reach ₹180,000+ as senior officer.",
    },
    {
      question: "Is B.Com required to become a Chartered Accountant?",
      answer:
        "Yes, B.Com is the standard qualification for CA. You cannot pursue CA without 12th pass for intermediate level, but B.Com significantly reduces CA article apprenticeship from 5 years to 4.5 years. CA course duration overall is 4.5-5 years.",
    },
    {
      question: "How long does it take to get government job after B.Com?",
      answer:
        "Typically 4-6 months from exam to joining. IBPS conducts exams in Sep-Oct, interviews in Nov-Dec, document verification in Jan-Feb, joining by April-May. Some exams like SSC have 8-10 month timeline.",
    },
    {
      question: "What subjects in B.Com help most for government exams?",
      answer:
        "Accounting, Finance, Business Law, and Economics subjects help significantly. Accounting knowledge gives edge in quantitative aptitude sections. Business Law helps in reasoning. Overall, B.Com knowledge is 30-40% advantage over other streams in government exams.",
    },
    {
      question: "Can B.Com graduates appear for UPSC Civil Service?",
      answer:
        "Yes, B.Com graduates eligible for UPSC CSS. They have advantage for finance-related postings, revenue administration, and economic policy roles. B.Com + UPSC combination good for those aiming for IAS/IFS prestigious roles.",
    },
  ],
};

export default function BComGovernmentJobsPage() {
  return <QualificationHubTemplate {...pageContent} />;
}
