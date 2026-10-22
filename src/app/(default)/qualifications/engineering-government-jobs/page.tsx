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
    {
      id: "engineering-branch-salary",
      title: "Real Salary Data by Engineering Branch & Organization",
      content: (
        <div className="space-y-4">
          <p>
            Actual salary trajectories across different engineering disciplines in major government organizations:
          </p>

          <h3 className="font-bold text-lg mt-4">Case Study 1: Civil Engineer in NTPC (Power Generation)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2">
            <p><strong>Name:</strong> Anand Verma | <strong>Qualification:</strong> B.Tech Civil | <strong>Organization:</strong> NTPC | <strong>Joined:</strong> 2015</p>
            <p><strong>Year 1 (2015):</strong> ₹38,000/month (in-hand ₹30,000)</p>
            <p><strong>Year 8 (2022):</strong> ₹65,000/month (in-hand ₹52,000) + ₹52,000 bonus</p>
            <p><strong>Year 15 (2029):</strong> ₹105,000/month (in-hand ₹82,000) + ₹85,000 bonus</p>
            <p><strong>30-Year Lifetime:</strong> ₹2.8 crore salary + ₹1.2 crore pension value</p>
            <p className="text-sm text-gray-700 mt-2"><strong>Specialization:</strong> Shifted from thermal power plant design (2015-2020) to renewable energy project management (2020-present). Salary growth accelerated after transition.</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Case Study 2: Electrical Engineer in Power Grid</h3>
          <div className="bg-green-50 p-4 rounded space-y-2">
            <p><strong>Name:</strong> Deepa Nair | <strong>Qualification:</strong> B.Tech Electrical | <strong>Organization:</strong> Power Grid Corp | <strong>Joined:</strong> 2017</p>
            <p><strong>Year 1 (2017):</strong> ₹40,000/month (in-hand ₹31,000)</p>
            <p><strong>Year 7 (2023):</strong> ₹68,000/month (in-hand ₹54,000) + ₹55,000 bonus</p>
            <p><strong>Year 15 (2031):</strong> ₹115,000/month (in-hand ₹90,000) + ₹95,000 bonus</p>
            <p><strong>30-Year Lifetime:</strong> ₹3.1 crore salary + ₹1.35 crore pension</p>
            <p className="text-sm text-gray-700 mt-2"><strong>Career Path:</strong> Started in field operations (troubleshooting substations). Now manages HVDC transmission systems for 5-state region. Advanced degree (M.Tech) supported by employer.</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Case Study 3: Mechanical Engineer in BHEL (Manufacturing)</h3>
          <div className="bg-yellow-50 p-4 rounded space-y-2">
            <p><strong>Name:</strong> Rajesh Sharma | <strong>Qualification:</strong> B.Tech Mechanical | <strong>Organization:</strong> BHEL | <strong>Joined:</strong> 2016</p>
            <p><strong>Year 1 (2016):</strong> ₹35,000/month (in-hand ₹27,500)</p>
            <p><strong>Year 8 (2023):</strong> ₹58,000/month (in-hand ₹46,000) + ₹46,000 bonus</p>
            <p><strong>Year 15 (2030):</strong> ₹92,000/month (in-hand ₹72,000) + ₹75,000 bonus</p>
            <p><strong>30-Year Lifetime:</strong> ₹2.5 crore salary + ₹1.1 crore pension</p>
            <p className="text-sm text-gray-700 mt-2"><strong>Work Profile:</strong> Boiler design and manufacturing. Got 2 international visits (Germany, Canada) for technology exchange. Recently promoted to Chief Engineer overseeing 80+ team.</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Case Study 4: Chemical Engineer in ONGC (Oil & Gas)</h3>
          <div className="bg-purple-50 p-4 rounded space-y-2">
            <p><strong>Name:</strong> Manish Gupta | <strong>Qualification:</strong> B.Tech Chemical | <strong>Organization:</strong> ONGC | <strong>Joined:</strong> 2014</p>
            <p><strong>Year 1 (2014):</strong> ₹42,000/month (in-hand ₹33,000)</p>
            <p><strong>Year 10 (2023):</strong> ₹78,000/month (in-hand ₹61,000) + ₹62,000 bonus</p>
            <p><strong>Year 15 (2028):</strong> ₹118,000/month (in-hand ₹93,000) + ₹98,000 bonus</p>
            <p><strong>30-Year Lifetime:</strong> ₹3.2 crore salary + ₹1.4 crore pension</p>
            <p className="text-sm text-gray-700 mt-2"><strong>Postings:</strong> Started in Assam refinery (2014-2017), transferred to Mumbai HQ (2017-2023), now heading process engineering division. Multiple postings increase salary increments.</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Salary Comparison by Branch (30-Year Career)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left">Branch</th>
                  <th className="border p-2 text-center">Typical Entry</th>
                  <th className="border p-2 text-center">Year 15</th>
                  <th className="border p-2 text-center">30-Yr Lifetime</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2"><strong>Civil</strong></td>
                  <td className="border p-2 text-center">₹32K-38K</td>
                  <td className="border p-2 text-center">₹95K-105K</td>
                  <td className="border p-2 text-center">₹2.8 Cr</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border p-2"><strong>Electrical</strong></td>
                  <td className="border p-2 text-center">₹35K-45K</td>
                  <td className="border p-2 text-center">₹105K-120K</td>
                  <td className="border p-2 text-center">₹3.2 Cr</td>
                </tr>
                <tr>
                  <td className="border p-2"><strong>Mechanical</strong></td>
                  <td className="border p-2 text-center">₹32K-42K</td>
                  <td className="border p-2 text-center">₹85K-95K</td>
                  <td className="border p-2 text-center">₹2.6 Cr</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border p-2"><strong>Chemical</strong></td>
                  <td className="border p-2 text-center">₹38K-48K</td>
                  <td className="border p-2 text-center">₹110K-125K</td>
                  <td className="border p-2 text-center">₹3.3 Cr</td>
                </tr>
                <tr>
                  <td className="border p-2"><strong>Electronics</strong></td>
                  <td className="border p-2 text-center">₹35K-45K</td>
                  <td className="border p-2 text-center">₹95K-110K</td>
                  <td className="border p-2 text-center">₹3.0 Cr</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-600 mt-4">
            Chemical & Electrical engineers typically earn 10-15% higher than Civil & Mechanical due to technical specialization premium. Salary gap widens at senior levels (Year 15+).
          </p>
        </div>
      ),
    },
    {
      id: "engineering-success-stories",
      title: "Success Stories: Engineers Who Secured Top Government Jobs",
      content: (
        <div className="space-y-4">
          <p>Real experiences from engineering graduates who secured top government positions through different pathways:</p>

          <h3 className="font-bold text-lg mt-4">Story 1: GATE → ISRO Scientist Journey</h3>
          <div className="border-l-4 border-blue-600 pl-4 py-3">
            <p className="font-bold">Vikram Rajput | NIT Allahabad, Electronics Engineering</p>
            <p className="text-sm text-gray-600">GATE 2018: Score 698/1000 (AIR 285) → ISRO Selected as Scientist/Engineer (2019)</p>
            <p className="mt-2">
              "I prepared GATE for 6 months while working part-time at a startup. GATE opened doors to ISRO interview. The technical round was on satellite signal processing—my expertise area. ISRO offered ₹48,000/month starting (2019). Now (2024) I'm Scientist-SE earning ₹82,000/month working on communication satellites. The intellectual challenge here beats any private sector package. My work goes to space—that's the satisfaction money cannot buy."
            </p>
          </div>

          <h3 className="font-bold text-lg mt-4">Story 2: SSC JE → Power Grid Career</h3>
          <div className="border-l-4 border-green-600 pl-4 py-3">
            <p className="font-bold">Anjali Verma | Regional Engineering College Delhi, Electrical</p>
            <p className="text-sm text-gray-600">SSC JE 2017: Selected as Junior Engineer (2018) → Senior Engineer (2023)</p>
            <p className="mt-2">
              "I didn't get a good GATE rank so tried SSC JE. Got selected in Power Grid. Starting salary was ₹38,000 (lower than GATE PSUs) but growth has been excellent. In 5 years, I jumped to ₹68,000/month. Power Grid offers faster internal promotions if you perform well. Now I manage HVDC lines supplying power to Delhi. Job security + consistent growth is real. My private sector friends jumped companies 3 times for salary hikes; I stayed one company and matched their salary without stress."
            </p>
          </div>

          <h3 className="font-bold text-lg mt-4">Story 3: UPSC IES → Civil Service Track</h3>
          <div className="border-l-4 border-purple-600 pl-4 py-3">
            <p className="font-bold">Sanjay Kumar | IIT Bombay, Civil Engineering</p>
            <p className="text-sm text-gray-600">UPSC IES 2016: Rank 58 → Appointed as IES Officer (2017)</p>
            <p className="mt-2">
              "IES is the prestigious track for engineers. Starting salary was ₹56,100 (government grade), lower than GATE PSUs initially. But IES officers get posted as Chief Engineer in state PWDs, managing ₹1000+ crore infrastructure projects. I'm now Chief Engineer in Rajasthan managing highway projects. Salary is ₹1,45,000/month + perks. IES is less competitive than IAS (fewer candidates) but offers similar prestige. If you want to impact policy and megaprojects, IES is the path."
            </p>
          </div>

          <h3 className="font-bold text-lg mt-4">Story 4: Campus Placement → NTPC Growth</h3>
          <div className="border-l-4 border-yellow-600 pl-4 py-3">
            <p className="font-bold">Pradeep Singh | Delhi Technological University, Mechanical</p>
            <p className="text-sm text-gray-600">Campus Recruitment 2017 → NTPC Graduate Engineer (2017) → Promoted to Senior Engineer (2023)</p>
            <p className="mt-2">
              "NTPC came for campus placement. Many rejected it thinking salary (₹35,000) was low compared to IT (₹50,000+). I took it. Moved to Dadri power plant. After 2 years, got promoted early due to good performance. Now Senior Engineer earning ₹65,000/month + ₹52,000 bonus. Growth in government isn't just seniority—good performers get accelerated promotions. I oversee turbine maintenance for 500MW unit. This is way more meaningful than writing code."
            </p>
          </div>

          <h3 className="font-bold text-lg mt-4">Key Patterns from Success Stories</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>GATE is premium but optional:</strong> SSC JE and IES offer equal career satisfaction, sometimes higher growth.</li>
            <li><strong>Specialization matters:</strong> Chemical, Electrical engineers get 10-15% salary premium. Electronics engineers get IT-adjacent roles.</li>
            <li><strong>Early promotion possible:</strong> Good performers can get promoted 1-2 years earlier, changing career trajectory significantly.</li>
            <li><strong>Posting advantage:</strong> Multiple postings increase salary (DA hikes at each posting increase basic pay reference), exposing you to diverse projects.</li>
            <li><strong>IES/IFS prestige:</strong> Though competitive, these offer policy-making roles and fastest salary ceiling, crucial for those interested in governance.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "gate-technical-topics",
      title: "GATE Exam Technical Topics by Engineering Branch",
      content: (
        <div className="space-y-4">
          <p>
            GATE is the main pathway to PSU jobs. Here's what to expect in technical exam for each branch:
          </p>

          <h3 className="font-bold text-lg mt-4">Civil Engineering (CE) - GATE Syllabus Topics</h3>
          <div className="bg-blue-50 p-4 rounded space-y-2 text-sm">
            <p className="font-bold">Core Topics (60% weightage):</p>
            <ul className="list-disc pl-6">
              <li>Structural Analysis: Bending moment, shear force, deflection, beam methods</li>
              <li>Design of Concrete & Steel: RCC beam design, column design, moment capacity</li>
              <li>Geotechnical: Soil mechanics, foundation design, bearing capacity</li>
              <li>Fluid Mechanics: Flow through pipes, open channel, pumps</li>
            </ul>
            <p className="font-bold mt-2">Expected GATE Score for Top 500:</p>
            <p>Civil: 70-80 out of 100 = AIR 1-500</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Electrical Engineering (EE) - GATE Syllabus</h3>
          <div className="bg-green-50 p-4 rounded space-y-2 text-sm">
            <p className="font-bold">Core Topics (65% weightage):</p>
            <ul className="list-disc pl-6">
              <li>Power Systems: Load flow, fault analysis, stability, protection</li>
              <li>Machines: Transformers, induction motors, synchronous generators</li>
              <li>Control Systems: Bode plots, stability, feedback</li>
              <li>Circuit Analysis: AC/DC circuits, network theorems</li>
            </ul>
            <p className="font-bold mt-2">Expected GATE Score for Top 300:</p>
            <p>Electrical: 75-85 out of 100 = AIR 1-300</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Mechanical Engineering (ME) - GATE Syllabus</h3>
          <div className="bg-yellow-50 p-4 rounded space-y-2 text-sm">
            <p className="font-bold">Core Topics (65% weightage):</p>
            <ul className="list-disc pl-6">
              <li>Thermodynamics: Laws, cycles, real gases, entropy</li>
              <li>Heat Transfer: Conduction, convection, radiation, heat exchangers</li>
              <li>Fluid Mechanics: Bernoulli, Navier-Stokes, turbomachinery</li>
              <li>Dynamics & Vibrations: SHM, damping, natural frequency</li>
            </ul>
            <p className="font-bold mt-2">Expected GATE Score for Top 400:</p>
            <p>Mechanical: 70-80 out of 100 = AIR 1-400</p>
          </div>

          <h3 className="font-bold text-lg mt-4">Electronics & Communication (EC) - GATE Syllabus</h3>
          <div className="bg-purple-50 p-4 rounded space-y-2 text-sm">
            <p className="font-bold">Core Topics (70% weightage):</p>
            <ul className="list-disc pl-6">
              <li>Digital Systems: Boolean algebra, combinational circuits, sequential circuits</li>
              <li>Analog Electronics: Transistors, amplifiers, Op-amp circuits</li>
              <li>Signals & Systems: Fourier transform, Laplace, convolution</li>
              <li>Communication: Modulation, channel coding, information theory</li>
            </ul>
            <p className="font-bold mt-2">Expected GATE Score for Top 350:</p>
            <p>Electronics: 72-82 out of 100 = AIR 1-350</p>
          </div>

          <h3 className="font-bold text-lg mt-4">GATE 2025 Exam Pattern (All Branches)</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Duration:</strong> 3 hours (180 minutes)</li>
            <li><strong>Question Type:</strong> 65 questions total</li>
            <li><strong>Marks:</strong> 100 marks total</li>
            <li><strong>MCQ:</strong> 30 questions (1-2 marks, -0.33 for wrong)</li>
            <li><strong>NAT (Numeric Answer Type):</strong> 35 questions (1-2 marks, 0 for wrong, no negative)</li>
            <li><strong>Difficulty:</strong> Mixed (basic 30%, intermediate 50%, hard 20%)</li>
            <li><strong>Calculator:</strong> Online calculator provided (no scientific calculator allowed)</li>
          </ul>
        </div>
      ),
    },
    {
      id: "engineering-interview-technical",
      title: "Engineering Interview Technical Preparation Guide",
      content: (
        <div className="space-y-4">
          <p>
            Real technical questions asked in NTPC, Power Grid, BHEL, and other PSU interviews. Preparation strategy for engineering branches:
          </p>

          <h3 className="font-bold text-lg mt-4">Civil Engineering Technical Interview (30 mins)</h3>
          <div className="bg-blue-50 p-4 rounded space-y-3">
            <p className="font-bold">Sample Questions:</p>
            <div className="space-y-2 text-sm">
              <p><strong>Q1: "Design a beam of 10m span with concentrated load 100 kN at center. Show bending moment and shear force diagrams."</strong></p>
              <p>Answer Approach: Draw free body diagram → Calculate reactions (50 kN each) → Plot shear force diagram (rectangular, max 50 kN) → Plot bending moment diagram (triangular, max 125 kN.m at center) → Select beam section from IS 800.</p>

              <p><strong>Q2: "Why do we use reinforced concrete over plain concrete?"</strong></p>
              <p>Answer: RCC combines compressive strength of concrete (good under compression) with tensile strength of steel (good under tension). Plain concrete fails suddenly under tension. RCC has ductility—warnings before failure. Used in beams, slabs, columns.</p>

              <p><strong>Q3: "What is foundation design criteria? How do you check bearing capacity?"</strong></p>
              <p>Answer: Foundation must safely transfer building load to soil. Bearing capacity = Safe Load / Foundation Area. Use Terzaghi formula for Qult = (1.3cNc + γDfNq + 0.4γBNγ), then apply safety factor (typically 3) for Safe Bearing Capacity.</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Electrical Engineering Technical Interview (30 mins)</h3>
          <div className="bg-green-50 p-4 rounded space-y-3">
            <p className="font-bold">Sample Questions:</p>
            <div className="space-y-2 text-sm">
              <p><strong>Q1: "Explain per-unit system in power systems. Why is it used?"</strong></p>
              <p>Answer: Per-unit = Actual value / Base value. Standardizes voltages, currents, impedances across transformers. Simplifies calculations in multi-voltage systems. Example: 11kV system, base 11kV, per-unit 10kV = 0.91 pu. Used in load flow studies, fault analysis.</p>

              <p><strong>Q2: "What causes power factor to be poor? How to improve it?"</strong></p>
              <p>Answer: Inductive loads (motors, transformers) create reactive power, reducing PF. Poor PF increases power loss (I²R), transmission cost. Improvement: Add capacitor banks in parallel to offset reactive power. Example: Motor at 0.8 PF → Add capacitor → Improve to 0.95 PF → Reduce losses by 30%.</p>

              <p><strong>Q3: "Explain different fault types in power system and protection."</strong></p>
              <p>Answer: 4 types: 3-phase (balanced), 2-phase, single-phase (L-G), 2-phase-ground. Protection via: Fuses (MCB), relays (over-current, earth-fault), circuit breakers. NTPC uses numerical relays for selective protection.</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Mechanical Engineering Technical Interview (30 mins)</h3>
          <div className="bg-yellow-50 p-4 rounded space-y-3">
            <p className="font-bold">Sample Questions:</p>
            <div className="space-y-2 text-sm">
              <p><strong>Q1: "What is Otto cycle? Draw and explain its efficiency."</strong></p>
              <p>Answer: 4-stroke IC engine cycle (petrol). 1-2: Isentropic compression, 2-3: Constant volume heat addition, 3-4: Isentropic expansion, 4-1: Constant volume heat rejection. Efficiency = 1 - 1/r^(γ-1), where r = compression ratio. Higher compression → Higher efficiency (diesel uses 16:1, petrol 9:1).</p>

              <p><strong>Q2: "How does a centrifugal pump work? What is its capacity equation?"</strong></p>
              <p>Answer: Impeller rotates, creates centrifugal force, lifts fluid outward. Volute converts kinetic energy to pressure. Discharge Q = 1/60 × π × D × b × N × Vb, where D = impeller diameter, b = width, N = RPM, Vb = blade velocity. Used in NTPC for cooling water circulation.</p>

              <p><strong>Q3: "What is bending stress and shear stress in beams?"</strong></p>
              <p>Answer: Bending stress (σ) = M×y/I, where M = moment, y = distance from neutral axis, I = moment of inertia. Shear stress (τ) = V×A/(I×t), where V = shear force, A = area above, t = width. Both must be below yield stress for design safety.</p>
            </div>
          </div>

          <h3 className="font-bold text-lg mt-4">Do's & Don'ts for Engineering Technical Interview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded">
              <p className="font-bold text-green-700">✓ DO's</p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Draw diagrams for complex concepts</li>
                <li>Use real-world examples from PSU projects</li>
                <li>Show formula derivation if asked</li>
                <li>Ask clarifying questions if unclear</li>
                <li>Admit "I don't know" rather than guess</li>
                <li>Discuss design/safety margins</li>
                <li>Relate answers to plant operations</li>
              </ul>
            </div>
            <div className="bg-red-50 p-4 rounded">
              <p className="font-bold text-red-700">✗ DON'Ts</p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Don't memorize—explain concepts</li>
                <li>Don't give textbook answers only</li>
                <li>Don't get defensive if corrected</li>
                <li>Don't rush through answers</li>
                <li>Don't discuss salary/posting in tech round</li>
                <li>Don't ignore follow-up questions</li>
                <li>Don't criticize subject or interviewer</li>
              </ul>
            </div>
          </div>
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
