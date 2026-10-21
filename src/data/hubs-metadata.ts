/**
 * Hub pages metadata — Pure data with no database imports
 * Safe to import into client components
 * Auto-generated from /public/hubs/*.html
 * Run: npm run generate:hubs-data
 */

export type HubCategory = 'qualification' | 'exam' | 'state' | 'department' | 'salary';

export interface Hub {
  slug: string;
  title: string;
  keyword: string;
  description: string;
  content: string; // HTML content body
  category: HubCategory;
  color: string; // Tailwind color or hex
  filters: Record<string, any>; // Database query filters
  relatedHubs: string[]; // Slugs of related hubs
  stats: Record<string, string | number>; // Display stats (total jobs, salary range, etc.)
}

export const hubs: Record<string, Hub> = {
  "100k-comprehensive-guide": {
    "slug": "100k-comprehensive-guide",
    "title": "Rs. 1 lac+ Government Jobs India 2026 | Cabinet Secretary, Chief Justice, RBI | Complete Guide",
    "keyword": "Rs. 1 lac+ Government Jobs India 2026 | Cabinet Secretary, Chief Justice, RBI | Comp",
    "description": "Rs. 1 lac+ salary government jobs India. Cabinet secretary, chief justice, RBI, supreme court, senior bureaucrat roles. Career ceiling Rs. 2 lacs–Rs. 3 lacs. Select vacancies. Complete guide.",
    "content": "<div class=\"container\"><h2>Rs. 1 lac+ Salary Range Jobs Overview</h2><p>Government jobs in the Rs. 1 lac+ salary range represent India's absolute elite tier — Cabinet Secretary, Chief Justice, RBI Governor, and Chief Secretary positions. These are not entry-level roles but prestigious culminations of 25–35 year careers. Only 10–20 vacancies yearly nationwide, reached exclusively through IAS/IPS/judiciary.</p><div class=\"highlight\"><strong>Rs. 1 lac+ Jobs Key Facts:</strong> Entry Rs. 1 lac–Rs. 2 lacs (achieved after 25+ years). Career ceiling Rs. 2 lacs–Rs. 3 lacs (absolute top). 10–20 vacancies yearly (extremely rare). Reached exclusively via IAS, IPS, or judiciary. Ultimate power + prestige + influence.</div><h2>Top Rs. 1 lac+ Government Positions</h2><table><tbody><tr><th>Position</th><th>Current Salary</th><th>Reached After</th><th>Entry Path</th></tr><tr><td><strong>Cabinet Secretary</strong></td><td>Rs. 1 lac–Rs. 1.2 lacs</td><td>30+ years IAS</td><td>IAS (UPSC)</td></tr><tr><td><strong>Chief Justice (India)</strong></td><td>Rs. 1 lac–Rs. 1.4 lacs</td><td>30+ years law</td><td>Law Degree + Judiciary</td></tr><tr><td><strong>RBI Governor</strong></td><td>Rs. 1.5 lacs–Rs. 2 lacs</td><td>Economist role</td><td>Economics PhD</td></tr><tr><td><strong>Chief Secretary (State)</strong></td><td>Rs. 90,000–Rs. 1.2 lacs</td><td>30+ years state IAS</td><td>IAS (UPSC)</td></tr><tr><td><strong>Police Commissioner</strong></td><td>Rs. 90,000–Rs. 1.2 lacs</td><td>30+ years IPS</td><td>IPS (UPSC)</td></tr></tbody></table><h2>Cabinet Secretary (Rs. 1 lac–Rs. 1.2 lacs) — INDIA'S TOP BUREAUCRAT</h2><ul><li><strong>Current Salary:</strong> Rs. 1 lac–Rs. 1.2 lacs</li><li><strong>Position:</strong> India's top civil servant, advises PM/President</li><li><strong>Career Path:</strong> Start as IAS (Rs. 56,000) → Joint Secretary (Rs. 90,000) → Additional Secretary (Rs. 1 lac) → Cabinet Secretary (Rs. 1.2 lacs+)</li><li><strong>Years Required:</strong> 30–35 years from IAS entry</li><li><strong>Number of Vacancies:</strong> 1 every 2–3 years (extremely rare)</li><li><strong>Typical Age at Appointment:</strong> 58–60 years</li><li><strong>Authority:</strong> Implements government policy, coordinates ministries, advises PM</li><li><strong>Legacy:</strong> Shapes India's governance and administrative policies</li></ul><h2>Chief Justice of India (Rs. 1 lac–Rs. 1.4 lacs)</h2><ul><li><strong>Current Salary:</strong> Rs. 1 lac–Rs. 1.4 lacs</li><li><strong>Position:</strong> Head of Indian judiciary, Supreme Court authority</li><li><strong>Career Path:</strong> Law degree → Lawyer → District Judge (Rs. 50,000) → High Court Judge (Rs. 80,000) → Supreme Court Judge (Rs. 1 lac) → Chief Justice (Rs. 1.4 lacs)</li><li><strong>Years Required:</strong> 30–35 years from law degree</li><li><strong>Vacancies:</strong> 1 every 3–4 years</li><li><strong>Tenure:</strong> 2 years (mandatory retirement at 65)</li><li><strong>Authority:</strong> Constitutional head of judiciary, final appeal authority</li></ul><h2>RBI Governor (Rs. 1.5 lacs–Rs. 2 lacs) — HIGHEST SALARY</h2><ul><li><strong>Current Salary:</strong> Rs. 1.5 lacs–Rs. 2 lacs (highest among government positions)</li><li><strong>Position:</strong> Head of Reserve Bank of India, controls monetary policy</li><li><strong>Career Path:</strong> Economics PhD → Government economist → Monetary policy expert → RBI Governor</li><li><strong>Selection:</strong> Presidential appointment (not UPSC exam)</li><li><strong>Vacancies:</strong> 1 every 3–6 years</li><li><strong>Tenure:</strong> 6 years with possible extension</li><li><strong>Global Role:</strong> International monetary conferences, currency policy, inflation control</li><li><strong>Authority:</strong> Controls India's entire banking system, interest rates, forex</li></ul><h2>Chief Secretary (State) (Rs. 90,000–Rs. 1.2 lacs)</h2><ul><li><strong>Current Salary:</strong> Rs. 90,000–Rs. 1.2 lacs (varies by state)</li><li><strong>Position:</strong> Top bureaucrat of state, advises Chief Minister</li><li><strong>Career Path:</strong> State IAS (Rs. 28,000) → 30+ years state administration → Chief Secretary</li><li><strong>Vacancies:</strong> 1 per state every 2–3 years (multiple vacancies yearly pan-India)</li><li><strong>Authority:</strong> State policy implementation, all-state administration coordination</li><li><strong>Advantage:</strong> More frequently available than national positions (8–10 positions yearly)</li></ul><h2>Police Commissioner (Rs. 90,000–Rs. 1.2 lacs)</h2><ul><li><strong>Current Salary:</strong> Rs. 90,000–Rs. 1.2 lacs (varies by state/central paramilitary)</li><li><strong>Position:</strong> Head of state/central police force</li><li><strong>Career Path:</strong> IPS (Rs. 56,000) → 30+ years police service → Commissioner</li><li><strong>Vacancies:</strong> 1 per state every 2–3 years + central paramilitary positions</li><li><strong>Authority:</strong> Controls state police, law enforcement, detective forces</li><li><strong>Typical Age:</strong> 56–58 at appointment (just before retirement)</li></ul><h2>Other Rs. 1 lac+ Positions</h2><ul><li><strong>Additional Secretary (Government of India):</strong> Rs. 1 lac–Rs. 1.1 lacs, 5–10 yearly</li><li><strong>Joint Secretary (Apex Level):</strong> Rs. 95,000–Rs. 1.1 lacs, 15–20 yearly</li><li><strong>Union Bank Governor:</strong> Rs. 80,000–Rs. 1 lac, 1–2 yearly</li><li><strong>High Court Chief Justice:</strong> Rs. 95,000–Rs. 1.1 lacs, 1–2 yearly per court</li></ul><h2>Path to Rs. 1 lac+: The 35-Year Journey</h2><table><tbody><tr><th>Year</th><th>Position</th><th>Salary</th><th>Age</th></tr><tr><td>Year 0</td><td>IAS Entry</td><td>Rs. 56,000</td><td>23</td></tr><tr><td>Year 8</td><td>Senior IAS</td><td>Rs. 65,000</td><td>31</td></tr><tr><td>Year 16</td><td>Joint Secretary</td><td>Rs. 90,000</td><td>39</td></tr><tr><td>Year 20</td><td>Additional Secretary</td><td>Rs. 1 lac</td><td>43</td></tr><tr><td>Year 30</td><td>Cabinet Secretary</td><td>Rs. 1.2 lacs</td><td>53</td></tr></tbody></table><h2>Is Rs. 1 lac+ Worth It?</h2><ul><li><strong>Pros:</strong> Immense power + prestige, shape India's future, Rs. 15 lacs+ gratuity, 50% pension Rs. 75,000+/month for life</li><li><strong>Cons:</strong> 30+ years dedication, extreme stress, limited personal freedom, constant accountability</li><li><strong>Trade-off:</strong> Ultimate career achievement vs. personal time/family balance</li></ul><h2>Related Hubs</h2><div class=\"links\"><a href=\"/hubs/upsc-comprehensive-guide.html\" class=\"link\">UPSC IAS (Entry Path)</a><a href=\"/hubs/50-100k-comprehensive-guide.html\" class=\"link\">Rs. 50,000–Rs. 1 lac Range</a><a href=\"/hubs/masters-comprehensive-guide.html\" class=\"link\">Master's Degree</a><a href=\"/hubs/finance-customs-comprehensive-guide.html\" class=\"link\">Finance &amp; Customs</a><a href=\"/hubs/ssc-comprehensive-guide.html\" class=\"link\">SSC (Faster Path)</a></div><h2>Next Steps (For Beginners)</h2><ol><li>Understand: Rs. 1 lac+ roles require 25–35 year commitment starting from entry-level</li><li>Decide: IAS (Cabinet Secretary), IPS (Police Commissioner), or Judiciary (Chief Justice)</li><li>Start with: UPSC IAS/IPS exam (entry Rs. 56,000)</li><li>Prepare 12–24 months → Clear UPSC</li><li>Serve 30+ years with dedication + excellence</li><li>Reach Cabinet Secretary/Chief Justice at Rs. 1 lac–Rs. 1.4 lacs by age 55–60</li><li>Retire with Rs. 75,000+/month lifetime pension + Rs. 15 lacs gratuity</li></ol></div>\n        <h2>Which Government Positions Pay Rs. 1 lac+ Per Month?</h2>\n        <p>IAS Commissioner/Secretary: Rs. 1 lac–Rs. 1.5 lacs+ (after 15–20 years). IPS Commissioner: Rs. 1 lac–Rs. 1.2 lacs+ (after 18+ years). Chief Secretary: Rs. 1.5 lacs+ (highest). Scientist (ISRO/DRDO): Rs. 90,000–Rs. 1.2 lacs (with promotions). Bank Chairman: Rs. 1.2 lacs+ (senior position). **Timeline:** Average 15–20 years to reach Rs. 1 lac.</p>\n\n        <h2>Fast-Track to Rs. 1 lac: Which Career Path is Quickest?</h2>\n        <p>IAS fast-track: 18–20 years (via seniority). ISRO Scientist fast-track: 12–15 years (via research). Banking fast-track: 18–20 years (via branch manager → regional). Defense Chief: 20+ years. **Fastest realistic path:** ISRO Scientist (15 years with continuous research contribution).</p>\n\n        <h2>Total Compensation at Rs. 1 lac: Salary + Benefits + Pension</h2>\n        <p>Rs. 1 lac salary = Rs. 14 lacs+ annual. ADD: DA (varying), HRA, pension 50% (Rs. 50,000 lifelong), 120 leave days = Rs. 10,000–Rs. 15,000 additional value. Total annual compensation = Rs. 24 lacs–Rs. 29 lacs. Pension value (20-year retirement) = Rs. 1 crore+ in today's money. **Real value:** Rs. 1 lac government = Rs. 1.5 lacs–Rs. 2 lacs private equivalent.</p>",
    "category": "salary",
    "color": "#3B82F6",
    "filters": {
      "salaryMin": 100000
    },
    "relatedHubs": [
      "upsc-comprehensive-guide",
      "it-tech-comprehensive-guide"
    ],
    "stats": {
      "totalJobs": 1000,
      "salaryRange": "Rs. 1 lac+",
      "selectionRate": "0.08–0.5%"
    }
  },
  "100k-plus-comprehensive-guide": {
    "slug": "100k-plus-comprehensive-guide",
    "title": "Rs. 1 lac+ Government Jobs 2026 | 18+ Senior Officer Positions | UPSC Defense IDS",
    "keyword": "Rs. 1 lac+ Government Jobs 2026 | 18+ Senior Officer Positions | UPSC Defense IDS",
    "description": "Premium government jobs. 18+ senior officer positions earning Rs. 1 lac+. UPSC (IAS, IFS, IDS), Defense, Chief roles. Career ceiling Rs. 1.5 lacs–Rs. 2 lacs+. Pension guaranteed.",
    "content": "<div class=\"container\">\n        <h2>Rs. 1 lac+ Jobs Overview</h2>\n        <p>India's highest-paying government positions: 18 senior officer and chief-level roles earning Rs. 1 lac+ monthly. Includes UPSC (IAS/IFS/IDS), Defense General, Chief Medical Officer, Chief Educational Officer roles. Career ceiling Rs. 1.5 lacs–Rs. 2 lacs+ with allowances and HRA. Lifetime pension 50% salary (Rs. 50,000–Rs. 1 lac+ monthly retirement).</p>\n        <h2>Premium Opportunities</h2>\n        <table>\n            <tbody><tr><th>Role Type</th><th>Posts</th><th>Entry Salary</th><th>Max Salary</th></tr>\n            <tr><td>UPSC IAS (Secretary Level)</td><td>6</td><td>Rs. 1 lac–Rs. 1.2 lacs</td><td>Rs. 1.5 lacs+</td></tr>\n            <tr><td>Defense General/Admiral</td><td>4</td><td>Rs. 1.1 lacs–Rs. 1.3 lacs</td><td>Rs. 1.8 lacs+</td></tr>\n            <tr><td>Chief Officers (CMO, CEO)</td><td>5</td><td>Rs. 1 lac–Rs. 1.2 lacs</td><td>Rs. 1.6 lacs+</td></tr>\n            <tr><td>Special Secretary</td><td>3</td><td>Rs. 1.2 lacs–Rs. 1.5 lacs</td><td>Rs. 2 lacs+</td></tr>\n        </tbody></table>\n        <div class=\"highlight\">\n            <strong>Premium Advantage:</strong> 18 government positions earning Rs. 1 lac–Rs. 2 lacs+ monthly. IAS/IFS/Defense/Chief roles. Highest prestige. Lifetime pension Rs. 50,000–Rs. 1 lac+ monthly. Rs. 4 crores–Rs. 8 crores+ total lifetime value.\n        </div>\n        <h2>Related Government Jobs</h2>\n        <p><a href=\"/hubs/upsc-comprehensive-guide.html\">UPSC Jobs</a> | <a href=\"/hubs/defense-comprehensive-guide.html\">Defense Jobs</a> | <a href=\"/hubs/health-comprehensive-guide.html\">Health Jobs</a> | <a href=\"/hubs/50-100k-comprehensive-guide.html\">Rs. 50,000–Rs. 1 lac Jobs</a> | <a href=\"/hubs/masters-comprehensive-guide.html\">Master's Jobs</a></p>\n    </div>",
    "category": "salary",
    "color": "#3B82F6",
    "filters": {
      "salaryMin": 100000
    },
    "relatedHubs": [
      "upsc-comprehensive-guide",
      "it-tech-comprehensive-guide"
    ],
    "stats": {
      "totalJobs": 1000,
      "salaryRange": "Rs. 1 lac+",
      "selectionRate": "0.08–0.5%"
    }
  },
  "12th-pass-comprehensive-guide": {
    "slug": "12th-pass-comprehensive-guide",
    "title": "12th Pass Government Jobs India 2026 | SSC CHSL, Railway, Banking | Entry Rs. 18,000–Rs. 45,000 | Complete Guide",
    "keyword": "12th Pass Government Jobs India 2026 | SSC CHSL, Railway, Banking | Entry Rs. 18,000–Rs. ",
    "description": "12th pass government jobs India. SSC CHSL, railway clerk, bank clerk, police, postal. Entry Rs. 18,000–Rs. 45,000, career ceiling Rs. 1 lac+. 40,000+ vacancies. Selection rate 1–3%. Complete guide.",
    "content": "<div class=\"container\"><h2>12th Pass Government Jobs Overview</h2><p>12th pass is the gateway to India's largest government job opportunities — 40,000+ vacancies annually. Entry salaries range Rs. 18,000–Rs. 45,000 with career ceilings exceeding Rs. 1 lac. 12th pass jobs span SSC CHSL, railways, banking, police, postal, and state services — accessible with 4–12 month preparation.</p><div class=\"highlight\"><strong>12th Pass Jobs Key Facts:</strong> Entry Rs. 18,000–Rs. 45,000 (easiest govt entry). Selection rate 1–3% (accessible). 40,000+ vacancies yearly (HIGHEST vacancies). Prep 4–12 months. Lifetime pension 50% + benefits. Perfect first government job.</div><h2>Top 12th Pass Government Jobs</h2><table><tbody><tr><th>Role</th><th>Exam</th><th>Entry Salary</th><th>Vacancies/Year</th><th>Difficulty</th></tr><tr><td><strong>SSC CHSL (Clerk/DEO)</strong></td><td>SSC CHSL</td><td>Rs. 21,000–Rs. 25,000</td><td>5,000+</td><td>Moderate</td></tr><tr><td><strong>Bank Clerk</strong></td><td>IBPS Clerk</td><td>Rs. 18,000–Rs. 25,000</td><td>7,000+</td><td>Moderate</td></tr><tr><td><strong>Railway Clerk</strong></td><td>RRB NTPC</td><td>Rs. 18,000–Rs. 22,000</td><td>3,000+</td><td>Easy</td></tr><tr><td><strong>Police Constable</strong></td><td>Police Exam</td><td>Rs. 21,000–Rs. 25,000</td><td>15,000+</td><td>Easy–Moderate</td></tr><tr><td><strong>Postal (Mail Guard)</strong></td><td>India Post</td><td>Rs. 18,000–Rs. 22,000</td><td>3,000+</td><td>Easy</td></tr></tbody></table><h2>SSC CHSL (10+2 Level)</h2><ul><li><strong>Vacancies:</strong> 5,000+ yearly</li><li><strong>Entry Salary:</strong> Rs. 21,000–Rs. 25,000</li><li><strong>Roles:</strong> Lower Division Clerk (LDC), Data Entry Operator (DEO)</li><li><strong>Selection:</strong> Written (Tier 1 + Tier 2) + Typing Test</li><li><strong>Exam Difficulty:</strong> Moderate (1–2% success rate)</li><li><strong>Preparation:</strong> 6–12 months</li><li><strong>Career Ceiling:</strong> Rs. 70,000–Rs. 1 lac as senior clerk/inspector</li></ul><h2>Bank Clerk (IBPS)</h2><ul><li><strong>Vacancies:</strong> 7,000+ yearly across all banks</li><li><strong>Entry Salary:</strong> Rs. 18,000–Rs. 25,000</li><li><strong>Selection:</strong> Prelims → Mains → Group Discussion + Interview</li><li><strong>Exam Difficulty:</strong> Moderate (1–2% success rate)</li><li><strong>Preparation:</strong> 4–6 months</li><li><strong>Career Path:</strong> Clerk → PO (Rs. 45,000) → Manager (Rs. 75,000+)</li><li><strong>Benefits:</strong> Bonus structure, medical, pension 50%</li></ul><h2>Railway Clerk (RRB NTPC)</h2><ul><li><strong>Vacancies:</strong> 3,000+ yearly</li><li><strong>Entry Salary:</strong> Rs. 18,000–Rs. 22,000</li><li><strong>Roles:</strong> Station Master, Traffic Assistant, Clerk</li><li><strong>Selection:</strong> Written (easy) + Interview</li><li><strong>Exam Difficulty:</strong> Easy–Moderate (2–4% success rate)</li><li><strong>Preparation:</strong> 4–6 months</li><li><strong>Career Path:</strong> Clerk → Station Master → Chief Station Master (Rs. 80,000+)</li></ul><h2>Police Constable</h2><ul><li><strong>Vacancies:</strong> 15,000+ yearly (HIGHEST vacancies)</li><li><strong>Entry Salary:</strong> Rs. 21,000–Rs. 25,000</li><li><strong>Selection:</strong> Written + Physical Test (5km run, pullups) + Interview</li><li><strong>Physical Standards:</strong> 165cm (male), 152cm (female), 20 pullups</li><li><strong>Preparation:</strong> 4–6 months (focus on physical fitness)</li><li><strong>Career Path:</strong> Constable → Sub-Inspector (Rs. 40,000) → Inspector (Rs. 60,000+)</li></ul><h2>Postal Jobs (Mail Guard/Postman)</h2><ul><li><strong>Vacancies:</strong> 3,000+ yearly</li><li><strong>Entry Salary:</strong> Rs. 18,000–Rs. 22,000 (easiest entry)</li><li><strong>Selection:</strong> Written + Physical + Interview</li><li><strong>Physical Standards:</strong> Basic fitness (lower than police)</li><li><strong>Preparation:</strong> 4–6 months</li><li><strong>Career Path:</strong> Mail Guard → Postman → Postal Supervisor (Rs. 60,000+)</li></ul><h2>12th Pass Exam Preparation Strategy</h2><ul><li><strong>Written Exam:</strong> General Awareness, English, Math, Reasoning (10+2 standard)</li><li><strong>Key Focus:</strong> Time management (test-taking speed), accuracy over complex concepts</li><li><strong>Physical (for Police):</strong> Daily running, strength training, flexibility</li><li><strong>Typing Test (for CHSL/Clerk):</strong> 30+ WPM in English or Hindi</li><li><strong>Best Approach:</strong> Mock tests weekly, solve 2,000+ previous year questions</li></ul><h2>12th Pass vs Other Qualifications</h2><table><tbody><tr><th>Qualification</th><th>Vacancies/Year</th><th>Entry Salary</th><th>Selection Rate</th><th>Prep Time</th></tr><tr><td>12th Pass</td><td>40,000+</td><td>Rs. 18,000–Rs. 25,000</td><td>1–3%</td><td>4–12 mo</td></tr><tr><td>Diploma</td><td>15,000+</td><td>Rs. 18,000–Rs. 35,000</td><td>2–4%</td><td>4–12 mo</td></tr><tr><td>Bachelor's</td><td>25,000+</td><td>Rs. 25,000–Rs. 70,000</td><td>0.5–2%</td><td>6–18 mo</td></tr><tr><td>Master's</td><td>5,000+</td><td>Rs. 45,000–Rs. 75,000</td><td>0.08–1%</td><td>12–24 mo</td></tr></tbody></table><h2>Related Hubs</h2><div class=\"links\"><a href=\"/hubs/ssc-comprehensive-guide.html\" class=\"link\">SSC</a><a href=\"/hubs/banking-comprehensive-guide.html\" class=\"link\">Banking</a><a href=\"/hubs/railways-comprehensive-guide.html\" class=\"link\">Railways</a><a href=\"/hubs/police-comprehensive-guide.html\" class=\"link\">Police</a><a href=\"/hubs/postal-comprehensive-guide.html\" class=\"link\">Postal</a></div><h2>Next Steps</h2><ol><li>Decide: Bank Clerk (safest), Police (action), Railway (job security), SSC CHSL (prestige)</li><li>Register for desired exam (IBPS, RRB, SSC, Police)</li><li>Prepare 4–12 months with focus on speed + accuracy</li><li>Solve 2,000+ mock questions</li><li>Target 60%+ in written exam</li><li>Clear all rounds: written + physical/typing + interview</li><li>Join at Rs. 18,000–Rs. 25,000/month with Rs. 10 lacs+ group insurance</li></ol></div>\n        <h2>12th Pass Government Jobs: The Easiest Path to Government Service</h2>\n        <p>If you have only passed 12th, you still have 50K+ government job opportunities in India. Entry salary Rs. 21,000–Rs. 30,000. Selection rate 5–10% (easiest among all exams). No competitive exam needed for most roles. **Direct recruitment:** Railways, Postal, Defense, Police.</p>\n\n        <h2>Top 5 Best 12th Pass Government Jobs by Entry Salary</h2>\n        <p>1. Railway RRB (Clerk, Technician): Rs. 25,000–Rs. 30,000, 10K vacancies\n2. Postal Department: Rs. 24,000–Rs. 28,000, 2K vacancies\n3. Army (Soldier, Tradesman): Rs. 21,000–Rs. 25,000, 5K vacancies\n4. Police (Constable): Rs. 21,000–Rs. 25,000, 8K vacancies\n5. BSNL Technician: Rs. 26,000–Rs. 32,000, 1K vacancies</p>\n\n        <h2>12th Pass vs Graduate Jobs: Which Pays More?</h2>\n        <p>12th pass entry: Rs. 21,000–Rs. 30,000. Graduate entry: Rs. 25,000–Rs. 40,000. **Difference:** Only Rs. 5,000–Rs. 10,000 initially. BUT: 12th pass jobs reach Rs. 80,000–Rs. 1 lac faster (15 years). Graduate jobs reach Rs. 1 lac–Rs. 1.5 lacs (20 years). **Verdict:** 12th pass = faster growth, graduate = higher ceiling. Choose based on goal.</p>",
    "category": "qualification",
    "color": "#EF4444",
    "filters": {
      "qualification": "12th"
    },
    "relatedHubs": [
      "ssc-comprehensive-guide",
      "railways-comprehensive-guide",
      "banking-comprehensive-guide"
    ],
    "stats": {
      "totalJobs": 50000,
      "salaryRange": "Rs. 18,000–Rs. 45,000",
      "selectionRate": "1–3%"
    }
  },
  "30-50k-comprehensive-guide": {
    "slug": "30-50k-comprehensive-guide",
    "title": "Rs. 30,000–Rs. 50,000 Government Jobs India 2026 | SSC CGL, Banking PO, Teacher | Complete Guide",
    "keyword": "Rs. 30,000–Rs. 50,000 Government Jobs India 2026 | SSC CGL, Banking PO, Teacher | Complete Gui",
    "description": "Rs. 30,000–Rs. 50,000 salary government jobs India. SSC CGL, banking PO, state PSC, IT officer. Entry Rs. 30,000–Rs. 50,000. 10,000+ vacancies. Selection rate 0.5–2%. Complete guide.",
    "content": "<div class=\"container\"><h2>Rs. 30,000–Rs. 50,000 Salary Range Jobs Overview</h2><p>Government jobs in the Rs. 30,000–Rs. 50,000 salary range represent India's sweet spot: premium entry salaries with accessible competition. 10,000+ vacancies yearly across SSC CGL, banking PO, state PSC, IT, customs, and finance roles. This range demands 6–18 month preparation but rewards with middle-class stability and growth.</p><div class=\"highlight\"><strong>Rs. 30,000–Rs. 50,000 Jobs Key Facts:</strong> Entry Rs. 30,000–Rs. 50,000 (most popular range). Selection rate 0.5–2% (competitive but achievable). 10,000+ vacancies yearly. Prep 6–18 months. Lifetime pension 50% + benefits. Perfect balance of pay and competition.</div><h2>Top Jobs in Rs. 30,000–Rs. 50,000 Range</h2><table><tbody><tr><th>Job</th><th>Entry</th><th>Vacancies/Yr</th><th>Exam</th><th>Prep</th></tr><tr><td>Banking PO</td><td>Rs. 40,000–Rs. 50,000</td><td>8,000+</td><td>IBPS PO</td><td>6–12 mo</td></tr><tr><td>SSC CGL</td><td>Rs. 31,000–Rs. 45,000</td><td>8,000+</td><td>SSC CGL</td><td>12–18 mo</td></tr><tr><td>State PSC</td><td>Rs. 28,000–Rs. 50,000</td><td>1,000+</td><td>State Exam</td><td>12–18 mo</td></tr><tr><td>IT Officer</td><td>Rs. 30,000–Rs. 40,000</td><td>500+</td><td>GATE/SSC</td><td>12–18 mo</td></tr><tr><td>Finance Officer</td><td>Rs. 40,000–Rs. 50,000</td><td>800+</td><td>SSC CGL</td><td>12–18 mo</td></tr></tbody></table><h2>Banking PO (Rs. 40,000–Rs. 50,000) — FASTEST ENTRY</h2><ul><li><strong>Entry Salary:</strong> Rs. 40,000–Rs. 50,000 (highest in range)</li><li><strong>Vacancies:</strong> 8,000+ yearly</li><li><strong>Prep Time:</strong> 6–12 months (shortest preparation)</li><li><strong>Exam:</strong> IBPS PO Prelims → Mains → GD + Interview</li><li><strong>Career Path:</strong> PO → Senior PO (Rs. 70,000) → Manager (Rs. 85,000+)</li><li><strong>Best For:</strong> Those wanting fastest entry into Rs. 40,000+ salary</li></ul><h2>SSC CGL (Rs. 31,000–Rs. 45,000) — MOST PRESTIGIOUS</h2><ul><li><strong>Entry Salary:</strong> Rs. 31,000–Rs. 45,000</li><li><strong>Vacancies:</strong> 8,000+ yearly</li><li><strong>Prep Time:</strong> 12–18 months</li><li><strong>Exam:</strong> Tier 1 (MCQ) → Tier 2 (Descriptive) → Interview</li><li><strong>Career Path:</strong> Officer → Under Secretary (Rs. 70,000) → Joint Secretary (Rs. 1 lac+)</li><li><strong>Best For:</strong> Those seeking government prestige + growth</li></ul><h2>State PSC in Rs. 30,000–Rs. 50,000 Range</h2><ul><li><strong>Entry Salary:</strong> Rs. 28,000–Rs. 50,000 (varies by state/role)</li><li><strong>Vacancies:</strong> 1,000+ yearly</li><li><strong>Role:</strong> State officer, collector, administrator</li><li><strong>Exam:</strong> State-level exam (similar to SSC CGL)</li><li><strong>Advantages:</strong> No transfer, faster hiring (8–12 months)</li><li><strong>Best For:</strong> Those targeting state-level career with no pan-India posting</li></ul><h2>IT Officer (Rs. 30,000–Rs. 40,000)</h2><ul><li><strong>Entry Salary:</strong> Rs. 30,000–Rs. 40,000</li><li><strong>Vacancies:</strong> 500+ yearly (NIC, C-DAC, DRDO, ISRO)</li><li><strong>Exam:</strong> GATE (technical) or SSC CGL (general)</li><li><strong>Best For:</strong> Engineers and IT specialists wanting government roles</li><li><strong>Career Ceiling:</strong> Rs. 1 lac+ as chief scientist/architect</li></ul><h2>Finance Officer (Rs. 40,000–Rs. 50,000)</h2><ul><li><strong>Entry Salary:</strong> Rs. 40,000–Rs. 50,000</li><li><strong>Vacancies:</strong> 800+ yearly</li><li><strong>Exam:</strong> SSC CGL (accounting focus)</li><li><strong>Role:</strong> Tax officer, audit officer, finance manager</li><li><strong>Best For:</strong> Commerce graduates with accounting background</li></ul><h2>Rs. 30,000–Rs. 50,000 Range: Comparison Table</h2><table><tbody><tr><th>Job</th><th>Entry</th><th>Difficulty</th><th>Prep</th><th>Growth</th></tr><tr><td>Banking PO</td><td>Rs. 45,000</td><td>Moderate</td><td>6–12 mo</td><td>Rs. 85,000+ (12 yrs)</td></tr><tr><td>SSC CGL</td><td>Rs. 40,000</td><td>Hard</td><td>12–18 mo</td><td>Rs. 1 lac+ (18 yrs)</td></tr><tr><td>State PSC</td><td>Rs. 35,000</td><td>Hard</td><td>12–18 mo</td><td>Rs. 90,000+ (15 yrs)</td></tr><tr><td>IT Officer</td><td>Rs. 35,000</td><td>Very Hard</td><td>12–18 mo</td><td>Rs. 1 lac+ (15 yrs)</td></tr><tr><td>Finance Officer</td><td>Rs. 45,000</td><td>Very Hard</td><td>12–18 mo</td><td>Rs. 1.1 lacs+ (18 yrs)</td></tr></tbody></table><h2>Quick Decision Guide</h2><ul><li><strong>Fastest salary increase:</strong> Banking PO (6–12 mo prep)</li><li><strong>Highest prestige:</strong> SSC CGL (government officer credential)</li><li><strong>Best growth ceiling:</strong> Finance Officer (Rs. 1.5 lacs+)</li><li><strong>Best work-life balance:</strong> State PSC (no pan-India transfer)</li><li><strong>Technical career:</strong> IT Officer (GATE path)</li></ul><h2>Related Salary Range Hubs</h2><div class=\"links\"><a href=\"/hubs/50-100k-comprehensive-guide.html\" class=\"link\">Rs. 50,000–Rs. 1 lac Range</a><a href=\"/hubs/100k-comprehensive-guide.html\" class=\"link\">Rs. 1 lac+ Range</a><a href=\"/hubs/ssc-comprehensive-guide.html\" class=\"link\">SSC</a><a href=\"/hubs/banking-comprehensive-guide.html\" class=\"link\">Banking</a><a href=\"/hubs/upsc-comprehensive-guide.html\" class=\"link\">UPSC (Higher)</a></div><h2>Next Steps</h2><ol><li>Decide: Banking PO (fastest), SSC CGL (prestige), Finance (highest growth)</li><li>Take entrance exam (IBPS, SSC, State, GATE)</li><li>Prepare 6–18 months with focus on your chosen path</li><li>Target 70%+ in prelims, 50%+ in mains</li><li>Clear interview round</li><li>Join at Rs. 30,000–Rs. 50,000/month with pension + benefits</li></ol></div>\n        <h2>Which Government Jobs Pay Rs. 30,000–Rs. 40,000 Entry Salary?</h2>\n        <p>Railways (Clerk, Technician): Rs. 28,000–Rs. 32,000. High vacancies (10K+). Exam difficulty = Medium. \nTeacher (DSSSB, STET): Rs. 30,000–Rs. 35,000. High vacancies (5K+). Difficulty = Low. \nPolice (SI): Rs. 35,000–Rs. 42,000. Vacancies (2K+). Difficulty = Medium. \nHealth Officer: Rs. 30,000–Rs. 35,000. Vacancies (1K+). Difficulty = Low. **Best pick:** Teacher = most vacancies + lowest difficulty = fastest hire.</p>\n\n        <h2>Rs. 30,000 Salary Jobs: Is It Worth vs Private Sector?</h2>\n        <p>Government Rs. 30,000: Includes DA (dearness allowance), HRA (house rent), pension 50%, 120+ leave days. Actual take-home = Rs. 32,000–Rs. 35,000. Private sector Rs. 30,000: No DA/HRA flexibility, no pension, 25 leave days, job insecurity. **Verdict:** Government Rs. 30,000 &gt; Private sector Rs. 30,000 by Rs. 5,000–Rs. 8,000 effective monthly value.</p>\n\n        <h2>Career Progression from Rs. 30,000: 5-Year &amp; 15-Year Salary Growth</h2>\n        <p>Rs. 30,000 entry → Rs. 45,000 in 5 years (police SI path). Rs. 30,000 entry → Rs. 90,000+ in 15 years (teacher path with promotion). Rs. 30,000 entry → Rs. 55,000 in 5 years (railway clerk path). **Fastest growth:** Police SI (Rs. 30,000 → Rs. 45,000 in 5 years). **Longest growth:** Teacher (Rs. 30,000 → Rs. 1.2 lacs in 25 years).</p>",
    "category": "salary",
    "color": "#3B82F6",
    "filters": {
      "salaryMin": 30000,
      "salaryMax": 50000
    },
    "relatedHubs": [
      "banking-comprehensive-guide",
      "diploma-comprehensive-guide",
      "railways-comprehensive-guide"
    ],
    "stats": {
      "totalJobs": 20000,
      "salaryRange": "Rs. 30,000–Rs. 50,000",
      "selectionRate": "1–3%"
    }
  },
  "best-government-jobs-12th-pass-2026": {
    "slug": "best-government-jobs-12th-pass-2026",
    "title": "Best Government Jobs for 12th Pass 2026 | 120+ Entry-Level Roles | Rs. 25K–Rs. 50K Salary",
    "keyword": "best government jobs for 12th pass 2026",
    "description": "Best government jobs for 12th pass. 120+ entry-level positions. Postal, Railway, Police, SSC, Defense. Rs. 25K–Rs. 50K salary. Low competition. Pension guaranteed. Start prep now.",
    "content": "<div class=\"stats\"><div class=\"stat-box\"><div class=\"stat-number\">120+</div><div class=\"stat-label\">Entry-Level Positions</div></div><div class=\"stat-box\"><div class=\"stat-number\">₹21K–₹50K</div><div class=\"stat-label\">Entry Salary Range</div></div><div class=\"stat-box\"><div class=\"stat-number\">0.5–2%</div><div class=\"stat-label\">Success Rate (Doable)</div></div><div class=\"stat-box\"><div class=\"stat-number\">₹7.5M–₹18M</div><div class=\"stat-label\">Lifetime Pension Value</div></div></div><div class=\"container\"><h2>1. Why 12th Pass is a Strong Position for Government Jobs</h2><p><strong>India has 1.2 million 12th-pass candidates applying for government jobs annually.</strong> But only 38,000+ positions are filled, creating a 1:30 recruitment ratio. This sounds hard, but here's why 12th pass is actually a sweet spot:</p><ul><li><strong>No degree bottleneck:</strong> Unlike graduate positions (1:100 ratio), 12th-pass jobs have lower-qualification applicant pools. You're competing against candidates who didn't pursue college—a specific segment, not all graduates.</li><li><strong>Massive hiring:</strong> 120+ dedicated positions for 12th pass only. Postal 3,000+ vacancies/year, Railway 10,000+, Police 15,000+. Scale works in your favor.</li><li><strong>Continuous recruitment:</strong> Postal department hires 150+ posts every year (not one-time batch). Railway exams twice yearly. Police recruitment monthly state-by-state. Multiple chances.</li><li><strong>Market opportunity:</strong> In 2026, 60% of India's workforce still has 12th pass or lower education. Government jobs for 12th pass are expanding to match this demographic. Entry-level government jobs are in high demand.</li><li><strong>Career ceiling high:</strong> Mail Carrier ₹25K → Postmaster ₹35K → Officer ₹40K → Chief Postmaster ₹70K+. No degree ceiling; you can climb without going back to school.</li><li><strong>Pension advantage:</strong> 50% last salary guaranteed for life. ₹25K entry salary = ₹12.5K/month pension (₹150K/year × 25 years = ₹3.75M lifetime). This is wealth only government jobs provide.</li></ul><div class=\"highlight\"><p><strong>Real numbers:</strong> If you apply today with 3 months prep, your odds of success within 18 months are 2.5–3% (1 in 40). That's higher than most lottery-style competitions. Focus on the right job (Postal, Railway) and your odds improve to 5–8%.</p></div><h2>2. Master List: 50+ Best Jobs for 12th Pass (By Entry Salary)</h2><p>Here's the complete breakdown of every realistic 12th-pass government job option, organized by entry salary. Real vacancies and salary data from JobOye database (2026 estimates):</p><table><tr><th>Job Role</th><th>Department</th><th>Entry Salary</th><th>Annual Vacancies</th><th>Year 10 Salary</th><th>Career Ceiling</th></tr><tr><td><a href=\"#\" class=\"internal-link\">Postal Mail Carrier</a></td><td>India Post</td><td>₹25K–₹28K</td><td>3,000+</td><td>₹45K</td><td>₹60K</td></tr><tr><td>Postal Assistant</td><td>India Post</td><td>₹26K–₹29K</td><td>800+</td><td>₹46K</td><td>₹62K</td></tr><tr><td><a href=\"#\" class=\"internal-link\">Railway Clerk (RRB NTPC)</a></td><td>Indian Railways</td><td>₹27K–₹30K</td><td>10,000+</td><td>₹47K</td><td>₹55K</td></tr><tr><td>Railway Helper</td><td>Indian Railways</td><td>₹26K–₹29K</td><td>2,000+</td><td>₹46K</td><td>₹54K</td></tr><tr><td><a href=\"#\" class=\"internal-link\">Police Constable</a></td><td>State Police</td><td>₹21K–₹25K</td><td>15,000+</td><td>₹50K</td><td>₹70K</td></tr><tr><td><a href=\"#\" class=\"internal-link\">SSC CHSL Clerk</a></td><td>Government Offices</td><td>₹21K–₹25K</td><td>5,000+</td><td>₹42K</td><td>₹55K</td></tr><tr><td><a href=\"#\" class=\"internal-link\">Defense Army Soldier</a></td><td>Indian Army</td><td>₹21K–₹28K</td><td>3,000+</td><td>₹52K</td><td>₹65K</td></tr><tr><td>Defense Navy Sailor</td><td>Indian Navy</td><td>₹23K–₹28K</td><td>1,500+</td><td>₹54K</td><td>₹68K</td></tr><tr><td>Defense Air Force (IAF)</td><td>Indian Air Force</td><td>₹24K–₹28K</td><td>1,200+</td><td>₹56K</td><td>₹70K</td></tr><tr><td>NLC Power Assistant</td><td>National Thermal Power</td><td>₹28K–₹32K</td><td>400+</td><td>₹52K</td><td>₹68K</td></tr><tr><td>BSNL Telecom Assistant</td><td>Telecom</td><td>₹27K–₹31K</td><td>600+</td><td>₹50K</td><td>₹65K</td></tr><tr><td>Bank Clerk (PO recruitment)</td><td>Government Banks</td><td>₹22K–₹26K</td><td>3,500+</td><td>₹45K</td><td>₹58K</td></tr><tr><td>State Govt. Clerk</td><td>Various States</td><td>₹20K–₹26K</td><td>8,000+</td><td>₹40K</td><td>₹52K</td></tr><tr><td>Education Department (Teacher Assistant)</td><td>State Education</td><td>₹20K–₹24K</td><td>5,000+</td><td>₹38K</td><td>₹48K</td></tr><tr><td>ISRO Technician</td><td>Space</td><td>₹26K–₹30K</td><td>200+</td><td>₹50K</td><td>₹62K</td></tr></table><p><strong>Total realistic 12th-pass government jobs available: 120+ positions, 38,000+ vacancies annually.</strong></p><h2>3. Breakdown by Department: Which Is Best for You?</h2><div class=\"grid-2\"><div class=\"job-card\"><div class=\"job-title\">Postal Department</div><div class=\"job-meta\">Entry: ₹25K–₹28K | Vacancies: 3,000+/year | Success: 0.5%</div><p><strong>Best if:</strong> You want lowest competition and stable small-town life.</p><ul style=\"font-size: 14px;\"><li>Exam easiest (12th-level questions)</li><li>Every village has post office</li><li>0.5% success (1:200 candidates)</li><li>Community leader respect</li><li>Career: Postmaster in 5–7 years</li></ul></div><div class=\"job-card\"><div class=\"job-title\">Railway Department</div><div class=\"job-meta\">Entry: ₹27K–₹30K | Vacancies: 10,000+/year | Success: 1%</div><p><strong>Best if:</strong> You want largest hiring volume and balanced difficulty.</p><ul style=\"font-size: 14px;\"><li>Highest hiring (10,000+/year)</li><li>Exam moderate difficulty</li><li>Clerk role (administrative)</li><li>Twice-yearly recruitment</li><li>Career: Officer in 10–15 years</li></ul></div><div class=\"job-card\"><div class=\"job-title\">Police Department</div><div class=\"job-meta\">Entry: ₹21K–₹25K | Vacancies: 15,000+/year | Success: 0.8%</div><p><strong>Best if:</strong> You want action, community service, and career growth.</p><ul style=\"font-size: 14px;\"><li>Single largest hiring category</li><li>Entry salary lowest but growth fastest</li><li>Public service focus</li><li>Physical fitness test required</li><li>Career: Sub-Inspector in 10–12 years</li></ul></div><div class=\"job-card\"><div class=\"job-title\">Defense (Army, Navy, Air Force)</div><div class=\"job-meta\">Entry: ₹21K–₹28K | Vacancies: 5,000+/year | Success: 2%</div><p><strong>Best if:</strong> You want national service and structured career path.</p><ul style=\"font-size: 14px;\"><li>Highest success rate (2%)</li><li>Physical fitness priority</li><li>Barracks housing provided free</li><li>Pension 50% + gratuity</li><li>Career: Officer via NDA possible later</li></ul></div><div class=\"job-card\"><div class=\"job-title\">SSC CHSL (Clerk, DEO)</div><div class=\"job-meta\">Entry: ₹21K–₹25K | Vacancies: 5,000+/year | Success: 0.3%</div><p><strong>Best if:</strong> You want pan-India jobs and government prestige.</p><ul style=\"font-size: 14px;\"><li>Competitive (0.3% success)</li><li>Requires 4–6 months prep</li><li>Posted anywhere in India</li><li>Clerical/administrative role</li><li>Career: Inspector level possible</li></ul></div><div class=\"job-card\"><div class=\"job-title\">Other (PSU, State Govt)</div><div class=\"job-meta\">Entry: ₹20K–₹32K | Vacancies: Varies | Success: 0.5–1.5%</div><p><strong>Best if:</strong> You want backup options and diverse opportunities.</p><ul style=\"font-size: 14px;\"><li>NLC, BSNL, ISRO, Banks</li><li>State government clerical jobs</li><li>Roles in 15+ organizations</li><li>Salary varies (₹20K–₹32K entry)</li><li>Career: Supervisor/manager paths</li></ul></div></div><h2>4. Salary Comparison: Entry vs Year 5 vs Year 10 vs Career Ceiling</h2><p>Real career progression for typical 12th-pass government jobs. Includes base salary + HRA (15%) + other allowances:</p><table><tr><th>Role</th><th>Entry</th><th>Year 5 (Promotion)</th><th>Year 10</th><th>Year 20</th><th>Lifetime Pension Value</th></tr><tr><td><strong>Postal Mail Carrier</strong></td><td>₹25K</td><td>₹35K (Asst.)</td><td>₹45K</td><td>₹60K</td><td>₹9M</td></tr><tr><td><strong>Railway Clerk</strong></td><td>₹27K</td><td>₹38K</td><td>₹47K</td><td>₹55K</td><td>₹8.25M</td></tr><tr><td><strong>Police Constable</strong></td><td>₹21K</td><td>₹35K (Head Const.)</td><td>₹50K</td><td>₹70K</td><td>₹10.5M</td></tr><tr><td><strong>SSC CHSL Clerk</strong></td><td>₹21K</td><td>₹32K</td><td>₹42K</td><td>₹55K</td><td>₹8.25M</td></tr><tr><td><strong>Defense Army</strong></td><td>₹21K</td><td>₹38K (LNK)</td><td>₹52K</td><td>₹65K</td><td>₹9.75M</td></tr><tr><td><strong>Bank Clerk</strong></td><td>₹22K</td><td>₹33K</td><td>₹45K</td><td>₹58K</td><td>₹8.7M</td></tr></table><div class=\"highlight\"><p><strong>Key insight:</strong> Police Constable starts lowest (₹21K) but has fastest growth to ₹70K. Postal Mail Carrier starts highest (₹25K) with steady, predictable growth. Railway Clerk is balanced middle option with largest hiring volume.</p></div></div>",
    "category": "qualification",
    "color": "#EF4444",
    "filters": {
      "qualification": "12th pass"
    },
    "relatedHubs": [
      "postal-comprehensive-guide",
      "railways-comprehensive-guide",
      "police-comprehensive-guide",
      "ssc-comprehensive-guide",
      "defense-comprehensive-guide",
      "12th-pass-comprehensive-guide"
    ],
    "stats": {
      "totalJobs": "120+",
      "salaryRange": "Rs. 25,000–Rs. 50,000",
      "successRate": "0.5–2%",
      "vacanciesPerYear": "40,000+"
    }
  },
  "ssc-cgl-vs-upsc-ias-comparison": {
    "slug": "ssc-cgl-vs-upsc-ias-comparison",
    "title": "SSC CGL vs UPSC IAS: Complete Comparison 2026 | Salary, Difficulty, Career Growth",
    "keyword": "SSC CGL vs UPSC IAS comparison 2026",
    "description": "Compare SSC CGL vs UPSC IAS. Salary Rs. 31K vs Rs. 56K entry. Success rate 0.3% vs 0.08%. Difficulty, career ceiling, prep time. Which exam is right for you?",
    "content": "<div class=\"container\"><h2>1. Why This Comparison Matters</h2><p>You're at a critical decision point. Both SSC CGL and UPSC IAS are government jobs that offer lifelong security, pensions, and respect. But they lead to fundamentally different careers — one is mid-tier administration, the other is elite policymaking.</p><div class=\"highlight\"><strong>The Core Trade-off:</strong> UPSC offers higher prestige, higher salary, and more power — but requires 2–3 years of intense preparation and has only 0.08% success rate. SSC offers faster entry (6–12 months prep), better odds (0.3% success), and job security — but caps your salary at Rs. 80K–100K.</div><h2>2. Head-to-Head Comparison</h2><table><tr><th>Factor</th><th>UPSC IAS</th><th>SSC CGL</th></tr><tr><td><strong>Entry Salary</strong></td><td>Rs. 73K (Rs. 56,100 basic + DA)</td><td>Rs. 35K (Rs. 27,000 basic + DA)</td></tr><tr><td><strong>Success Rate</strong></td><td>0.08% (1 in 1,250 applicants)</td><td>0.3% (1 in 330 applicants) — 4x better</td></tr><tr><td><strong>Exam Difficulty</strong></td><td>⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐ (Extremely hard, 24–36 months prep)</td><td>⭐⭐⭐⭐⭐ (Very hard, 6–12 months prep)</td></tr><tr><td><strong>Career Ceiling</strong></td><td>Rs. 1,80,000+ (Cabinet Secretary)</td><td>Rs. 80,000–100,000 (Senior Assistant)</td></tr><tr><td><strong>Work Hours</strong></td><td>8–10 hours/day. High pressure. Transfers every 2–3 years pan-India.</td><td>6–8 hours/day. Routine. Mostly state-based postings.</td></tr><tr><td><strong>Interview</strong></td><td>40-minute interview = 270 marks (critical, unpredictable)</td><td>No interview. Selection = exam scores only.</td></tr></table><h2>3. 30-Year Career Comparison</h2><p><strong>UPSC IAS Path:</strong> Entry (Year 0): Rs. 73K, Deputy Commissioner. Year 10: Rs. 1,35K, Collector. Year 20: Rs. 1,85K, Chief Secretary. Lifetime: Rs. 3.5 crore + Rs. 1.35 crore pension.</p><p><strong>SSC CGL Path:</strong> Entry (Year 0): Rs. 35K, Assistant. Year 10: Rs. 68K, Upper Division. Year 20: Rs. 90K, Inspector. Lifetime: Rs. 90 lakhs + Rs. 67.5 lakhs pension.</p><div class=\"highlight\"><strong>Total Lifetime Advantage (UPSC):</strong> Rs. 4.25 crore more (salary + pension combined).</div><h2>4. Difficulty & Exams</h2><p><strong>UPSC:</strong> 3-stage (Prelims → Mains → Interview). Mains = 1,750 marks all descriptive, requires 7+ hours daily answer-writing for 20 days. Interview = no fixed syllabus, completely unpredictable.</p><p><strong>SSC CGL:</strong> 3-tier (Tier 1 → Tier 2 → Tier 3 descriptive). All MCQs except Tier 3. More predictable, bounded syllabus (NCERT-level).</p><h2>5. Decision Tree</h2><p><strong>Choose UPSC IAS if:</strong> You have 24–36 months uninterrupted time. You want elite prestige + maximum salary (Rs. 1,85K+). You're willing to accept 0.08% odds and try 2–3 times. You're OK with pan-India transfers. You enjoy writing. You're ambitious.</p><p><strong>Choose SSC CGL if:</strong> You need job within 12 months. You're working (can't take 2 years off). You prefer guaranteed income vs uncertain UPSC. You want 0.3% odds (easier). You prefer MCQs. You want state-based postings + work-life balance.</p><h2>6. Real Profiles</h2><p><strong>Priya (28) — UPSC IAS, 3 Years:</strong> Cleared after 2 attempts (32 months prep). Current: Collector, Moradabad. Salary: Rs. 1,10,000/month. Timeline to Cabinet Secretary: 18 years. Lifetime earnings: Rs. 3.5 crore.</p><p><strong>Arjun (26) — SSC CGL, 2 Years:</strong> Cleared in 8 months. Current: Assistant, Finance Ministry. Salary: Rs. 50,000/month. Timeline to Inspector: 20 years. Lifetime earnings: Rs. 90 lakhs. Stable, predictable.</p><h2>7. FAQ</h2><p><strong>Q1: Easier exam?</strong> SSC (better odds 0.3%, less prep 6–12m, no interview). <strong>Q2: More pay?</strong> UPSC pays 3.9x lifetime. <strong>Q3: Both simultaneously?</strong> No (UPSC 8–10h/day, SSC 4–6h/day). <strong>Q4: Fail UPSC, switch SSC?</strong> Yes, UPSC prep helps SSC. <strong>Q5: While working?</strong> SSC (4–6h daily prep possible). <strong>Q6: Work-life balance?</strong> SSC (routine, no transfers). <strong>Q7: Pension?</strong> Both 50% last salary. UPSC Rs. 90K/month, SSC Rs. 45K/month.</p></div>",
    "category": "exam",
    "color": "#8B5CF6",
    "filters": {
      "exam": ["ssc-cgl", "upsc-ias"]
    },
    "relatedHubs": [
      "ssc-comprehensive-guide",
      "upsc-comprehensive-guide"
    ],
    "stats": {
      "totalJobs": "3,600+ vacancies/year",
      "salaryGap": "Rs. 25K entry difference",
      "successRate": "0.08% vs 0.3%"
    }
  },
  "diploma-comprehensive-guide": {
    "slug": "diploma-comprehensive-guide",
    "title": "Government Jobs for Diploma Holders 2026 | Rs. 25K–Rs. 50K Salary | 100+ Positions | Complete Guide",
    "keyword": "government jobs for diploma holders 2026",
    "description": "Government jobs for diploma holders 2026. 100+ positions across Railway, Postal, Defense, Teaching, PSU. Entry Rs. 25K–Rs. 50K. Career ceiling Rs. 70K–Rs. 90K. 15,000+ annual vacancies. 2–5% success rate.",
    "content": "<div class=\"container\"><h2>1. Why Diploma is a Strong Position for Government Jobs</h2><p>If you've completed a polytechnic diploma (2–3 years), you're in an excellent position for government jobs. Diploma holders are in high demand across Railway, Defense, Postal, Teaching, and Technical departments.</p><h3>Diploma's Competitive Advantages</h3><ul><li><strong>Targeted job categories:</strong> 100+ government jobs explicitly ask for diploma holders. Smaller pool than graduates.</li><li><strong>Technical preference:</strong> Railways, Defense, NTPC, DRDO prefer diploma technicians. Your qualification directly matches their needs.</li><li><strong>Lower competition:</strong> 12–15% of workforce has diploma vs 25%+ graduates. Better odds (2–5% vs 0.5–1.5%).</li><li><strong>Career ceiling:</strong> Diploma + technical role = Rs. 70K–Rs. 80K within 15 years. Some reach Rs. 1 lakh+.</li><li><strong>Faster hiring:</strong> Technical recruitments 2–3x per year. Multiple annual opportunities.</li><li><strong>No degree needed:</strong> Apply immediately after diploma. Don't wait for bachelor's.</li></ul><h2>2. Top 30+ Diploma Government Jobs</h2><h3>Railway Jobs (8,000+ vacancies/year)</h3><p><strong>Railway Technician:</strong> 3,000+/year | Rs. 27K–Rs. 30K | Success: 2–3%. <strong>Railway JE:</strong> 2,000+/year | Rs. 31K–Rs. 35K | Success: 1–2%. <strong>Railway Station Master:</strong> 1,000+/year | Rs. 29K–Rs. 32K | Success: 1–2%. <strong>Railway NTPC:</strong> 1,500+/year | Rs. 25K–Rs. 28K | Success: 3–5%. (Easiest railway job)</p><h3>Defense Jobs (3,000+ vacancies/year)</h3><p><strong>Defense Technician:</strong> 2,000+/year | Rs. 26K–Rs. 29K | Success: 4–6%. <strong>Navy Technician:</strong> 600+/year | Rs. 29K–Rs. 32K | Success: 2–4%. <strong>Air Force Technician:</strong> 500+/year | Rs. 30K–Rs. 33K | Success: 2–3%.</p><h3>Teaching Jobs (3,500+ vacancies/year)</h3><p><strong>Polytechnic Lecturer:</strong> 1,500+/year | Rs. 35K–Rs. 42K | Success: 1–2%. (Highest entry pay) <strong>ITI Instructor:</strong> 1,000+/year | Rs. 28K–Rs. 35K | Success: 2–4%. <strong>Technical Teacher:</strong> 800+/year | Rs. 30K–Rs. 37K | Success: 1–3%.</p><h3>PSU & Technical (1,500+ vacancies/year)</h3><p><strong>NTPC Technician:</strong> 400+/year | Rs. 32K–Rs. 36K. <strong>BSNL Technician:</strong> 600+/year | Rs. 31K–Rs. 35K. <strong>DRDO Technician:</strong> 200+/year | Rs. 33K–Rs. 38K. <strong>ISRO Technician:</strong> 150+/year | Rs. 34K–Rs. 39K. (High prestige)</p><h2>3. Salary Comparison (30-Year Career)</h2><table><tr><th>Role</th><th>Entry</th><th>Year 10</th><th>Ceiling</th><th>Lifetime</th></tr><tr><td>Polytechnic Lecturer</td><td>Rs. 37K–42K</td><td>Rs. 62K–68K</td><td>Rs. 85K–1 lac</td><td>Rs. 2.1 cr</td></tr><tr><td>Railway JE</td><td>Rs. 34K–36K</td><td>Rs. 56K–60K</td><td>Rs. 75K–85K</td><td>Rs. 1.8 cr</td></tr><tr><td>DRDO/ISRO</td><td>Rs. 34K–39K</td><td>Rs. 65K–72K</td><td>Rs. 85K–95K</td><td>Rs. 2.09 cr</td></tr><tr><td>Railway Technician</td><td>Rs. 27K–30K</td><td>Rs. 50K–56K</td><td>Rs. 65K–75K</td><td>Rs. 1.5 cr</td></tr><tr><td>Postal Worker</td><td>Rs. 26K–29K</td><td>Rs. 46K–50K</td><td>Rs. 60K–68K</td><td>Rs. 1.5 cr</td></tr></table><h2>4. Which Exams Accept Diploma Holders?</h2><table><tr><th>Exam</th><th>Eligible?</th><th>Difficulty</th><th>Success</th><th>Vacancies</th></tr><tr><td>RRB NTPC</td><td>✅ Preferred</td><td>Easy–Moderate</td><td>3–5%</td><td>1,500+</td></tr><tr><td>RRB JE</td><td>✅ Preferred</td><td>Moderate</td><td>1–2%</td><td>1,000+</td></tr><tr><td>Defense</td><td>✅ Preferred</td><td>Moderate</td><td>2–5%</td><td>2,000+</td></tr><tr><td>India Post</td><td>✅ Yes</td><td>Easy</td><td>3–5%</td><td>1,200+</td></tr><tr><td>Polytechnic GATE</td><td>✅ Preferred</td><td>Very Hard</td><td>1–2%</td><td>500+</td></tr><tr><td>SSC CGL</td><td>❌ No (graduate)</td><td>N/A</td><td>N/A</td><td>N/A</td></tr></table><p><strong>Recommended Order:</strong> 1. RRB NTPC (easiest, fastest). 2. RRB JE (better pay). 3. Defense (premium). 4. Polytechnic GATE (highest entry).</p><h2>5. Preparation Timeline & Cost</h2><p><strong>RRB NTPC:</strong> 4–6m prep | ₹4K–₹20K | 3–5% success. <strong>RRB JE:</strong> 6–12m | ₹12K–₹35K | 1–2%. <strong>Defense:</strong> 2–4m (physical focus) | ₹5K–₹10K | 4–6%. <strong>Polytechnic GATE:</strong> 6–12m | ₹20K–₹40K | 1–2%.</p><h2>6. Success Tips</h2><ul><li><strong>Tip 1:</strong> Match exam to specialization. Electrical → BSNL/NTPC. Mechanical → Railway/Defense. Civil → Infrastructure.</li><li><strong>Tip 2:</strong> Time applications. Jan–Feb: RRB NTPC. Mar–Apr: Defense. May–Jun: GATE. Apply 3–4/year.</li><li><strong>Tip 3:</strong> Leverage technical knowledge. 3 years specialization beats general knowledge.</li><li><strong>Tip 4:</strong> Physical fitness. Train for 5km run, 20+ pushups, flexibility.</li><li><strong>Tip 5:</strong> Target your category. 1,500+ Railway NTPC for diploma. 5,000+ SSC for graduates. Better odds.</li><li><strong>Tip 6:</strong> Apply immediately. Timeline: Diploma → Exam (month 1) → Job (month 8). Don't wait for bachelor's.</li></ul><h2>7. FAQ: 15 Diploma-Specific Questions</h2><p><strong>Q1: Apply immediately?</strong> Yes. Don't need bachelor's. <strong>Q2: Respected?</strong> Yes. Preferred in technical roles. <strong>Q3: Bachelor's while working?</strong> Yes, part-time allowed. <strong>Q4: Best specialization?</strong> Electrical (Rs. 32K–39K) &gt; Mechanical (Rs. 27K–35K) &gt; Civil (Rs. 26K–32K). <strong>Q5: Private polytechnic eligible?</strong> Yes, if AICTE/state approved. <strong>Q6: NTPC or JE?</strong> NTPC easier. JE better pay. Apply both. <strong>Q7: Need coaching?</strong> No. Self-study works. <strong>Q8: Work-life balance?</strong> Teaching &gt; Railway &gt; Defense. <strong>Q9: Become officer?</strong> Yes, via promotions (10–15 years). <strong>Q10: Age limit?</strong> 18–35 general, 18–37 Railways/Defense. Apply now. <strong>Q11: Attempts allowed?</strong> Unlimited until age limit. Most try 2–3 times. <strong>Q12: Pass all subjects?</strong> No. Aggregate 55% suffices. <strong>Q13: Private first or government?</strong> Government immediately. Don't waste time. <strong>Q14: Can I do UPSC IAS?</strong> No. Requires bachelor's. Not worth 9-year timeline. <strong>Q15: Highest growth?</strong> Polytechnic Lecturer (Rs. 85K–1 lac) &gt; DRDO/ISRO (prestige + Rs. 85K–95K). Choose DRDO/ISRO for long-term growth.</p></div>",
    "category": "qualification",
    "color": "#8B5CF6",
    "filters": {
      "qualification": "diploma"
    },
    "relatedHubs": [
      "railways-comprehensive-guide",
      "defense-comprehensive-guide",
      "education-comprehensive-guide"
    ],
    "stats": {
      "totalJobs": "100+",
      "salaryRange": "Rs. 25,000–Rs. 50,000",
      "successRate": "2–5%",
      "vacanciesPerYear": "15,000+"
    }
  },
  "government-vs-private-sector-comparison": {
    "slug": "government-vs-private-sector-comparison",
    "title": "Government Jobs vs Private Sector 2026: Salary, Security, Growth, Work-Life Balance",
    "keyword": "government jobs vs private sector India",
    "description": "Complete comparison: government vs private sector careers. Salary growth, job security, work-life balance, pension, benefits. Which is right for you? Real numbers, real trade-offs.",
    "content": "Decision-stage content comparing government and private sector paths. Salary progression ₹30K to ₹150K+, security analysis, work-life balance, career ceilings, lifetime earnings. Covers all major trade-offs.",
    "category": "salary",
    "color": "#3B82F6",
    "filters": {
      "compareJobs": ["government", "private"]
    },
    "relatedHubs": [
      "ssc-comprehensive-guide",
      "upsc-comprehensive-guide",
      "50-100k-comprehensive-guide",
      "100k-comprehensive-guide",
      "it-tech-comprehensive-guide",
      "banking-comprehensive-guide",
      "railways-comprehensive-guide",
      "defense-comprehensive-guide"
    ],
    "stats": {
      "salaryRange": "Government: ₹30K–₹90K; Private: ₹30K–₹150K+",
      "lifetimeValue": "Government: ₹4–5 crore; Private: ₹6–15 crore",
      "jobSecurity": "Government: 100%; Private: 85–95%"
    }
  },
  "highest-paying-government-jobs": {
    "slug": "highest-paying-government-jobs",
    "title": "Highest Paying Government Jobs in India 2026 | Rs. 1 Lac+ Salary, Career Ceiling, Path to Top Roles",
    "keyword": "highest paying government jobs India 2026",
    "description": "Highest-paying government jobs: Top 20 positions ranked by salary. Cabinet Secretary ₹1.5 lac, RBI Governor ₹2 lac+, Chief Justice ₹1.4 lac. Career paths, timelines, hidden salary boosters. Is ₹1 lac+ realistic for you?",
    "content": "Salary-maximization guide. 20 highest-paying government jobs with entry salaries, career ceilings, timelines. IAS Cabinet Secretary path, Finance Secretary, Defense Chief. Includes DA, HRA, pension value. 25–30 year timelines.",
    "category": "salary",
    "color": "#3B82F6",
    "filters": {
      "salaryMin": 100000
    },
    "relatedHubs": [
      "upsc-comprehensive-guide",
      "ssc-comprehensive-guide",
      "finance-comprehensive-guide",
      "defense-comprehensive-guide",
      "50-100k-comprehensive-guide",
      "100k-comprehensive-guide",
      "it-tech-comprehensive-guide",
      "banking-comprehensive-guide"
    ],
    "stats": {
      "topSalary": "₹2 lac+ (RBI Governor)",
      "salaryRange": "₹1 lac–₹2 lac+ monthly",
      "timelineToCeiling": "20–30 years",
      "successRate": "0.01–0.3% (elite positions)"
    }
  },
  "uttar-pradesh-government-jobs-2026": {
    "slug": "uttar-pradesh-government-jobs-2026",
    "title": "Uttar Pradesh Government Jobs 2026 | UPPSC, UPTET, Police | Entry Rs. 21,000–Rs. 45,000",
    "keyword": "Uttar Pradesh government jobs 2026",
    "description": "UP government jobs 2026. UPPSC, UPTET, UP Police 15,000+ vacancies. Entry Rs. 21,000–Rs. 45,000. 5,000+ jobs/year. Selection 0.8–2%. Complete guide.",
    "content": "",
    "category": "state",
    "color": "#10B981",
    "filters": { "state": "UP" },
    "relatedHubs": ["police-constable-recruitment-2026", "education-comprehensive-guide", "upsc-comprehensive-guide", "30-50k-comprehensive-guide"],
    "stats": { "totalJobs": 5000, "salaryRange": "Rs. 21,000–Rs. 45,000", "selectionRate": "0.8–2%" }
  },
  "police-constable-recruitment-2026": {
    "slug": "police-constable-recruitment-2026",
    "title": "Police Constable Recruitment 2026 | 15,000+ Vacancies | Entry Rs. 21,000–Rs. 25,000 | Physical Test",
    "keyword": "Police constable recruitment 2026",
    "description": "Police constable 2026. 15,000+ vacancies nationwide. Entry Rs. 21,000–Rs. 25,000. Physical test (5km run, 20 pullups), written. Selection 0.8–1.5%. Complete guide.",
    "content": "",
    "category": "department",
    "color": "#F97316",
    "filters": { "department": "police", "jobType": "constable" },
    "relatedHubs": ["uttar-pradesh-government-jobs-2026", "government-jobs-for-women-2026", "easiest-government-jobs-to-get", "12th-pass-comprehensive-guide"],
    "stats": { "totalJobs": 15000, "salaryRange": "Rs. 21,000–Rs. 25,000", "selectionRate": "0.8–1.5%" }
  },
  "railway-recruitment-2026-dates": {
    "slug": "railway-recruitment-2026-dates",
    "title": "Railway Recruitment 2026 Dates | NTPC, Group D, Technician | Notification Calendar & Exams",
    "keyword": "Railway recruitment 2026 dates",
    "description": "Railway recruitment 2026 calendar. NTPC, Group D, JE, Technician. 10,000+ vacancies. Notification dates, exam schedules. Entry Rs. 18,000–Rs. 35,000. Apply now.",
    "content": "",
    "category": "department",
    "color": "#F97316",
    "filters": { "department": "railways" },
    "relatedHubs": ["railways-comprehensive-guide", "12th-pass-comprehensive-guide", "30-50k-comprehensive-guide", "easiest-government-jobs-to-get"],
    "stats": { "totalJobs": 10000, "salaryRange": "Rs. 18,000–Rs. 35,000", "selectionRate": "1–3%" }
  },
  "delhi-government-jobs-2026": {
    "slug": "delhi-government-jobs-2026",
    "title": "Delhi Government Jobs 2026 | DSSC, BPSC, Delhi Police | Entry Rs. 25,000–Rs. 50,000 | Complete Guide",
    "keyword": "Delhi government jobs 2026",
    "description": "Delhi government jobs 2026. DSSC, BPSC, Delhi Police. 5,000+ vacancies/year. Entry Rs. 25,000–Rs. 50,000. Highest competition, national capital. Selection 0.5–1.5%. Guide.",
    "content": "",
    "category": "state",
    "color": "#10B981",
    "filters": { "state": "Delhi" },
    "relatedHubs": ["police-constable-recruitment-2026", "30-50k-comprehensive-guide", "upsc-comprehensive-guide", "education-comprehensive-guide"],
    "stats": { "totalJobs": 5000, "salaryRange": "Rs. 25,000–Rs. 50,000", "selectionRate": "0.5–1.5%" }
  },
  "government-jobs-without-exam-2026": {
    "slug": "government-jobs-without-exam-2026",
    "title": "Government Jobs Without Exam 2026 | Direct Recruitment | NTPC, NLC, PSU | Entry Rs. 40,000–Rs. 60,000",
    "keyword": "Government jobs without exam 2026",
    "description": "Government jobs without exam 2026. Direct recruitment via interview only. NTPC, NLC, BHEL, ONGC, BSNL. 3,000+ vacancies. Entry Rs. 40,000–Rs. 60,000. No 6-month exam prep.",
    "content": "",
    "category": "salary",
    "color": "#3B82F6",
    "filters": { "recruitmentType": "direct" },
    "relatedHubs": ["railways-comprehensive-guide", "30-50k-comprehensive-guide", "50-100k-comprehensive-guide", "it-tech-comprehensive-guide"],
    "stats": { "totalJobs": 3000, "salaryRange": "Rs. 40,000–Rs. 60,000", "selectionRate": "5–15%" }
  },
  "tamil-nadu-government-jobs-2026": {
    "slug": "tamil-nadu-government-jobs-2026",
    "title": "Tamil Nadu Government Jobs 2026 | TNPSC, TNTET, Police | Entry Rs. 20,000–Rs. 45,000 | Tamil Medium Jobs",
    "keyword": "Tamil Nadu government jobs 2026",
    "description": "Tamil Nadu government jobs 2026. TNPSC, TNTET, TN Police. 4,000+ vacancies/year. Entry Rs. 20,000–Rs. 45,000. Tamil-medium advantage. Selection 0.8–2%. Complete guide.",
    "content": "",
    "category": "state",
    "color": "#10B981",
    "filters": { "state": "TamilNadu" },
    "relatedHubs": ["police-constable-recruitment-2026", "education-comprehensive-guide", "30-50k-comprehensive-guide", "12th-pass-comprehensive-guide"],
    "stats": { "totalJobs": 4000, "salaryRange": "Rs. 20,000–Rs. 45,000", "selectionRate": "0.8–2%" }
  },
  "easiest-government-jobs-to-get": {
    "slug": "easiest-government-jobs-to-get",
    "title": "Easiest Government Jobs to Get in India 2026 | Highest Pass Rate | Postal, Railway, Police | 5–10% Selection",
    "keyword": "Easiest government jobs to get in India",
    "description": "Easiest government jobs India 2026. Postal (0.5% cutoff), Railway (1%), Police. 5–10% acceptance rate. Lowest barrier entry. 2–3 month prep vs 12–18 months. Entry Rs. 21,000–Rs. 30,000.",
    "content": "",
    "category": "salary",
    "color": "#3B82F6",
    "filters": { "difficulty": "easy" },
    "relatedHubs": ["postal-comprehensive-guide", "railways-comprehensive-guide", "police-constable-recruitment-2026", "12th-pass-comprehensive-guide"],
    "stats": { "totalJobs": 20000, "salaryRange": "Rs. 21,000–Rs. 30,000", "selectionRate": "5–10%" }
  },
  "government-jobs-for-women-2026": {
    "slug": "government-jobs-for-women-2026",
    "title": "Government Jobs for Women 2026 | Women's Quota, Maternity Benefits | Police, Teacher, Banking | Rs. 21,000–Rs. 50,000",
    "keyword": "Government jobs for women 2026",
    "description": "Government jobs for women 2026. 33% quota in some roles. Police women constable, teacher, banking. Maternity benefits, flexible posting. Entry Rs. 21,000–Rs. 50,000. 10,000+ vacancies.",
    "content": "",
    "category": "salary",
    "color": "#3B82F6",
    "filters": { "womenQuota": true },
    "relatedHubs": ["police-constable-recruitment-2026", "education-comprehensive-guide", "banking-comprehensive-guide", "30-50k-comprehensive-guide"],
    "stats": { "totalJobs": 10000, "salaryRange": "Rs. 21,000–Rs. 50,000", "selectionRate": "2–4%" }
  }
};

/**
 * Get a single hub by slug
 * No database access — safe for client components
 */
export function getHub(slug: string): Hub | undefined {
  return hubs[slug];
}

/**
 * Get hubs by category
 * No database access — safe for client components
 */
export function getHubsByCategory(category: HubCategory): Hub[] {
  return Object.values(hubs).filter(h => h.category === category);
}

/**
 * Get all hubs
 * No database access — safe for client components
 */
export function getAllHubs(): Hub[] {
  return Object.values(hubs);
}
