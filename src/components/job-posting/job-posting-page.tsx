/**
 * Job Posting Page Component
 *
 * Layout: breadcrumb → blue hero → TOC strip → sections → footer.
 * Design matches the BhartiDesk post-leaf reference.
 */

import Link from "next/link";
import { JobPostingData } from "@/types/job-posting";
import JobPostingHeader from "./sections/job-posting-header";
import ImportantDates from "./sections/important-dates";
import EligibilityCriteria from "./sections/eligibility-criteria";
import VacancyDetails from "./sections/vacancy-details";
import SelectionProcess from "./sections/selection-process";
import ApplicationFee from "./sections/application-fee";
import HowToApply from "./sections/how-to-apply";
import DocumentsRequired from "./sections/documents-required";
import OfficialSourceVerification from "./sections/official-source-verification";
import DutiesResponsibilities from "./sections/duties-responsibilities";
import SalaryCompensation from "./sections/salary-compensation";
import styles from "./job-posting-page.module.css";

interface RecruitmentData {
  recruitment: any;
  posts: any[];
  totalPosts: number;
  isSingleJobRecruitment: boolean;
}

export interface ResolvedLeafFacts {
  vacancyCount: number | null;
  salary: { min: number; max: number; currency: string; period: string } | null;
  deadline: { date: Date | null; state: "OPEN" | "CLOSED" | "UNKNOWN" };
}

export interface ResolvedRecruitmentFacts {
  officialSource: string | null;
  applicationUrl: string | null;
  employer: string | null;
  selectionProcess: string | null;
}

interface JobPostingPageProps {
  post: JobPostingData;
  recruitment?: RecruitmentData | null;
  isSingleJobRecruitment?: boolean;
  locale?: string;
  resolvedFacts?: ResolvedLeafFacts;
  recruitmentResolvedFacts?: ResolvedRecruitmentFacts | null;
}

function fmtDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  try {
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return null;
  }
}

