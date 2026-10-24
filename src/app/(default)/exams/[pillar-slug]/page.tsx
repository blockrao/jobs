/**
 * /exams/{slug} — Exam hub pages (Master Plan §4).
 *
 * Resolution order:
 *  1. Exam slug → render exam hub page
 *  2. Org pillar slug → redirect to org page (/organizations/{slug})
 *  3. Org slug → redirect to org page (/organizations/{slug})
 *  4. 404
 */
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { resolveOrganization } from "@/lib/organizations/resolve";
import { getExamBySlug, getPostingsByExam } from "@/lib/queries";
import { safeQuery } from "@/lib/safe-query";
import { pageSeo } from "@/lib/seo";
import { buildBreadcrumbSchema, buildFAQSchema, jsonLdGraph } from "@/lib/structured-data";
import { legacyPostingHref } from "@/lib/recruitment-href";

export const revalidate = 86400;

type Props = { params: Promise<{ "pillar-slug": string }> };

// ── Per-exam FAQs (top exams only; others get auto-generated FAQs from DB fields) ──
const EXAM_FAQS: Record<string, Array<{ question: string; answer: string }>> = {
  "rrb-asm": [
    { question: "What is the age limit for RRB ASM?", answer: "The age limit for RRB Assistant Station Master is 18–33 years. Age relaxation of 5 years for SC/ST, 3 years for OBC (NCL), and 10 years for PwBD candidates applies as per Railway Board norms." },
    { question: "What is the salary of RRB ASM?", answer: "RRB ASM salary is ₹19,900–63,200 per month (Level 6 of 7th Pay Commission). Gross salary including HRA and allowances is approximately ₹35,000–55,000 per month depending on posting city." },
    { question: "What is the qualification required for RRB ASM?", answer: "A graduate degree from a recognized university is required. Vision standards are mandatory — candidates must not have colour blindness and must meet specific visual acuity standards." },
    { question: "How many vacancies are there in RRB ASM?", answer: "Vacancy count varies by notification. RRB NTPC cycles (which include ASM posts) have historically had 5,000–35,000 vacancies across all Railway Recruitment Boards. Check the current notification for exact numbers." },
    { question: "What is the selection process for RRB ASM?", answer: "The selection process has three stages: CBT-1 (Computer Based Test, 100 questions, 90 minutes), CBT-2 (subject-specific, 120 questions, 90 minutes), and Document Verification. There is no physical test for ASM unlike some other RRB posts." },
  ],
  "rrb-ntpc": [
    { question: "What is the age limit for RRB NTPC?", answer: "Age limit is 18–30 years for most NTPC posts, and 18–33 years for senior posts like ASM and Traffic Assistant. SC/ST get 5 years relaxation, OBC (NCL) get 3 years." },
    { question: "What is the salary of RRB NTPC?", answer: "RRB NTPC salary ranges from ₹19,900–63,200 (Level 2–6) depending on the post. Junior Clerk-cum-Typist starts at ₹19,900, while Senior Commercial cum Ticket Clerk is at Level 5 (₹29,200–92,300)." },
    { question: "What is the qualification for RRB NTPC?", answer: "Minimum 10+2 (12th pass) for most posts. Graduation required for posts like Traffic Assistant, Senior Commercial Clerk, Senior Clerk cum Typist, and Accounts Clerk." },
    { question: "How many vacancies come in RRB NTPC?", answer: "RRB NTPC is one of the largest railway recruitments — the 2019 cycle had 35,277 vacancies and the 2024 cycle has 11,558 vacancies across all RRBs." },
    { question: "How many stages are there in RRB NTPC selection?", answer: "Four stages: CBT-1 (screening, 100 Qs), CBT-2 (main, 120 Qs), Skill Test/Typing Test (for clerical posts), and Document Verification. No medical exam for clerical posts." },
  ],
  "ssc-cgl": [
    { question: "What is the age limit for SSC CGL?", answer: "SSC CGL age limit is 18–32 years for most posts. Some posts like Inspector in CBI, NIA require 20–30 years. SC/ST get 5 years relaxation, OBC (NCL) get 3 years." },
    { question: "What is the salary of SSC CGL?", answer: "SSC CGL salary ranges from ₹25,500–81,100 (Level 4) to ₹56,100–1,77,500 (Level 10) depending on the post. Group B Gazetted posts (like Assistant Section Officer) are at Level 7 (₹44,900–1,42,400)." },
    { question: "What is the qualification for SSC CGL?", answer: "A graduate degree from a recognized university is the minimum qualification. Some posts require specific degrees — e.g., Statistical Investigator requires Mathematics/Statistics at graduation level." },
    { question: "What posts come under SSC CGL?", answer: "SSC CGL fills 70+ posts across ministries and departments: Inspector Income Tax, Inspector Central Excise, Assistant Section Officer (MEA, MHA), Sub-Inspector in CBI, Auditor, Accountant, Statistical Investigator, and many more." },
    { question: "What is the SSC CGL exam pattern?", answer: "SSC CGL has Tier-1 (CBT, 100 Qs, 60 min), Tier-2 (Paper-1 for all posts + Paper-2 for JSO/Statistical posts + Paper-3 for AAO posts). Tier-1 covers GI, English, Quantitative Aptitude, and General Awareness." },
  ],
  "ssc-chsl": [
    { question: "What is the age limit for SSC CHSL?", answer: "SSC CHSL age limit is 18–27 years for most posts (LDC/JSA, PA/SA, DEO). SC/ST get 5 years relaxation, OBC (NCL) get 3 years." },
    { question: "What is the qualification for SSC CHSL?", answer: "10+2 (Intermediate / Class 12 pass) from a recognized board. Graduation and above are not eligible. DEO post in certain offices requires Science stream with Mathematics in 12th." },
    { question: "What is the salary of SSC CHSL?", answer: "SSC CHSL salary: LDC/JSA at Level 2 (₹19,900–63,200), PA/SA at Level 4 (₹25,500–81,100), DEO at Level 4–5 (₹25,500–92,300) plus HRA, DA and other allowances." },
    { question: "What is the SSC CHSL selection process?", answer: "SSC CHSL has Tier-1 (CBT, 100 Qs, 60 minutes), Tier-2 (CBT including modules on Maths, English, Reasoning, Computer Knowledge, and a Skill Module — Typing/DEO test)." },
    { question: "What posts are filled through SSC CHSL?", answer: "Lower Division Clerk (LDC) / Junior Secretariat Assistant (JSA), Postal Assistant (PA) / Sorting Assistant (SA), and Data Entry Operator (DEO) across various central government departments." },
  ],
  "ibps-po": [
    { question: "What is the age limit for IBPS PO?", answer: "IBPS PO age limit is 20–30 years. SC/ST candidates get 5 years relaxation, OBC (NCL) get 3 years, PwBD get 10 years, and ex-servicemen get relaxation as per government norms." },
    { question: "What is the salary of IBPS PO?", answer: "IBPS PO starting salary is ₹41,960 per month (basic ₹23,700 + DA + HRA + other allowances). After 2 years probation, salary increases with biennial increments. Total CTC including perks is approximately ₹52,000–58,000 per month." },
    { question: "What is the qualification for IBPS PO?", answer: "A graduation degree in any discipline from a recognized university. Proficiency in the official language of the state/UT of the applying bank is preferred. Computer literacy is required." },
    { question: "What is the IBPS PO selection process?", answer: "Three stages: Preliminary Exam (100 marks, 1 hour — English, Quantitative Aptitude, Reasoning), Main Exam (225 marks + Descriptive Paper — Reasoning, Data Analysis, General Economy/Banking Awareness, English), and Interview (100 marks). Final merit is 80% Main + 20% Interview." },
    { question: "What is the difference between IBPS PO and SBI PO?", answer: "IBPS PO fills vacancies in 11 public sector banks (Bank of Baroda, PNB, Canara Bank, etc.) while SBI PO is exclusively for State Bank of India. SBI PO is generally considered more prestigious, has higher competition, and SBI has a slightly higher salary structure." },
  ],
  "upsc-ias": [
    { question: "What is the age limit for UPSC IAS?", answer: "UPSC IAS (Civil Services Examination) age limit is 21–32 years for General category. SC/ST candidates get 5 years relaxation (up to 37 years), OBC (NCL) get 3 years (up to 35 years), PwBD get 10 years." },
    { question: "How many attempts are allowed for UPSC IAS?", answer: "General category: 6 attempts (up to 32 years). OBC (NCL): 9 attempts (up to 35 years). SC/ST: Unlimited attempts (up to 37 years). PwBD General/OBC: 9 attempts; PwBD SC/ST: Unlimited." },
    { question: "What is the qualification for UPSC IAS?", answer: "A degree from a recognized university or equivalent. Candidates appearing in the final year of their degree examination are also eligible to apply for Prelims, but must produce the degree certificate at the time of application for Main." },
    { question: "What is the UPSC IAS salary?", answer: "IAS salary depends on pay level and posting. Starting as Sub-Divisional Magistrate at Level 10 (₹56,100/month basic), it goes up to Cabinet Secretary level at Level 18 (₹2,50,000/month fixed). Gross salary including DA, HRA, and allowances at entry level is approximately ₹80,000–1,00,000/month." },
    { question: "What is the UPSC IAS exam pattern?", answer: "Three stages: Prelims (2 objective papers — GS Paper 1 for 200 marks, CSAT for 200 marks — qualifying in nature), Mains (9 papers — 4 General Studies, 2 Optional subject papers, 1 Essay, 2 language papers), and Personality Test / Interview (275 marks)." },
  ],
  "sbi-po": [
    { question: "What is the age limit for SBI PO?", answer: "SBI PO age limit is 21–30 years. SC/ST get 5 years relaxation, OBC (NCL) get 3 years, PwBD General/OBC get 10 years, PwBD SC/ST get 15 years." },
    { question: "What is the salary of SBI PO?", answer: "SBI PO starting basic salary is ₹41,960 (after the 2022 pay revision), with DA, HRA, CCA and other allowances. Total monthly emoluments are approximately ₹52,000–60,000 at metro postings. Gross CTC including perks (medical, fuel, newspaper, etc.) is about ₹8.2–9.5 LPA." },
    { question: "What is the qualification for SBI PO?", answer: "Graduation in any discipline from a recognized university. Final year students can also apply. Knowledge of the official language of the state/UT for which the candidate applies is desirable." },
    { question: "What is the SBI PO selection process?", answer: "Preliminary Exam (100 marks, 1 hour), Main Exam (250 marks — Objective 200 marks + Descriptive 50 marks), and Group Exercise & Interview (30 + 20 marks). Final selection is based on Main Exam + GE & PI scores." },
  ],
};

