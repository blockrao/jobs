/**
 * MBA Government Jobs Page
 *
 * Keyword Target: "MBA Government Jobs" (4,400 searches/month)
 * Related Keywords: MBA salary government, Finance, Management, PSU recruitment
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import QualificationHubTemplate from "@/components/qualification-hub-template";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbSchema, buildFAQSchema, jsonLdGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "MBA Government Jobs in India 2025 - Salary, Exams, Management Roles",
  description:
    "MBA government jobs: salary ₹35,000-60,000, PSU management positions, banking, finance roles. UPSC, SSC, IBPS exams. Complete career guide for MBA graduates.",
  ...pageSeo(`${SITE_URL}/qualifications/mba-government-jobs`, { index: true }),
};

const pageContent = {
  title: "MBA Government Jobs in India",
  qualification: "MBA",
  heroDescription:
    "MBA graduates are highly sought after in government sector for management, finance, operations, and strategic roles. Explore PSU management positions, banking roles, civil service opportunities, and career progression.",
  quickFacts: {
    avgSalary: "₹35,000-60,000",
    topRecruiters: ["NTPC", "Indian Oil", "SBI", "BHEL", "Power Grid"],
    topExams: ["IBPS PO", "SSC CGL", "UPSC", "State PSC", "PSU Direct"],
    jobCount: 1856,
  },
  sections: [
    {
      id: "what-is-mba",
      title: "What is MBA and Government Career Opportunities",
      content: (
        <div className="space-y-4">
          <p>
            MBA (Master of Business Administration) is a 2-year postgraduate degree that prepares professionals for management, strategy, finance, and operations roles. Government organizations actively recruit MBA graduates for leadership positions across PSUs, banking, insurance, and civil service.
          </p>
          <p>
            MBA specializations include Finance, Marketing, Operations, HR, International Business, and Entrepreneurship. Government roles leverage these skills for organizational management, financial planning, and strategic decision-making.
          </p>
          <h3 className="font-bold text-lg mt-4">Why MBA for Government Jobs?</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Management Positions:</strong> Direct entry into management cadre with higher responsibility and authority
            </li>
            <li>
              <strong>Premium Salary:</strong> MBA graduates earn ₹35,000-60,000+ starting, 15-20% higher than bachelor's holders
            </li>
            <li>
              <strong>Fast Track Growth:</strong> Accelerated promotion to senior management roles compared to non-MBA counterparts
            </li>
            <li>
              <strong>Strategic Role:</strong> Involved in policy making, budgeting, and organizational strategy from early career
            </li>
            <li>
              <strong>Banking Leadership:</strong> Preferred for bank branch management, operations, and finance roles
            </li>
            <li>
              <strong>Civil Service Premium:</strong> UPSC considers MBA valuable for administrative and management postings
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "government-jobs-mba",
      title: "Top Government Jobs for MBA Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. PSU Management Roles</h3>
          <p>
            <strong>NTPC, Power Grid, BHEL, Coal India, Indian Oil:</strong> Recruit MBA graduates for Manager (Operations, Finance, HR) positions. Starting position: Assistant Manager or Deputy Manager. Salary: ₹45,000-60,000 entry level.
          </p>

          <h3 className="font-bold text-lg mt-4">2. Banking Sector (Government Banks)</h3>
          <p>
            <strong>SBI, Bank of India, PNB, Central Bank:</strong> MBA graduates preferred for Probationary Officer (PO) roles leading to branch management. Salary: ₹35,000-50,000 entry level, fast promotion to officer grade.
          </p>
          <p>
            <strong>Roles:</strong> Branch Management, Credit Analysis, Operations, Risk Management, Treasury.
          </p>

          <h3 className="font-bold text-lg mt-4">3. Insurance Companies (Government)</h3>
          <p>
            <strong>LIC, General Insurance Corporation, NIACL:</strong> Recruit MBA graduates for management and underwriting roles. Salary: ₹32,000-45,000 entry, ₹100,000+ as manager.
          </p>

          <h3 className="font-bold text-lg mt-4">4. Civil Service - Administrative Service</h3>
          <p>
            <strong>UPSC Civil Service Exam:</strong> MBA graduates eligible and preferred for administrative postings. IAS salary: ₹56,100-177,500. MBA provides significant advantage in interview selection.
          </p>

          <h3 className="font-bold text-lg mt-4">5. Financial Institutions</h3>
          <p>
            <strong>NABARD, SIDBI, Export-Import Bank:</strong> Government financial institutions recruiting MBA Finance graduates for credit, analysis, and operations roles.
          </p>

          <h3 className="font-bold text-lg mt-4">6. E-Commerce & Startups (Government Backed)</h3>
          <p>
            <strong>GeM (Government e-Marketplace), India Post:</strong> Government initiatives recruiting MBA for operations and strategy roles.
          </p>
        </div>
      ),
    },
    {
      id: "salary-mba",
      title: "MBA Government Job Salary and Career Growth",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Entry Level Salary (Banking & PSU)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Base Salary</span>
              <span className="font-bold">₹28,000-35,000</span>
            </div>
            <div className="flex justify-between">
              <span>Allowances (DA, HRA, Other)</span>
              <span className="font-bold">₹12,000-20,000</span>
            </div>
            <div className="flex justify-between">
              <span>Bonus & Performance Pay</span>
              <span className="font-bold">₹2,000-5,000</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Monthly Take Home</span>
              <span>₹35,000-60,000</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">MBA Career Progression (Banking/PSU)</h3>
          <ul className="space-y-2">
            <li>
              <strong>0-2 Years:</strong> PO/Manager - ₹35,000-45,000
            </li>
            <li>
              <strong>2-5 Years:</strong> Senior Manager - ₹55,000-75,000
            </li>
            <li>
              <strong>5-10 Years:</strong> Assistant General Manager - ₹80,000-120,000
            </li>
            <li>
              <strong>10-15 Years:</strong> General Manager - ₹120,000-180,000
            </li>
            <li>
              <strong>15+ Years:</strong> Director/Chief GM - ₹180,000-400,000+
            </li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Benefits Package</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Performance Bonus: 2-4 months salary annually</li>
            <li>Variable Pay: Based on bank/PSU performance (10-20% of salary)</li>
            <li>Pension: Defined benefit scheme (50% salary for life)</li>
            <li>Medical: Premium health insurance for family (₹50-100 lakh)</li>
            <li>Housing: Government housing or loan at 4-6% interest</li>
            <li>Leave: 30 days casual + 15 days sick leave</li>
            <li>Children Education: School/college fee reimbursement</li>
          </ul>

          <p className="text-sm text-gray-600 mt-4">
            MBA graduates typically earn 20-30% higher salary than non-MBA counterparts in same position, reflecting premium for management education.
          </p>
        </div>
      ),
    },
    {
      id: "exams-mba",
      title: "Government Exams and Recruitment for MBA",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. IBPS PO (Probationary Officer)</h3>
          <p>
            <strong>Difficulty:</strong> Medium | <strong>Positions:</strong> 1,000+ annually | <strong>Salary:</strong> ₹35,000-50,000
          </p>
          <p>
            Gateway to leadership in government banking sector. MBA graduates perform better in IBPS PO exam due to management knowledge. Conducted yearly with 2-3 rounds (prelims, mains, interview).
          </p>

          <h3 className="font-bold text-lg mt-4">2. SSC CGL (Combined Graduate Level)</h3>
          <p>
            <strong>Difficulty:</strong> High | <strong>Salary:</strong> ₹29,200-92,300 (Grade A/B) | <strong>Positions:</strong> 8,000+ annually
          </p>
          <p>
            Opens administrative roles in ministries and departments. MBA preferred for finance, audit, and management roles in government departments.
          </p>

          <h3 className="font-bold text-lg mt-4">3. UPSC Civil Service Exam (IAS/IFS)</h3>
          <p>
            <strong>Difficulty:</strong> Very High | <strong>Salary:</strong> ₹56,100-177,500 | <strong>Prestige:</strong> Highest
          </p>
          <p>
            MBA significantly improves UPSC performance, especially in interview stage. Strategic thinking and business knowledge are valued. IAS officers with MBA background excel in administration and policy roles.
          </p>

          <h3 className="font-bold text-lg mt-4">4. SBI PO / Bank of India Officer Exam</h3>
          <p>
            <strong>Positions:</strong> 500+ yearly | <strong>Salary:</strong> ₹36,000-50,000 entry, ₹200,000+ as manager
          </p>
          <p>
            Direct entry to probationary officer cadre. MBA graduates fast-tracked for branch management roles after 1-2 year training period.
          </p>

          <h3 className="font-bold text-lg mt-4">5. PSU Direct Recruitment</h3>
          <p>
            Some PSUs (NTPC, Power Grid, BHEL) conduct direct recruitment for MBA graduates as Manager/Assistant Manager without competitive exam. Eligibility: MBA 60%+ or equivalent GPA.
          </p>

          <h3 className="font-bold text-lg mt-4">Exam Difficulty Ranking</h3>
          <ol className="list-decimal pl-6 space-y-1">
            <li>UPSC Civil Service (Hardest)</li>
            <li>SSC CGL (Hard)</li>
            <li>IBPS/SBI PO (Medium-Hard)</li>
            <li>PSU Direct Recruitment (Easy for eligible MBA)</li>
          </ol>
        </div>
      ),
    },
    {
      id: "career-path",
      title: "Career Path for MBA in Government",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Banking Sector Career Path (30 Years)</h3>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 0-2: Probationary Officer / Junior Manager</p>
              <p className="text-sm text-gray-600">₹35,000-45,000 | Training, branch work, credit exposure</p>
            </div>
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 2-5: Officer / Senior Manager</p>
              <p className="text-sm text-gray-600">₹50,000-70,000 | Branch manager potential, credit decisions</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 5-10: Senior Manager / Assistant General Manager</p>
              <p className="text-sm text-gray-600">₹80,000-120,000 | Regional leadership, strategic roles</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 10-20: General Manager / Head of Department</p>
              <p className="text-sm text-gray-600">₹120,000-200,000 | Zonal management, policy implementation</p>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <p className="font-bold">Year 20+: Chief General Manager / Executive Director</p>
              <p className="text-sm text-gray-600">₹200,000-400,000+ | Board-level responsibility</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">PSU Management Path</h3>
          <p>
            Similar to banking but roles are more technical (Finance Manager, Operations Manager). MBA Finance/Operations graduates excel in PSU finance and planning departments.
          </p>

          <h3 className="font-bold text-lg mt-6">Civil Service Path (IAS)</h3>
          <p>
            MBA + IAS = Administrative Service with strategic portfolio responsibilities. Secretary-level positions manage major government programs, policy formulation, and budget planning.
          </p>
        </div>
      ),
    },
    {
      id: "how-to-apply",
      title: "How to Apply for MBA Government Jobs",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Step-by-Step Process (3-6 months)</h3>
          <div className="space-y-3">
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 1: Enroll in MBA Program</p>
              <p className="text-sm text-gray-700 mt-1">
                Pursue 2-year MBA from AICTE-recognized college (regular or distance learning acceptable)
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 2: Register for Government Exams</p>
              <p className="text-sm text-gray-700 mt-1">
                IBPS PO (banking) or SSC CGL (general service) typically conducted in Sep-Oct and published by year-end
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 3: Exam & Interview (2-4 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Take competitive exam (written test) → Personal interview (personality, domain knowledge assessment)
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 4: Document Verification (1-2 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Submit MBA degree, mark sheets, character certificates, medical fitness reports
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 5: Joining & Training (2-6 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Receive joining letter → Induction training → Posted to first assignment
              </p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Documents Required</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>MBA degree certificate</li>
            <li>Mark sheets from all semesters</li>
            <li>Graduation certificate (bachelor's)</li>
            <li>Character certificate from MBA college</li>
            <li>Medical fitness certificate</li>
            <li>Caste certificate (if applicable)</li>
            <li>Address proof</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Eligibility</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ Master's degree in Business Administration</li>
            <li>✓ Bachelor's degree from recognized university</li>
            <li>✓ Indian citizen</li>
            <li>✓ Age: Typically 21-35 years (varies by exam)</li>
            <li>✓ No criminal convictions</li>
            <li>✓ Medical fitness</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Advantages of MBA for Government Jobs</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ Direct entry to management cadre (vs bachelor's entry to junior level)</li>
            <li>✓ 15-20% higher starting salary</li>
            <li>✓ Better interview performance (IBPS, UPSC value management education)</li>
            <li>✓ Faster promotion to senior roles (already have management foundation)</li>
            <li>✓ More strategic roles from day one (operations, finance, policy roles)</li>
          </ul>
        </div>
      ),
    },
  ],
  relatedJobs: [
    {
      title: "IBPS PO Recruitment 2025",
      recruitmentSlug: "ibps-po-2025",
      postSlug: "probationary-officer",
      vacancies: 1000,
      deadline: "2025-10-15",
    },
    {
      title: "SBI PO 2025 Notification",
      recruitmentSlug: "sbi-po-2025",
      postSlug: "probationary-officer-recruitment",
      vacancies: 500,
      deadline: "2025-09-30",
    },
    {
      title: "NTPC Management Recruitment 2025",
      recruitmentSlug: "ntpc-2025",
      postSlug: "manager-recruitment",
      vacancies: 200,
      deadline: "2025-10-20",
    },
    {
      title: "SSC CGL 2025 Exam Notification",
      recruitmentSlug: "ssc-cgl-2025",
      postSlug: "combined-graduate-level",
      vacancies: 8000,
      deadline: "2025-11-30",
    },
    {
      title: "Power Grid Manager Recruitment 2025",
      recruitmentSlug: "power-grid-2025",
      postSlug: "manager-positions",
      vacancies: 150,
      deadline: "2025-09-15",
    },
  ],
  relatedQualifications: [
    { title: "B.Com Government Jobs", slug: "b-com-government-jobs" },
    { title: "Engineering Government Jobs", slug: "engineering-government-jobs" },
    { title: "CA Government Jobs", slug: "ca-government-jobs" },
    { title: "M.A Government Jobs", slug: "m-a-government-jobs" },
  ],
  faqs: [
    {
      question: "Do I need MBA to get government job in banking?",
      answer:
        "MBA is not mandatory but highly preferred. IBPS/SBI conduct exams for graduates without MBA (IBPS Clerk, SBI Associate), but MBA gives direct entry to officer cadre (PO) with higher salary and management role.",
    },
    {
      question: "Which MBA specialization is best for government jobs?",
      answer:
        "Finance MBA is most sought after for banking and PSU finance roles. Operations/HR MBA good for PSU management roles. General MBA acceptable for most government positions. Choice depends on career preference (banking vs PSU vs civil service).",
    },
    {
      question: "Is distance MBA acceptable for government job exams?",
      answer:
        "Yes, AICTE-recognized distance MBA is acceptable for IBPS, SBI, SSC, and UPSC exams. No discrimination between regular and distance MBA for government recruitment. Eligibility is based on degree, not delivery mode.",
    },
    {
      question: "What is the starting salary for MBA in government banking?",
      answer:
        "IBPS/SBI PO starting salary is ₹36,000-50,000 monthly including basic + allowances. After 2-3 years, promotion to officer grade increases salary to ₹55,000-75,000. MBA holders earn 15-20% more than non-MBA probationary officers.",
    },
    {
      question: "Is UPSC easier with MBA?",
      answer:
        "MBA doesn't make UPSC exam easier (same syllabus and difficulty), but MBA holders often perform better in interview stage. Their knowledge of governance, economics, policy helps in UPSC interview. MBA + UPSC combination highly valued.",
    },
    {
      question: "How long to get government job after MBA?",
      answer:
        "Typically 4-8 months from exam to joining. IBPS/SBI conduct exams in Sep-Oct, interviews in Dec-Feb, document verification in Feb-Mar, and joining by April-May. Total time: exam date to joining ~6 months.",
    },
    {
      question: "Can MBA freshers directly apply for SSC CGL?",
      answer:
        "Yes, MBA freshers eligible for SSC CGL without work experience. Age limit is typically 21-32 years, so most MBA graduates fall within range. SSC CGL offers general government administration roles (ministry, department positions).",
    },
    {
      question: "What are the career ceiling and growth limits for MBA in banking?",
      answer:
        "MBA bankers can reach Chief General Manager (₹250,000-400,000+) and Executive Director level in government banks. Some can transition to UPSC/IAS for administrative service. No fixed ceiling, growth depends on performance and merit.",
    },
    {
      question: "Is PSU management role better than banking for MBA?",
      answer:
        "Both have pros and cons. Banking offers faster promotions and higher final salary, more stable roles. PSU management offers technical knowledge, infrastructure impact, and diverse industry exposure. Choice depends on personal interest (financial vs operational management).",
    },
    {
      question: "Do government jobs prefer top MBA colleges over tier-2 colleges?",
      answer:
        "Government exams (IBPS, SSC, UPSC) don't discriminate by college rank. All MBA graduates compete equally in written exam. College brand matters in the interview (conversational advantage), but written exam performance is purely merit-based.",
    },
  ],
};

export default function MBAGovernmentJobsPage() {
  return <QualificationHubTemplate {...pageContent} />;
}
