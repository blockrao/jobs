/**
 * BCA Government Jobs Page
 *
 * Keyword Target: "BCA Government Jobs" (1,400 searches/month)
 * Related Keywords: Computer Science, IT jobs, Government IT, Software developer
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import QualificationHubTemplate from "@/components/qualification-hub-template";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbSchema, buildFAQSchema, jsonLdGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "BCA Government Jobs in India 2025 - IT Developer, Programmer, System Admin Roles",
  description:
    "BCA government jobs: IT developer, system administrator, government IT roles. Salary ₹28,000-50,000, SSC, banking IT, BSNL, NIC recruitment pathways.",
  ...pageSeo(`${SITE_URL}/qualifications/bca-government-jobs`, { index: true }),
};

const pageContent = {
  title: "BCA Government Jobs in India",
  qualification: "BCA",
  heroDescription:
    "BCA graduates have excellent opportunities in government IT sector as programmers, system administrators, and IT specialists. Explore salary, exams, and career growth in government IT roles.",
  quickFacts: {
    avgSalary: "₹28,000-50,000",
    topRecruiters: ["BSNL", "NIC", "LIC", "Bank IT Departments", "Government Ministries"],
    topExams: ["SSC CGL IT", "BSNL Recruitment", "Banking IT", "NIC Recruitment", "IBPS IT"],
    jobCount: 1123,
  },
  sections: [
    {
      id: "what-is-bca",
      title: "What is BCA and Government Job Opportunities",
      content: (
        <div className="space-y-4">
          <p>
            BCA (Bachelor of Computer Applications) is a 3-year undergraduate degree specializing in computer science, programming, and software development. Government organizations actively recruit BCA graduates for IT roles, programming positions, and system administration.
          </p>
          <p>
            Government's digitalization drive has increased demand for BCA graduates in IT departments, government portals, and digital services. BCA is ideal pathway to government IT career with competitive salary and job security.
          </p>
          <h3 className="font-bold text-lg mt-4">Why BCA for Government Jobs?</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>High Demand:</strong> Government IT sector rapidly expanding with digitalization initiatives
            </li>
            <li>
              <strong>Better Salary:</strong> BCA IT roles pay ₹28,000-50,000 vs general graduates at ₹21,000-30,000
            </li>
            <li>
              <strong>Job Security:</strong> Government IT roles provide permanent employment and pension
            </li>
            <li>
              <strong>Skill Utilization:</strong> Programming skills directly applicable in government portals, databases, systems
            </li>
            <li>
              <strong>Growth Scope:</strong> BCA can lead to senior IT positions, CIO roles with ₹150,000+ salary
            </li>
            <li>
              <strong>Remote Work:</strong> Increasing remote work options in government IT roles
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "government-jobs-bca",
      title: "Top Government Jobs for BCA Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. BSNL IT Positions</h3>
          <p>
            <strong>IT Specialist, Programmer:</strong> BSNL recruiting BCA for telecom IT systems. Salary: ₹28,000-45,000. 200+ positions annually.
          </p>

          <h3 className="font-bold text-lg mt-4">2. NIC (National Informatics Centre)</h3>
          <p>
            <strong>System Administrator, Programmer:</strong> NIC operates government IT infrastructure. Salary: ₹30,000-48,000. 100+ positions annually.
          </p>

          <h3 className="font-bold text-lg mt-4">3. Banking IT (Government Banks)</h3>
          <p>
            <strong>SBI, Bank of India IT Departments:</strong> BCA preferred for IT officer roles. IBPS IT recruitment. Salary: ₹35,000-50,000.
          </p>

          <h3 className="font-bold text-lg mt-4">4. LIC IT Roles</h3>
          <p>
            <strong>LIC Recruitment:</strong> IT specialist, developer, system admin roles. Salary: ₹28,000-45,000.
          </p>

          <h3 className="font-bold text-lg mt-4">5. Government Ministry IT Departments</h3>
          <p>
            <strong>SSC CGL IT, Ministry IT:</strong> Various ministries recruit for IT roles. Salary: ₹29,200-92,300 via SSC.
          </p>

          <h3 className="font-bold text-lg mt-4">6. Post Office IT Roles</h3>
          <p>
            <strong>India Post Digital Services:</strong> IT recruitment for postal automation. Salary: ₹25,000-40,000.
          </p>
        </div>
      ),
    },
    {
      id: "salary-bca",
      title: "BCA Government Job Salary and Career Progression",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Entry Level Salary (IT Officer/Programmer)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Basic Salary</span>
              <span className="font-bold">₹18,000-24,000</span>
            </div>
            <div className="flex justify-between">
              <span>DA + HRA</span>
              <span className="font-bold">₹8,000-14,000</span>
            </div>
            <div className="flex justify-between">
              <span>Other Allowances</span>
              <span className="font-bold">₹2,000-4,000</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Monthly</span>
              <span>₹28,000-48,000</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Career Progression (30 Years)</h3>
          <ul className="space-y-2">
            <li><strong>0-3 Years:</strong> ₹28,000-38,000 (Programmer)</li>
            <li><strong>3-8 Years:</strong> ₹40,000-60,000 (Senior Programmer/Analyst)</li>
            <li><strong>8-15 Years:</strong> ₹65,000-100,000 (Manager/Lead)</li>
            <li><strong>15+ Years:</strong> ₹100,000-200,000+ (Senior Manager/CIO)</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Benefits</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Bonus: 2-3 months salary annually</li>
            <li>Pension: 50% salary for life</li>
            <li>Medical insurance</li>
            <li>Housing loan/government quarter</li>
            <li>Leave: 30 casual + 15 sick days</li>
            <li>Technology training allowance</li>
          </ul>
        </div>
      ),
    },
    {
      id: "exams-bca",
      title: "Government Exams for BCA Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. SSC CGL (IT Module)</h3>
          <p>
            <strong>Difficulty:</strong> Medium | <strong>Positions:</strong> 500+ annually | <strong>Salary:</strong> ₹29,200-92,300
          </p>
          <p>
            BCA graduates take IT module in SSC CGL, easier than non-IT graduates due to technical background.
          </p>

          <h3 className="font-bold text-lg mt-4">2. BSNL Direct Recruitment</h3>
          <p>
            <strong>Difficulty:</strong> Easy-Moderate | <strong>Positions:</strong> 100-200 annually | <strong>Salary:</strong> ₹28,000-45,000
          </p>
          <p>
            BSNL directly recruits BCA for IT roles. Technical interview focuses on programming, databases, networking.
          </p>

          <h3 className="font-bold text-lg mt-4">3. NIC Recruitment</h3>
          <p>
            <strong>Difficulty:</strong> Moderate | <strong>Positions:</strong> 50-100 annually | <strong>Salary:</strong> ₹30,000-48,000
          </p>

          <h3 className="font-bold text-lg mt-4">4. IBPS IT Officer</h3>
          <p>
            <strong>Difficulty:</strong> Medium-Hard | <strong>Positions:</strong> 200-300 annually | <strong>Salary:</strong> ₹35,000-50,000
          </p>
          <p>
            Banking IT officer role. Additional financial knowledge required beyond programming.
          </p>

          <h3 className="font-bold text-lg mt-4">5. LIC IT Recruitment</h3>
          <p>
            <strong>Difficulty:</strong> Easy-Moderate | <strong>Positions:</strong> 100+ annually | <strong>Salary:</strong> ₹28,000-45,000
          </p>

          <h3 className="font-bold text-lg mt-4">Recommendation</h3>
          <p>
            <strong>Best Path:</strong> (1) BSNL direct recruitment (highest paying for BCA), (2) SSC CGL IT module, (3) IBPS IT officer.
          </p>
        </div>
      ),
    },
    {
      id: "career-path",
      title: "Career Path for BCA in Government IT",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">IT Career Progression</h3>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 0-2: Programmer/Developer</p>
              <p className="text-sm text-gray-600">₹28,000-38,000 | Code development, system maintenance</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 2-8: Senior Programmer/Analyst</p>
              <p className="text-sm text-gray-600">₹40,000-65,000 | Project responsibility, team lead</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 8-15: Manager/IT Head</p>
              <p className="text-sm text-gray-600">₹70,000-110,000 | Department management, strategy</p>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <p className="font-bold">Year 15+: Senior Manager/CIO</p>
              <p className="text-sm text-gray-600">₹120,000-250,000+ | Organization IT leadership</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Skill Advancement</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Cloud certifications (AWS, Azure)</li>
            <li>Cybersecurity specialization</li>
            <li>Data analytics/AI expertise</li>
            <li>Enterprise architecture knowledge</li>
          </ul>
        </div>
      ),
    },
    {
      id: "how-to-apply",
      title: "How to Apply for BCA Government IT Jobs",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Application Process</h3>
          <div className="space-y-3">
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 1: Register for Recruitment</p>
              <p className="text-sm text-gray-700 mt-1">
                Monitor BSNL, NIC, IBPS websites for IT recruitment
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 2: Technical Test</p>
              <p className="text-sm text-gray-700 mt-1">
                Programming, database, networking, system administration questions
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 3: Technical Interview</p>
              <p className="text-sm text-gray-700 mt-1">
                Deep technical questions, coding problem-solving
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 4: Document Verification</p>
              <p className="text-sm text-gray-700 mt-1">
                Submit BCA degree, mark sheets, character certificate
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 5: Joining</p>
              <p className="text-sm text-gray-700 mt-1">
                Receive joining letter → IT induction training → assigned to department
              </p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Documents Required</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ BCA degree certificate</li>
            <li>✓ Mark sheets from all semesters</li>
            <li>✓ Character certificate</li>
            <li>✓ Medical fitness report</li>
            <li>✓ Address proof</li>
            <li>✓ Resume highlighting projects/coding skills</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Eligibility</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ BCA degree from recognized university</li>
            <li>✓ Indian citizen</li>
            <li>✓ Age: 21-35 years (varies)</li>
            <li>✓ No criminal record</li>
            <li>✓ Medical fitness</li>
          </ul>
        </div>
      ),
    },
  ],
  relatedJobs: [
    {
      title: "BSNL IT Recruitment 2025",
      recruitmentSlug: "bsnl-it-2025",
      postSlug: "it-specialist-recruitment",
      vacancies: 200,
      deadline: "2025-10-30",
    },
    {
      title: "NIC System Administrator Recruitment 2025",
      recruitmentSlug: "nic-2025",
      postSlug: "system-admin-programmer",
      vacancies: 100,
      deadline: "2025-10-15",
    },
    {
      title: "IBPS IT Officer 2025",
      recruitmentSlug: "ibps-it-2025",
      postSlug: "it-officer-recruitment",
      vacancies: 250,
      deadline: "2025-09-30",
    },
    {
      title: "SSC CGL 2025 IT Module",
      recruitmentSlug: "ssc-cgl-2025",
      postSlug: "combined-graduate-level",
      vacancies: 500,
      deadline: "2025-11-30",
    },
    {
      title: "LIC IT Recruitment 2025",
      recruitmentSlug: "lic-2025",
      postSlug: "it-specialist-positions",
      vacancies: 150,
      deadline: "2025-11-15",
    },
  ],
  relatedQualifications: [
    { title: "B.Tech Computer Science Government Jobs", slug: "b-tech-cs-government-jobs" },
    { title: "MBA IT Government Jobs", slug: "mba-it-government-jobs" },
    { title: "B.Com Government Jobs", slug: "b-com-government-jobs" },
    { title: "Engineering Government Jobs", slug: "engineering-government-jobs" },
  ],
  faqs: [
    {
      question: "Is BCA sufficient for government IT jobs or should I pursue further studies?",
      answer:
        "BCA is sufficient for immediate government IT jobs (BSNL, NIC, banking IT). However, MBA/M.Tech opens higher-paying management roles. Most government IT professionals successfully build careers with just BCA.",
    },
    {
      question: "Can BCA graduate appear for GATE to become IT engineer?",
      answer:
        "Technically GATE is for B.Tech graduates. However, you can pursue B.Tech part-time and then appear for GATE if aiming for PSU IT engineer roles. Direct government IT roles don't require GATE.",
    },
    {
      question: "What programming languages should BCA know for government jobs?",
      answer:
        "Core languages: C, C++, Java, Python. Also database knowledge (SQL, Oracle), web technologies (HTML/CSS/JavaScript), and system administration. Government IT roles are diverse, learn multiple languages.",
    },
    {
      question: "Is remote work available in government IT roles?",
      answer:
        "Increasingly yes. BSNL, NIC, banking IT now offer remote work options, especially post-pandemic. Senior roles often allow hybrid work. This is a growing trend in government IT sector.",
    },
    {
      question: "What is the scope for BCA graduates in government IT?",
      answer:
        "Entry: ₹28,000-48,000 → Senior: ₹70,000-110,000 → CIO level: ₹150,000-300,000+. Significant growth opportunity, especially with cloud and cybersecurity skills. 30-year career with good progression.",
    },
    {
      question: "Can BCA graduate transition to management role?",
      answer:
        "Yes, possible. After 8-10 years as developer/analyst, you can move to IT manager role if you develop management skills. Some pursue MBA part-time for faster management track.",
    },
    {
      question: "Is B.Tech preferred over BCA for government IT jobs?",
      answer:
        "B.Tech may have slight advantage in some BSNL/NIC interviews, but BCA is equally eligible and preferred. Many government IT leaders are BCA graduates. No significant discrimination.",
    },
    {
      question: "How often does BSNL conduct IT recruitment?",
      answer:
        "BSNL's IT recruitment is conducted as per operational need, typically every 2-3 years. 100-200+ positions in each cycle. Monitor BSNL recruitment portal for notifications.",
    },
    {
      question: "What cybersecurity skills should BCA know for government IT?",
      answer:
        "Basic cybersecurity understanding: password management, data protection, SSL certificates, firewalls. Certifications like CEH, CISSP valuable. Government IT increasingly focuses on cybersecurity.",
    },
    {
      question: "Can BCA graduate work in non-IT government roles?",
      answer:
        "Technically no - BCA qualification is specific to IT roles. For non-IT government jobs, you need B.A, B.Sc, B.Com degrees. BCA strictly channels to IT sector.",
    },
  ],
};

export default function BCAGovernmentJobsPage() {
  return <QualificationHubTemplate {...pageContent} />;
}
