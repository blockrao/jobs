/**
 * 12th Pass Government Jobs Page
 *
 * Keyword Target: "12th Pass Government Jobs" (850 searches/month)
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import QualificationHubTemplate from "@/components/qualification-hub-template";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "12th Pass Government Jobs in India 2025 - Railway, Post Office, Banking Jobs",
  description: "12th pass government jobs: railway clerk, postal worker, LIC agent. Salary ₹20,000-35,000, SSC CHSL, RRB NTPC exams, career guide.",
  ...pageSeo(`${SITE_URL}/qualifications/12th-pass-government-jobs`, { index: true }),
};

const pageContent = {
  title: "12th Pass Government Jobs in India",
  qualification: "12th Pass",
  heroDescription: "12th pass graduates have abundant government job opportunities in railways, banks, postal services. Explore salary, exams, and career progression for secondary school qualification.",
  quickFacts: {
    avgSalary: "₹20,000-35,000",
    topRecruiters: ["Indian Railways", "Banks (Clerk)", "Post Office", "SSC", "LIC"],
    topExams: ["SSC CHSL", "RRB NTPC", "RRB Group D", "Banking Clerk", "Post Office"],
    jobCount: 8500,
  },
  sections: [
    {
      id: "what-is-12th",
      title: "What is 12th Pass and Government Job Opportunities",
      content: (
        <div className="space-y-4">
          <p>
            12th pass (senior secondary education) is the minimum qualification for numerous government jobs in India. Students with any stream (Science, Commerce, Arts) can apply for government positions in railways, banking, postal services, and armed forces.
          </p>
          <p>
            Government has massive recruitment for 12th pass candidates: 50,000+ positions annually across railways, banks, and postal services. This is the most accessible entry point to government employment in India.
          </p>
        </div>
      ),
    },
    {
      id: "government-jobs",
      title: "Top Government Jobs for 12th Pass",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. Railway Clerk</h3>
          <p>
            <strong>Indian Railways RRB NTPC:</strong> 20,000+ positions. Salary: ₹20,000-32,000 entry, reaching ₹60,000+ as officer.
          </p>

          <h3 className="font-bold text-lg mt-4">2. Banking Clerk</h3>
          <p>
            <strong>All Banks (SBI, IBPS, Private):</strong> 10,000+ positions annually. Salary: ₹18,000-28,000 entry, ₹50,000+ as officer within 5-7 years.
          </p>

          <h3 className="font-bold text-lg mt-4">3. Postal Service</h3>
          <p>
            <strong>India Post:</strong> Postman, postal clerk roles. Salary: ₹20,000-30,000. Good work-life balance.
          </p>

          <h3 className="font-bold text-lg mt-4">4. SSC CHSL (Combined Higher Secondary)</h3>
          <p>
            <strong>Government offices, customs, excise:</strong> Salary: ₹21,000-32,000. Most popular government exam for 12th pass.
          </p>

          <h3 className="font-bold text-lg mt-4">5. Armed Forces</h3>
          <p>
            <strong>Army, Navy, Air Force recruitment:</strong> Soldier, airman positions. Salary: ₹21,000+ with high benefits.
          </p>

          <h3 className="font-bold text-lg mt-4">6. LIC Agent</h3>
          <p>
            <strong>Life Insurance Corporation:</strong> Insurance agent role. Salary: ₹12,000 base + commission (₹30,000-50,000+ with good performance).
          </p>
        </div>
      ),
    },
    {
      id: "salary",
      title: "12th Pass Government Job Salary and Career Progression",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Entry Level Salary</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Basic Salary</span>
              <span className="font-bold">₹15,000-20,000</span>
            </div>
            <div className="flex justify-between">
              <span>DA + HRA</span>
              <span className="font-bold">₹4,000-8,000</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total Monthly</span>
              <span>₹20,000-35,000</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Career Progression (30+ years)</h3>
          <ul className="space-y-1 text-sm">
            <li><strong>0-3 Years:</strong> ₹20,000-25,000 (Clerk/Postal Worker)</li>
            <li><strong>3-10 Years:</strong> ₹30,000-45,000 (Senior Clerk → Officer Promoted)</li>
            <li><strong>10+ Years:</strong> ₹50,000-80,000+ (Senior Officer/Manager)</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Railway Progression Example</h3>
          <p className="text-sm">Railway Group D → ₹18,000 → Group C Clerk → ₹28,000 → Senior Clerk → ₹45,000 → Officer → ₹80,000+</p>
        </div>
      ),
    },
    {
      id: "exams",
      title: "Government Exams for 12th Pass",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. SSC CHSL (Most Popular)</h3>
          <p>
            <strong>Difficulty:</strong> Easy-Moderate | <strong>Positions:</strong> 5,000+ | <strong>Salary:</strong> ₹21,000-32,000
          </p>
          <p className="text-sm">Staff Selection Commission exam for 12th pass. Multi-level selection: Tier 1 (online), Tier 2 (descriptive). Pass rate 5-10%.</p>

          <h3 className="font-bold text-lg mt-4">2. RRB NTPC</h3>
          <p>
            <strong>Difficulty:</strong> Moderate | <strong>Positions:</strong> 10,000+ | <strong>Salary:</strong> ₹20,000-32,000
          </p>
          <p className="text-sm">Railway recruitment. NTPC (Non-Technical Popular Category) most suitable for 12th pass. High number of positions.</p>

          <h3 className="font-bold text-lg mt-4">3. Banking Clerk Exam</h3>
          <p>
            <strong>Difficulty:</strong> Easy | <strong>Positions:</strong> 10,000+ | <strong>Salary:</strong> ₹18,000-28,000
          </p>
          <p className="text-sm">IBPS Clerk, SBI Clerk. Highest pass rate among government exams (10-15%). Fastest path to banking.</p>

          <h3 className="font-bold text-lg mt-4">4. RRB Group D</h3>
          <p>
            <strong>Difficulty:</strong> Very Easy | <strong>Positions:</strong> 50,000+ | <strong>Salary:</strong> ₹18,000-25,000
          </p>
          <p className="text-sm">Railway worker positions. Easiest government exam. Highest number of vacancies. Best for quick employment.</p>
        </div>
      ),
    },
    {
      id: "career-path",
      title: "Career Path for 12th Pass",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Fastest to Richest Career Paths</h3>
          <div className="space-y-2">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold text-sm">Path 1: RRB Group D → NTPC (2-3 years)</p>
              <p className="text-xs text-gray-600">₹18,000 → ₹28,000 (fastest promotion)</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold text-sm">Path 2: Banking Clerk → Officer (5-7 years)</p>
              <p className="text-xs text-gray-600">₹18,000 → ₹50,000+ (best salary growth)</p>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <p className="font-bold text-sm">Path 3: SSC CHSL → Income Tax Officer (10+ years)</p>
              <p className="text-xs text-gray-600">₹21,000 → ₹80,000+ (premium positions)</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "how-to-apply",
      title: "How to Apply for 12th Pass Government Jobs",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Fastest Path: 12th → RRB Group D → Job (3-6 months)</h3>
          <div className="space-y-2">
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 1: Complete 12th Pass</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 2: Register for Government Exam (RRB Group D, Banking Clerk, or SSC CHSL)</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 3: Prepare & Appear (2-4 months)</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 4: Document Verification (1-2 months)</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 5: Medical & Joining</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Eligibility</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>✓ 12th pass from recognized board</li>
            <li>✓ Indian citizen</li>
            <li>✓ Age: 18-30 years (varies by exam)</li>
            <li>✓ Medical fitness</li>
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
      title: "SSC CHSL 2025",
      recruitmentSlug: "ssc-chsl-2025",
      postSlug: "chsl-exam",
      vacancies: 5000,
      deadline: "2025-11-30",
    },
    {
      title: "Banking Clerk 2025",
      recruitmentSlug: "banking-clerk-2025",
      postSlug: "clerk-positions",
      vacancies: 10000,
      deadline: "2025-10-31",
    },
  ],
  relatedQualifications: [
    { title: "10th Pass Government Jobs", slug: "10th-pass-government-jobs" },
    { title: "B.A Government Jobs", slug: "b-a-government-jobs" },
    { title: "ITI Government Jobs", slug: "iti-government-jobs" },
  ],
  faqs: [
    {
      question: "What is the easiest government exam for 12th pass?",
      answer: "RRB Group D is the easiest with highest pass rate (20-25%) and most vacancies (50,000+). Banking Clerk is also easy (10-15% pass rate). SSC CHSL is moderate difficulty (5-10% pass rate).",
    },
    {
      question: "Can 12th pass become bank officer or only clerk?",
      answer: "12th pass starts as clerk. After 5-7 years, you can appear for officer promotion exams and become officer with ₹50,000+ salary. Clear career progression available.",
    },
    {
      question: "How much time to prepare for SSC CHSL or RRB exam?",
      answer: "2-4 months preparation is standard. Most 12th pass candidates succeed with 3 months focused study using books and mock tests.",
    },
    {
      question: "Is 12th pass salary enough or need to study further?",
      answer: "12th pass salary (₹20,000-35,000) is good initially. However, for higher salary (₹80,000+), pursuing graduation while working is recommended (part-time distance education).",
    },
  ],
};

export default function TwelfthPassGovernmentJobsPage() {
  return <QualificationHubTemplate {...pageContent} />;
}
