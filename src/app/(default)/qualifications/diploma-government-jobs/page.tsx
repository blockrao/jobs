/**
 * Diploma Government Jobs Page
 *
 * Keyword Target: "Diploma Government Jobs" (1,600 searches/month)
 * Related Keywords: Polytechnic, Technical, Government positions, PSU, Railway, BSNL
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import QualificationHubTemplate from "@/components/qualification-hub-template";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Diploma Government Jobs in India 2025 - Technician, Apprentice, PSU Roles",
  description:
    "Diploma government jobs: technician positions, apprenticeships, PSU recruitment. Salary ₹20,000-35,000, ITI comparison, Railway, BSNL, and other PSU opportunities.",
  ...pageSeo(`${SITE_URL}/qualifications/diploma-government-jobs`, { index: true }),
};

const pageContent = {
  title: "Diploma Government Jobs in India",
  qualification: "Diploma",
  heroDescription:
    "Diploma holders have strong opportunities in government sector for technician, apprentice, and skilled positions across PSUs, Railways, BSNL, and manufacturing units. Explore salary, exams, and career growth.",
  quickFacts: {
    avgSalary: "₹20,000-35,000",
    topRecruiters: ["Indian Railways", "BSNL", "Power Plants", "Manufacturing PSUs", "Defense"],
    topExams: ["Railway Recruitment", "SSC Selection", "BSNL Recruitment", "PSU Apprentice", "State Board"],
    jobCount: 3421,
  },
  sections: [
    {
      id: "what-is-diploma",
      title: "What is Diploma and Government Job Opportunities",
      content: (
        <div className="space-y-4">
          <p>
            Diploma is a 2-3 year technical certification course offered by polytechnic institutes, offering specialized skills in Mechanical, Electrical, Civil, Electronics, and other engineering disciplines.
          </p>
          <p>
            Government organizations actively recruit diploma holders for technician positions, apprenticeships, and skilled roles across PSUs, Railways, utilities, and manufacturing units.
          </p>
          <h3 className="font-bold text-lg mt-4">Why Diploma for Government Jobs?</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Practical Skills:</strong> Diploma provides hands-on technical training directly applicable in government work</li>
            <li><strong>High Demand:</strong> Government has constant need for skilled technicians across all sectors</li>
            <li><strong>Job Security:</strong> Government technician roles provide permanent employment</li>
            <li><strong>Entry to PSU:</strong> Pathway to higher-paying PSU technician and engineer-track positions</li>
            <li><strong>Apprenticeship Programs:</strong> Government apprenticeships lead to permanent positions with stipend + employment</li>
            <li><strong>Scope for Advancement:</strong> Diploma + experience can lead to supervisor/manager roles</li>
          </ul>
        </div>
      ),
    },
    {
      id: "government-jobs-diploma",
      title: "Top Government Jobs for Diploma Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. Railway Technician Positions</h3>
          <p>
            <strong>Indian Railways:</strong> Recruit diploma holders for technician roles in locomotives, signals, track maintenance. 500+ positions annually. Salary: ₹22,000-35,000, increasing to ₹50,000+ after 10 years.
          </p>

          <h3 className="font-bold text-lg mt-4">2. BSNL Technical Positions</h3>
          <p>
            <strong>Telecom Technician, Network Technician:</strong> BSNL recruits diploma graduates for technical roles. Salary: ₹20,000-32,000 entry level.
          </p>

          <h3 className="font-bold text-lg mt-4">3. Power Plant Technician</h3>
          <p>
            <strong>NTPC, State Electricity Boards:</strong> Technician roles for power generation and distribution. Salary: ₹23,000-35,000 + benefits.
          </p>

          <h3 className="font-bold text-lg mt-4">4. Apprenticeship Programs (Government)</h3>
          <p>
            <strong>National Apprenticeship Promotion Scheme:</strong> All PSUs conduct apprenticeship programs. Stipend: ₹8,000-12,000 per month for 1 year → Convert to permanent technician with salary ₹22,000-30,000.
          </p>

          <h3 className="font-bold text-lg mt-4">5. BSNL/Defense Manufacturing</h3>
          <p>
            <strong>Technician in Defence Units:</strong> Ordnance factories, HAL recruit diploma for skilled technical roles. Salary: ₹20,000-32,000.
          </p>

          <h3 className="font-bold text-lg mt-4">6. SSC Selection (Technician Category)</h3>
          <p>
            <strong>SSC Technician Recruitment:</strong> Government departments recruit diploma for technical assistant roles. Salary: ₹21,000-30,000.
          </p>
        </div>
      ),
    },
    {
      id: "salary-diploma",
      title: "Diploma Government Job Salary and Benefits",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Entry Level Salary (Technician)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Basic Salary</span>
              <span className="font-bold">₹12,000-16,000</span>
            </div>
            <div className="flex justify-between">
              <span>DA + HRA + Other</span>
              <span className="font-bold">₹6,000-12,000</span>
            </div>
            <div className="flex justify-between">
              <span>Overtime/Shift Allowance</span>
              <span className="font-bold">₹2,000-4,000</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Monthly</span>
              <span>₹20,000-32,000</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Career Progression (30 Years)</h3>
          <ul className="space-y-2">
            <li><strong>0-5 Years:</strong> ₹20,000-30,000 (Technician)</li>
            <li><strong>5-10 Years:</strong> ₹30,000-45,000 (Senior Technician)</li>
            <li><strong>10-15 Years:</strong> ₹45,000-65,000 (Supervisor/Foreman)</li>
            <li><strong>15+ Years:</strong> ₹65,000-100,000+ (Shift-in-charge, Manager)</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Benefits</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Annual bonus: 2-3 months salary</li>
            <li>Pension: 50% salary for life</li>
            <li>Medical coverage (CGHS/ESI)</li>
            <li>Government housing or loan</li>
            <li>Leave: 30 days casual + 15 days sick</li>
          </ul>
        </div>
      ),
    },
    {
      id: "exams-diploma",
      title: "Government Exams and Pathways for Diploma",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. Railway Recruitment Board (RRB)</h3>
          <p>
            <strong>Difficulty:</strong> Easy-Moderate | <strong>Positions:</strong> 1,000+ annually | <strong>Salary:</strong> ₹22,000-35,000
          </p>
          <p>
            Most common pathway for diploma technicians. RRB Group C exams for technician roles. High pass rate for diploma candidates.
          </p>

          <h3 className="font-bold text-lg mt-4">2. BSNL Technician Recruitment</h3>
          <p>
            <strong>Difficulty:</strong> Easy-Moderate | <strong>Positions:</strong> 500+ annually | <strong>Salary:</strong> ₹20,000-32,000
          </p>
          <p>
            Direct recruitment by BSNL for technical roles. Conducted every 2-3 years.
          </p>

          <h3 className="font-bold text-lg mt-4">3. SSC Technical Selection</h3>
          <p>
            <strong>Difficulty:</strong> Moderate | <strong>Positions:</strong> 500+ annually | <strong>Salary:</strong> ₹21,000-30,000
          </p>
          <p>
            Government technical assistant positions. Diploma specifically preferred.
          </p>

          <h3 className="font-bold text-lg mt-4">4. Apprenticeship Programs</h3>
          <p>
            <strong>Difficulty:</strong> Easy | <strong>Stipend:</strong> ₹8,000-12,000/month | <strong>Duration:</strong> 1-2 years
          </p>
          <p>
            All PSUs run apprenticeship. Diploma is primary qualification. 80-90% conversion to permanent technician roles.
          </p>

          <h3 className="font-bold text-lg mt-4">5. Power Sector Recruitment</h3>
          <p>
            <strong>NTPC, State Electricity Boards:</strong> Direct recruitment for technician roles. Conducted regularly.
          </p>

          <h3 className="font-bold text-lg mt-4">Recommendation</h3>
          <p>
            <strong>Best Path:</strong> (1) Enroll in PSU apprenticeship program (highest demand, immediate stipend), (2) Appear for Railway RRB recruitment (most positions), (3) BSNL technical selection as backup.
          </p>
        </div>
      ),
    },
    {
      id: "career-path",
      title: "Career Path for Diploma Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Technician Career Progression</h3>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 0-2: Apprentice / Trainee</p>
              <p className="text-sm text-gray-600">₹8,000-15,000 | Learning, practical training</p>
            </div>
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 2-5: Technician</p>
              <p className="text-sm text-gray-600">₹20,000-32,000 | Independent technical work</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 5-10: Senior Technician</p>
              <p className="text-sm text-gray-600">₹32,000-45,000 | Technical supervision, training juniors</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 10-15: Supervisor / Foreman</p>
              <p className="text-sm text-gray-600">₹45,000-65,000 | Team management, quality control</p>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <p className="font-bold">Year 15+: Manager / Shift-in-charge</p>
              <p className="text-sm text-gray-600">₹65,000-100,000+ | Department responsibility</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Advancement Options</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Pursue B.Tech part-time → Engineer role with 50% higher salary</li>
            <li>Specialized certifications (welding, safety, quality)</li>
            <li>Foreman/supervisor training programs</li>
          </ul>
        </div>
      ),
    },
    {
      id: "how-to-apply",
      title: "How to Apply for Diploma Government Jobs",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Step-by-Step Application (2-6 months)</h3>
          <div className="space-y-3">
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 1: Register for Recruitment Drives</p>
              <p className="text-sm text-gray-700 mt-1">
                Monitor RRB, BSNL, Railway websites for recruitment notifications
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 2: Apply to Apprenticeship Programs</p>
              <p className="text-sm text-gray-700 mt-1">
                Fastest pathway - apply to PSU apprenticeships through NASSCOMM portal
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 3: Written Test & Interview</p>
              <p className="text-sm text-gray-700 mt-1">
                Pass written exam (technical questions) → technical interview
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 4: Document Verification (1-2 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Submit diploma certificate, character certificate, medical fitness
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 5: Joining & Training</p>
              <p className="text-sm text-gray-700 mt-1">
                Receive joining letter → induction training → posted to location
              </p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Documents Required</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ Diploma certificate from polytechnic</li>
            <li>✓ Mark sheets from all semesters</li>
            <li>✓ 10th & 12th pass certificates</li>
            <li>✓ Character certificate</li>
            <li>✓ Medical fitness certificate</li>
            <li>✓ Address proof</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Eligibility</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ Diploma in any technical field (Mechanical, Electrical, Civil, etc.)</li>
            <li>✓ Indian citizen</li>
            <li>✓ Age: 18-28 years (varies by organization)</li>
            <li>✓ No criminal record</li>
            <li>✓ Medical fitness</li>
          </ul>
        </div>
      ),
    },
  ],
  relatedJobs: [
    {
      title: "Railway RRB Technician Recruitment 2025",
      recruitmentSlug: "rrb-technician-2025",
      postSlug: "technician-posts",
      vacancies: 1000,
      deadline: "2025-11-15",
    },
    {
      title: "BSNL Technician Recruitment 2025",
      recruitmentSlug: "bsnl-2025",
      postSlug: "technician-recruitment",
      vacancies: 500,
      deadline: "2025-10-30",
    },
    {
      title: "PSU Apprenticeship Programs 2025",
      recruitmentSlug: "psu-apprentice-2025",
      postSlug: "apprentice-recruitment",
      vacancies: 3000,
      deadline: "2025-09-30",
    },
    {
      title: "NTPC Technician Recruitment 2025",
      recruitmentSlug: "ntpc-2025",
      postSlug: "technician-positions",
      vacancies: 200,
      deadline: "2025-10-20",
    },
    {
      title: "Power Plant Technician Positions",
      recruitmentSlug: "power-sector-2025",
      postSlug: "technician-recruitment",
      vacancies: 300,
      deadline: "2025-11-30",
    },
  ],
  relatedQualifications: [
    { title: "ITI Government Jobs", slug: "iti-government-jobs" },
    { title: "10th Pass Government Jobs", slug: "10th-pass-government-jobs" },
    { title: "Engineering Government Jobs", slug: "engineering-government-jobs" },
    { title: "B.Tech Government Jobs", slug: "b-tech-government-jobs" },
  ],
  faqs: [
    {
      question: "What is the difference between diploma and ITI for government jobs?",
      answer:
        "Both qualify for technician roles. ITI (2 years) is basic skill training with lower salary (₹15,000-25,000). Diploma (3 years) provides deeper technical knowledge with higher salary (₹20,000-35,000) and better career growth. Diploma is preferable.",
    },
    {
      question: "Can I appear for GATE exam with diploma qualification?",
      answer:
        "Technically no, GATE is for B.Tech graduates. However, you can pursue B.Tech part-time/distance while working, then appear for GATE to move into engineer roles with 50% salary increase.",
    },
    {
      question: "Is apprenticeship a good pathway for diploma graduates?",
      answer:
        "Absolutely yes. PSU apprenticeship is fastest path: 1 year stipend (₹8,000-12,000/month) + 80% conversion to permanent technician (₹22,000-30,000 salary). Recommended over waiting for other exams.",
    },
    {
      question: "What is the maximum salary a diploma technician can reach?",
      answer:
        "Entry: ₹20,000-32,000 → Senior technician: ₹45,000-65,000 → Manager: ₹100,000+. Diploma technician reaching manager level is realistic with 15-20 years experience and some certifications.",
    },
    {
      question: "Can I shift from technician to engineer role later?",
      answer:
        "Yes, possible. While working as technician, pursue B.Tech (part-time/distance learning). Then appear for GATE → PSU engineer role. Takes 5-7 additional years but significant salary upgrade.",
    },
    {
      question: "How many attempts allowed for Railway RRB exams?",
      answer:
        "RRB conducts recruitment regularly. No official limit on attempts, but candidates typically age out (33-35 years). Most diploma candidates selected on first/second attempt due to relevant qualification.",
    },
    {
      question: "What skills should a diploma technician have for government jobs?",
      answer:
        "Technical skills from diploma course (machinery operation, electrical basics, safety), problem-solving, teamwork, basic computer literacy, attention to detail. Government values practical skills over theoretical knowledge.",
    },
    {
      question: "Is there a gender preference or reservation for diploma technician jobs?",
      answer:
        "No gender preference. Reservation for SC/ST/OBC categories applies equally. In fact, many organizations have women-specific vacancies to encourage gender diversity in technical roles.",
    },
    {
      question: "What is the postings process for diploma technicians in Railways?",
      answer:
        "After selection and training, posted to railway divisions across India. Pan-India posting possible. Some locations are remote. Posting can change every 3-5 years. Seniority-based posting preference after 10+ years.",
    },
    {
      question: "Can diploma graduates apply for non-technical government jobs?",
      answer:
        "Not directly. Diploma is technical qualification only. For non-technical jobs (SSC, banking), you need bachelor's degree (B.A, B.Com, B.Sc). Recommend pursuing B.Tech if aiming for broader government career options.",
    },
  ],
};

export default function DiplomaGovernmentJobsPage() {
  return <QualificationHubTemplate {...pageContent} />;
}