export default function JobPostingPage({
  post,
  recruitment,
  isSingleJobRecruitment = false,
  locale = "en",
  resolvedFacts,
  recruitmentResolvedFacts,
}: JobPostingPageProps) {
  const localePrefix = locale === "hi" ? "/hi" : "";
  const siblingPosts = recruitment?.posts?.filter((p) => p.id !== post.id) || [];

  // ── Quick answers (derived from structured data where available) ──
  // Phase 1: display stored text only — no eligibility engine
  const qualText: string | null =
    post.fjaExtract?.eligibilityRaw ??
    post.fjaExtract?.qualificationRaw ??
    null;
  const expText: string | null =
    post.fjaExtract?.experienceRaw ?? null;
  const deadline = resolvedFacts?.deadline;
  const vacancyCount = resolvedFacts?.vacancyCount;

  const payLevel = (() => {
    const pl = post.enrichment?.payLevel || post.payLevel;
    if (!pl) return null;
    if (typeof pl === "string") return `Level-${pl}`;
    if (pl && typeof pl === "object") {
      const level = (pl as any).level;
      const scheme = (pl as any).scheme;
      return scheme ? `Level-${level} (${scheme})` : `Level-${level}`;
    }
    return null;
  })();

  const deadlineDateStr = deadline?.date ? fmtDate(deadline.date) : null;
  const applyUrl = recruitmentResolvedFacts?.applicationUrl ?? null;
  const sourceUrl = recruitmentResolvedFacts?.officialSource ?? null;

  // ── FJA raw-field fallbacks (display-only, "reported" label) ────────────
  // Used only when the resolver returns null (no verified enrichment row).
  // These are transcribed text from the aggregator source, not official facts.
  const reportedSalaryRaw: string | null =
    resolvedFacts?.salary == null
      ? (post.fjaExtract?.salaryRaw ?? null)
      : null;

  // Reported vacancy from raw FJA field — used to decide whether to render
  // the Vacancies section even when the resolver returned null.
  const reportedVacancyCount: number | null = (() => {
    if (resolvedFacts?.vacancyCount != null) return null; // resolver handled it
    const raw = post.fjaExtract?.vacancyCountRaw;
    if (!raw) return null;
    const n = Number(raw.replace(/,/g, "").trim());
    return Number.isSafeInteger(n) && n > 0 ? n : null;
  })();

  // Reported deadline from recruitment end date — used when resolver returns UNKNOWN.
  const reportedDeadline: Date | null = (() => {
    if (deadline?.state !== "UNKNOWN") return null;
    const d = post.fjaExtract?.sourceApplicationEndDate ?? post.recruitmentApplicationEndDate;
    if (!d) return null;
    try { return new Date(d as string); } catch { return null; }
  })();
  const reportedDeadlineDateStr = reportedDeadline ? fmtDate(reportedDeadline) : null;

  // Check if location available
  const location: string | null =
    post.locationCity ??
    (typeof post.fjaExtract?.locationRaw === "string" ? post.fjaExtract.locationRaw : null) ??
    null;

  // ── dl.facts rows ──
  interface FactRow {
    term: string;
    detail: React.ReactNode;
  }
  const factRows: FactRow[] = [];
  factRows.push({ term: "Post", detail: post.title });
  if (post.organizationName) {
    factRows.push({ term: "Employer", detail: post.organizationName });
  }
  if (post.sourcePostCode) {
    factRows.push({ term: "Vacancy number", detail: post.sourcePostCode });
  }
  if (vacancyCount != null) {
    factRows.push({ term: "Vacancies", detail: vacancyCount.toLocaleString("en-IN") });
  } else if (reportedVacancyCount != null) {
    factRows.push({ term: "Vacancies (reported)", detail: reportedVacancyCount.toLocaleString("en-IN") });
  }
  if (payLevel) {
    factRows.push({ term: "Pay level", detail: payLevel });
  }
  if (reportedSalaryRaw) {
    factRows.push({ term: "Salary (reported)", detail: reportedSalaryRaw });
  }
  if (post.employmentType) {
    factRows.push({
      term: "Type",
      detail: post.employmentType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    });
  }
  if (location) {
    factRows.push({ term: "Location", detail: location });
  }
  if (deadlineDateStr) {
    factRows.push({ term: "Last date", detail: deadlineDateStr });
  } else if (reportedDeadlineDateStr) {
    factRows.push({ term: "Last date (reported)", detail: reportedDeadlineDateStr });
  }

  // ── Build data-start and data-end for countdown JS ──
  const appStart =
    post.enrichment?.applicationOpenDate ??
    post.recruitmentApplicationStartDate ??
    null;
  const appEnd =
    post.enrichment?.applicationClosingDate ??
    post.recruitmentApplicationEndDate ??
    deadline?.date ??
    null;

  const dataStart = appStart ? new Date(appStart).toISOString() : null;
  const dataEnd = appEnd ? new Date(appEnd).toISOString() : null;

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <ol className={styles.breadcrumbList}>
          <li>
            <Link href={`${localePrefix}/`}>Home</Link>
          </li>
          <li>
            &nbsp;/&nbsp;<Link href={`${localePrefix}/jobs`}>Jobs</Link>
          </li>
          {post.recruitmentSlug && (
            <li>
              &nbsp;/&nbsp;
              <Link href={`${localePrefix}/jobs/${post.recruitmentSlug}`}>
                {post.recruitmentName ?? recruitment?.recruitment?.name ?? "Recruitment"}
              </Link>
            </li>
          )}
          <li>&nbsp;/&nbsp;{post.title}</li>
        </ol>
      </nav>

      {/* Hero header */}
      <article
        {...(dataStart ? { "data-start": dataStart } : {})}
        {...(dataEnd ? { "data-end": dataEnd } : {})}
      >
        <JobPostingHeader
          post={post}
          resolvedFacts={resolvedFacts}
          recruitmentResolvedFacts={recruitmentResolvedFacts}
          localePrefix={localePrefix}
          reportedDeadline={reportedDeadline}
        />

        {/* TOC strip */}
        <nav className={styles.toc} aria-label="On this page">
          <a href="#quick">Quick answers</a>
          <a href="#facts">Post facts</a>
          {(qualText || expText ||
            post.enrichment?.education ||
            post.enrichment?.experience ||
            post.enrichment?.ageRulesByCategory ||
            post.enrichment?.ageNote ||
            post.enrichment?.ageRelaxationRules ||
            post.enrichment?.eligibilityPathways) && <a href="#eligibility">Eligibility</a>}
          <a href="#dates">Dates</a>
          {(vacancyCount != null || reportedVacancyCount != null ||
            post.enrichment?.vacanciesTotal != null ||
            (post.enrichment?.vacanciesByCategory && Object.keys(post.enrichment.vacanciesByCategory as object).length > 0)) && <a href="#vacancies">Vacancies</a>}
          <a href="#selection">Selection</a>
          <a href="#apply">How to apply</a>
          <a href="#documents">Documents</a>
        </nav>

        {/* Verification notice */}
        {post.fjaExtract && post.fjaExtract.verificationStatus !== "VERIFIED" && (
          <aside
            className={styles.verificationNotice}
            role="note"
            aria-label="Verification notice"
          >
            <strong>Official verification pending</strong>
            <p style={{ margin: "6px 0 0", lineHeight: 1.55 }}>
              Some details on this page were transcribed from a secondary listing and have
              not yet been confirmed against the institution&apos;s official notice. Treat
              reported dates, eligibility, pay, tenure and application instructions as
              provisional. Confirm with the official recruitment source before acting.
            </p>
          </aside>
        )}

        {/* Quick Answers */}
        <section id="quick" className={styles.section} aria-labelledby="quick-h">
          <h2 id="quick-h" className={styles.sectionTitle}>
            Quick answers about this post
          </h2>
          <div className={styles.qa}>
            {qualText && (
              <div id="qa-qualify">
                <h3 className={styles.qaQuestion}>What are the qualifications?</h3>
                <p className={styles.qaAnswer}>{qualText}</p>
              </div>
            )}
            {expText && (
              <div id="qa-exp">
                <h3 className={styles.qaQuestion}>What experience is required?</h3>
                <p className={styles.qaAnswer}>{expText}</p>
              </div>
            )}
            {payLevel && (
              <div id="qa-pay">
                <h3 className={styles.qaQuestion}>What is the pay level?</h3>
                <p className={styles.qaAnswer}>{payLevel} of the 7th CPC pay matrix.</p>
              </div>
            )}
            {reportedSalaryRaw && (
              <div id="qa-salary">
                <h3 className={styles.qaQuestion}>What is the salary?</h3>
                <p className={styles.qaAnswer}>{reportedSalaryRaw} (reported — confirm with official notification).</p>
              </div>
            )}
            {vacancyCount != null && (
              <div id="qa-vacancies">
                <h3 className={styles.qaQuestion}>How many vacancies are there?</h3>
                <p className={styles.qaAnswer}>
                  {vacancyCount.toLocaleString("en-IN")} {vacancyCount === 1 ? "vacancy" : "vacancies"} in this post.
                </p>
              </div>
            )}
            {deadlineDateStr && (
              <div id="qa-deadline">
                <h3 className={styles.qaQuestion}>What is the last date to apply?</h3>
                <p className={styles.qaAnswer}>
                  {deadline?.state === "CLOSED"
                    ? `The application window has closed (was ${deadlineDateStr}).`
                    : `${deadlineDateStr}.`}
                </p>
              </div>
            )}
            {applyUrl && (
              <div id="qa-how">
                <h3 className={styles.qaQuestion}>Where do I apply?</h3>
                <p className={styles.qaAnswer}>
                  Apply online at{" "}
                  <a href={applyUrl} target="_blank" rel="noopener noreferrer">
                    the official application portal
                  </a>
                  .
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Post at a glance (dl.facts) */}
        {factRows.length > 0 && (
          <section id="facts" className={styles.section} aria-labelledby="facts-h">
            <h2 id="facts-h" className={styles.sectionTitle}>
              Post at a glance
            </h2>
            <dl className={styles.facts}>
              {factRows.map((row) => (
                <div key={row.term} className={styles.factsRow}>
                  <dt className={styles.factsTerm}>{row.term}</dt>
                  <dd className={styles.factsDetail}>{row.detail}</dd>
                </div>
              ))}
            </dl>
            {/* Gate box for eligibility summary */}
            {qualText && (
              <p className={styles.gate}>
                <strong>Who can apply:</strong>{" "}
                {qualText}
                {expText ? `. ${expText}` : ""}
              </p>
            )}
          </section>
        )}

        {/* Eligibility */}
        {(qualText || expText ||
          post.enrichment?.education ||
          post.enrichment?.experience ||
          post.enrichment?.ageRulesByCategory ||
          post.enrichment?.ageNote ||
          post.enrichment?.ageRelaxationRules ||
          post.enrichment?.eligibilityPathways) && (
          <section id="eligibility" className={styles.section} aria-labelledby="elig-h">
            <h2 id="elig-h" className={styles.sectionTitle}>
              Eligibility
            </h2>
            {qualText && (
              <>
                <h3 style={{ fontSize: "20px", fontWeight: 800, margin: "12px 0 8px" }}>
                  Qualification
                </h3>
                <p>{qualText}</p>
              </>
            )}
            {expText && (
              <>
                <h3 style={{ fontSize: "20px", fontWeight: 800, margin: "16px 0 8px" }}>
                  Experience
                </h3>
                <p>{expText}</p>
              </>
            )}
            <EligibilityCriteria post={post} embedded />
          </section>
        )}

        {/* Important Dates */}
        <section id="dates" className={styles.section} aria-labelledby="dates-h">
          <h2 id="dates-h" className={styles.sectionTitle}>
            Important dates
          </h2>
          <ImportantDates post={post} embedded />
        </section>

        {/* Vacancy Details */}
        {(vacancyCount != null || reportedVacancyCount != null ||
          post.enrichment?.vacanciesTotal != null ||
          (post.enrichment?.vacanciesByCategory && Object.keys(post.enrichment.vacanciesByCategory as object).length > 0)) && (
          <section id="vacancies" className={styles.section} aria-labelledby="vac-h">
            <h2 id="vac-h" className={styles.sectionTitle}>
              Seats and vacancies{reportedVacancyCount != null && vacancyCount == null ? " (reported)" : ""}
            </h2>
            <VacancyDetails post={post} resolvedFacts={resolvedFacts} embedded />
          </section>
        )}

        {/* Selection Process */}
        <section id="selection" className={styles.section} aria-labelledby="sel-h">
          <h2 id="sel-h" className={styles.sectionTitle}>
            How this post is filled
          </h2>
          <SelectionProcess
            post={post}
            recruitmentResolvedFacts={recruitmentResolvedFacts}
            embedded
          />
        </section>

        {/* Duties and Responsibilities */}
        <DutiesResponsibilities post={post} />

        {/* Salary and Compensation */}
        <SalaryCompensation post={post} resolvedFacts={resolvedFacts} />

        {/* Application Fee */}
        <section id="fee" className={styles.section} aria-labelledby="fee-h">
          <h2 id="fee-h" className={styles.sectionTitle}>
            Application fee
          </h2>
          <ApplicationFee post={post} embedded />
        </section>

        {/* How to Apply */}
        <section id="apply" className={styles.section} aria-labelledby="apply-h">
          <h2 id="apply-h" className={styles.sectionTitle}>
            How to apply
          </h2>
          <HowToApply
            post={post}
            recruitmentResolvedFacts={recruitmentResolvedFacts}
            embedded
          />
        </section>

        {/* Documents */}
        <section id="documents" className={styles.section} aria-labelledby="docs-h">
          <h2 id="docs-h" className={styles.sectionTitle}>
            Documents checklist
          </h2>
          <p className={styles.note}>
            Tick the ones that apply to you. Your progress is saved on this device.
          </p>
          <DocumentsRequired post={post} embedded />
        </section>

        {/* Other posts in this recruitment */}
        {siblingPosts.length > 0 && (
          <section id="other" className={styles.section} aria-labelledby="other-h">
            <h2 id="other-h" className={styles.sectionTitle}>
              Other posts in this recruitment
            </h2>
            <ul className={styles.links}>
              {siblingPosts.map((p) => (
                <li key={p.id}>
                  <Link href={`${localePrefix}/jobs/${post.recruitmentSlug}/${p.slug}`}>
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Back to hub for single-job recruitments */}
        {isSingleJobRecruitment && post.recruitmentSlug && (
          <section className={styles.section}>
            <p>
              For recruitment-wide details, timeline, and related information,
              visit the{" "}
              <Link href={`${localePrefix}/jobs/${post.recruitmentSlug}`}>
                recruitment hub page
              </Link>
              .
            </p>
          </section>
        )}

        {/* Source and verification */}
        <section id="source" className={styles.section} aria-labelledby="src-h">
          <h2 id="src-h" className={styles.sectionTitle}>
            Where this information comes from
          </h2>
          <OfficialSourceVerification
            post={post}
            recruitmentResolvedFacts={recruitmentResolvedFacts}
            embedded
          />
        </section>

      </article>

      {/* Footer note */}
      <div className={styles.footerNote}>
        JobOye organises available information about this role to help candidates review it.
        Details can be incomplete or change over time. Always confirm application-critical
        information with the official notification and the responsible organisation&apos;s website.
        JobOye is not affiliated with{" "}
        {post.organizationName ?? "the recruiting organisation"} and does not handle applications
        directly.
      </div>

      {/* Countdown JS — runs after hydration, safe no-op if data-end is absent */}
      <CountdownScript postSlug={post.slug} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client-side countdown — tiny inline script, SSR-safe
// ---------------------------------------------------------------------------
function CountdownScript({ postSlug }: { postSlug: string }) {
  const js = `
(function () {
  try {
    var art = document.querySelector('article[data-end]');
    if (!art) return;
    var start = Date.parse(art.getAttribute('data-start'));
    var end = Date.parse(art.getAttribute('data-end'));
    var now = Date.now();
    var day = function (t) { var d = new Date(t + 330 * 60000); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
    var days = Math.round((day(end) - day(now)) / 86400000);
    var state = now > end ? 'closed' : now < start ? 'upcoming' : days <= 3 ? 'closing' : 'open';
    var names = { open: 'Open', closing: 'Closing soon', closed: 'Closed', upcoming: 'Opens soon' };
    var text = state === 'closed' ? 'Applications are closed.'
      : state === 'upcoming' ? 'Applications have not opened yet.'
      : days === 0 ? 'Last day today.'
      : days === 1 ? '1 day left.'
      : days + ' days left.';
    document.querySelectorAll('[data-status]').forEach(function (n) {
      n.textContent = names[state];
    });
    document.querySelectorAll('[data-countdown]').forEach(function (n) {
      n.textContent = text;
    });
    document.documentElement.setAttribute('data-state', state);
    if (state === 'closed') {
      document.querySelectorAll('.apply-only').forEach(function (n) { n.style.display = 'none'; });
    }
  } catch (e) {}
})();
  `.trim();

  return (
    <script
      dangerouslySetInnerHTML={{ __html: js }}
    />
  );
}
