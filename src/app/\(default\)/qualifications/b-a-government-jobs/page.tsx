/**
 * B.A Government Jobs Page
 *
 * Keyword Target: "B.A Government Jobs" (2,100 searches/month)
 * Related Keywords: Arts, Government administration, Civil service, SSC, Banking
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import QualificationHubTemplate from "@/components/qualification-hub-template";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "B.A Government Jobs in India 2025 - SSC, Banking, Administration Roles",
  description:
    "B.A government jobs: civil service, banking clerk, SSC, administrative roles. Salary ₹25,000-45,000, complete career guide for arts graduates.",
  ...pageSeo(`${SITE_URL}/qualifications/b-a-government-jobs`, { index: true }),
};

const pageContent = {
  title: "B.A Government Jobs in India",
  qualification: "B.A",
  heroDescription:
    "B.A graduates have diverse government career options in civil service, banking, administrative roles, and teaching positions. Explore exams, salary, career progression, and application process.",
  quickFacts: {
    avgSalary: "₹25,000-45,000",
    topRecruiters: ["SBI", "Bank of India", "SSC", "Railway", "State Departments"],
    topExams: ["SSC CGL", "SSC CHSL", "IBPS Clerk", "UPSC", "State PSC"],
    jobCount: 2156,
  },
  sections: [
    {
      id: "what-is-ba",
      title: "What is B.A and Government Job Opportunities",
      content: (
        <div className="space-y-4">
          <p>
            B.A (Bachelor of Arts) is a 3-year undergraduate degree in humanities and social sciences. Government organizations actively recruit B.A graduates for administrative, clerical, banking, and civil service roles across multiple departments.
          </p>
          <p>
            B.A graduates form the backbone of government administration with access to prestigious civil service exams (UPSC), general administrative roles, and banking career pathways.
          </p>
          <h3 className="font-bold text-lg mt-4">Why B.A for Government Jobs?</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Civil Service Eligibility:</strong> Direct pathway to prestigious IAS/IFS through UPSC Civil Service Examination
            </li>
            <li>
              <strong>Abundant Positions:</strong> Thousands of government clerical, administrative, and banking positions annually
            </li>
            <li>
              <strong>Diverse Career Options:</strong> Banking, railways, postal, customs, tax, education sectors all recruit B.A
            </li>
            <li>
              <strong>Job Security:</strong> Permanent government employment with pension and benefits
            </li>
            <li>
              <strong>Reasonable Salary:</strong> Starting ₹25,000-35,000, progression to ₹100,000+ for senior roles
            </li>
            <li>
              <strong>Work-Life Balance:</strong> Fixed hours, structured leave, and family-friendly policies
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "government-jobs-ba",
      title: "Top Government Jobs for B.A Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. Government Banking Sector</h3>
          <p>
            <strong>SBI, Bank of India, PNB:</strong> B.A graduates eligible for Clerk positions. Salary: ₹21,000-30,000. No subject preference, making B.A equally competitive as B.Sc/B.Com.
          </p>

          <h3 className="font-bold text-lg mt-4">2. Civil Service (UPSC)</h3>
          <p>
            <strong>IAS/IFS:</strong> B.A holders are primary candidates for UPSC Civil Service. Humanities background valuable for political science, history, geography optional subjects. IAS salary: ₹56,100-177,500.
          </p>

          <h3 className="font-bold text-lg mt-4">3. SSC Recruitment</h3>
          <p>
            <strong>SSC CGL (Combined Graduate Level):</strong> Government administrative positions in ministries, departments. Salary: ₹29,200-92,300. 8,000+ positions annually.
          </p>
          <p>
            <strong>SSC CHSL (Combined Higher Secondary Level):</strong> Data entry, LDC, postal positions. Salary: ₹21,700-69,100.
          </p>

          <h3 className="font-bold text-lg mt-4">4. Railway Department</h3>
          <p>
            <strong>Railway Clerk, Ticket Collector:</strong> Government Railway positions. Salary: ₹25,000-40,000 + benefits.
          </p>

          <h3 className="font-bold text-lg mt-4">5. Postal & Communication</h3>
          <p>
            <strong>India Post:</strong> Postal Assistant, Sorting Assistant positions. Salary: ₹23,000-38,000.
          </p>

          <h3 className="font-bold text-lg mt-4">6. State Government Departments</h3>
          <p>
            <strong>State PSC Exams:</strong> Administrative roles in state departments. Competitive with central government roles. Salary: ₹24,000-50,000.
          </p>

          <h3 className="font-bold text-lg mt-4">7. Teaching in Government Schools</h3>
          <p>
            <strong>Assistant Teacher, PGT (Post Graduate Teacher):</strong> B.A + B.Ed eligible for teaching government schools. Salary: ₹28,000-50,000 starting.
          </p>
        </div>
      ),
    },
    {
      id: "salary-ba",
      title: "B.A Government Job Salary and Career Progression",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Entry Level Salary (Clerk/LDC)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Basic Salary</span>
              <span className="font-bold">₹14,000-18,000</span>
            </div>
            <div className="flex justify-between">
              <span>DA + HRA</span>
              <span className="font-bold">₹7,000-12,000</span>
            </div>
            <div className="flex justify-between">
              <span>Other Allowances</span>
              <span className="font-bold">₹1,000-3,000</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Monthly</span>
              <span>₹21,000-30,000</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Career Progression (Banking Clerk)</h3>
          <ul className="space-y-2">
            <li><strong>0-5 Years:</strong> ₹21,000-32,000 (Clerk)</li>
            <li><strong>5-10 Years:</strong> ₹35,000-55,000 (Senior Clerk/Officer)</li>
            <li><strong>10-15 Years:</strong> ₹60,000-100,000 (Manager)</li>
            <li><strong>15+ Years:</strong> ₹100,000-200,000+ (Senior Management)</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Career Progression (Civil Service - IAS)</h3>
          <ul className="space-y-2">
            <li><strong>IAS Officer (Start):</strong> ₹56,100-90,000 (Level 10-11)</li>
            <li><strong>Senior IAS Officer:</strong> ₹120,000-180,000 (Level 12-13)</li>
            <li><strong>Chief Secretary / Additional Chief Secretary:</strong> ₹180,000-250,000+ (Level 15-16)</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Benefits</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Performance bonus 2-3 months annually</li>
            <li>Defined benefit pension (50% salary for life)</li>
            <li>CGHS medical coverage</li>
            <li>Government housing or loan</li>
            <li>30 days casual + 15 days sick leave</li>
          </ul>
        </div>
      ),
    },
    {
      id: "exams-ba",
      title: "Government Exams for B.A Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. SSC CGL (Combined Graduate Level)</h3>
          <p>
            <strong>Difficulty:</strong> High | <strong>Positions:</strong> 8,000+ annually | <strong>Salary:</strong> ₹29,200-92,300
          </p>
          <p>
            Most popular for B.A graduates. Opens administrative roles in government ministries and departments. Conducts 4 tiers of examination.
          </p>

          <h3 className="font-bold text-lg mt-4">2. IBPS Clerk (Banking)</h3>
          <p>
            <strong>Difficulty:</strong> Easy-Moderate | <strong>Positions:</strong> 5,000+ annually | <strong>Salary:</strong> ₹21,000-30,000
          </p>
          <p>
            No subject-specific advantage for B.A, but general aptitude sections manageable. Opens banking career path.
          </p>

          <h3 className="font-bold text-lg mt-4">3. UPSC Civil Service (IAS/IFS)</h3>
          <p>
            <strong>Difficulty:</strong> Very High | <strong>Salary:</strong> ₹56,100-177,500 | <strong>Prestige:</strong> Highest
          </p>
          <p>
            B.A holders are primary audience. Optional subjects in humanities (History, Geography, Political Science) are accessible to B.A graduates.
          </p>

          <h3 className="font-bold text-lg mt-4">4. State PSC Exams</h3>
          <p>
            <strong>Difficulty:</strong> Moderate | <strong>Positions:</strong> 1,000-5,000 per state | <strong>Salary:</strong> ₹24,000-50,000
          </p>
          <p>
            Every state conducts exams for state-level administrative positions. Less competition than central exams.
          </p>

          <h3 className="font-bold text-lg mt-4">5. Railway Recruitment Board (RRB)</h3>
          <p>
            <strong>Difficulty:</strong> Easy-Moderate | <strong>Positions:</strong> 10,000+ annually | <strong>Salary:</strong> ₹25,000-40,000
          </p>
          <p>
            NTPC and RRB Group D exams. No subject advantage but good opportunity for B.A candidates.
          </p>

          <h3 className="font-bold text-lg mt-4">6. India Post & Postal Services</h3>
          <p>
            <strong>Difficulty:</strong> Easy | <strong>Positions:</strong> 2,000+ annually | <strong>Salary:</strong> ₹23,000-38,000
          </p>
          <p>
            Direct recruitment for postal positions. Lower competition, good starting point.
          </p>

          <h3 className="font-bold text-lg mt-4">Exam Difficulty Ranking</h3>
          <ol className="list-decimal pl-6 space-y-1">
            <li>UPSC Civil Service (Hardest)</li>
            <li>SSC CGL (Hard)</li>
            <li>State PSC (Moderate-Hard)</li>
            <li>IBPS Clerk (Moderate)</li>
            <li>Railway/Postal (Easy-Moderate)</li>
          </ol>
        </div>
      ),
    },
    {
      id: "career-path",
      title: "Career Path for B.A in Government",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Banking/Administrative Clerk Career Path</h3>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 0-3: Clerk / LDC</p>
              <p className="text-sm text-gray-600">₹21,000-30,000 | Basic clerical duties, customer interaction</p>
            </div>
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 3-8: Senior Clerk / Officer</p>
              <p className="text-sm text-gray-600">₹35,000-55,000 | Supervisory role, team management</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 8-15: Manager / Senior Manager</p>
              <p className="text-sm text-gray-600">₹60,000-100,000 | Department management, strategy</p>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <p className="font-bold">Year 15+: Director / Executive</p>
              <p className="text-sm text-gray-600">₹100,000-200,000+ | Senior organization roles</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Civil Service (IAS) Career Path</h3>
          <ul className="space-y-2">
            <li><strong>IAS Officer (First Posting):</strong> Probation training, initial posting in state/central department</li>
            <li><strong>Senior IAS Officer:</strong> Postings as additional secretary, principal secretary, head of major departments</li>
            <li><strong>Chief Secretary Level:</strong> Top administrative officer in state/central government</li>
          </ul>
        </div>
      ),
    },
    {
      id: "how-to-apply",
      title: "How to Apply for B.A Government Jobs",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Application Process (6-10 months)</h3>
          <div className="space-y-3">
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 1: Register for Exam</p>
              <p className="text-sm text-gray-700 mt-1">
                Choose exam (SSC CGL, IBPS, UPSC, State PSC), register on official website
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 2: Preparation (3-6 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Study using books, mock tests, coaching if needed
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 3: Exam & Interview (3-5 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Written exam → Interview/personality test if shortlisted
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 4: Document Verification (1-2 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Submit B.A degree, character certificates, medical fitness
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 5: Joining & Training</p>
              <p className="text-sm text-gray-700 mt-1">
                Receive joining letter, complete training, posted to location
              </p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Documents Required</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>B.A degree certificate</li>
            <li>Mark sheets from all years</li>
            <li>Character certificate from college</li>
            <li>Medical fitness certificate</li>
            <li>Caste certificate (if applicable)</li>
            <li>Address proof (Aadhaar, voter ID)</li>
            <li>10th & 12th certificates</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Eligibility</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ B.A degree from recognized university</li>
            <li>✓ Indian citizen</li>
            <li>✓ Age: 18-35 years (varies by exam/category)</li>
            <li>✓ No criminal convictions</li>
            <li>✓ Medical fitness</li>
          </ul>
        </div>
      ),
    },
  ],
  relatedJobs: [
    {
      title: "SSC CGL 2025 Notification",
      recruitmentSlug: "ssc-cgl-2025",
      postSlug: "combined-graduate-level",
      vacancies: 8000,
      deadline: "2025-11-30",
    },
    {
      title: "IBPS Clerk Recruitment 2025",
      recruitmentSlug: "ibps-clerk-2025",
      postSlug: "clerk-notification",
      vacancies: 5000,
      deadline: "2025-10-30",
    },
    {
      title: "UPSC Civil Service 2025 Exam",
      recruitmentSlug: "upsc-css-2025",
      postSlug: "civil-service-exam",
      vacancies: 1000,
      deadline: "2025-09-15",
    },
    {
      title: "Indian Railways RRB Recruitment 2025",
      recruitmentSlug: "rrb-2025",
      postSlug: "ntpc-general-posts",
      vacancies: 10000,
      deadline: "2025-11-15",
    },
    {
      title: "India Post Postal Assistant 2025",
      recruitmentSlug: "india-post-2025",
      postSlug: "postal-assistant-recruitment",
      vacancies: 2000,
      deadline: "2025-10-20",
    },
  ],
  relatedQualifications: [
    { title: "B.Com Government Jobs", slug: "b-com-government-jobs" },
    { title: "B.Sc Government Jobs", slug: "b-sc-government-jobs" },
    { title: "M.A Government Jobs", slug: "m-a-government-jobs" },
    { title: "MBA Government Jobs", slug: "mba-government-jobs" },
  ],
  faqs: [
    {
      question: "Is B.A degree enough for government jobs or should I pursue further studies?",
      answer:
        "B.A is sufficient for immediate government jobs (SSC, banking, railways). However, M.A or specialization improves career options, especially for civil service and teaching roles. Most successful candidates pursue UPSC after gaining some experience.",
    },
    {
      question: "Which stream in B.A is best for government jobs?",
      answer:
        "Any stream (History, Geography, Political Science, English, etc.) is equally eligible for SSC and banking jobs. For UPSC Civil Service, certain streams like History, Geography, Political Science have optional subject advantage.",
    },
    {
      question: "What is the difference between SSC CGL and UPSC for B.A holders?",
      answer:
        "SSC CGL is for government administrative positions (₹29,200-92,300 salary, various government offices). UPSC is for prestigious civil service (IAS/IFS, ₹56,100-177,500 salary, top administrative roles). UPSC is harder but more prestigious.",
    },
    {
      question: "Can B.A graduate directly get government job or must appear for exam?",
      answer:
        "Must appear for competitive exams (SSC, IBPS, UPSC, etc.). Direct recruitment without exam is rare for B.A holders. Exams ensure merit-based selection across all government positions.",
    },
    {
      question: "How long does it take to get government job after B.A?",
      answer:
        "Typically 4-8 months from exam date to joining. SSC takes ~8 months (exam to joining), IBPS Clerk takes ~6 months, UPSC takes ~12 months (very long process). Railways/postal exams faster, ~4-5 months.",
    },
    {
      question: "What is the scope for B.A holders in civil service?",
      answer:
        "B.A holders are the largest portion of IAS officers. Civil service offers highest prestige and salary (₹56,100-250,000+). Becomes chief secretary level (top administrative position) after 30+ years. Best long-term career path.",
    },
    {
      question: "Is B.A from private college acceptable for government exams?",
      answer:
        "Yes, fully acceptable. Government exams don't discriminate between private and government college graduates. What matters is the B.A degree from recognized university. Competition is equal.",
    },
    {
      question: "How many attempts are allowed for SSC/UPSC exams?",
      answer:
        "SSC: 4 attempts (age limit 32 years, with relaxations up to 37). UPSC: 6 attempts (age limit 32 years). Candidates can attempt every year until age/attempt limit expires.",
    },
    {
      question: "What salary can B.A graduate expect in first government job?",
      answer:
        "Banking clerk: ₹21,000-30,000, SSC clerk: ₹22,000-28,000, Railway clerk: ₹25,000-35,000, IAS officer: ₹56,100-90,000. Depends on exam and position.",
    },
    {
      question: "Can B.A graduate transition from clerk role to officer role?",
      answer:
        "Yes, possible through internal selection or appearing for IBPS Officer exam after clerk experience. However, MBA holders get direct officer entry with higher salary. Most ambitious B.A clerks aim for UPSC Civil Service.",
    },
  ],
};

export default function BAGovernmentJobsPage() {
  return <QualificationHubTemplate {...pageContent} />;
}