// ── Auto-generate FAQs from DB fields for exams without hardcoded FAQs ──
function buildAutoFAQs(exam: {
  label: string;
  eligibility: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  commission: { name: string };
}): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];
  if (exam.eligibility) {
    faqs.push({
      question: `What is the eligibility for ${exam.label}?`,
      answer: exam.eligibility,
    });
  }
  if (exam.salaryMin) {
    faqs.push({
      question: `What is the salary for ${exam.label}?`,
      answer: `The pay scale for ${exam.label} is ₹${exam.salaryMin.toLocaleString("en-IN")}–${exam.salaryMax?.toLocaleString("en-IN") ?? "varies"} per month as per 7th Pay Commission norms. Gross in-hand salary varies by posting location.`,
    });
  }
  faqs.push({
    question: `Which body conducts ${exam.label}?`,
    answer: `${exam.label} is conducted by ${exam.commission.name}.`,
  });
  return faqs;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "pillar-slug": slug } = await params;
  const exam = await safeQuery(() => getExamBySlug(slug), null);
  if (!exam) return {};

  const year = new Date().getFullYear();
  const title = `${exam.label} ${year} – Eligibility, Salary, Exam Pattern`; // layout template adds "| JobOye"
  const description = exam.eligibility
    ? `${exam.label}: ${exam.eligibility.slice(0, 120)}… Check salary, vacancies, and open positions on JobOye.`
    : `${exam.description?.slice(0, 140) ?? exam.label} – eligibility, salary, exam pattern and current vacancies on JobOye.`;

  return {
    title,
    description,
    ...pageSeo(`/exams/${exam.slug}`, { index: true }),
  };
}

