/**
 * 10th Pass Government Jobs Page
 *
 * Keyword Target: "10th Pass Government Jobs" (750 searches/month)
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import QualificationHubTemplate from "@/components/qualification-hub-template";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "10th Pass Government Jobs in India 2025 - Railway, Postal, Army Jobs",
  description: "10th pass government jobs: railway worker, postal, army recruit, apprentice. Salary ₹18,000-28,000, RRB Group D, apprenticeships, career progression.",
  ...pageSeo(`${SITE_URL}/qualifications/10th-pass-government-jobs`, { index: true }),
};

const pageContent = {
  title: "10th Pass Government Jobs in India",
  qualification: "10th Pass",
  heroDescription: "10th pass students have excellent opportunities in government through apprenticeships, railways, postal services, and armed forces. Explore opportunities and career paths.",
  quickFacts: {
    avgSalary: "₹18,000-28,000",
    topRecruiters: ["Indian Railways", "Post Office", "PSU Apprenticeships", "Armed Forces", "Manufacturing"],
    topExams: ["RRB Group D", "Post Office", "Apprenticeship", "Armed Forces"],
    jobCount: 6200,
  },
  sections: [
    {
      id: "what-is-10th",
      title: "What is 10th Pass and Government Job Opportunities",
      content: (
        <div className="space-y-4">
          <p>
            10th pass (SSC - Secondary School Certificate) is the minimum qualification for apprenticeships and entry-level government positions in railways, postal services, and manufacturing units. This opens immediate government employment doors.
          </p>
          <p>
            Government apprenticeship programs specifically target 10th pass students. Apprenticeships offer stipend + permanent job conversion at 80-90% rate. This is the fastest route to government employment in India.
          </p>
        </div>
      ),
    },
    {
      id: "government-jobs",
      title: "Top Government Jobs for 10th Pass",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. PSU Apprenticeships (Best Option)</h3>
          <p>
            <strong>NTPC, Indian Oil, BHEL, HAL:</strong> 3,000+ positions. Stipend: ₹8,000-12,000 → Convert to permanent technician: ₹20,000-32,000 after 1 year. Highest conversion rate.
          </p>

          <h3 className="font-bold text-lg mt-4">2. Railway RRB Group D</h3>
          <p>
            <strong>Indian Railways:</strong> 50,000+ worker positions. Salary: ₹18,000-25,000. Largest number of vacancies among government exams.
          </p>

          <h3 className="font-bold text-lg mt-4">3. Postal Service Worker</h3>
          <p>
            <strong>India Post:</strong> Postman, mail sorter positions. Salary: ₹18,000-26,000. Good work-life balance.
          </p>

          <h3 className="font-bold text-lg mt-4">4. Armed Forces Recruit</h3>
          <p>
            <strong>Army, Navy, Air Force:</strong> Soldier, tradesman roles. Salary: ₹21,000+ with high benefits and pension.
          </p>

          <h3 className="font-bold text-lg mt-4">5. Manufacturing Technician</h3>
          <p>
            <strong>Ordnance Factories, Defense Units:</strong> Production technician, operator roles. Salary: ₹18,000-28,000.
          </p>
        </div>
      ),
    },
    {
      id: "salary",
      title: "10th Pass Government Job Salary and Career Progression",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Entry Level (Apprentice or RRB Group D)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Apprentice Stipend (1 year)</span>
              <span className="font-bold">₹8,000-12,000</span>
            </div>
            <div className="flex justify-between">
              <span>RRB Group D / Worker</span>
              <span className="font-bold">₹18,000-25,000</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Career Progression (30+ years)</h3>
          <ul className="space-y-1 text-sm">
            <li><strong>0-1 Year:</strong> ₹8,000-12,000 (Apprentice stipend)</li>
            <li><strong>1-5 Years:</strong> ₹18,000-28,000 (Technician/Worker)</li>
            <li><strong>5-15 Years:</strong> ₹30,000-50,000 (Senior technician/Supervisor)</li>
            <li><strong>15+ Years:</strong> ₹50,000-80,000+ (Foreman/Officer)</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Benefits</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>✓ Job security for life</li>
            <li>✓ Defined benefit pension (50% salary)</li>
            <li>✓ Medical coverage for family</li>
            <li>✓ Government housing loan</li>
          </ul>
        </div>
      ),
    },
    {
      id: "exams",
      title: "Government Exams for 10th Pass",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. RRB Group D (BEST OPTION)</h3>
          <p>
            <strong>Difficulty:</strong> Very Easy | <strong>Positions:</strong> 50,000+ | <strong>Salary:</strong> ₹18,000-25,000
          </p>
          <p className="text-sm">Railway worker positions. Easiest government exam (20-30% pass rate). Highest number of vacancies. Best for quick employment.</p>

          <h3 className="font-bold text-lg mt-4">2. Apprenticeship Programs (FASTEST)</h3>
          <p>
            <strong>Difficulty:</strong> Easy | <strong>Positions:</strong> 3,000+ | <strong>Stipend:</strong> ₹8,000-12,000 → Convert ₹20,000-32,000
          </p>
          <p className="text-sm">All PSUs run apprentice programs. 80-90% conversion to permanent job. Takes only 1 year to permanent role.</p>

          <h3 className="font-bold text-lg mt-4">3. Post Office Recruitment</h3>
          <p>
            <strong>Difficulty:</strong> Easy | <strong>Positions:</strong> 2,000+ | <strong>Salary:</strong> ₹18,000-26,000
          </p>

          <h3 className="font-bold text-lg mt-4">4. Armed Forces</h3>
          <p>
            <strong>Difficulty:</strong> Moderate (Physical Fitness) | <strong>Positions:</strong> 5,000+ | <strong>Salary:</strong> ₹21,000+
          </p>
        </div>
      ),
    },
    {
      id: "career-path",
      title: "Career Path for 10th Pass",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Two Fastest Career Paths</h3>
          <div className="space-y-2">
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold text-sm">Path 1: Apprentice (Recommended) - 1 Year to Permanent Job</p>
              <p className="text-xs text-gray-600">₹8,000-12,000 (apprentice) → ₹20,000-32,000 (permanent technician)</p>
            </div>
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold text-sm">Path 2: RRB Group D - Immediate Permanent Job</p>
              <p className="text-xs text-gray-600">₹18,000-25,000 (worker) → ₹40,000+ (senior worker/supervisor)</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "how-to-apply",
      title: "How to Apply for 10th Pass Government Jobs",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Fastest Path: 10th Pass → Apprenticeship → Permanent Job (1 year)</h3>
          <div className="space-y-2">
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 1: Complete 10th Pass</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 2: Apply for PSU Apprenticeships (NASSCOMM portal)</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 3: Selection & Joining (Basic interview)</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 4: 1-Year Apprenticeship with Stipend</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 5: Convert to Permanent Technician (₹20,000-32,000)</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Alternative Path: RRB Group D (Immediate Job)</h3>
          <div className="space-y-2">
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 1: Register for RRB Group D Exam</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 2: Prepare & Appear (2-3 months)</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 3: Document Verification & Medical (1 month)</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 4: Joining as Railway Worker (₹18,000-25,000)</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Eligibility</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>✓ 10th pass from recognized board</li>
            <li>✓ Indian citizen</li>
            <li>✓ Age: 18-33 years (varies)</li>
            <li>✓ Medical fitness (Physical for armed forces)</li>
          </ul>
        </div>
      ),
    },
  ],
  relatedJobs: [
    {
      title: "RRB Group D 2025",
      recruitmentSlug: "rrb-group-d-2025",
      postSlug: "group-d-recruitment",
      vacancies: 50000,
      deadline: "2025-12-31",
    },
    {
      title: "PSU Apprenticeship 2025",
      recruitmentSlug: "psu-apprentice-2025",
      postSlug: "apprentice-recruitment",
      vacancies: 3000,
      deadline: "2025-09-30",
    },
    {
      title: "Post Office Recruitment 2025",
      recruitmentSlug: "post-office-2025",
      postSlug: "postal-worker-positions",
      vacancies: 2000,
      deadline: "2025-10-31",
    },
    {
      title: "Army Recruitment 2025",
      recruitmentSlug: "army-recruitment-2025",
      postSlug: "soldier-recruitment",
      vacancies: 5000,
      deadline: "2025-11-30",
    },
  ],
  relatedQualifications: [
    { title: "12th Pass Government Jobs", slug: "12th-pass-government-jobs" },
    { title: "ITI Government Jobs", slug: "iti-government-jobs" },
    { title: "Diploma Government Jobs", slug: "diploma-government-jobs" },
  ],
  faqs: [
    {
      question: "Which government job is easiest for 10th pass?",
      answer: "RRB Group D is the easiest with highest pass rate (20-30%) and most vacancies (50,000+). Apprenticeships are also easy but require 1-year wait for permanent job.",
    },
    {
      question: "How long does apprenticeship take to become permanent?",
      answer: "1 year. Most PSU apprentices convert to permanent technician position after completing 1 year with 80-90% conversion rate.",
    },
    {
      question: "Is 10th pass salary enough for living?",
      answer: "₹18,000-28,000 is decent for entry level. However, continuing education part-time (12th, diploma) opens better opportunities (₹35,000+).",
    },
    {
      question: "Can 10th pass become officer in government?",
      answer: "Yes, but takes longer (15+ years of promotions). Quicker path: 10th → 12th part-time → SSC CHSL exam → Officer role in 5-7 years.",
    },
  ],
};

export default function TenthPassGovernmentJobsPage() {
  return <QualificationHubTemplate {...pageContent} />;
}
