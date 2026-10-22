/**
 * Engineering Government Jobs Page
 *
 * Keyword Target: "Engineering Government Jobs" (5,900 searches/month)
 * Related Keywords: Government engineer jobs, Public sector, PSU, Infrastructure
 *
 * This is a broad qualification page covering all engineering disciplines
 * Links to specific engineering branches (Mechanical, Civil, Electrical, etc.)
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import QualificationHubTemplate from "@/components/qualification-hub-template";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Engineering Government Jobs in India 2025 - All Branches, Salary Guide",
  description:
    "Government engineering jobs for Civil, Mechanical, Electrical, Chemical engineers. Salary ₹30,000-60,000, PSU & infrastructure roles, GATE exam guide, career growth.",
  ...pageSeo(`${SITE_URL}/qualifications/engineering-government-jobs`, { index: true }),
};

const pageContent = {
  title: "Engineering Government Jobs in India",
  qualification: "Engineering",
  heroDescription:
    "Engineering graduates have diverse government career opportunities across public sector, infrastructure, power, oil & gas, railways, and defence. Discover job types, salary, exams, and career progression.",
  quickFacts: {
    avgSalary: "₹30,000-60,000",
    topRecruiters: ["Power Grid", "Indian Oil", "NTPC", "Highways Authority", "Metro Rail"],
    topExams: ["GATE", "SSC JE", "UPSC", "Railway", "State PSC"],
    jobCount: 4231,
  },
  sections: [
    {
      id: "what-is-engineering",
      title: "What is Engineering and Government Job Scope",
      content: (
        <div className="space-y-4">
          <p>
            Engineering is a 4-year bachelor's degree that prepares professionals for designing, building, and improving infrastructure, machines, systems, and processes. Government organizations across India desperately need engineers for infrastructure projects, power generation, transportation, and defence.
          </p>
          <p>
            Engineering disciplines include Civil, Mechanical, Electrical, Electronics, Chemical, Computer Science, Aeronautical, and many others. Each discipline opens unique government career pathways with strong demand and excellent job security.
          </p>
          <h3 className="font-bold text-lg mt-4">Government Sectors Hiring Engineers</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Infrastructure:</strong> Roads, highways, dams, water management (Project length: 20-30 years)</li>
            <li><strong>Power & Energy:</strong> Power plants, transmission networks, renewable energy projects</li>
            <li><strong>Oil & Gas:</strong> Refineries, pipelines, exploration, distribution networks</li>
            <li><strong>Transportation:</strong> Railways, metros, ports, airports, highways</li>
            <li><strong>Defence:</strong> DRDO, Defence PSUs, military equipment manufacturing</li>
            <li><strong>Space & Research:</strong> ISRO, satellite technology, research institutions</li>
            <li><strong>Telecom:</strong> BSNL, state telecom corporations, network infrastructure</li>
            <li><strong>Water & Sanitation:</strong> Municipal corporations, water boards, treatment plants</li>
          </ul>
        </div>
      ),
    },
    {
      id: "government-jobs-engineering",
      title: "Top Government Jobs for Engineering Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. PSU Engineering Roles (GATE Path)</h3>
          <p>
            <strong>Power Sector:</strong> NTPC, Power Grid Corporation, State Electricity Boards - Design, construction, operation of power plants and transmission networks. Salary: ₹35,000-50,000 entry level.
          </p>
          <p>
            <strong>Oil & Gas:</strong> Indian Oil, ONGC, Hindustan Petroleum - Refinery operations, pipeline management, exploration projects. Salary: ₹38,000-55,000 entry level.
          </p>

          <h3 className="font-bold text-lg mt-4">2. Infrastructure & Public Works</h3>
          <p>
            <strong>National Highways Authority (NHAI):</strong> Road design, construction, maintenance. 200+ positions annually. Salary: ₹32,000-45,000.
          </p>
          <p>
            <strong>Railways:</strong> Track engineering, signals, civil works. NTPC recruitment: 10,000+ positions. Salary: ₹28,000-45,000+.
          </p>
          <p>
            <strong>Metro Rail Corporations:</strong> Construction, operations, systems engineering for metro projects. Salary: ₹30,000-50,000.
          </p>

          <h3 className="font-bold text-lg mt-4">3. Defence & Aerospace</h3>
          <p>
            <strong>DRDO:</strong> Weapon systems, aerospace, electronics, mechanical engineering projects. 500+ positions annually. Salary: ₹40,000-55,000.
          </p>
          <p>
            <strong>ISRO:</strong> Satellite systems, launch vehicles, ground equipment. 100+ positions annually. Salary: ₹45,000-60,000.
          </p>
          <p>
            <strong>Defence Manufacturing:</strong> Ordnance factories, Hindustan Aeronautics Limited (HAL), Mazagon Dock. Salary: ₹35,000-50,000.
          </p>

          <h3 className="font-bold text-lg mt-4">4. Water & Sanitation</h3>
          <p>
            <strong>Water Boards:</strong> Treatment plants, distribution networks, dam management. Salary: ₹30,000-45,000.
          </p>

          <h3 className="font-bold text-lg mt-4">5. Mining & Minerals</h3>
          <p>
            <strong>Coal India Limited, Mineral Exploration:</strong> Mining operations, safety, extraction management. Salary: ₹32,000-48,000.
          </p>
        </div>
      ),
    },
    {
      id: "salary-engineering",
      title: "Engineering Government Job Salary Structure",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Entry Level Salary (GATE Recruited)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Basic Salary</span>
              <span className="font-bold">₹22,000-28,000</span>
            </div>
            <div className="flex justify-between">
              <span>DA + HRA</span>
              <span className="font-bold">₹10,000-18,000</span>
            </div>
            <div className="flex justify-between">
              <span>Other Benefits</span>
              <span className="font-bold">₹2,000-4,000</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Monthly</span>
              <span>₹30,000-50,000</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Career Salary Growth</h3>
          <ul className="space-y-2">
            <li><strong>0-3 Years:</strong> ₹30,000-40,000 (Junior Engineer)</li>
            <li><strong>3-8 Years:</strong> ₹48,000-70,000 (Senior Engineer)</li>
            <li><strong>8-15 Years:</strong> ₹75,000-120,000 (Manager)</li>
            <li><strong>15+ Years:</strong> ₹120,000-300,000+ (Senior Management)</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Benefits Package</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Performance Bonus: 3-5 months salary annually</li>
            <li>Pension: 50% salary for life</li>
            <li>Medical Coverage: CGHS/ESI for family</li>
            <li>Housing Loan: 4-6% interest with ₹20-50 lakh sanction</li>
            <li>Leave: 30 days casual + 15 days sick annually</li>
            <li>Professional Development: Higher education support, certifications</li>
          </ul>
        </div>
      ),
    },
    {
      id: "exams-engineering",
      title: "Government Exams for Engineering Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. GATE (Graduate Aptitude Test in Engineering)</h3>
          <p>
            The primary exam for PSU recruitment. 200,000+ candidates annually, top 0.1% get PSU jobs. Multiple specialization branches: Civil, Mechanical, Electrical, Electronics, Chemical, Computer Science, and 23+ others.
          </p>
          <p><strong>Recruitment:</strong> NTPC, Power Grid, BHEL, SAIL, Coal India, Oil refineries</p>

          <h3 className="font-bold text-lg mt-4">2. SSC JE (Junior Engineer)</h3>
          <p>
            Conducted twice yearly for Central PWD, Railways, Central Water Commission. Easier than GATE with moderate competition.
          </p>
          <p><strong>Salary Range:</strong> ₹35,400-112,400 | <strong>Positions:</strong> 100-200 annually</p>

          <h3 className="font-bold text-lg mt-4">3. State PSC Engineering Exams</h3>
          <p>
            Every state conducts engineering exams for state-level PSUs, public works, water boards, and state corporations. Entry into state PSU with similar benefits as central PSUs.
          </p>

          <h3 className="font-bold text-lg mt-4">4. UPSC Civil Service (IES - Indian Engineering Service)</h3>
          <p>
            <strong>Highest Prestige:</strong> IES officers can rise to secretary-level positions. Also eligible for IAS with technical advantage.
          </p>
          <p><strong>Salary:</strong> ₹56,100-177,500 | <strong>Service Track Record:</strong> Highly respected career path</p>

          <h3 className="font-bold text-lg mt-4">5. Railway Recruitment</h3>
          <p>
            Multiple pathways: NTPC, SSC, recruitment through GATE (some PSU railroads). 10,000+ positions annually across India with pan-India posting.
          </p>

          <h3 className="font-bold text-lg mt-4">Exam Difficulty & Strategy</h3>
          <p><strong>Easiest to Hardest:</strong> Railway NTPC → SSC JE → GATE → UPSC IES → UPSC IAS</p>
          <p>Strategy: Start with SSC JE or Railway NTPC for job security, prepare GATE alongside for higher salary PSUs.</p>
        </div>
      ),
    },
    {
      id: "career-path",
      title: "Career Growth in Government Engineering",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Typical 30-Year Career Progression</h3>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 0-2: Graduate Engineer / Trainee</p>
              <p className="text-sm text-gray-600">Field work, learning, small projects, ₹30,000-38,000</p>
            </div>
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 2-6: Senior Engineer</p>
              <p className="text-sm text-gray-600">Lead teams, site supervision, project execution, ₹48,000-65,000</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 6-12: Manager / Chief Engineer</p>
              <p className="text-sm text-gray-600">Department head, 20-50 people, strategic projects, ₹75,000-110,000</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 12-20: Senior Manager / General Manager</p>
              <p className="text-sm text-gray-600">Division head, multiple projects, P&L responsibility, ₹110,000-180,000</p>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <p className="font-bold">Year 20+: Director / Executive Director</p>
              <p className="text-sm text-gray-600">Organization-wide responsibility, policy, ₹180,000-400,000+</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Specialization Paths</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Project Management (Large infrastructure, multi-year projects)</li>
            <li>Technical Leadership (Subject matter expert, technical authority)</li>
            <li>Operations Management (Plant operations, daily management)</li>
            <li>Safety & Quality (ISO, occupational safety, compliance)</li>
            <li>Research & Innovation (R&D roles in labs and research institutes)</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Inter-PSU Movement</h3>
          <p>
            Government engineers can transfer between PSUs (NTPC → Power Grid, ONGC → Indian Oil, etc.) for higher positions, creating diverse career trajectories and industry experience.
          </p>
        </div>
      ),
    },
    {
      id: "how-to-apply",
      title: "How to Apply for Engineering Government Jobs",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Application Process (6-12 months total)</h3>
          <div className="space-y-3">
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 1: Choose Your Path (1-2 weeks)</p>
              <p className="text-sm text-gray-700 mt-1">
                Decide between GATE, SSC JE, Railway NTPC, or State PSC based on your specialization and career goals
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 2: Register & Prepare (3-6 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Register on official website, enroll in coaching/self-study, practice mock tests daily
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 3: Exam Day</p>
              <p className="text-sm text-gray-700 mt-1">
                Appear for competitive exam, submit answers, get scorecard within 1-2 months
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 4: Interview (2-4 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Get shortlisted based on cutoff, attend technical interview, HR interview
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 5: Document Verification & Joining (1-3 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Submit documents, medical check-up, receive joining letter, start training
              </p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Required Documents</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Engineering degree certificate</li>
            <li>Mark sheets from all semesters</li>
            <li>Character certificate from college</li>
            <li>Medical fitness certificate</li>
            <li>Caste certificate (if applicable)</li>
            <li>10th, 12th certificates</li>
            <li>Address proof (Aadhaar)</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Eligibility Checklist</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ Bachelor's degree in any engineering discipline</li>
            <li>✓ Indian citizen or eligible category</li>
            <li>✓ Age typically 21-35 years (varies by exam)</li>
            <li>✓ No criminal record</li>
            <li>✓ Medical fitness certified by government doctor</li>
          </ul>
        </div>
      ),
    },
  ],
  relatedJobs: [
    {
      title: "GATE 2025 - All Engineering Streams",
      recruitmentSlug: "gate-2025",
      postSlug: "gate-notification",
      vacancies: 2000,
      deadline: "2025-10-30",
    },
    {
      title: "Power Grid Recruitment 2025",
      recruitmentSlug: "power-grid-2025",
      postSlug: "executive-trainee-engineer",
      vacancies: 400,
      deadline: "2025-09-15",
    },
    {
      title: "NTPC Graduate Recruitment 2025",
      recruitmentSlug: "ntpc-2025",
      postSlug: "engineer-trainee",
      vacancies: 500,
      deadline: "2025-09-30",
    },
    {
      title: "SSC JE Exam 2025 Notification",
      recruitmentSlug: "ssc-je-2025",
      postSlug: "junior-engineer-notification",
      vacancies: 100,
      deadline: "2025-08-15",
    },
    {
      title: "NHAI Engineering Recruitment 2025",
      recruitmentSlug: "nhai-2025",
      postSlug: "engineer-positions",
      vacancies: 200,
      deadline: "2025-10-20",
    },
  ],
  relatedQualifications: [
    { title: "B.Tech Government Jobs", slug: "b-tech-government-jobs" },
    { title: "M.Tech Government Jobs", slug: "m-tech-government-jobs" },
    { title: "Diploma in Engineering Government Jobs", slug: "diploma-engineering-government-jobs" },
    { title: "Civil Engineering Government Jobs", slug: "civil-engineering-government-jobs" },
  ],
  faqs: [
    {
      question: "What is the best engineering discipline for government jobs?",
      answer:
        "Civil and Mechanical Engineering have the highest government job demand for infrastructure and PSU projects. Electronics and Computer Science offer IT and tech roles. All disciplines have good government opportunities; choice depends on interest and specialization.",
    },
    {
      question: "Can I get a government job with engineering degree without GATE?",
      answer:
        "Yes. You can appear for SSC JE, Railway NTPC, State PSC exams, or banking exams which don't require GATE. GATE is the highest-paying path to PSUs, but alternatives exist. Railway NTPC and SSC JE are popular alternatives.",
    },
    {
      question: "What's the difference between GATE engineering job and SSC JE job?",
      answer:
        "GATE jobs through PSUs typically pay ₹35,000-50,000 entry level with higher growth. SSC JE jobs in central departments pay ₹35,400-45,000 entry level. GATE competition is higher (200,000+ candidates) but salary potential is better.",
    },
    {
      question: "How much time needed to prepare for GATE?",
      answer:
        "4-6 months of dedicated preparation is standard. If you have engineering background already, 3 months may suffice. Some candidates prepare for 1-2 years for top scores. Depends on your current knowledge and target rank.",
    },
    {
      question: "Can I apply for UPSC IES with engineering degree?",
      answer:
        "Yes, fully eligible. Engineering graduates are the primary audience for Indian Engineering Service (IES). IES is considered more prestigious than PSU GATE jobs with higher salary (Level 10-14) and better career prospects as officers.",
    },
    {
      question: "What happens after clearing GATE exam?",
      answer:
        "After clearing GATE with good score, you participate in PSU recruitment. Different PSUs conduct interviews (written test + interview + group discussion). Process typically takes 2-4 months from cutoff declaration to final selection.",
    },
    {
      question: "How many PSUs recruit through GATE?",
      answer:
        "20+ major PSUs recruit through GATE including NTPC, Power Grid, BHEL, Indian Oil, Coal India, Steel Authority, NLC, SAIL, and many others. GATE score is valid for 3 years, so you can apply in multiple years.",
    },
    {
      question: "Is engineering government job posting pan-India?",
      answer:
        "Yes, most government engineering jobs involve pan-India posting. You may be posted in any city/state after joining. Some PSUs offer preference for home state in initial posting. Posting changes every 3-5 years for career development.",
    },
    {
      question: "What is the growth ceiling in government engineering jobs?",
      answer:
        "Engineers can rise to Director/Executive Director level (₹200,000-400,000+) or higher in large PSUs. Some senior engineers also pursue UPSC for IAS/IFS cadre. Growth is steady and structured based on performance and years of service.",
    },
    {
      question: "Is shift work common in engineering government jobs?",
      answer:
        "Depends on posting. Power plants, refineries, and 24/7 operations have shift rotations. Infrastructure and construction projects may have site-based work with variable hours. Desk jobs have standard 9-5 hours. Most positions normalize after initial posting.",
    },
  ],
};

export default function EngineeringGovernmentJobsPage() {
  return <QualificationHubTemplate {...pageContent} />;
}
