"use client";

import Link from "next/link";

// ── SEO / AEO / GEO Footer Link Grid ─────────────────────────────────────────
// ~100 high-value internal links grouped into four columns.
// Each column can be contextually overridden per page type (e.g. an SSC page
// surfaces SSC sub-exam links in column 1). See `examLinks` prop.
// ─────────────────────────────────────────────────────────────────────────────

interface LinkItem {
  label: string;
  href: string;
}

// ── Default column data ───────────────────────────────────────────────────────

const EXAM_BODY_LINKS: LinkItem[] = [
  { label: "UPSC Civil Services", href: "/jobs?q=upsc+civil+services" },
  { label: "SSC CGL", href: "/jobs?q=ssc+cgl" },
  { label: "SSC CHSL", href: "/jobs?q=ssc+chsl" },
  { label: "SSC MTS", href: "/jobs?q=ssc+mts" },
  { label: "SSC GD Constable", href: "/jobs?q=ssc+gd" },
  { label: "SSC CPO", href: "/jobs?q=ssc+cpo" },
  { label: "RRB NTPC", href: "/jobs?q=rrb+ntpc" },
  { label: "RRB Group D", href: "/jobs?q=rrb+group+d" },
  { label: "RRB ALP", href: "/jobs?q=rrb+alp" },
  { label: "RRC Group D Railways", href: "/jobs?q=rrc+group+d" },
  { label: "IBPS PO", href: "/jobs?q=ibps+po" },
  { label: "IBPS Clerk", href: "/jobs?q=ibps+clerk" },
  { label: "SBI PO", href: "/jobs?q=sbi+po" },
  { label: "SBI Clerk", href: "/jobs?q=sbi+clerk" },
  { label: "RBI Grade B", href: "/jobs?q=rbi+grade+b" },
  { label: "NDA", href: "/jobs?q=nda" },
  { label: "CDS", href: "/jobs?q=cds" },
  { label: "CAPF AC", href: "/jobs?q=capf" },
  { label: "ESIC Recruitment", href: "/jobs?q=esic" },
  { label: "UPSC NDA/NA", href: "/jobs?q=upsc+nda" },
  { label: "UPSC CMS", href: "/jobs?q=upsc+cms" },
  { label: "UPPSC PCS", href: "/jobs?q=uppsc" },
  { label: "BPSC", href: "/jobs?q=bpsc" },
  { label: "MPSC", href: "/jobs?q=mpsc" },
  { label: "RPSC RAS", href: "/jobs?q=rpsc" },
];

const QUALIFICATION_LINKS: LinkItem[] = [
  { label: "10th Pass Govt Jobs", href: "/jobs?qualification=10th" },
  { label: "12th Pass Govt Jobs", href: "/jobs?qualification=12th" },
  { label: "Graduate Govt Jobs", href: "/jobs?qualification=graduate" },
  { label: "Engineering Jobs", href: "/jobs?qualification=btech" },
  { label: "Medical / MBBS Jobs", href: "/jobs?qualification=mbbs" },
  { label: "Law / LLB Jobs", href: "/jobs?qualification=llb" },
  { label: "MBA / Management Jobs", href: "/jobs?qualification=mba" },
  { label: "Science Graduate Jobs", href: "/jobs?qualification=bsc" },
  { label: "Arts Graduate Jobs", href: "/jobs?qualification=ba" },
  { label: "Commerce Graduate Jobs", href: "/jobs?qualification=bcom" },
  { label: "ITI Govt Jobs", href: "/jobs?qualification=iti" },
  { label: "Diploma Holders Jobs", href: "/jobs?qualification=diploma" },
  { label: "Post Graduate Jobs", href: "/jobs?qualification=pg" },
  { label: "PhD Research Jobs", href: "/jobs?qualification=phd" },
  { label: "No Experience Required", href: "/jobs?experience=fresher" },
  { label: "Teaching Jobs (TET)", href: "/jobs?q=tet+teacher" },
  { label: "Nursing Jobs Govt", href: "/jobs?q=nursing+staff+nurse" },
  { label: "Junior Engineer Jobs", href: "/jobs?q=junior+engineer" },
  { label: "Constable Jobs", href: "/jobs?q=constable" },
  { label: "Clerk Jobs Govt", href: "/jobs?q=clerk" },
  { label: "Stenographer Jobs", href: "/jobs?q=stenographer" },
  { label: "Data Entry Operator", href: "/jobs?q=data+entry+operator" },
  { label: "Accountant / Accounts Officer", href: "/jobs?q=accountant" },
  { label: "Security Guard Jobs", href: "/jobs?q=security+guard" },
  { label: "Driver / Operator Jobs", href: "/jobs?q=driver+operator" },
];

