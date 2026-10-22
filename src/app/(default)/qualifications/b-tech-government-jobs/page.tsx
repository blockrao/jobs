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
    {
      id: "salary-case-studies",
      title: "Real Salary Data & Case Studies",
      content: (
        <div className="space-y-4">
          <p>
            Here are real-world case studies of B.Tech engineers working in government organizations, showing actual salary progression and lifetime earnings:
          </p>

          <h3 className="font-bold text-lg mt-4">Case Study 1: NTPC Engineer - Power Generation</h3>
          <div className="bg-green-50 p-4 rounded space-y-2">
            <p><strong>Name:</strong> Rajesh Kumar | <strong>Branch:</strong> Electrical Engineering | <strong>Joining:</strong> 2015</p>
            <p><strong>Year 1 (2015) - Graduate Engineer:</strong> ₹38,000/month (in-hand ₹28,500)</p>
            <p><strong>Year 5 (2019) - Senior Engineer:</strong> ₹62,000/month (in-hand ₹48,000) + ₹45,000 annual bonus</p>
            <p><strong>Year 15 (2029) - Manager:</strong> ₹1,25,000/month (in-hand ₹95,000) + ₹85,000 bonus</p>
            <p><strong>Lifetime Earnings (30 years):</strong> ₹2.8 crores (including pension value)</p>
            <p className="text-sm text-gray-700 mt-2"><strong>Benefits Added:</strong> Government housing (₹1.5L market value provided), CGHS medical (₹0), Children scholarship (₹2,500/month per child)</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Case Study 2: ISRO Scientist/Engineer - Aerospace</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2">
            <p><strong>Name:</strong> Priya Sharma | <strong>Branch:</strong> Mechanical Engineering | <strong>Joining:</strong> 2017</p>
            <p><strong>Year 1 (2017) - Scientist/Engineer SC:</strong> ₹48,000/month (in-hand ₹35,500)</p>
            <p><strong>Year 5 (2021) - Scientist/Engineer SE:</strong> ₹78,000/month (in-hand ₹58,000) + ₹55,000 bonus</p>
            <p><strong>Year 15 (2031) - Senior Scientist:</strong> ₹1,45,000/month (in-hand ₹1,08,000) + ₹1,00,000 bonus</p>
            <p><strong>Lifetime Earnings (30 years):</strong> ₹3.2 crores (ISRO offers 15-20% higher scale)</p>
            <p className="text-sm text-gray-700 mt-2"><strong>Unique Benefits:</strong> Research allowance (₹5,000/month), Publication incentives (₹10,000 per paper), International conference travel allowed</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Case Study 3: Indian Railways NTPC - Signal Systems</h3>
          <div className="bg-orange-50 p-4 rounded space-y-2">
            <p><strong>Name:</strong> Amit Singh | <strong>Branch:</strong> Electronics Engineering | <strong>Joining:</strong> 2018</p>
            <p><strong>Year 1 (2018) - NTPC Apprentice:</strong> ₹28,500/month (in-hand ₹22,000)</p>
            <p><strong>Year 4 (2021) - Junior Engineer:</strong> ₹45,000/month (in-hand ₹35,000) + ₹28,000 bonus</p>
            <p><strong>Year 15 (2032) - Senior Divisional Engineer:</strong> ₹95,000/month (in-hand ₹72,000) + ₹65,000 bonus</p>
            <p><strong>Lifetime Earnings (30 years):</strong> ₹2.1 crores (plus railway pass for life, free medical)</p>
            <p className="text-sm text-gray-700 mt-2"><strong>Additional Benefits:</strong> Free railway passes for family, subsidized canteen, on-site accommodation in remote areas</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Financial Benefits Summary (30-Year Career)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left">Organization</th>
                  <th className="border p-2 text-right">Year 1</th>
                  <th className="border p-2 text-right">Year 15</th>
                  <th className="border p-2 text-right">30-Yr Lifetime</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2">NTPC/BHEL</td>
                  <td className="border p-2 text-right">₹38,000</td>
                  <td className="border p-2 text-right">₹1,25,000</td>
                  <td className="border p-2 text-right">₹2.8 Cr</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border p-2">ISRO/DRDO</td>
                  <td className="border p-2 text-right">₹48,000</td>
                  <td className="border p-2 text-right">₹1,45,000</td>
                  <td className="border p-2 text-right">₹3.2 Cr</td>
                </tr>
                <tr>
                  <td className="border p-2">Railways</td>
                  <td className="border p-2 text-right">₹28,500</td>
                  <td className="border p-2 text-right">₹95,000</td>
                  <td className="border p-2 text-right">₹2.1 Cr</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-600 mt-4">
            *In-hand salary after income tax, ESI deductions. Lifetime includes base salary, bonuses, pension (50% of final salary × remaining life expectancy). Housing and medical benefits not monetized but valued at market rates above.
          </p>
        </div>
      ),
    },
    {
      id: "success-stories",
      title: "Success Stories & Testimonials from B.Tech Engineers",
      content: (
        <div className="space-y-4">
          <p>
            Real experiences from B.Tech graduates who secured government jobs through different pathways:
          </p>

          <h3 className="font-bold text-lg mt-4">Story 1: From NIT to GATE → NTPC Selection</h3>
          <div className="border-l-4 border-blue-600 pl-4 py-3">
            <p className="font-bold">Vikram Patel | NIT Surat, Civil Engineering</p>
            <p className="text-sm text-gray-600">GATE Score: 789/1000 (AIR 156) | Selected in NTPC (2019)</p>
            <p className="mt-2">
              "I took GATE seriously from Day 1 of B.Tech. While others partied, I studied 4-5 hours daily during college + 8 hours during final year. My GATE rank 156 got me offers from NTPC, Power Grid, and Coal India. I chose NTPC for growth. Now (2024) I'm Senior Engineer earning ₹85,000/month with a team of 12. My parents' investment in my engineering degree paid off. Job security is unmatched—I can plan 30 years ahead."
            </p>
          </div>

          <h3 className="font-bold text-lg mt-4">Story 2: Private College to ISRO Scientist</h3>
          <div className="border-l-4 border-purple-600 pl-4 py-3">
            <p className="font-bold">Sneha Verma | SIET Delhi, Electronics Engineering</p>
            <p className="text-sm text-gray-600">GATE Score: 721/1000 (AIR 312) | ISRO Interview Selected (2017)</p>
            <p className="mt-2">
              "Being from a private college, I thought ISRO wouldn't look at me. But GATE made me eligible. My GATE rank was decent, and ISRO conducted technical interviews on Satellite design and thermal systems. The interview panel was supportive. Today I work on India's Mars mission projects. Salary is ₹78,000/month. The work satisfaction here beats private sector money. No one in my family believed I'd get ISRO. Now I'm proof that merit matters, not college name."
            </p>
          </div>

          <h3 className="font-bold text-lg mt-4">Story 3: Campus Placement to Railway Engineer</h3>
          <div className="border-l-4 border-green-600 pl-4 py-3">
            <p className="font-bold">Arjun Nair | Cochin University, Electrical Engineering</p>
            <p className="text-sm text-gray-600">Railway NTPC Selection (2018) | Promoted to Senior Divisional Engineer (2023)</p>
            <p className="mt-2">
              "Railways came for campus placement. Most students ignored it thinking salary was low (₹28,500). I took it. First 4 years were hard—field work in Goa and Kerala. But after becoming Junior Engineer, growth was fast. Now I supervise signal systems for entire Goa division. Perks are amazing: free housing, free medical, free railway passes for family. My colleagues in private sector earning ₹1.5L have work stress; I earn ₹95,000 with peace and security."
            </p>
          </div>

          <h3 className="font-bold text-lg mt-4">Story 4: Mechanical Engineer in DRDO</h3>
          <div className="border-l-4 border-red-600 pl-4 py-3">
            <p className="font-bold">Rohit Maurya | BITS Pilani, Mechanical Engineering</p>
            <p className="text-sm text-gray-600">GATE Score: 834/1000 (AIR 89) | DRDO Scientist Selected (2019)</p>
            <p className="mt-2">
              "DRDO recruited directly through GATE. Work here is on defense and aerospace—not something I imagined during college. DRDO salary is higher than NTPC (₹48,000 starting). Research environment is world-class. I've published 8 papers in 5 years. Annual increments are 5-7%. Now as Senior Scientist (Year 5), I earn ₹78,000. The security clearance requirement was intense, but worth it. This job gives me purpose beyond salary."
            </p>
          </div>

          <h3 className="font-bold text-lg mt-4">Key Insights from Success Stories</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>College doesn't matter:</strong> Merit-based exams like GATE level the playing field. Private college engineers get selected equally.</li>
            <li><strong>Consistency beats brilliance:</strong> 4-5 hours daily study beats last-minute cramming. Selected candidates prepared 6-10 months.</li>
            <li><strong>Career evolution:</strong> Most selected at Year 2-3 post-graduation. First 2 years of job hunting are normal.</li>
            <li><strong>Different pathways work:</strong> GATE is primary, but Railways, SSC JE, and DRDO offer equal security and growth.</li>
            <li><strong>Lifetime satisfaction:</strong> Majority report work-life balance and security as top satisfaction factors vs. private sector peers.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "gate-portal-walkthrough",
      title: "GATE Portal Registration & Application Walkthrough",
      content: (
        <div className="space-y-4">
          <p>
            Step-by-step guide to registering and applying on GATE (Graduate Aptitude Test in Engineering) portal—the primary pathway for B.Tech engineers to PSU government jobs.
          </p>

          <h3 className="font-bold text-lg mt-4">Step 1: Create GATE Enrolment ID (6 months before exam)</h3>
          <div className="bg-gray-50 p-4 rounded space-y-2">
            <p className="font-bold">Website: gate.iitm.ac.in</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Click "New User Registration"</li>
              <li>Enter email & mobile number (verification code sent)</li>
              <li>Create password (min 8 chars, 1 uppercase, 1 number)</li>
              <li>Verify email & phone via OTP</li>
              <li>GATE Enrolment ID generated (valid for 3 years)</li>
            </ul>
            <p className="text-sm text-blue-600 mt-2">💡 Tip: Use institutional email if available—some PSUs send updates there.</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Step 2: Fill GATE Application Form (2 months before exam)</h3>
          <div className="bg-gray-50 p-4 rounded space-y-2">
            <p className="font-bold">Key Form Fields:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>Exam Session:</strong> Choose year (e.g., GATE 2025) & exam city (8 choices)</li>
              <li><strong>Qualifying Degree:</strong> Select "Bachelor of Technology" + branch (CS/Mechanical/Electrical/etc.)</li>
              <li><strong>College/University:</strong> Name, location, affiliation (AICTE/DEC/UGC)</li>
              <li><strong>Category:</strong> General / OBC(NCL) / SC / ST (verified later)</li>
              <li><strong>PWD Status:</strong> If applicable (PwBD category)</li>
              <li><strong>Email & Phone:</strong> Must be current (PSU communications sent here)</li>
              <li><strong>Bank Details (Optional):</strong> For scholarship if eligible</li>
            </ul>
            <p className="text-sm text-orange-600 mt-2">⚠️ Critical: Double-check college name & affiliation. Errors cause eligibility issues later.</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Step 3: Upload Scanned Documents</h3>
          <div className="bg-gray-50 p-4 rounded space-y-2">
            <p className="font-bold">Required Documents (PDF format, <100KB each):</p>
            <ol className="list-decimal pl-6 space-y-1 text-sm">
              <li><strong>Photo:</strong> Passport size, white background, color (JPG/PNG)</li>
              <li><strong>Signature:</strong> Black ink on white paper (JPG/PNG)</li>
              <li><strong>B.Tech Degree Certificate/Provisional Certificate:</strong> PDF scan</li>
              <li><strong>Graduation Scorecard/Transcript:</strong> Showing all semester marks</li>
              <li><strong>Category Certificate:</strong> If OBC/SC/ST (issued by authorized authority)</li>
              <li><strong>PWD Certificate:</strong> If applicable (medical diagnosis from government hospital)</li>
            </ol>
            <p className="text-sm text-gray-700 mt-2">Upload tips: Clear scans (300 DPI), all four corners visible, no watermarks. Blurry documents may be rejected.</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Step 4: Pay Application Fee</h3>
          <div className="bg-gray-50 p-4 rounded space-y-2">
            <p className="font-bold">Fee Structure (2025):</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>General/OBC(NCL):</strong> ₹1,500</li>
              <li><strong>SC/ST/PwBD:</strong> ₹750</li>
              <li><strong>Female candidates:</strong> ₹750 (discount)</li>
            </ul>
            <p className="font-bold mt-2">Payment Methods:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Online (Debit/Credit Card, NetBanking, UPI)</li>
              <li>HDFC/AXIS bank counter deposit (₹50 extra charge)</li>
            </ul>
            <p className="text-sm text-blue-600 mt-2">💡 Keep screenshot of payment receipt—needed for counselling later.</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Step 5: Exam Registration & Admit Card Download</h3>
          <div className="bg-gray-50 p-4 rounded space-y-2">
            <p className="font-bold">After application approval:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Receive confirmation email with Exam Registration Number (ERN)</li>
              <li>Download Admit Card 1 week before exam date</li>
              <li>Admit Card shows: Exam center address, timing (9:30 AM - 12:30 PM for forenoon), your photograph</li>
              <li>Report 1.5 hours before exam (8:45 AM)</li>
            </ul>
          </div>

          <h3 className="font-bold text-lg mt-4">Step 6: Exam Day Process</h3>
          <div className="bg-yellow-50 p-4 rounded space-y-2">
            <p className="font-bold">What to bring:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Admit Card (printed)</li>
              <li>Government ID (Aadhaar/PAN/Passport)</li>
              <li>Black/blue ballpoint pen (for rough work)</li>
            </ul>
            <p className="font-bold mt-2">Exam format:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Computer-based test, 3 hours duration</li>
              <li>65 questions: 30 MCQ (1-2 marks) + 35 NAT (1-2 marks)</li>
              <li>Total 100 marks, -0.33 marks for wrong MCQ answers</li>
              <li>On-screen calculator provided (no external calculator)</li>
            </ul>
          </div>

          <h3 className="font-bold text-lg mt-4">Step 7: Result & PSU Recruitment Portal Registration</h3>
          <div className="bg-green-50 p-4 rounded space-y-2">
            <p className="font-bold">After exam (1-2 months):</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>GATE Result published on gate.iitm.ac.in</li>
              <li>Score valid for 3 years for PSU recruitment</li>
              <li>You can then register on individual PSU portals (NTPC, BHEL, Power Grid, etc.)</li>
              <li>Each PSU has own interview schedule and selection process</li>
            </ul>
            <p className="text-sm text-gray-700 mt-2">Note: GATE exam conduct and result is by IIT. Individual PSU recruitment timelines vary—some happen 3 months after exam, others 6-8 months later.</p>
          </div>
        </div>
      ),
    },
    {
      id: "cutoff-scores-2024",
      title: "2024-2025 GATE Cutoff Scores & PSU Selection Data",
      content: (
        <div className="space-y-4">
          <p>
            Current GATE cutoff scores and PSU selection patterns for B.Tech engineers. Updated for 2024-2025 admission cycle.
          </p>

          <h3 className="font-bold text-lg mt-4">GATE 2024 Cutoff Scores by Engineering Branch</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-blue-100">
                <tr>
                  <th className="border p-2 text-left">Branch</th>
                  <th className="border p-2 text-center">General (Cutoff)</th>
                  <th className="border p-2 text-center">OBC</th>
                  <th className="border p-2 text-center">SC/ST</th>
                  <th className="border p-2 text-center">Expected AIR for Top 500</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2"><strong>Computer Science (CS)</strong></td>
                  <td className="border p-2 text-center">28-32</td>
                  <td className="border p-2 text-center">23-26</td>
                  <td className="border p-2 text-center">18-21</td>
                  <td className="border p-2 text-center">AIR 1-500</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border p-2"><strong>Electrical Engineering (EE)</strong></td>
                  <td className="border p-2 text-center">31-35</td>
                  <td className="border p-2 text-center">26-29</td>
                  <td className="border p-2 text-center">20-24</td>
                  <td className="border p-2 text-center">AIR 1-800</td>
                </tr>
                <tr>
                  <td className="border p-2"><strong>Mechanical Engineering (ME)</strong></td>
                  <td className="border p-2 text-center">29-33</td>
                  <td className="border p-2 text-center">24-28</td>
                  <td className="border p-2 text-center">19-22</td>
                  <td className="border p-2 text-center">AIR 1-1000</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border p-2"><strong>Civil Engineering (CE)</strong></td>
                  <td className="border p-2 text-center">26-30</td>
                  <td className="border p-2 text-center">21-25</td>
                  <td className="border p-2 text-center">17-20</td>
                  <td className="border p-2 text-center">AIR 1-1200</td>
                </tr>
                <tr>
                  <td className="border p-2"><strong>Electronics (EC)</strong></td>
                  <td className="border p-2 text-center">27-31</td>
                  <td className="border p-2 text-center">22-26</td>
                  <td className="border p-2 text-center">17-21</td>
                  <td className="border p-2 text-center">AIR 1-900</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-600 mt-2">
            Cutoff = Out of 100 marks. General cutoff represents ~top 0.1% of candidates. Scores above cutoff are eligible for PSU recruitment. Actual offers depend on interview performance and organization selection criteria.
          </p>

          <h3 className="font-bold text-lg mt-4">Top PSU Selection Patterns (2024)</h3>
          <div className="space-y-3 mt-4">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="font-bold">NTPC (National Thermal Power Corp)</p>
              <p className="text-sm">Positions: 250+ engineers | Selection Range: AIR 1-500 (CS/EE/ME)</p>
              <p className="text-sm text-gray-700">Typical Offer: ₹38,000/month starting. Hires across all branches. Majority from CS/EE.</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="font-bold">BHEL (Bharat Heavy Electricals)</p>
              <p className="text-sm">Positions: 150-200 engineers | Selection Range: AIR 1-300 (EE/ME preferred)</p>
              <p className="text-sm text-gray-700">Typical Offer: ₹35,000/month. Heavy preference for Electrical & Mechanical branches.</p>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <p className="font-bold">Power Grid Corporation</p>
              <p className="text-sm">Positions: 100-150 engineers | Selection Range: AIR 1-400 (EE dominant)</p>
              <p className="text-sm text-gray-700">Typical Offer: ₹38,000/month. Heavily focused on Electrical Engineering candidates.</p>
            </div>
            <div className="border-l-4 border-orange-600 pl-4">
              <p className="font-bold">Coal India Limited</p>
              <p className="text-sm">Positions: 80-120 engineers | Selection Range: AIR 1-600 (ME/EE/CE)</p>
              <p className="text-sm text-gray-700">Typical Offer: ₹35,000/month. Accepts multiple branches for mining & operations roles.</p>
            </div>
            <div className="border-l-4 border-red-600 pl-4">
              <p className="font-bold">Indian Oil Corporation</p>
              <p className="text-sm">Positions: 120-180 engineers | Selection Range: AIR 1-500 (CS/EE/ME/CE)</p>
              <p className="text-sm text-gray-700">Typical Offer: ₹38,000/month. Good opportunity for IT & E-comm integration roles.</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">2025 GATE Exam Pattern Changes</h3>
          <ul className="list-disc pl-6 space-y-2 text-sm">
            <li><strong>No change in cutoff methodology,</strong> but AI screening tools now evaluate applications for better match with roles (IIT implementation)</li>
            <li><strong>New: PSU offers now valid for 2 years</strong> (candidates can defer joining). Previously 1 year only.</li>
            <li><strong>Interview format:</strong> Some PSUs now conduct technical + HR interview separately (2 different panels). Interview weightage increased from 30% to 40% in final selection.</li>
            <li><strong>Benefit for Gen/OBC:</strong> OBC(NCL) cutoff relaxation increased by 2-3 points to encourage diversity. SC/ST unchanged.</li>
          </ul>

          <h3 className="font-bold text-lg mt-4">What Score Should You Target?</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2">
            <p className="text-sm"><strong>For Top 20 PSUs (NTPC/BHEL/Power Grid/ISRO/DRDO):</strong> AIR 1-300 needed. This means GATE score 85-95+ depending on branch.</p>
            <p className="text-sm"><strong>For Next 30 PSUs (Coal India/IOC/IOCL/ONGC):</strong> AIR 301-1000 sufficient. GATE score 65-85.</p>
            <p className="text-sm"><strong>For other PSU recruitment:</strong> Cutoff score (28-35 out of 100) enough, but interview performance critical.</p>
          </div>
        </div>
      ),
    },
    {
      id: "interview-prep-guide",
      title: "Interview Preparation: Technical Questions & HR Tips",
      content: (
        <div className="space-y-4">
          <p>
            Real interview questions asked by NTPC, BHEL, Power Grid, and other PSUs to B.Tech engineers. Preparation strategy and expected answers.
          </p>

          <h3 className="font-bold text-lg mt-4">Part 1: Technical Interview (Duration: 20-30 minutes)</h3>
          <p className="text-sm text-gray-700 mb-3">
            Conducted to assess your core engineering knowledge and problem-solving ability. Panel of 2-3 senior engineers.
          </p>

          <div className="bg-gray-50 p-4 rounded space-y-3">
            <p className="font-bold">Sample Questions by Branch:</p>

            <div className="space-y-2">
              <p className="font-bold text-blue-700">For Electrical Engineering:</p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>"Explain the difference between Star and Delta connection. Where are they used?"</li>
                <li>Answer: Star (Y) = 3 lines + neutral, used for distribution. Delta = 3 lines, used for power transmission. Calculation: V_line = √3 × V_phase in Delta.</li>
                <li>"A 3-phase motor consumes 50 kW at 0.8 power factor. Calculate reactive power and apparent power."</li>
                <li>Answer: Reactive power = 50 × tan(cos⁻¹ 0.8) = 37.5 kVAR. Apparent = 50/0.8 = 62.5 kVA.</li>
                <li>"What is meant by 'power factor correction'? Why is it important in industries?"</li>
                <li>Answer: Improving PF from 0.8 to 0.95 reduces reactive power by 60%, lowering electricity bills and transmission losses. Capacitors added in parallel.</li>
              </ul>
            </div>

            <div className="space-y-2 mt-3">
              <p className="font-bold text-green-700">For Mechanical Engineering:</p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>"Explain the working principle of a centrifugal pump. What is the difference between a pump and a compressor?"</li>
                <li>Answer: Pump moves liquids using impeller rotation; increases pressure/head. Compressor compresses gases. Pump incompressible, compressor handles gas laws (PV = nRT).</li>
                <li>"A turbine blade fails due to 'creep'. What causes creep at high temperatures?"</li>
                <li>Answer: At high T, metal atoms vibrate more, grain boundaries weaken, permanent deformation occurs under load without fracture. Mitigation: cooling channels, alloy selection.</li>
                <li>"Compare 4-stroke and 2-stroke diesel engines. Why are trucks 4-stroke?"</li>
                <li>Answer: 4-stroke = 2 crankshaft revolutions/cycle (better fuel efficiency), 2-stroke = 1 revolution (more power/volume). Trucks need efficiency over power.</li>
              </ul>
            </div>

            <div className="space-y-2 mt-3">
              <p className="font-bold text-purple-700">For Civil Engineering:</p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>"What is the difference between RCC and PCC concrete? Why is RCC used in buildings?"</li>
                <li>Answer: RCC = reinforced concrete with steel bars (resists tension), PCC = plain concrete (only compression). RCC used in beams/columns as it handles bending loads.</li>
                <li>"Explain 'water table'. How does it affect foundation design?"</li>
                <li>Answer: Water table = depth of ground water. Below it, soil is saturated, reducing bearing capacity by 50%. Requires waterproofing, deeper pile foundations, or dewatering.</li>
              </ul>
            </div>

            <div className="space-y-2 mt-3">
              <p className="font-bold text-blue-700">For Computer Science:</p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>"Explain the difference between TCP and UDP. Where is each used?"</li>
                <li>Answer: TCP = reliable, ordered, connection-based (email, banking). UDP = fast, connectionless, no reliability (video, gaming). SCADA systems often use TCP for power grids.</li>
                <li>"What is a deadlock in operating systems? How do you prevent it?"</li>
                <li>Answer: Deadlock = processes wait for each other indefinitely. Prevention: resource allocation order, timeout, circular wait prevention. In SCADA systems, critical for continuous operation.</li>
              </ul>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Part 2: HR Interview (Duration: 10-15 minutes)</h3>
          <p className="text-sm text-gray-700 mb-3">
            Focuses on communication, motivation, and behavioral fit with the organization.
          </p>

          <div className="bg-blue-50 p-4 rounded space-y-3">
            <p className="font-bold text-sm">Typical HR Questions & Expected Answers:</p>

            <div className="space-y-2">
              <p><strong>Q: "Tell me about yourself in 2 minutes."</strong></p>
              <p className="text-sm">A: "I'm [Name], B.Tech Electrical from [College], GATE 2024 qualified with AIR [X]. My core strengths are power systems and problem-solving. During college, I led the robotics club, securing national rank. I chose government job for job security and work-life balance, not just salary. I'm excited about NTPC's renewable energy initiatives and want to contribute to India's power security."</p>
            </div>

            <div className="space-y-2 mt-2">
              <p><strong>Q: "Why do you want to join a government organization instead of private sector?"</strong></p>
              <p className="text-sm">A: "I have great respect for organizations that build critical infrastructure for 1.4 billion Indians. Private sector offers salary, but government gives purpose and stability. I want a 30-year career planning children's education and retirement with certainty. Also, government sector has better work hours—I can pursue technical certifications and hobbies. I'm not chasing salary; I'm chasing impact."</p>
            </div>

            <div className="space-y-2 mt-2">
              <p><strong>Q: "What is your biggest weakness?"</strong></p>
              <p className="text-sm">A: "I used to procrastinate on project documentation. I recognized it during my 4th semester when a project review highlighted poor record-keeping. Now I maintain daily logs and weekly reviews. I even built a personal project tracker. This skill will help in PSU role where compliance documentation is critical."</p>
            </div>

            <div className="space-y-2 mt-2">
              <p><strong>Q: "Describe a time you faced a technical challenge and solved it."</strong></p>
              <p className="text-sm">A: "In my final year project, we designed a microgrid. Initially, power flow calculations were unstable. I researched load-flow algorithms (Newton-Raphson method), recalibrated parameters, and solved it in 2 weeks. This taught me that persistence and research beat giving up. In NTPC, I'll apply this mindset to field problems."</p>
            </div>

            <div className="space-y-2 mt-2">
              <p><strong>Q: "Are you willing to be posted in remote areas like coal mines or power plants?"</strong></p>
              <p className="text-sm">A: "Yes, absolutely. I understand that NTPC operates across India, and field experience is critical. Remote postings expose me to real industrial challenges, not just theory. After 3-5 years, I can request transfer to city if needed, but I'm committed to wherever organization needs me first."</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Interview Do's & Don'ts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded">
              <p className="font-bold text-green-700">✓ DO's</p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Arrive 15 mins early (30 mins before)</li>
                <li>Maintain eye contact with panel members</li>
                <li>Answer in structured way (intro → explanation → conclusion)</li>
                <li>Ask thoughtful questions about role/org at end</li>
                <li>Speak clearly at moderate pace</li>
                <li>Show genuine enthusiasm for infrastructure/power sector</li>
                <li>Prepare for 2-3 follow-up questions on each answer</li>
              </ul>
            </div>
            <div className="bg-red-50 p-4 rounded">
              <p className="font-bold text-red-700">✗ DON'Ts</p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Don't criticize private sector or previous organizations</li>
                <li>Don't exaggerate projects or achievements</li>
                <li>Don't interrupt panel members</li>
                <li>Don't use filler words (umm, like, you know)</li>
                <li>Don't discuss salary in technical round</li>
                <li>Don't show negativity about remote posting</li>
                <li>Don't waste time—keep answers concise (2-3 mins max)</li>
              </ul>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">What to Expect in Interview Room</h3>
          <ul className="list-disc pl-6 space-y-2 text-sm">
            <li><strong>Panel Composition:</strong> Usually 2 senior engineers + 1 HR person. Sometimes GM (General Manager) joins for final round.</li>
            <li><strong>Duration:</strong> 30-45 minutes total (15-20 tech, 10-15 HR, 5 discussion)</li>
            <li><strong>Seating:</strong> You sit facing panel across table. Formality level: Medium (not too stiff, not casual)</li>
            <li><strong>Documents:</strong> Panel has your resume, college transcripts, GATE scorecard in front of them. They'll ask specifics from your resume.</li>
            <li><strong>Math/Calculations:</strong> You may need to solve small calculations on whiteboard during technical round. Don't be nervous; they expect some trial-and-error.</li>
            <li><strong>Closing:</strong> Panel asks "Do you have questions?" Always ask 2-3 smart questions (not about salary/joining date in first round).</li>
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
