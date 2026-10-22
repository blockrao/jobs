/**
 * M.A Government Jobs Page
 *
 * Keyword Target: "M.A Government Jobs" (1,800 searches/month)
 * Related Keywords: Master's degree, Teaching, University, Civil service, Government colleges
 */

import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";
import QualificationHubTemplate from "@/components/qualification-hub-template";
import { SITE_URL } from "@/lib/site";
import { buildBreadcrumbSchema, buildFAQSchema, jsonLdGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "M.A Government Jobs in India 2025 - Teaching, University, Lecturer Roles",
  description:
    "M.A government jobs: lecturer positions, university roles, government colleges, NET exams. Salary ₹35,000-55,000, civil service, teaching career guide.",
  ...pageSeo(`${SITE_URL}/qualifications/m-a-government-jobs`, { index: true }),
};

const pageContent = {
  title: "M.A Government Jobs in India",
  qualification: "M.A",
  heroDescription:
    "M.A graduates have strong opportunities in government education sector as lecturers, researchers, and civil service candidates. Explore teaching roles, university positions, and administrative opportunities.",
  quickFacts: {
    avgSalary: "₹35,000-55,000",
    topRecruiters: ["Government Colleges", "Universities", "UPSC", "School Education", "Ministry"],
    topExams: ["UGC NET", "UPSC", "SSC CGL", "State PSC", "University Recruitment"],
    jobCount: 1534,
  },
  sections: [
    {
      id: "what-is-ma",
      title: "What is M.A and Government Job Opportunities",
      content: (
        <div className="space-y-4">
          <p>
            M.A (Master of Arts) is a 2-year postgraduate degree in humanities and social sciences (History, Geography, Economics, Political Science, English, Sociology, etc.). Government organizations actively recruit M.A graduates for teaching, research, and administrative roles.
          </p>
          <p>
            M.A is foundation for academic careers in government colleges and universities, civil service exams, and specialized administrative roles requiring advanced humanities knowledge.
          </p>
          <h3 className="font-bold text-lg mt-4">Why M.A for Government Jobs?</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Teaching Career:</strong> Direct pathway to assistant professor/lecturer in government colleges
            </li>
            <li>
              <strong>Premium Salary:</strong> M.A holders earn ₹35,000-55,000 starting vs B.A graduates at ₹21,000-30,000
            </li>
            <li>
              <strong>Civil Service Advantage:</strong> M.A subjects align with UPSC optional subjects, providing significant advantage
            </li>
            <li>
              <strong>Academic Authority:</strong> M.A recognized as subject matter expert in government administration
            </li>
            <li>
              <strong>Job Security:</strong> Teaching and government roles offer lifetime employment
            </li>
            <li>
              <strong>Research Opportunity:</strong> Gateway to Ph.D. and advanced research roles in government institutes
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "government-jobs-ma",
      title: "Top Government Jobs for M.A Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. Government College Lecturer/Assistant Professor</h3>
          <p>
            <strong>Most Common Role:</strong> M.A + UGC NET qualifies for government college teaching positions. Starting salary: ₹35,000-55,000. Potential to reach professor level (₹150,000+).
          </p>
          <p>
            <strong>Government Colleges Recruiting:</strong> Every state has 50+ government colleges hiring lecturers in arts subjects.
          </p>

          <h3 className="font-bold text-lg mt-4">2. University Assistant Professor / Research Fellow</h3>
          <p>
            <strong>Universities (State & Central):</strong> Delhi University, Mumbai University, JNU, and 300+ government universities recruit M.A for teaching and research. Salary: ₹35,000-60,000 entry.
          </p>

          <h3 className="font-bold text-lg mt-4">3. Civil Service (UPSC IAS/IFS)</h3>
          <p>
            <strong>IAS/IFS:</strong> M.A holders are primary audience for UPSC. M.A subjects directly align with UPSC optional subjects (History, Geography, Political Science, Sociology). IAS salary: ₹56,100-177,500.
          </p>

          <h3 className="font-bold text-lg mt-4">4. Government Research Institutes</h3>
          <p>
            <strong>ICSSR, IIAS, Government Research Labs:</strong> M.A graduates recruited for research associate and senior research associate roles. Salary: ₹32,000-50,000.
          </p>

          <h3 className="font-bold text-lg mt-4">5. SSC CGL Administrative Roles</h3>
          <p>
            <strong>Government Ministries & Departments:</strong> M.A graduates preferred for policy, research, and administrative roles in government departments. Salary: ₹29,200-92,300.
          </p>

          <h3 className="font-bold text-lg mt-4">6. School Principal/Senior Teacher (Government Schools)</h3>
          <p>
            <strong>Government School Leadership:</strong> M.A + B.Ed + experience qualifies for principal positions. Senior salary ₹60,000-100,000+.
          </p>
        </div>
      ),
    },
    {
      id: "salary-ma",
      title: "M.A Government Job Salary and Career Growth",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Entry Level Salary (Lecturer/Asst Professor)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Basic Salary</span>
              <span className="font-bold">₹21,000-28,000</span>
            </div>
            <div className="flex justify-between">
              <span>DA + HRA</span>
              <span className="font-bold">₹10,000-18,000</span>
            </div>
            <div className="flex justify-between">
              <span>Other Allowances</span>
              <span className="font-bold">₹2,000-4,000</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Monthly</span>
              <span>₹35,000-55,000</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Academic Career Progression (30 Years)</h3>
          <ul className="space-y-2">
            <li><strong>0-5 Years:</strong> Assistant Professor - ₹35,000-50,000</li>
            <li><strong>5-10 Years:</strong> Associate Professor - ₹60,000-90,000</li>
            <li><strong>10-20 Years:</strong> Professor - ₹90,000-150,000</li>
            <li><strong>20+ Years:</strong> Senior Professor/Principal - ₹150,000-250,000+</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Civil Service Salary (IAS)</h3>
          <ul className="space-y-2">
            <li><strong>IAS Officer:</strong> ₹56,100-90,000 (Starting)</li>
            <li><strong>Senior IAS Officer:</strong> ₹120,000-180,000</li>
            <li><strong>Chief Secretary Level:</strong> ₹200,000-300,000+</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Benefits Package</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Performance bonus 2-3 months annually</li>
            <li>Defined benefit pension (50% average salary for life)</li>
            <li>CGHS medical coverage</li>
            <li>Government housing or housing loan</li>
            <li>30 days casual + 15 days sick leave</li>
            <li>Children education scholarship</li>
          </ul>
        </div>
      ),
    },
    {
      id: "exams-ma",
      title: "Government Exams and Pathways for M.A Graduates",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">1. UGC NET (National Eligibility Test)</h3>
          <p>
            <strong>Difficulty:</strong> Moderate | <strong>Eligibility for:</strong> Junior Research Fellow (JRF) + Lectureship
          </p>
          <p>
            M.A graduates take NET immediately after degree. Qualifying grant eligibility for government college lecturer position + JRF stipend. Most direct path to teaching career.
          </p>

          <h3 className="font-bold text-lg mt-4">2. UPSC Civil Service Exam</h3>
          <p>
            <strong>Difficulty:</strong> Very High | <strong>Salary:</strong> ₹56,100-177,500
          </p>
          <p>
            M.A subjects (History, Geography, Political Science, etc.) are UPSC optional subjects. M.A holders have significant advantage. IAS career = administrative power + high salary.
          </p>

          <h3 className="font-bold text-lg mt-4">3. SSC CGL (Combined Graduate Level)</h3>
          <p>
            <strong>Difficulty:</strong> High | <strong>Positions:</strong> 8,000+ annually | <strong>Salary:</strong> ₹29,200-92,300
          </p>
          <p>
            Opens government administrative roles. M.A holders equally competitive.
          </p>

          <h3 className="font-bold text-lg mt-4">4. Direct University Recruitment</h3>
          <p>
            <strong>Government Universities & Colleges:</strong> Some universities conduct direct recruitment (with or without NET) for lecturer positions. M.A degree + interview sufficient.
          </p>

          <h3 className="font-bold text-lg mt-4">5. State PSC Exams</h3>
          <p>
            <strong>Difficulty:</strong> Moderate-Hard | <strong>Positions:</strong> 1,000-5,000 per state | <strong>Salary:</strong> ₹24,000-50,000
          </p>

          <h3 className="font-bold text-lg mt-4">Best Path for M.A Graduates</h3>
          <p>
            <strong>Recommended:</strong> (1) Appear for UGC NET immediately → Get lectureship in government college (fastest, most secure), (2) Simultaneously prepare for UPSC → Potentially become IAS (high prestige, higher salary), (3) SSC CGL as backup → Government administrative role.
          </p>
        </div>
      ),
    },
    {
      id: "career-path",
      title: "Career Path for M.A in Government",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Teaching Career Path (Government College)</h3>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">0-5 Years: Assistant Professor</p>
              <p className="text-sm text-gray-600">₹35,000-50,000 | Teaching, research, student mentoring</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">5-10 Years: Associate Professor</p>
              <p className="text-sm text-gray-600">₹60,000-90,000 | Department committee, curriculum design</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">10-20 Years: Professor</p>
              <p className="text-sm text-gray-600">₹90,000-150,000 | Department head, research supervision</p>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <p className="font-bold">20+ Years: Senior Professor / Principal</p>
              <p className="text-sm text-gray-600">₹150,000-250,000+ | Institution leadership</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Civil Service (IAS) Path</h3>
          <ul className="space-y-2">
            <li><strong>IAS Officer:</strong> Initial posting in state/central department</li>
            <li><strong>Senior IAS Officer:</strong> Additional secretary, principal secretary roles</li>
            <li><strong>Chief Secretary:</strong> Top administrative position in state government</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Specialization Opportunities</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Research in specific subject discipline</li>
            <li>Academic administration (dean, registrar roles)</li>
            <li>Policy research in government institutes</li>
            <li>Higher education leadership</li>
          </ul>
        </div>
      ),
    },
    {
      id: "how-to-apply",
      title: "How to Apply for M.A Government Jobs",
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Fast Track: M.A → UGC NET → Lecturer (8-12 months)</h3>
          <div className="space-y-3">
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 1: Complete M.A Degree</p>
              <p className="text-sm text-gray-700 mt-1">
                Finish 2-year M.A from recognized university
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 2: Appear for UGC NET Exam (3-4 months prep)</p>
              <p className="text-sm text-gray-700 mt-1">
                Register and appear for NET in your M.A subject, conducted twice yearly
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 3: Get NET Qualification</p>
              <p className="text-sm text-gray-700 mt-1">
                Qualify NET exam → Eligible for lecturer position + eligible for JRF if top 10%
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 4: Apply to Government College Recruitment</p>
              <p className="text-sm text-gray-700 mt-1">
                Every college/university advertises lecturer vacancies, apply with NET certificate
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="font-bold">Step 5: Interview & Joining (1-2 months)</p>
              <p className="text-sm text-gray-700 mt-1">
                Participate in interview, document verification, receive joining letter
              </p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-6">Documents Required</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>M.A degree certificate and mark sheets</li>
            <li>B.A degree certificate</li>
            <li>UGC NET score card (if lecturer through NET)</li>
            <li>Character certificate from college</li>
            <li>Medical fitness certificate</li>
            <li>Address proof (Aadhaar, voter ID)</li>
            <li>Caste certificate (if applicable)</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">Eligibility Criteria</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ M.A degree from recognized university</li>
            <li>✓ UGC NET qualification (for most positions)</li>
            <li>✓ Indian citizen</li>
            <li>✓ Age: No limit for NET, generally 21-40 for college recruitment</li>
            <li>✓ No criminal convictions</li>
            <li>✓ Medical fitness</li>
          </ul>

          <h3 className="font-bold text-lg mt-6">M.A Advantage in Government Jobs</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>✓ Direct entry to lecturer position (B.A holders must do B.Ed)</li>
            <li>✓ Higher starting salary than B.A (₹35,000 vs ₹21,000)</li>
            <li>✓ UPSC optional subject alignment (if pursuing civil service)</li>
            <li>✓ Research opportunity and JRF fellowship eligibility</li>
            <li>✓ Faster promotion to associate/professor level</li>
          </ul>
        </div>
      ),
    },
  ],
  relatedJobs: [
    {
      title: "UGC NET 2025 - Lectureship & JRF",
      recruitmentSlug: "ugc-net-2025",
      postSlug: "net-exam-notification",
      vacancies: 5000,
      deadline: "2025-10-20",
    },
    {
      title: "Government College Lecturer Recruitment 2025",
      recruitmentSlug: "college-recruitment-2025",
      postSlug: "lecturer-positions",
      vacancies: 2000,
      deadline: "2025-11-30",
    },
    {
      title: "UPSC Civil Service 2025 Exam",
      recruitmentSlug: "upsc-css-2025",
      postSlug: "civil-service-exam",
      vacancies: 1000,
      deadline: "2025-09-15",
    },
    {
      title: "SSC CGL 2025 Notification",
      recruitmentSlug: "ssc-cgl-2025",
      postSlug: "combined-graduate-level",
      vacancies: 8000,
      deadline: "2025-11-30",
    },
    {
      title: "State PSC Exams 2025 - Various States",
      recruitmentSlug: "state-psc-2025",
      postSlug: "assistant-positions",
      vacancies: 5000,
      deadline: "2025-12-15",
    },
  ],
  relatedQualifications: [
    { title: "B.A Government Jobs", slug: "b-a-government-jobs" },
    { title: "MBA Government Jobs", slug: "mba-government-jobs" },
    { title: "Ph.D Government Jobs", slug: "phd-government-jobs" },
    { title: "B.Sc Government Jobs", slug: "b-sc-government-jobs" },
  ],
  faqs: [
    {
      question: "Is UGC NET mandatory for government college lecturer job?",
      answer:
        "UGC NET is mandatory for most government college and university lecturer positions. Some colleges conduct direct recruitment but NET is almost universally required. NET is also your pathway to JRF fellowship for pursuing Ph.D.",
    },
    {
      question: "What if I don't clear UGC NET? Can I still get government job?",
      answer:
        "Yes, you can appear for SSC CGL or other government exams. However, NET is the most direct path to teaching. Non-NET government jobs (SSC, admin roles) have lower salary and less career satisfaction for M.A graduates.",
    },
    {
      question: "How difficult is UGC NET compared to UPSC?",
      answer:
        "UGC NET is moderate difficulty (easier than UPSC). It's subject-specific so M.A knowledge directly applies. ~15-20% of NET candidates qualify (vs ~0.5% for UPSC). Most students can crack NET with 2-3 months focused preparation.",
    },
    {
      question: "Can M.A graduates directly appear for UPSC Civil Service?",
      answer:
        "Yes, absolutely eligible. In fact, M.A holders are primary audience for UPSC. Your M.A subject likely matches UPSC optional subject, providing 30-40% advantage in that paper vs general candidates.",
    },
    {
      question: "What is JRF (Junior Research Fellow) salary and eligibility?",
      answer:
        "JRF is ₹28,000-35,000 monthly (non-taxable or minimal tax). Only top 10% of NET qualifiers get JRF award. During JRF (2-3 years), you pursue Ph.D. After Ph.D., you become scientist/faculty with ₹50,000+ salary.",
    },
    {
      question: "How long is the government college lecturer recruitment process?",
      answer:
        "Typically 3-5 months from application to joining. Colleges advertise → you apply → written test (if conducted) → interview → document verification → joining letter. Some colleges directly appoint on NET + interview.",
    },
    {
      question: "What is the difference between lecturer, assistant professor, and associate professor?",
      answer:
        "Lecturer (0-3 yrs, ₹35,000-45,000) → Assistant Professor (3-8 yrs, ₹45,000-65,000) → Associate Professor (8+ yrs, ₹65,000-100,000). Salary and responsibilities increase with grade.",
    },
    {
      question: "Can I do B.Ed after M.A to become school teacher?",
      answer:
        "Yes, M.A + B.Ed qualifies for government school principal and senior teacher roles with higher salary (₹50,000-100,000). However, NET for college lecturer is more prestigious and better paying long-term.",
    },
    {
      question: "What are the best M.A subjects for government jobs?",
      answer:
        "All M.A subjects (History, Geography, Economics, Political Science, English, etc.) are equally eligible for NET and government jobs. However, History, Geography, Political Science have advantage for UPSC as well.",
    },
    {
      question: "What is the scope and growth ceiling for M.A in government teaching?",
      answer:
        "M.A teachers can reach Professor level (₹150,000+), Department Head, Principal, or Vice-Chancellor (₹200,000-400,000+). No fixed ceiling - advancement based on merit, Ph.D. qualification, and research contributions.",
    },
  ],
};

export default function MAGovernmentJobsPage() {
  return <QualificationHubTemplate {...pageContent} />;
}
