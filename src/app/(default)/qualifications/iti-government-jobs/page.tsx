/**
 * ITI Government Jobs Page - Shortened for token efficiency
 *
 * Keyword Target: "ITI Government Jobs" (950 searches/month)
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import QualificationHubTemplate from "@/components/qualification-hub-template";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbSchema, buildFAQSchema, jsonLdGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "ITI Government Jobs in India 2025 - Technician, Apprentice, Skilled Worker Roles",
  description: "ITI government jobs: technician, apprentice, skilled worker positions. Salary ₹18,000-32,000, apprenticeships, railways, BSNL, PSU opportunities.",
  ...pageSeo(`${SITE_URL}/qualifications/iti-government-jobs`, { index: true }),
};

const pageContent = {
  title: "ITI Government Jobs in India",
  qualification: "ITI",
  heroDescription: "ITI graduates have strong opportunities in government for apprenticeships and technician roles. Explore salary, exams, and career progression in skilled trades.",
  quickFacts: {
    avgSalary: "₹18,000-32,000",
    topRecruiters: ["Indian Railways", "BSNL", "PSUs", "Manufacturing Units", "Defense"],
    topExams: ["Railway RRB", "Apprenticeship", "BSNL", "PSU Recruitment", "State Trade"],
    jobCount: 4231,
  },
  sections: [
    {
      id: "what-is-iti",
      title: "What is ITI and Government Job Opportunities",
      content: (
        <div className="space-y-4">
          <p>
            ITI (Industrial Training Institute) is a 6-month to 2-year vocational training course in skilled trades (Electrician, Plumber, Mechanic, Welding, etc.). Government organizations actively recruit ITI graduates for apprenticeships and technician roles.
          </p>
          <p>
            Government's National Apprenticeship Program prioritizes ITI graduates, offering stipend + permanent employment pathways. ITI is fastest route to government job among non-graduate certifications.
          </p>
        </div>
      ),
    },
    {
      id: "government-jobs-iti",
      title: "Top Government Jobs for ITI Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. PSU Apprenticeships</h3>
          <p>
            <strong>All PSUs (NTPC, Indian Oil, BHEL, etc.):</strong> 3,000+ apprentice positions annually. Stipend: ₹8,000-12,000/month for 1 year → Convert to permanent technician: ₹20,000-32,000.
          </p>

          <h3 className="font-bold text-lg mt-4">2. Railway Technician</h3>
          <p>
            <strong>Indian Railways:</strong> 500+ apprentice/technician positions. Starting: ₹18,000-25,000, increasing to ₹40,000+ after 10 years.
          </p>

          <h3 className="font-bold text-lg mt-4">3. BSNL Technical</h3>
          <p>
            <strong>BSNL Apprentice/Technician:</strong> Telecom technician roles. Salary: ₹18,000-28,000.
          </p>

          <h3 className="font-bold text-lg mt-4">4. Manufacturing/Defense Units</h3>
          <p>
            <strong>Ordnance Factories, HAL:</strong> Manufacturing technician positions. Salary: ₹18,000-32,000.
          </p>
        </div>
      ),
    },
    {
      id: "salary-iti",
      title: "ITI Government Job Salary and Career Progression",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Entry Level (Apprentice)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Apprentice Stipend</span>
              <span className="font-bold">₹8,000-12,000</span>
            </div>
            <div className="flex justify-between">
              <span>Post-Apprentice Technician</span>
              <span className="font-bold">₹20,000-32,000</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Career Progression (30 Years)</h3>
          <ul className="space-y-1">
            <li><strong>0-1 Year:</strong> ₹8,000-12,000 (Apprentice stipend)</li>
            <li><strong>1-5 Years:</strong> ₹20,000-30,000 (Technician)</li>
            <li><strong>5-10 Years:</strong> ₹35,000-50,000 (Senior Technician)</li>
            <li><strong>10+ Years:</strong> ₹50,000-80,000+ (Supervisor/Foreman)</li>
          </ul>
        </div>
      ),
    },
    {
      id: "exams-iti",
      title: "Government Exams for ITI Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. Apprenticeship Programs (Easiest Path)</h3>
          <p>
            <strong>Difficulty:</strong> Easy | <strong>Positions:</strong> 3,000+ annually | <strong>Stipend:</strong> ₹8,000-12,000/month
          </p>
          <p>
            All PSUs run apprenticeship programs. ITI is primary qualification. 80-90% convert to permanent technician after 1 year.
          </p>

          <h3 className="font-bold text-lg mt-4">2. Railway RRB Recruitment</h3>
          <p>
            <strong>Difficulty:</strong> Easy-Moderate | <strong>Positions:</strong> 500+ annually | <strong>Salary:</strong> ₹20,000-32,000
          </p>

          <h3 className="font-bold text-lg mt-4">3. BSNL Technician</h3>
          <p>
            <strong>Difficulty:</strong> Easy | <strong>Positions:</strong> 200+ | <strong>Salary:</strong> ₹18,000-28,000
          </p>
        </div>
      ),
    },
    {
      id: "career-path",
      title: "Career Path for ITI Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Typical Progression</h3>
          <div className="space-y-2">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 0-1: Apprentice</p>
              <p className="text-sm text-gray-600">₹8,000-12,000 | Learning, practical training</p>
            </div>
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 1-5: Technician</p>
              <p className="text-sm text-gray-600">₹20,000-32,000 | Independent technical work</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 5-15: Senior Technician/Supervisor</p>
              <p className="text-sm text-gray-600">₹35,000-65,000 | Team supervision, quality control</p>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <p className="font-bold">Year 15+: Foreman/Manager</p>
              <p className="text-sm text-gray-600">₹65,000-100,000+ | Department responsibility</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "how-to-apply",
      title: "How to Apply for ITI Government Jobs",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Fastest Path: ITI → Apprenticeship → Permanent Job (1-2 years)</h3>
          <div className="space-y-2">
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 1: Complete ITI Course</p>
              <p className="text-xs text-gray-700">6 months to 2 years depending on trade</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 2: Apply to PSU Apprenticeships</p>
              <p className="text-xs text-gray-700">Monitor NASSCOMM portal for apprenticeship notifications</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 3: Selection & Joining</p>
              <p className="text-xs text-gray-700">Technical interview (if required), receive appointment</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 4: 1-Year Apprenticeship</p>
              <p className="text-xs text-gray-700">Earn stipend + practical training</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-bold text-sm">Step 5: Convert to Permanent Position</p>
              <p className="text-xs text-gray-700">₹20,000-32,000 permanent technician salary</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Eligibility</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>✓ ITI certificate from recognized institute</li>
            <li>✓ 10th pass minimum education</li>
            <li>✓ Indian citizen</li>
            <li>✓ Age: 18-28 years (varies)</li>
            <li>✓ Medical fitness</li>
          </ul>
        </div>
      ),
    },
  ],
  relatedJobs: [
    {
      title: "PSU Apprenticeship 2025",
      recruitmentSlug: "psu-apprentice-2025",
      postSlug: "apprentice-recruitment",
      vacancies: 3000,
      deadline: "2025-09-30",
    },
    {
      title: "Railway RRB Technician 2025",
      recruitmentSlug: "rrb-2025",
      postSlug: "technician-posts",
      vacancies: 500,
      deadline: "2025-11-15",
    },
    {
      title: "BSNL Technician Recruitment 2025",
      recruitmentSlug: "bsnl-2025",
      postSlug: "technician-recruitment",
      vacancies: 200,
      deadline: "2025-10-30",
    },
    {
      title: "Ordnance Factory Recruitment 2025",
      recruitmentSlug: "ordnance-2025",
      postSlug: "technician-positions",
      vacancies: 300,
      deadline: "2025-11-30",
    },
  ],
  relatedQualifications: [
    { title: "Diploma Government Jobs", slug: "diploma-government-jobs" },
    { title: "10th Pass Government Jobs", slug: "10th-pass-government-jobs" },
    { title: "Engineering Government Jobs", slug: "engineering-government-jobs" },
  ],
  faqs: [
    {
      question: "Is apprenticeship a paid position or unpaid training?",
      answer: "Apprenticeships are PAID positions. You earn ₹8,000-12,000 monthly stipend while learning. After 1 year, conversion to permanent technician role with ₹20,000-32,000 salary.",
    },
    {
      question: "What is the conversion rate from apprentice to permanent job?",
      answer: "Conversion rate: 80-90%. Most PSU apprentices convert to permanent technician positions after completing 1-year apprenticeship successfully.",
    },
    {
      question: "Can ITI graduate become engineer later?",
      answer: "Yes. ITI + Diploma → Bachelor's via AMIE exam → Engineer role possible. However, takes 5-7 years additional study. Direct government job faster with ITI alone.",
    },
    {
      question: "What trades are in highest demand for government jobs?",
      answer: "Highest demand: Electrician, Welder, Mechanic, Plumber, CNC operator, Electronics. These trades have maximum apprenticeship positions and fastest conversion rates.",
    },
    {
      question: "How is ITI different from Diploma for government jobs?",
      answer: "ITI (6mo-2yr): Faster, 1-year apprenticeship → permanent job. Diploma (3yr): Higher salary entry (₹20,000-35,000 vs ₹18,000), more career ceiling. ITI is faster to employment.",
    },
  ],
};

export default function ITIGovernmentJobsPage() {
  return <QualificationHubTemplate {...pageContent} />;
}