export default async function ExamHubPage({ params }: Props) {
  const { "pillar-slug": pillarSlug } = await params;

  // 1. Try to render as an exam hub page
  const [exam, postings] = await Promise.all([
    safeQuery(() => getExamBySlug(pillarSlug), null),
    safeQuery(() => getPostingsByExam(pillarSlug), []),
  ]);

  if (exam) {
    const year = new Date().getFullYear();
    const faqs = EXAM_FAQS[exam.slug] ?? buildAutoFAQs(exam);
    const siblingExams = exam.commission.exams.filter((e: { id: number; slug: string; label: string }) => e.id !== exam.id).slice(0, 6);

    const schema = jsonLdGraph(
      buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Exams", path: "/exams" },
        { name: exam.commission.name, path: `/commissions/${exam.commission.slug}` },
        { name: exam.label, path: `/exams/${exam.slug}` },
      ]),
      ...(faqs.length > 0 ? [buildFAQSchema(faqs)] : []),
    );

    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />

        {/* Breadcrumb */}
        <nav className="mb-4 text-sm text-neutral-500">
          <Link href="/" className="hover:underline">Home</Link>
          {" / "}
          <Link href="/exams" className="hover:underline">Exams</Link>
          {" / "}
          <Link href={`/commissions/${exam.commission.slug}`} className="hover:underline">
            {exam.commission.name}
          </Link>
          {" / "}
          <span className="text-neutral-800">{exam.label}</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {exam.label} {year}
          </h1>
          {exam.description && (
            <p className="text-neutral-600 text-base leading-relaxed max-w-3xl">
              {exam.description}
            </p>
          )}
        </div>

        {/* Key facts grid */}
        {(exam.salaryMin || exam.eligibility) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {exam.salaryMin && (
              <div className="rounded-lg border border-black/10 bg-green-50 p-4">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Pay Scale</p>
                <p className="text-lg font-bold text-green-900">
                  ₹{exam.salaryMin.toLocaleString("en-IN")} – ₹{exam.salaryMax?.toLocaleString("en-IN") ?? "varies"}
                </p>
                <p className="text-xs text-green-700 mt-0.5">per month (7th Pay Commission)</p>
              </div>
            )}
            {exam.eligibility && (
              <div className="rounded-lg border border-black/10 bg-blue-50 p-4">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Eligibility</p>
                <p className="text-sm text-blue-900 leading-snug">{exam.eligibility}</p>
              </div>
            )}
          </div>
        )}

        {/* Live postings */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            Current {exam.label} Openings
            {postings.length > 0 && (
              <span className="ml-2 text-sm font-normal text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                {postings.length} open
              </span>
            )}
          </h2>
          {postings.length === 0 ? (
            <div className="rounded-lg bg-neutral-50 border border-black/10 p-6 text-center">
              <p className="text-neutral-500 text-sm">
                No active {exam.label} notifications right now.{" "}
                <Link href="/jobs" className="text-blue-600 hover:underline">
                  Browse all government jobs →
                </Link>
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-black/10">
              {postings.map((posting: { id: number; title: string; locationCity: string | null; organization: { name: string }; inferredRecruitment?: { slug: string } | null }) => {
                const href = legacyPostingHref(posting);
                return (
                  <li key={posting.id} className="py-4">
                    {href ? (
                      <Link href={href} className="text-base font-semibold hover:underline block">
                        {posting.title}
                      </Link>
                    ) : (
                      <span className="text-base font-semibold block">{posting.title}</span>
                    )}
                    <p className="text-sm text-neutral-500 mt-0.5">
                      {posting.organization.name}
                      {posting.locationCity ? ` · ${posting.locationCity}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* FAQ */}
        {faqs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4">{exam.label} – Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <details key={i} className="rounded-lg border border-black/10 bg-neutral-50 p-4 cursor-pointer hover:bg-neutral-100">
                  <summary className="font-semibold text-sm">{faq.question}</summary>
                  <p className="mt-2 text-sm text-neutral-700 leading-relaxed">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Other exams in this commission */}
        {siblingExams.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Other {exam.commission.name} Exams</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {siblingExams.map((sibling: { id: number; slug: string; label: string }) => (
                <Link
                  key={sibling.id}
                  href={`/exams/${sibling.slug}`}
                  className="rounded-lg border border-black/10 p-3 text-sm font-medium hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                >
                  {sibling.label}
                </Link>
              ))}
            </div>
            <p className="mt-4 text-sm">
              <Link href={`/commissions/${exam.commission.slug}`} className="text-blue-600 hover:underline">
                View all {exam.commission.name} exams →
              </Link>
            </p>
          </section>
        )}
      </div>
    );
  }

  // 2 & 3. Fall back to org redirect logic
  const db = getDb();
  const byPillar = await db
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.pillarSlug, pillarSlug))
    .limit(1);

  const target =
    byPillar.length > 0
      ? await resolveOrganization(byPillar[0].slug)
      : await resolveOrganization(pillarSlug);

  if (target.kind === "canonical") permanentRedirect(`/organizations/${target.org.slug}`);
  if (target.kind === "redirect") permanentRedirect(`/organizations/${target.slug}`);
  notFound();
}
