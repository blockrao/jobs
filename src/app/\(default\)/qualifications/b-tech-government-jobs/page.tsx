/**
 * B.Tech Government Jobs Page
 *
 * Keyword Target: "B.Tech Government Jobs" (8,100 searches/month)
 * Related Keywords: Engineering, Government jobs, Salary, GATE, PSU, ISRO, DRDO
 *
 * Content Strategy:
 * - Target engineers looking for government career paths
 * - Link to GATE, UPSC, SSC, Railway, Banking exams
 * - Show real salary data and career progression
 * - Internal links to related qualifications (M.Tech, Diploma, etc.)
 * - Internal links to salary guides and comparisons
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import QualificationHubTemplate from "@/components/qualification-hub-template";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "B.Tech Government Jobs in India 2025 - Salary, Exams, Career Path",
  description:
    "Complete guide to B.Tech government jobs: salary ₹35,000-50,000, top exams (GATE, UPSC, SSC), PSU recruitment, ISRO, DRDO, and career progression for engineers.",
  ...pageSeo(`${SITE_URL}/qualifications/b-tech-government-jobs`, { index: true }),
};

const pageContent = {
  title: "B.Tech Government Jobs in India",
  qualification: "B.Tech",
  heroDescription:
    "B.Tech graduates have excellent opportunities in government jobs with attractive salaries, job security, and career growth. Explore government organizations recruiting engineers: ISRO, DRDO, PSUs, Railways, and more.",
  quickFacts: {
    avgSalary: "₹35,000-50,000",
    topRecruiters: ["ISRO", "DRDO", "NTPC", "Indian Oil", "Bharat Heavy Electricals"],
    topExams: ["GATE", "UPSC", "SSC JE", "Railway", "Banking"],
    jobCount: 2845,
  },
  sections: [
    {
      id: "what-is-btech",
      title: "What is B.Tech and Government Job Opportunities",
      content: (
        <div className="space-y-4">
          <p>
            B.Tech (Bachelor of Technology) is a 4-year undergraduate engineering degree that qualifies graduates for various government sector positions. Government organizations actively recruit B.Tech engineers for technical, administrative, and project management roles across multiple departments and industries.
          </p>
          <p>
            The government values engineering expertise for infrastructure development, research, energy, and public utilities. B.Tech graduates are preferred for positions in ISRO, DRDO, Indian Railways, State Electricity Boards, PSU manufacturing units, and civil service roles requiring technical knowledge.
          </p>
          <h3 className="font-bold text-lg mt-4">Why B.Tech Government Jobs?</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Job Security:</strong> Government jobs provide lifetime employment security with regular pay increments and pension benefits.
            </li>
            <li>
              <strong>Excellent Salary:</strong> Starting salary of ₹35,000-50,000 per month with regular allowances and benefits.
            </li>
            <li>
              <strong>Career Growth:</strong> Clear promotion pathways with grade progression from Level 1 to senior management positions.
            </li>
            <li>
              <strong>Work-Life Balance:</strong> Fixed working hours and structured leave policies (30 days annual leave + additional benefits).
            </li>
            <li>
              <strong>Pension & Retirement Benefits:</strong> Defined Benefit Pension Scheme with family coverage.
            </li>
            <li>
              <strong>Medical & Housing Benefits:</strong> Comprehensive health insurance for employee and family, housing loan with low interest rates.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "government-jobs-btech",
      title: "Top Government Jobs for B.Tech Graduates",
      content: (
        <div className="space-y-4">
          <p>
            B.Tech graduates can pursue careers in numerous government organizations across different sectors. Here are the primary categories:
          </p>
          <h3 className="font-bold text-lg mt-4">1. Space & Research (ISRO, DRDO)</h3>
          <p>
            <strong>Indian Space Research Organisation (ISRO):</strong> Recruits B.Tech engineers for satellite design, launch vehicles, ground systems, and space technology. Starting salary: ₹45,000-55,000 per month.
          </p>
          <p>
            <strong>Defence Research and Development Organisation (DRDO):</strong> Hiring engineers for weapon systems, aerospace, electronics, and mechanical projects. Salary range: ₹40,000-50,000 monthly.
          </p>

          <h3 className="font-bold text-lg mt-4">2. Public Sector Undertakings (PSUs)</h3>
          <p>
            Major PSUs recruiting B.Tech engineers through GATE examination:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>NTPC Limited:</strong> Power generation, 500+ engineer positions annually. Salary: ₹35,000-45,000
            </li>
            <li>
              <strong>Indian Oil Corporation:</strong> Oil & gas refining, pipeline operations. Salary: ₹38,000-48,000
            </li>
            <li>
              <strong>Bharat Heavy Electricals Limited (BHEL):</strong> Power equipment manufacturing. Salary: ₹35,000-45,000
            </li>
            <li>
              <strong>Power Grid Corporation:</strong> Electricity transmission networks. Salary: ₹38,000-48,000
            </li>
            <li>
              <strong>Coal India Limited:</strong> Mining operations and energy. Salary: ₹35,000-42,000
            </li>
          </ul>

          <h3 className="font-bold text-lg mt-4">3. Railways</h3>
          <p>
            <strong>Indian Railways NTPC:</strong> Graduate apprenticeships and engineering positions for track maintenance, signal systems, and locomotive technology. Starting salary: ₹28,000-35,000, increasing to ₹45,000+ after 4 years.
          </p>

          <h3 className="font-bold text-lg mt-4">4. Banking & Finance</h3>
          <p>
            Major government banks (SBI, Bank of India, PNB) recruit B.Tech graduates for IT, operations, and management roles through IBPS exams. Salary: ₹30,000-40,000 starting.
          </p>

          <h3 className="font-bold text-lg mt-4">5. Civil Service (IAS/IFS)</h3>
          <p>
            B.Tech graduates can appear for UPSC Civil Service Examination with technical knowledge as an advantage for engineering-related postings. IAS salary: ₹56,100-177,500 per month (Level 10 to Level 16).
          </p>
        </div>
      ),
    },
    {
      id: "salary-btech",
      title: "B.Tech Government Job Salary & Benefits",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Monthly Salary Breakdown (GATE Recruited PSUs)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Basic Salary</span>
              <span className="font-bold">₹25,000-30,000</span>
            </div>
            <div className="flex justify-between">
              <span>Dearness Allowance (DA)</span>
              <span className="font-bold">₹8,000-12,000</span>
            </div>
            <div className="flex justify-between">
              <span>House Rent Allowance (HRA)</span>
              <span className="font-bold">₹4,000-6,000</span>
            </div>
            <div className="flex justify-between">
              <span>Other Allowances</span>
              <span className="font-bold">₹2,000-4,000</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Monthly Salary</span>
              <span>₹35,000-50,000</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Salary Progression Over 30-Year Career</h3>
          <ul className="space-y-2">
            <li>
              <strong>0-3 Years (Entry):</strong> ₹35,000-40,000 (Trainee/Junior Engineer)
            </li>
            <li>
              <strong>3-8 Years (Development):</strong> ₹50,000-75,000 (Senior Engineer)
            </li>
            <li>
              <strong>8-15 Years (Growth):</strong> ₹80,000-120,000 (Manager/Specialist)
            </li>
            <li>
              <strong>15+ Years (Peak):</strong> ₹120,000-250,000+ (Chief Manager/Director)
            </li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Additional Benefits</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Annual Bonus:</strong> Productivity Linked Bonus (PLB) typically 3-5 months salary
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
              <strong>Education:</strong> Children scholarship and education assistance programs
            </li>
          </ul>

          <p className="text-sm text-gray-600 mt-4">
            *Salary figures are approximate and vary by organization, location, and grade. ISRO and DRDO typically pay 10-20% higher than standard PSU scales.
          </p>
        </div>
      ),
    },
    {
      id: "exams-btech",
      title: "Top Government Exams for B.Tech Engineers",
      content: (
        <div className="space-y-4">
          <p>
            B.Tech graduates can pursue government jobs through multiple competitive exams:
          </p>

          <h3 className="font-bold text-lg mt-4">1. GATE (Graduate Aptitude Test in Engineering)</h3>
          <p>
            <strong>Difficulty:</strong> High | <strong>Salary Potential:</strong> ₹35,000-50,000 | <strong>Job Security:</strong> Excellent
          </p>
          <p>
            GATE is the primary pathway for B.Tech engineers to join PSUs. Over 200,000 candidates appear annually, and top 0.1% get PSU recruitment. GATE score is also valid for 3 years.
          </p>
          <p>
            <strong>PSUs Recruiting through GATE:</strong> NTPC, BHEL, Power Grid, Coal India, Indian Oil, NLC, etc.
          </p>

          <h3 className="font-bold text-lg mt-4">2. SSC JE (Junior Engineer) Exam</h3>
          <p>
            <strong>Difficulty:</strong> Medium | <strong>Salary:</strong> ₹35,400-112,400 | <strong>Positions:</strong> 100+ annually
          </p>
          <p>
            SSC Junior Engineer exam is conducted twice yearly for Central PWD, Railway, Central Water Commission, and other government departments.
          </p>

          <h3 className="font-bold text-lg mt-4">3. UPSC Civil Service (IAS/IFS)</h3>
          <p>
            <strong>Difficulty:</strong> Very High | <strong>Salary:</strong> ₹56,100-177,500 | <strong>Prestige:</strong> Highest
          </p>
          <p>
            B.Tech graduates can appear for UPSC CSS with technical knowledge advantageous for engineering-cadre postings.
          </p>

          <h3 className="font-bold text-lg mt-4">4. Indian Railways NTPC</h3>
          <p>
            <strong>Positions:</strong> 10,000+ annually | <strong>Starting Salary:</strong> ₹28,000-35,000
          </p>
          <p>
            Non-Technical Graduate Posts for B.Tech graduates in railways, increasing to ₹45,000+ after apprenticeship completion.
          </p>

          <h3 className="font-bold text-lg mt-4">5. Banking Exams (IBPS/SBI)</h3>
          <p>
            <strong>Salary:</strong> ₹30,000-42,000 | <strong>Positions:</strong> 5,000+ annually
          </p>
          <p>
            Government banks recruit B.Tech graduates for IT and Operations roles through IBPS PO and SBI PO exams.
          </p>

          <h3 className="font-bold text-lg mt-4">Exam Difficulty Ranking</h3>
          <ol className="list-decimal pl-6 space-y-1">
            <li>UPSC Civil Service (Hardest)</li>
            <li>GATE (Hard)</li>
            <li>SSC JE (Moderate)</li>
            <li>Banking Exams (Moderate)</li>
            <li>Railway NTPC (Moderate-Easy)</li>
          </ol>
        </div>
      ),
    },
    {
      id: "career-path",
      title: "Career Path & Growth for B.Tech in Government",
      content: (
        <div className="space-y-4">
          <p>
            Government organizations offer structured career progression for B.Tech engineers:
          </p>

          <h3 className="font-bold text-lg mt-4">Typical Career Progression (PSU - 30 Year Career)</h3>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 0-2: Trainee/Graduate Engineer</p>
              <p className="text-sm text-gray-600">
                Salary: ₹32,000-38,000 | Training, field work, project exposure
              </p>
            </div>
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 2-6: Junior Engineer / Senior Trainee</p>
              <p className="text-sm text-gray-600">
                Salary: ₹45,000-60,000 | Lead small teams, site supervision, technical execution
              </p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 6-12: Senior Engineer / Technical Specialist</p>
              <p className="text-sm text-gray-600">
                Salary: ₹75,000-100,000 | Project management, 15-20 people reporting, technical authority
              </p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 12-20: Manager / Chief Engineer</p>
              <p className="text-sm text-gray-600">
                Salary: ₹110,000-150,000 | Department head, strategic planning, 50+ team
              </p>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <p className="font-bold">Year 20+: Senior Manager / Director</p>
              <p className="text-sm text-gray-600">
                Salary: ₹150,000-300,000+ | Organization-wide responsibility, policy making
              </p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Specialization Opportunities</h3>
          <p>
            B.Tech engineers can specialize in:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Project Management (PRINCE2, PMP certifications)</li>
            <li>Safety & Quality (ISO certifications)</li>
            <li>Operations Management</li>
            <li>Research & Development (for ISRO, DRDO roles)</li>
            <li>Energy Efficiency & Sustainability</li>
          </ul>
        </div>
      ),
    },
    {
      id: "how-to-apply",
      title: "How to Apply for B.Tech Government Jobs",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Step-by-Step Application Process</h3>

          <div className="space-y-3">
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 1: Appear for Entrance Exam (3-6 months preparation)</p>
              <p className="text-sm text-gray-700 mt-1">
                Register on exam website (gate.iitm.ac.in, ssc.nic.in, etc.) → Prepare for 3-6 months → Appear on exam date
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 2: Check Results & Score Cards (1-2 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Results published on official website → Download score card → Compare with cutoffs
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 3: Participate in Recruitment Process (2-4 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Apply through GATE portal (for PSUs) → Participate in interviews → Technical round + HR round
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 4: Document Verification & Selection (1-2 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Submit educational certificates, character certificates → Medical examination → Final selection
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 5: Joining & Training (1-6 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Receive joining letter → Complete induction training → Posted to work location
              </p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Documents Required</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>B.Tech degree certificate and mark sheets</li>
            <li>Graduation scorecard/transcripts</li>
            <li>Character certificate from college principal</li>
            <li>Medical fitness certificate</li>
            <li>Caste certificate (if applicable)</li>
            <li>Address proof (Aadhaar, electricity bill)</li>
            <li>10th & 12th pass certificates</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Eligibility Criteria</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Indian citizen or eligible foreigner</li>
            <li>Bachelor's degree in Engineering (any branch)</li>
            <li>Age limit: Typically 30-35 years (varies by exam/organization)</li>
            <li>No conviction record</li>
            <li>Medical fitness (verified by government medical board)</li>
          </ul>
        </div>
      ),
    },
  ],
  relatedJobs: [
    {
      title: "GATE 2025 Notification",
      recruitmentSlug: "graduate-aptitude-test-engineering-2025",
      postSlug: "gate-exam-notification",
      vacancies: 2000,
      deadline: "2025-10-30",
    },
    {
      title: "NTPC Recruitment 2025 - Engineer Trainee",
      recruitmentSlug: "ntpc-limited-2025",
      postSlug: "engineer-trainee-recruitment",
      vacancies: 500,
      deadline: "2025-09-30",
    },
    {
      title: "Indian Railways NTPC 2025 - Graduate Posts",
      recruitmentSlug: "indian-railways-2025",
      postSlug: "ntpc-graduate-recruitment",
      vacancies: 10000,
      deadline: "2025-11-15",
    },
    {
      title: "BHEL Recruitment - Graduate Engineer Trainee",
      recruitmentSlug: "bhel-limited-2025",
      postSlug: "get-program-recruitment",
      vacancies: 300,
      deadline: "2025-08-31",
    },
    {
      title: "DRDO Scientist/Engineer Recruitment 2025",
      recruitmentSlug: "drdo-recruitment-2025",
      postSlug: "scientist-engineer-posts",
      vacancies: 200,
      deadline: "2025-10-15",
    },
  ],
  relatedQualifications: [
    { title: "M.Tech Government Jobs", slug: "m-tech-government-jobs" },
    { title: "Engineering Government Jobs", slug: "engineering-government-jobs" },
    { title: "Diploma in Engineering Government Jobs", slug: "diploma-engineering-government-jobs" },
    { title: "MBA Government Jobs", slug: "mba-government-jobs" },
  ],
  faqs: [
    {
      question: "What is the starting salary for B.Tech in government jobs?",
      answer:
        "The starting salary for B.Tech engineers in government PSUs ranges from ₹32,000-50,000 per month depending on the organization and grade. ISRO and DRDO typically offer higher salaries (₹45,000-55,000) compared to other PSUs.",
    },
    {
      question: "Which exam is easiest for B.Tech engineers - GATE or SSC JE?",
      answer:
        "SSC JE is generally considered easier than GATE. GATE has higher competition (200,000+ candidates) but offers higher-paying PSU jobs. SSC JE has lower competition but positions are limited (100+ annually). Choice depends on career goals.",
    },
    {
      question: "Can B.Tech graduates appear for UPSC Civil Service?",
      answer:
        "Yes, B.Tech graduates (any stream) can appear for UPSC Civil Service Examination. Their engineering background is advantageous for technical cadres like IES (Indian Engineering Service) and can help in sectoral postings.",
    },
    {
      question: "What is the job security like in government jobs?",
      answer:
        "Government jobs in India offer exceptional job security. Once confirmed (after 2-year probation), employees cannot be terminated except under extreme circumstances. Government employees enjoy lifetime employment, pension benefits, and cannot be laid off.",
    },
    {
      question: "How long is the recruitment process from exam to joining?",
      answer:
        "Typically 6-12 months from exam date to final joining. This includes results (1-2 months), interviews (2-4 months), document verification (1-2 months), and training (1-3 months before posting).",
    },
    {
      question: "Are there age limits for B.Tech government job exams?",
      answer:
        "Yes. GATE has no age limit, but most PSU recruitment prefers candidates under 30-32 years. SSC JE has upper age limit of 32 years (with relaxations for reserved categories). UPSC CSE has upper age limit of 32 years.",
    },
    {
      question: "What is the difference between GATE and direct recruitment?",
      answer:
        "GATE is the primary portal for PSU recruitment where the organization and candidate both participate through the GATE portal. Direct recruitment is when an organization conducts its own entrance exam and interview. GATE jobs are usually higher-paying and more transparent.",
    },
    {
      question: "Can B.Tech from private college apply for government jobs?",
      answer:
        "Yes, absolutely. Government exams and recruitment do not discriminate between private and government college graduates. What matters is the B.Tech degree from a recognized university. Competition is equal for all candidates.",
    },
    {
      question: "What skills do B.Tech engineers need for government jobs?",
      answer:
        "Technical knowledge in your branch, problem-solving skills, communication abilities, and analytical thinking are essential. Additionally, soft skills like leadership, teamwork, and computer proficiency are increasingly important for management roles.",
    },
    {
      question: "Is a B.Tech in any branch eligible or only certain branches?",
      answer:
        "B.Tech from any recognized engineering branch (Computer Science, Mechanical, Electrical, Civil, Electronics, etc.) is eligible for most government jobs. However, some positions may prefer specific branches (e.g., ISRO prefers Electronics/Mechanical for satellite programs).",
    },
  ],
};

export default function BTechGovernmentJobsPage() {
  return <QualificationHubTemplate {...pageContent} />;
}