const STATE_LINKS: LinkItem[] = [
  { label: "Uttar Pradesh Govt Jobs", href: "/jobs?state=UP" },
  { label: "Rajasthan Govt Jobs", href: "/jobs?state=RJ" },
  { label: "Bihar Govt Jobs", href: "/jobs?state=BR" },
  { label: "Maharashtra Govt Jobs", href: "/jobs?state=MH" },
  { label: "Madhya Pradesh Govt Jobs", href: "/jobs?state=MP" },
  { label: "Karnataka Govt Jobs", href: "/jobs?state=KA" },
  { label: "Gujarat Govt Jobs", href: "/jobs?state=GJ" },
  { label: "West Bengal Govt Jobs", href: "/jobs?state=WB" },
  { label: "Haryana Govt Jobs", href: "/jobs?state=HR" },
  { label: "Punjab Govt Jobs", href: "/jobs?state=PB" },
  { label: "Odisha Govt Jobs", href: "/jobs?state=OD" },
  { label: "Jharkhand Govt Jobs", href: "/jobs?state=JH" },
  { label: "Assam Govt Jobs", href: "/jobs?state=AS" },
  { label: "Himachal Pradesh Jobs", href: "/jobs?state=HP" },
  { label: "Uttarakhand Govt Jobs", href: "/jobs?state=UK" },
  { label: "Kerala Govt Jobs", href: "/jobs?state=KL" },
  { label: "Telangana Govt Jobs", href: "/jobs?state=TS" },
  { label: "Tamil Nadu Govt Jobs", href: "/jobs?state=TN" },
  { label: "Andhra Pradesh Jobs", href: "/jobs?state=AP" },
  { label: "Chhattisgarh Govt Jobs", href: "/jobs?state=CG" },
  { label: "Delhi Govt Jobs", href: "/jobs?state=DL" },
  { label: "Goa Govt Jobs", href: "/jobs?state=GA" },
  { label: "Jammu & Kashmir Jobs", href: "/jobs?state=JK" },
  { label: "Manipur Govt Jobs", href: "/jobs?state=MN" },
  { label: "Central Govt Jobs (All India)", href: "/jobs?kind=GOVERNMENT" },
];

const TOPIC_LINKS: LinkItem[] = [
  { label: "Govt Jobs Closing This Week", href: "/jobs?deadline=this-week" },
  { label: "New Govt Job Notifications", href: "/jobs?sort=newest" },
  { label: "Highest Vacancy Jobs 2026", href: "/jobs?sort=vacancies" },
  { label: "Upcoming Govt Jobs 2026", href: "/jobs?status=upcoming" },
  { label: "Salary & Pay Scale Guide", href: "/topics/salary" },
  { label: "Age Limit for Govt Jobs", href: "/topics/age-limit" },
  { label: "Eligibility Criteria", href: "/topics/eligibility" },
  { label: "How to Apply Online", href: "/topics/how-to-apply" },
  { label: "Exam Syllabus & Pattern", href: "/topics/syllabus" },
  { label: "Admit Card Download", href: "/topics/admit-card" },
  { label: "Result & Merit List", href: "/topics/result" },
  { label: "Cut-off Marks", href: "/topics/cut-off" },
  { label: "Application Fee Guide", href: "/topics/application-fee" },
  { label: "OBC / SC / ST Reservation", href: "/topics/reservation" },
  { label: "Physical Fitness Test (PFT)", href: "/topics/pft" },
  { label: "Group A Officers Jobs", href: "/jobs?grade=group-a" },
  { label: "Group B Gazetted Jobs", href: "/jobs?grade=group-b" },
  { label: "Group C Non-Gazetted", href: "/jobs?grade=group-c" },
  { label: "Defence / Army Jobs", href: "/jobs?sector=defence" },
  { label: "Police / Paramilitary Jobs", href: "/jobs?sector=police" },
  { label: "Banking & Finance Jobs", href: "/jobs?sector=banking" },
  { label: "Railway Jobs 2026", href: "/jobs?sector=railways" },
  { label: "Teaching & Education Jobs", href: "/jobs?sector=teaching" },
  { label: "Health & Medical Sector", href: "/jobs?sector=health" },
  { label: "PSU Jobs 2026", href: "/jobs?q=psu" },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface SeoFooterLinksProps {
  /** Override column 1 (Exam Bodies) with contextual links — e.g. SSC sub-exams on SSC pages */
  examLinks?: LinkItem[];
  /** Override column 2 (Qualification) */
  qualificationLinks?: LinkItem[];
  /** Override column 3 (State) */
  stateLinks?: LinkItem[];
  /** Override column 4 (Topics) */
  topicLinks?: LinkItem[];
  /** Heading label for column 1 */
  examHeading?: string;
}

export function SeoFooterLinks({
  examLinks = EXAM_BODY_LINKS,
  qualificationLinks = QUALIFICATION_LINKS,
  stateLinks = STATE_LINKS,
  topicLinks = TOPIC_LINKS,
  examHeading = "Exam Bodies",
}: SeoFooterLinksProps) {
  return (
    <section className="border-t border-neutral-100 bg-neutral-50/60 mt-12 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-6">
          Browse Government Jobs
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-8">
          {/* Column 1 — Exam Bodies */}
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
              {examHeading}
            </h3>
            <ul className="space-y-1.5">
              {examLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-neutral-600 hover:text-brand-600 transition-colors leading-snug"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2 — Qualification */}
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
              By Qualification
            </h3>
            <ul className="space-y-1.5">
              {qualificationLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-neutral-600 hover:text-brand-600 transition-colors leading-snug"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — State */}
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
              By State
            </h3>
            <ul className="space-y-1.5">
              {stateLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-neutral-600 hover:text-brand-600 transition-colors leading-snug"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — Topics / Intent */}
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
              Topics &amp; Guides
            </h3>
            <ul className="space-y-1.5">
              {topicLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-neutral-600 hover:text-brand-600 transition-colors leading-snug"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
