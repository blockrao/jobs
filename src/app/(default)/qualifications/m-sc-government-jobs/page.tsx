/**
 * M.Sc Government Jobs Page
 *
 * Keyword Target: "M.Sc Government Jobs" (2,400 searches/month)
 * Related Keywords: Master's degree, Science, Research, Lab, Physics, Chemistry, Biology
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import QualificationHubTemplate from "@/components/qualification-hub-template";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "M.Sc Government Jobs in India 2025 - Research, Lab, Scientist Roles",
  description:
    "M.Sc government jobs: scientist positions, research labs, CSIR, universities. Salary ₹32,000-55,000, GATE exam, civil service. Physics, Chemistry, Biology, Math career guide.",
  ...pageSeo(`${SITE_URL}/qualifications/m-sc-government-jobs`, { index: true }),
};

const pageContent = {
  title: "M.Sc Government Jobs in India",
  qualification: "M.Sc",
  heroDescription:
    "M.Sc graduates have excellent opportunities in government research, scientific institutions, and academic roles. Explore careers in CSIR labs, ISRO, universities, and government research organizations.",
  quickFacts: {
    avgSalary: "₹32,000-55,000",
    topRecruiters: ["CSIR Labs", "ISRO", "BARC", "Universities", "DRDO"],
    topExams: ["GATE", "UPSC", "University Recruitment", "DST", "Research Fellowships"],
    jobCount: 876,
  },
  sections: [
    {
      id: "what-is-msc",
      title: "What is M.Sc and Government Job Opportunities",
      content: (
        <div className="space-y-4">
          <p>
            M.Sc (Master of Science) is a 2-year postgraduate degree in subjects like Physics, Chemistry, Biology, Mathematics, Geology, Microbiology, and others. It prepares professionals for research, academic, and scientific careers in government institutions.
          </p>
          <p>
            Government organizations like CSIR labs, ISRO, BARC, and universities actively recruit M.Sc graduates for scientist, research associate, and lecturer positions. The degree is foundation for pursuing Ph.D. and research careers.
          </p>
          <h3 className="font-bold text-lg mt-4">Why M.Sc for Government Jobs?</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Research Career:</strong> M.Sc is essential for government research positions and scientific roles.
            </li>
            <li>
              <strong>Job Security:</strong> Government research institutions offer lifetime employment with stable career path.
            </li>
            <li>
              <strong>Academic Roles:</strong> Direct pathway to assistant professor positions in government colleges and universities.
            </li>
            <li>
              <strong>Scientific Authority:</strong> M.Sc holders are recognized subject matter experts in their discipline.
            </li>
            <li>
              <strong>Ph.D. Gateway:</strong> Foundation for pursuing doctoral degree and higher research roles in prestigious labs.
            </li>
            <li>
              <strong>Unique Opportunities:</strong> Access to world-class research facilities and equipment in government labs.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "government-jobs-msc",
      title: "Top Government Jobs for M.Sc Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. CSIR (Council of Scientific & Industrial Research) Labs</h3>
          <p>
            <strong>37 CSIR labs nationwide:</strong> Recruit M.Sc graduates as Research Scientists, Junior Research Fellows, and Senior Research Officers. Salary: ₹32,000-50,000 entry level.
          </p>
          <p>
            <strong>Lab Areas:</strong> Physics, Chemistry, Biology, Materials Science, Environmental Science, and applied research.
          </p>

          <h3 className="font-bold text-lg mt-4">2. ISRO (Indian Space Research Organisation)</h3>
          <p>
            <strong>Scientist Positions:</strong> Recruit M.Sc graduates for satellite technology, space science research. Salary: ₹40,000-55,000 entry level, ₹80,000+ as senior scientist.
          </p>
          <p>
            <strong>Qualifications Preferred:</strong> Physics, Electronics, Chemistry, Mechanical Engineering M.Sc holders.
          </p>

          <h3 className="font-bold text-lg mt-4">3. BARC (Bhabha Atomic Research Centre)</h3>
          <p>
            <strong>Scientific Officer / Research Associate:</strong> Recruit M.Sc graduates for nuclear science research. Salary: ₹38,000-52,000 entry level.
          </p>

          <h3 className="font-bold text-lg mt-4">4. Government Universities & Colleges</h3>
          <p>
            <strong>Assistant Professor / Lecturer:</strong> M.Sc + NET/GATE eligible for government college teaching positions. Salary: ₹35,000-55,000 starting, ₹150,000+ as professor.
          </p>

          <h3 className="font-bold text-lg mt-4">5. DRDO (Defence Research & Development)</h3>
          <p>
            <strong>Scientist Positions:</strong> M.Sc graduates recruited for defence research in various domains. Salary: ₹38,000-50,000 entry level.
          </p>

          <h3 className="font-bold text-lg mt-4">6. Government Health & Pharmaceutical Labs</h3>
          <p>
            <strong>Pharmaceutical Scientist, Quality Control Officer:</strong> M.Sc Chemistry/Biology holders recruited by government pharmaceutical institutes. Salary: ₹32,000-45,000.
          </p>

          <h3 className="font-bold text-lg mt-4">7. Ministry Research Institutes</h3>
          <p>
            <strong>DST, DBT, DSIR:</strong> Recruit M.Sc graduates for research fellowships and scientist positions. Salary: ₹28,000-45,000.
          </p>
        </div>
      ),
    },
    {
      id: "salary-msc",
      title: "M.Sc Government Job Salary and Career Growth",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Entry Level Salary (CSIR/ISRO/BARC)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Basic Salary</span>
              <span className="font-bold">₹21,000-28,000</span>
            </div>
            <div className="flex justify-between">
              <span>Dearness Allowance (DA)</span>
              <span className="font-bold">₹6,000-10,000</span>
            </div>
            <div className="flex justify-between">
              <span>House Rent Allowance (HRA)</span>
              <span className="font-bold">₹3,000-5,000</span>
            </div>
            <div className="flex justify-between">
              <span>Other Allowances</span>
              <span className="font-bold">₹2,000-4,000</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Monthly Salary</span>
              <span>₹32,000-50,000</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Career Progression (Research/CSIR Path)</h3>
          <ul className="space-y-2">
            <li>
              <strong>0-3 Years:</strong> Research Associate / JRF - ₹32,000-40,000
            </li>
            <li>
              <strong>3-8 Years:</strong> Scientist / Senior Scientist - ₹50,000-75,000
            </li>
            <li>
              <strong>8-15 Years:</strong> Principal Scientist - ₹80,000-120,000
            </li>
            <li>
              <strong>15+ Years:</strong> Chief Scientist / Director - ₹120,000-250,000+
            </li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Academic Path Career Progression</h3>
          <ul className="space-y-2">
            <li>
              <strong>0-5 Years:</strong> Assistant Professor - ₹35,000-50,000
            </li>
            <li>
              <strong>5-10 Years:</strong> Associate Professor - ₹60,000-90,000
            </li>
            <li>
              <strong>10-20 Years:</strong> Professor - ₹90,000-150,000
            </li>
            <li>
              <strong>20+ Years:</strong> Senior Professor / Department Head - ₹150,000-250,000+
            </li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Benefits Package</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Annual Bonus:</strong> Performance bonus 2-3 months salary
            </li>
            <li>
              <strong>Pension:</strong> Defined benefit scheme: 50% average salary for life
            </li>
            <li>
              <strong>Medical:</strong> CGHS/ESI family health coverage
            </li>
            <li>
              <strong>Housing:</strong> Government hostel or housing loan 4-6% interest
            </li>
            <li>
              <strong>Leave:</strong> 30 days casual + 15 days sick leave
            </li>
            <li>
              <strong>Research Support:</strong> Funding for conferences, publications, international collaborations
            </li>
            <li>
              <strong>Ph.D. Support:</strong> Many labs offer part-time Ph.D. sponsorship with salary continuation
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "exams-msc",
      title: "Government Exams and Pathways for M.Sc Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. GATE (Graduate Aptitude Test in Engineering/Science)</h3>
          <p>
            <strong>Difficulty:</strong> Hard | <strong>Salary Potential:</strong> ₹40,000-50,000 (if selected for PSU/CSIR)
          </p>
          <p>
            M.Sc graduates can appear for GATE in their respective subjects. Top performers get CSIR research positions, PSU scientist posts, and higher education opportunities (IIT/IISC Ph.D.).
          </p>

          <h3 className="font-bold text-lg mt-4">2. NET (National Eligibility Test) - UGC/CSIR</h3>
          <p>
            <strong>Difficulty:</strong> Moderate | <strong>Eligibility for:</strong> Junior Research Fellow + Lectureship
          </p>
          <p>
            M.Sc graduates eligible for UGC NET (teaching track) or CSIR NET (research track). Junior Research Fellow (JRF) salary: ₹28,000-32,000 → Convertible to scientist position.
          </p>

          <h3 className="font-bold text-lg mt-4">3. CSIR Recruitment Drive</h3>
          <p>
            <strong>Direct Recruitment:</strong> CSIR labs conduct annual recruitment for Research Associate, Technician positions. M.Sc 60%+ eligible. Salary: ₹32,000-40,000 entry.
          </p>

          <h3 className="font-bold text-lg mt-4">4. ISRO Scientist/Engineer Recruitment</h3>
          <p>
            <strong>Difficulty:</strong> Hard | <strong>Salary:</strong> ₹40,000-55,000 entry
          </p>
          <p>
            ISRO conducts direct recruitment for scientist positions. M.Sc Physics/Electronics preferred. Selection through written test + interview.
          </p>

          <h3 className="font-bold text-lg mt-4">5. UPSC Civil Service (IAS/IFS)</h3>
          <p>
            <strong>Difficulty:</strong> Very High | <strong>Salary:</strong> ₹56,100-177,500
          </p>
          <p>
            M.Sc graduates eligible with advantage for science-related administrative postings and policy-making roles in scientific ministries.
          </p>

          <h3 className="font-bold text-lg mt-4">6. University Lecturer/Professor Recruitment</h3>
          <p>
            <strong>Requirement:</strong> M.Sc + NET + Optional Ph.D.
          </p>
          <p>
            Government colleges recruit M.Sc+NET holders as Assistant Professors. Salary: ₹35,000-55,000 starting. Ph.D. accelerates promotion.
          </p>

          <h3 className="font-bold text-lg mt-4">Recommendation for M.Sc Graduates</h3>
          <p>
            <strong>Best Path:</strong> Pursue CSIR NET immediately after M.Sc → Get JRF → Do Ph.D. → Scientist position in government labs. This 6-8 year path ensures 50,000+ salary and permanent scientist position.
          </p>
        </div>
      ),
    },
    {
      id: "career-path",
      title: "Career Path for M.Sc in Government",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Research Scientist Path (Most Common)</h3>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 0-1: Post M.Sc - Research Associate</p>
              <p className="text-sm text-gray-600">₹21,000-28,000 | Lab work, learning research methodologies</p>
            </div>
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">Year 1-3: JRF (Junior Research Fellow)</p>
              <p className="text-sm text-gray-600">₹28,000-35,000 | Ph.D. pursuit, independent research projects</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 3-8: Scientist / Senior Scientist</p>
              <p className="text-sm text-gray-600">₹50,000-75,000 | Lead research team, publish findings, secure grants</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">Year 8-15: Principal Scientist</p>
              <p className="text-sm text-gray-600">₹80,000-120,000 | Department leadership, strategic research direction</p>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <p className="font-bold">Year 15+: Chief Scientist / Director</p>
              <p className="text-sm text-gray-600">₹120,000-300,000+ | Lab direction, policy input, national recognition</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Academic Path (Government University)</h3>
          <ul className="space-y-2">
            <li><strong>M.Sc + NET:</strong> Lecturer position, ₹35,000-50,000</li>
            <li><strong>PhD + 3-5 Years:</strong> Associate Professor, ₹60,000-90,000</li>
            <li><strong>15+ Years:</strong> Professor, ₹150,000+</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Specialization Opportunities</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Interdisciplinary Research (Biotech, Nanotechnology, Materials)</li>
            <li>Clinical/Applied Research (Pharmaceutical, Medical devices)</li>
            <li>Environmental Science & Sustainability</li>
            <li>International Collaboration & Academic Exchange</li>
          </ul>
        </div>
      ),
    },
    {
      id: "how-to-apply",
      title: "How to Apply for M.Sc Government Jobs",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Application Path (1-8 years depending on route)</h3>
          <div className="space-y-3">
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 1: Complete M.Sc Degree</p>
              <p className="text-sm text-gray-700 mt-1">
                Complete 2-year M.Sc from government/recognized college (Physics, Chemistry, Biology, Mathematics, etc.)
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 2: Appear for CSIR/UGC NET Exam</p>
              <p className="text-sm text-gray-700 mt-1">
                Register and appear for CSIR NET or UGC NET (conducted twice yearly). M.Sc holders eligible immediately.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 3: Get JRF Award (If NET Qualified)</p>
              <p className="text-sm text-gray-700 mt-1">
                If qualifying rank in NET exam, become Junior Research Fellow (JRF) with ₹28,000-32,000 salary. Pursue Ph.D. during JRF period.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 4: Apply to CSIR/ISRO/BARC Recruitment Drives</p>
              <p className="text-sm text-gray-700 mt-1">
                Apply for Scientist/Research Associate positions when labs conduct recruitment (usually yearly or as vacancies arise).
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 5: Interviews & Selection (3-4 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Appear for technical interview, research discussion, join selected institute.
              </p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Documents Required</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>M.Sc degree certificate and mark sheets</li>
            <li>B.Sc degree certificate (for admission verification)</li>
            <li>Character certificate from college</li>
            <li>NET/GATE score card (if applicable)</li>
            <li>Medical fitness certificate</li>
            <li>Address proof (Aadhaar, voter ID)</li>
            <li>Caste certificate (if applicable)</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Eligibility Checklist</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ Master's degree in Science (M.Sc)</li>
            <li>✓ Minimum 55% marks (or equivalent CGPA)</li>
            <li>✓ Indian citizen</li>
            <li>✓ Age: Usually 25-35 years (varies by organization)</li>
            <li>✓ No criminal convictions</li>
            <li>✓ Medical fitness</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Timeline to Government Job</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Fast Track:</strong> M.Sc → Direct CSIR/ISRO recruitment → 8-12 months to job</li>
            <li><strong>Academic Track:</strong> M.Sc → NET → Lecturer position → 6-12 months</li>
            <li><strong>Research Track:</strong> M.Sc → NET → JRF → Ph.D. → Scientist → 6-8 years total</li>
          </ul>
        </div>
      ),
    },
  ],
  relatedJobs: [
    {
      title: "CSIR Research Fellow Recruitment 2025",
      recruitmentSlug: "csir-2025",
      postSlug: "scientist-positions",
      vacancies: 300,
      deadline: "2025-10-30",
    },
    {
      title: "ISRO Scientist Recruitment 2025",
      recruitmentSlug: "isro-2025",
      postSlug: "scientist-engineer-posts",
      vacancies: 100,
      deadline: "2025-09-30",
    },
    {
      title: "BARC Scientist Officer 2025",
      recruitmentSlug: "barc-2025",
      postSlug: "scientist-officer-recruitment",
      vacancies: 80,
      deadline: "2025-10-15",
    },
    {
      title: "UGC NET 2025 - Lectureship & JRF",
      recruitmentSlug: "ugc-net-2025",
      postSlug: "net-exam-notification",
      vacancies: 5000,
      deadline: "2025-10-20",
    },
    {
      title: "Government University Assistant Professor Recruitment",
      recruitmentSlug: "university-recruitment-2025",
      postSlug: "assistant-professor-positions",
      vacancies: 200,
      deadline: "2025-11-30",
    },
  ],
  relatedQualifications: [
    { title: "B.Sc Government Jobs", slug: "b-sc-government-jobs" },
    { title: "Ph.D Government Jobs & Research Fellowships", slug: "phd-government-jobs" },
    { title: "Engineering Government Jobs", slug: "engineering-government-jobs" },
    { title: "B.Tech Government Jobs", slug: "b-tech-government-jobs" },
  ],
  faqs: [
    {
      question: "Do I need Ph.D for government scientist position?",
      answer:
        "Ph.D is not mandatory for entry but highly recommended for career growth. Many M.Sc holders get JRF and pursue Ph.D during the fellowship (6-8 year path). Without Ph.D, career ceiling is lower. CSIR/ISRO prefer Ph.D for senior scientist roles.",
    },
    {
      question: "What is difference between CSIR NET and UGC NET?",
      answer:
        "CSIR NET is for research track (scientist, research fellowships). UGC NET is for academic track (lecturer, professor). If you prefer research, take CSIR NET. If interested in teaching government colleges, take UGC NET. Both qualify for JRF award.",
    },
    {
      question: "How much is JRF (Junior Research Fellow) salary?",
      answer:
        "JRF salary is ₹28,000-32,000 per month (non-taxable or minimal tax). This is purely for research work (pursuing Ph.D), not a government salary yet. After completing Ph.D (3 years), candidates convert to scientist position with ₹50,000+ salary.",
    },
    {
      question: "Can M.Sc graduate get GATE recruitment for PSU scientist job?",
      answer:
        "No, GATE recruitment for PSU scientist jobs is primarily for B.Tech/B.E graduates. M.Sc holders can't directly apply for GATE-based PSU scientist positions. CSIR, ISRO, BARC have separate scientist recruitment through their own exams.",
    },
    {
      question: "Is M.Sc from distance university acceptable for government jobs?",
      answer:
        "Distance M.Sc from AICTE/UGC-recognized university is acceptable for NET, CSIR recruitment, and government jobs. No discrimination based on regular vs distance. However, some premier labs (BARC, ISRO) may prefer regular degree candidates.",
    },
    {
      question: "What is the salary progression from JRF to scientist in CSIR?",
      answer:
        "JRF: ₹28,000-32,000 → Senior Research Fellow (after 2 years): ₹35,000-40,000 → Scientist: ₹50,000-75,000 → Senior Scientist: ₹75,000-100,000. Total 8-10 year progression from M.Sc to senior scientist.",
    },
    {
      question: "Can M.Sc holder directly become university lecturer?",
      answer:
        "Yes, M.Sc + UGC NET qualifies for Assistant Professor/Lecturer position in government colleges. No Ph.D required for entry, though Ph.D helps in promotion to higher grades. Starting salary: ₹35,000-50,000.",
    },
    {
      question: "How many times can I attempt NET exam?",
      answer:
        "No age limit for repeated NET attempts in India. You can attempt yearly until age limit is reached (typically 40-45 years for general category). Many candidates succeed on 2nd-3rd attempt with better preparation.",
    },
    {
      question: "What is the probability of getting NET-JRF award?",
      answer:
        "NET exam has ~2% JRF success rate (only top performers get award). Approximately 15-20% get qualified but not JRF (eligible for lectureship). Getting JRF is competitive but achievable with dedicated 4-6 month preparation after M.Sc.",
    },
    {
      question: "What should M.Sc graduate do immediately after degree to get government job?",
      answer:
        "Recommended: (1) Apply to CSIR/ISRO direct recruitment if available, (2) Appear for CSIR NET (best for research), (3) If interested in teaching, appear for UGC NET, (4) Pursue GATE as alternative for PSU roles, (5) Consider Ph.D admission through GATE/other sources.",
    },
  ],
};

export default function MScGovernmentJobsPage() {
  return <QualificationHubTemplate {...pageContent} />;
}
