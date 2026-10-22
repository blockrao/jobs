/**
 * LLB Government Jobs Page
 *
 * Keyword Target: "LLB Government Jobs" (1,200 searches/month)
 * Related Keywords: Law, Lawyer, Government position, Court, Legal officer, Judicial
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import QualificationHubTemplate from "@/components/qualification-hub-template";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "LLB Government Jobs in India 2025 - Lawyer, Judge, Legal Officer Roles",
  description:
    "LLB government jobs: civil service, judiciary, legal officer, government counsel roles. Judicial exam, UPSC, civil service pathway. Salary ₹35,000-150,000+ career guide.",
  ...pageSeo(`${SITE_URL}/qualifications/llb-government-jobs`, { index: true }),
};

const pageContent = {
  title: "LLB Government Jobs in India",
  qualification: "LLB",
  heroDescription:
    "LLB graduates have prestigious opportunities in government as judges, civil service officers, legal officers, and government counsel. Explore exams, salary, and path to judicial and legal roles.",
  quickFacts: {
    avgSalary: "₹35,000-150,000+",
    topRecruiters: ["Judiciary", "UPSC Civil Service", "Government Ministries", "Courts", "AG Office"],
    topExams: ["Judicial Exam", "UPSC Civil Service", "SSC CGL Law", "State Bar Council", "Law Ministry"],
    jobCount: 856,
  },
  sections: [
    {
      id: "what-is-llb",
      title: "What is LLB and Government Job Opportunities",
      content: (
        <div className="space-y-4">
          <p>
            LLB (Bachelor of Laws) is a professional law degree qualifying graduates for legal practice, judicial roles, and government positions. Government organizations recruit LLB holders as judges, legal advisors, and civil service officers.
          </p>
          <p>
            LLB is gateway to India's judicial system and legal government roles. India has acute shortage of judges and legal officers, creating exceptional opportunities for LLB graduates in government sector.
          </p>
          <h3 className="font-bold text-lg mt-4">Why LLB for Government Jobs?</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Judicial Career:</strong> Pathway to judge position - one of India's most respected roles
            </li>
            <li>
              <strong>Prestige & Authority:</strong> Judges and legal officers wield significant authority and respect in society
            </li>
            <li>
              <strong>High Salary:</strong> Judge salary ₹150,000+ with housing, transportation, and respect
            </li>
            <li>
              <strong>Civil Service Track:</strong> LLB qualifies for IAS/IFS with legal background advantage
            </li>
            <li>
              <strong>Legal Expertise Value:</strong> Government desperately needs legal expertise in policy, legislation, litigation
            </li>
            <li>
              <strong>Career Flexibility:</strong> Can practice law privately while working in government, creating additional income
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "government-jobs-llb",
      title: "Top Government Jobs for LLB Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. Judicial Positions (Judge)</h3>
          <p>
            <strong>District Judge, High Court Judge, Supreme Court Judge:</strong> Most prestigious government position. Starting as civil judge: ₹56,100-177,500, reaching chief justice ₹300,000+ (appointment by President). Security, bungalow, staff provided.
          </p>

          <h3 className="font-bold text-lg mt-4">2. Civil Service (UPSC IAS/IFS)</h3>
          <p>
            <strong>IAS Officer:</strong> LLB graduates eligible with advantage for legal/constitutional law administration. Salary: ₹56,100-177,500.
          </p>

          <h3 className="font-bold text-lg mt-4">3. Government Legal Officer</h3>
          <p>
            <strong>Law Ministry, Government Counsel:</strong> Legal advisor roles in government departments. Salary: ₹35,000-75,000 entry, ₹120,000+ as senior counsel.
          </p>

          <h3 className="font-bold text-lg mt-4">4. Attorney General & Solicitor General</h3>
          <p>
            <strong>AG Office Advocates:</strong> Government litigator position. Salary: ₹50,000-100,000+. Represents government in court cases.
          </p>

          <h3 className="font-bold text-lg mt-4">5. Law & Parliamentary Commission</h3>
          <p>
            <strong>Law Commission, Parliamentary Affairs:</strong> Policy-making roles. Salary: ₹40,000-80,000.
          </p>

          <h3 className="font-bold text-lg mt-4">6. State Public Service Exams</h3>
          <p>
            <strong>State PSC Legal Officer Recruitment:</strong> State government legal roles. Salary: ₹30,000-55,000.
          </p>
        </div>
      ),
    },
    {
      id: "salary-llb",
      title: "LLB Government Job Salary and Progression",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Judicial Salary Structure</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Civil Judge (Entry)</span>
              <span className="font-bold">₹56,100-90,000</span>
            </div>
            <div className="flex justify-between">
              <span>Additional District Judge</span>
              <span className="font-bold">₹90,000-140,000</span>
            </div>
            <div className="flex justify-between">
              <span>High Court Judge</span>
              <span className="font-bold">₹140,000-200,000</span>
            </div>
            <div className="flex justify-between">
              <span>Chief Justice/Senior Judge</span>
              <span className="font-bold">₹200,000-300,000+</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Judge Career Benefits</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Government bungalow (free housing)</li>
            <li>Official vehicle + driver</li>
            <li>Personal security (for senior judges)</li>
            <li>Generous pension (80% salary for life)</li>
            <li>Medical benefits (CGHS premium coverage)</li>
            <li>Children education scholarships</li>
            <li>Lifetime tenure security</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Civil Service (IAS) vs Judicial</h3>
          <ul className="space-y-2">
            <li><strong>IAS Starting:</strong> ₹56,100-90,000 → Chief Secretary: ₹200,000+</li>
            <li><strong>Judge Starting:</strong> ₹56,100-90,000 → Chief Justice: ₹300,000+</li>
            <li><strong>Key Difference:</strong> Judges have superior authority within judiciary, IAS officers in administration</li>
          </ul>
        </div>
      ),
    },
    {
      id: "exams-llb",
      title: "Government Exams and Pathways for LLB",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. Judicial Exam (State Level)</h3>
          <p>
            <strong>Difficulty:</strong> Hard | <strong>Positions:</strong> 50-200 per state | <strong>Salary:</strong> ₹56,100-177,500
          </p>
          <p>
            Primary pathway to judge position. Every state conducts judicial service exam. LLB degree is mandatory. Most direct path to judicial career.
          </p>

          <h3 className="font-bold text-lg mt-4">2. UPSC Civil Service (IAS/IFS)</h3>
          <p>
            <strong>Difficulty:</strong> Very High | <strong>Salary:</strong> ₹56,100-177,500 | <strong>Prestige:</strong> Highest
          </p>
          <p>
            LLB graduates eligible. Law knowledge provides advantage for constitutional law and legal policy roles in IAS.
          </p>

          <h3 className="font-bold text-lg mt-4">3. Law Ministry Recruitment</h3>
          <p>
            <strong>Difficulty:</strong> Medium | <strong>Positions:</strong> 100+ annually | <strong>Salary:</strong> ₹35,000-75,000
          </p>
          <p>
            Direct recruitment for government legal officer roles. Some positions conducted by SSC.
          </p>

          <h3 className="font-bold text-lg mt-4">4. Attorney General's Office</h3>
          <p>
            <strong>Difficulty:</strong> Hard | <strong>Positions:</strong> 50+ annually | <strong>Salary:</strong> ₹50,000-100,000+
          </p>
          <p>
            Government litigator. Top law graduates from premier law schools preferred. Represents government in court.
          </p>

          <h3 className="font-bold text-lg mt-4">Recommendation</h3>
          <p>
            <strong>Best Path:</strong> (1) Judicial exam (direct path to judge), (2) UPSC Civil Service as alternative, (3) Law Ministry roles for administrative law.
          </p>
        </div>
      ),
    },
    {
      id: "career-path",
      title: "Career Path for LLB Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Judicial Career Progression</h3>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 0-10: Civil Judge</p>
              <p className="text-sm text-gray-600">₹56,100-90,000 | Trial court judge, civil & criminal cases</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 10-20: Additional District Judge</p>
              <p className="text-sm text-gray-600">₹90,000-140,000 | Senior judge, complex cases, supervisory role</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 20+: High Court Judge</p>
              <p className="text-sm text-gray-600">₹140,000-200,000+ | Constitutional law, appeals, jurisdiction-wide authority</p>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <p className="font-bold">Peak: Chief Justice / Supreme Court</p>
              <p className="text-sm text-gray-600">₹200,000-300,000+ | Highest authority, law-making influence</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Alternative: Government Legal Officer</h3>
          <ul className="space-y-2">
            <li><strong>Entry:</strong> ₹35,000-50,000 (Legal Officer)</li>
            <li><strong>Mid-Career:</strong> ₹60,000-90,000 (Senior Legal Officer)</li>
            <li><strong>Senior:</strong> ₹100,000-150,000+ (Chief Legal Officer/AG)</li>
          </ul>
        </div>
      ),
    },
    {
      id: "how-to-apply",
      title: "How to Apply for LLB Government Jobs",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Fast Track: LLB → Judicial Exam → Judge (2-3 years)</h3>
          <div className="space-y-3">
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 1: Complete LLB + Bar Membership</p>
              <p className="text-sm text-gray-700 mt-1">
                Complete 5-year LLB, pass bar council exam, register as advocate
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 2: Practice as Advocate (3-5 years optional)</p>
              <p className="text-sm text-gray-700 mt-1">
                Gain legal experience (helps in interviews but not mandatory)
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 3: Appear for Judicial Exam</p>
              <p className="text-sm text-gray-700 mt-1">
                Register for state judicial service exam, prepare 6-12 months
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 4: Written Exam + Interview (6-12 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Pass written exam covering law subjects, appear for interview
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 5: Joining as Civil Judge</p>
              <p className="text-sm text-gray-700 mt-1">
                Receive appointment letter, induction training, posted to court
              </p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Documents Required</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ LLB degree certificate</li>
            <li>✓ Bar council registration</li>
            <li>✓ Mark sheets from law school</li>
            <li>✓ Character certificate</li>
            <li>✓ Medical fitness report</li>
            <li>✓ Professional experience certificate (if practiced)</li>
            <li>✓ Address proof</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Eligibility</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ LLB from recognized law university</li>
            <li>✓ Bar council registration (advocate license)</li>
            <li>✓ Indian citizen</li>
            <li>✓ Age: 25-40 years (varies by state)</li>
            <li>✓ No criminal convictions</li>
            <li>✓ Medical fitness</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Key Advantage: LLB Graduates</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ High pass rate for judicial exams (well-prepared candidates)</li>
            <li>✓ Judicial salary among highest in government (₹150,000-300,000+)</li>
            <li>✓ Lifetime tenure security after confirmation</li>
            <li>✓ Respect and authority in society</li>
            <li>✓ Can continue legal practice while serving in judiciary</li>
            <li>✓ Clear career progression path: Judge → High Court → Supreme Court</li>
          </ul>
        </div>
      ),
    },
  ],
  relatedJobs: [
    {
      title: "State Judicial Service Exam 2025",
      recruitmentSlug: "judicial-exam-2025",
      postSlug: "civil-judge-recruitment",
      vacancies: 500,
      deadline: "2025-12-31",
    },
    {
      title: "UPSC Civil Service 2025",
      recruitmentSlug: "upsc-css-2025",
      postSlug: "civil-service-exam",
      vacancies: 1000,
      deadline: "2025-09-15",
    },
    {
      title: "Law Ministry Legal Officer Recruitment 2025",
      recruitmentSlug: "law-ministry-2025",
      postSlug: "legal-officer-recruitment",
      vacancies: 100,
      deadline: "2025-11-30",
    },
    {
      title: "Attorney General's Office Recruitment",
      recruitmentSlug: "ag-office-2025",
      postSlug: "government-advocate-posts",
      vacancies: 50,
      deadline: "2025-10-30",
    },
    {
      title: "State PSC Law Officer Recruitment 2025",
      recruitmentSlug: "state-psc-law-2025",
      postSlug: "law-officer-positions",
      vacancies: 200,
      deadline: "2025-12-15",
    },
  ],
  relatedQualifications: [
    { title: "B.A Government Jobs", slug: "b-a-government-jobs" },
    { title: "M.A Government Jobs", slug: "m-a-government-jobs" },
    { title: "MBA Government Jobs", slug: "mba-government-jobs" },
    { title: "B.Com Government Jobs", slug: "b-com-government-jobs" },
  ],
  faqs: [
    {
      question: "Do I need to practice as advocate before appearing for judicial exam?",
      answer:
        "No, it's not mandatory. You can directly appear for judicial exam after law school and bar council registration. However, 3-5 years of practice improves interview performance and legal knowledge.",
    },
    {
      question: "What is the pass rate and difficulty level of judicial exams?",
      answer:
        "Pass rate: 3-5% (very competitive). Difficulty: Hard. Only top law graduates succeed. Extensive preparation (12-18 months) and strong legal knowledge required.",
    },
    {
      question: "Can LLB graduate become judge without appearing for exam?",
      answer:
        "No. Judicial exam is mandatory to become judge in India. It's a rigorous selection process to ensure only best legal minds reach judiciary.",
    },
    {
      question: "What is the benefit of UPSC for LLB graduates?",
      answer:
        "UPSC opens IAS/IFS career with similar salary (₹56,100-177,500) as judge entry. Advantage: IAS can later become chief secretary (₹200,000+), more administrative power than judge in some aspects.",
    },
    {
      question: "Can a judge continue private law practice while serving?",
      answer:
        "No. Judges must resign from legal practice upon appointment. However, retired judges can practice. This is to avoid conflict of interest.",
    },
    {
      question: "What law subjects are most important for judicial exam?",
      answer:
        "Constitutional Law, Criminal Law, Civil Law, and Law of Evidence are most important. Emphasis on Indian Constitution, IPC, CrPC, CPC, Indian Evidence Act.",
    },
    {
      question: "How long is the judicial career span?",
      answer:
        "Judges retire at 62 years. Typical career: age 30 (civil judge) → age 50+ (high court judge). About 30+ years of judicial service possible.",
    },
    {
      question: "What is the competition level for judicial exams?",
      answer:
        "Extremely competitive. For 100 judge positions, 5,000-10,000 advocates compete. Only top 1-2% succeed. Most require 2-3 attempts.",
    },
    {
      question: "Are there gender-based reservations in judicial exams?",
      answer:
        "SC/ST/OBC reservations apply. Women candidates may have some advantages in certain states. Overall, judiciary has 30-40% women judges (increasing).",
    },
    {
      question: "What is the fastest way to government job for LLB graduate?",
      answer:
        "Law Ministry recruitment is fastest (2-3 months). Judicial exam takes 2-3 years. UPSC takes 12+ months. For immediate government position, apply for law ministry legal officer roles.",
    },
  ],
};

export default function LLBGovernmentJobsPage() {
  return <QualificationHubTemplate {...pageContent} />;
}
