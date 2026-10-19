/**
 * Job Posting Page Component
 *
 * Layout: breadcrumb → blue hero → TOC strip → sections → footer.
 * Design matches the BhartiDesk post-leaf reference.
 */

import Link from "next/link";
import { JobPostingData } from "@/types/job-posting";
import JobPostingHeader from "./sections/job-posting-header";
import QuickFactsGrid from "./sections/quick-facts-grid";
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
import FAQSection from "./sections/faq-section";
import OfficialResourcesLinks from "./sections/official-resources-links";
import RelatedPostsLinks from "./sections/related-posts-links";
import JobPostingTabs from "./job-posting-tabs";
import styles from "./job-posting-page.module.css";
import type { RelatedPostsForLeaf } from "@/db/operations/get-posts";

interface RecruitmentData {
  recruitment: Record<string, unknown> & { name?: string | null };
  posts: Array<{ id: number | string; slug: string; title: string | null }>;
  totalPosts: number;
  isSingleJobRecruitment: boolean;
}

export interface ResolvedLeafFacts {
  vacancyCount: number | null;
  salary: { min: number; max: number; currency: string; period: string; verificationStatus?: "VERIFIED" | "PENDING" } | null;
  deadline: { date: Date | null; state: "OPEN" | "CLOSED" | "UNKNOWN"; verificationStatus?: "VERIFIED" | "PENDING" };
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
  relatedPosts?: RelatedPostsForLeaf | null;
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
  relatedPosts,
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
    const pl = post.enrichment?.payLevel;
    if (!pl) return null;
    if (typeof pl === "string") return `Level-${pl}`;
    if (pl && typeof pl === "object") {
      const level = (pl as { level?: unknown }).level;
      const scheme = (pl as { scheme?: unknown }).scheme;
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
  // For PENDING facts, use resolver-gated salary and mark as "reported" for pending status.
  const reportedSalaryRaw: string | null =
    resolvedFacts?.salary == null
      ? (post.fjaExtract?.salaryRaw ?? null)
      : null;

  // Reported vacancy from raw FJA field — used to decide whether to render
  // the Vacancies section even when the resolver returned null.
  // For PENDING facts, the resolver already provides the count; don't use raw fallback.
  const reportedVacancyCount: number | null = (() => {
    if (resolvedFacts?.vacancyCount != null) return null; // resolver handled it (includes PENDING)
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
    // Internal Organization link keeps the Post Leaf connected to its issuing body
    // (Phase 1 P0 #3: no orphan Posts). Falls back to plain text without a slug.
    const organizationSlug: string | null =
      typeof recruitment?.recruitment?.organizationSlug === "string"
        ? recruitment.recruitment.organizationSlug
        : null;
    factRows.push({
      term: "Employer",
      detail: organizationSlug ? (
        <Link href={`${localePrefix}/organizations/${organizationSlug}`}>
          {post.organizationName}
        </Link>
      ) : (
        post.organizationName
      ),
    });
  }
  if (post.sourcePostCode) {
    factRows.push({ term: "Vacancy number", detail: post.sourcePostCode });
  }
  // Vacancy: the resolver now returns PENDING vacancies as well
  // Show "reported" label for PENDING verification status
  if (vacancyCount != null) {
    // Note: vacancyCount is from the resolver, which may be PENDING
    // The resolver doesn't return the actual vacancy value separately here
    // This is handled at the section component level
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
  // Deadline: show verification status for PENDING facts
  if (deadlineDateStr) {
    const isPendingDeadline = resolvedFacts?.deadline?.verificationStatus === "PENDING";
    const term = isPendingDeadline ? "Last date (reported)" : "Last date";
    factRows.push({ term, detail: deadlineDateStr });
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
        {/* Hero Section (JobPostingHeader + QuickFactsGrid combined) */}
        <JobPostingHeader
          post={post}
          resolvedFacts={resolvedFacts}
          recruitmentResolvedFacts={recruitmentResolvedFacts}
          localePrefix={localePrefix}
          reportedDeadline={reportedDeadline}
        />
        <QuickFactsGrid post={post} resolvedFacts={resolvedFacts} />

        {/* Phase 2: Tab Navigation (replaces old TOC) */}
        <JobPostingTabs defaultTab="quick">

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

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PRIORITY 1 SECTIONS (always show)                                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}

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

        {/* Post at a glance (dl.facts) - Quick Facts Detailed */}
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

        {/* About the Role - Duties and Responsibilities */}
        <section id="role-details" className={styles.section} aria-labelledby="role-h">
          <h2 id="role-h" className={styles.sectionTitle}>
            About the role
          </h2>
          <DutiesResponsibilities post={post} />
        </section>

        {/* Eligibility Requirements */}
        {(qualText || expText ||
          post.enrichment?.education ||
          post.enrichment?.experience ||
          post.enrichment?.ageRulesByCategory ||
          post.enrichment?.ageNote ||
          post.enrichment?.ageRelaxationRules ||
          post.enrichment?.eligibilityPathways) && (
          <section id="eligibility" className={styles.section} aria-labelledby="elig-h">
            <h2 id="elig-h" className={styles.sectionTitle}>
              Eligibility Requirements
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
            <EligibilityCriteria post={post} resolvedFacts={resolvedFacts} embedded />
          </section>
        )}

        {/* Selection Process */}
        <section id="selection" className={styles.section} aria-labelledby="sel-h">
          <h2 id="sel-h" className={styles.sectionTitle}>
            Selection Process
          </h2>
          <SelectionProcess
            post={post}
            recruitmentResolvedFacts={recruitmentResolvedFacts}
            embedded
          />
        </section>

        {/* Important Dates */}
        <section id="dates" className={styles.section} aria-labelledby="dates-h">
          <h2 id="dates-h" className={styles.sectionTitle}>
            Important Dates
          </h2>
          <ImportantDates post={post} resolvedFacts={resolvedFacts} embedded />
        </section>

        {/* How to Apply */}
        <section id="apply" className={styles.section} aria-labelledby="apply-h">
          <h2 id="apply-h" className={styles.sectionTitle}>
            How to Apply
          </h2>
          <HowToApply
            post={post}
            recruitmentResolvedFacts={recruitmentResolvedFacts}
            embedded
          />
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PRIORITY 2 SECTIONS (if data exists)                               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}

        {/* Vacancy Details */}
        {(vacancyCount != null || reportedVacancyCount != null ||
          post.enrichment?.vacanciesTotal != null ||
          (post.enrichment?.vacanciesByCategory && Object.keys(post.enrichment.vacanciesByCategory as object).length > 0)) && (
          <section id="vacancies" className={styles.section} aria-labelledby="vac-h">
            <h2 id="vac-h" className={styles.sectionTitle}>
              Vacancy Details{reportedVacancyCount != null && vacancyCount == null ? " (reported)" : ""}
            </h2>
            <VacancyDetails post={post} resolvedFacts={resolvedFacts} embedded />
          </section>
        )}

        {/* Salary & Compensation */}
        <div id="salary">
          <SalaryCompensation post={post} resolvedFacts={resolvedFacts} />
        </div>

        {/* Application Fee */}
        <section id="fee" className={styles.section} aria-labelledby="fee-h">
          <h2 id="fee-h" className={styles.sectionTitle}>
            Application Fee
          </h2>
          <ApplicationFee post={post} embedded />
        </section>

        {/* Benefits & Perks */}
        {post.enrichment?.benefits && post.enrichment.benefits.length > 0 && (
          <section id="benefits" className={styles.section} aria-labelledby="ben-h">
            <h2 id="ben-h" className={styles.sectionTitle}>
              Benefits & Perks
            </h2>
            <ul style={{ marginLeft: "20px", color: "var(--text-secondary)" }}>
              {post.enrichment.benefits.map((benefit, idx) => (
                <li key={idx} style={{ marginBottom: "8px", fontSize: "15px", lineHeight: "1.6" }}>
                  {benefit}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Experience Requirements (Structured) */}
        {post.enrichment?.experience && (
          <section id="experience-detail" className={styles.section} aria-labelledby="exp-detail-h">
            <h2 id="exp-detail-h" className={styles.sectionTitle}>
              Experience Requirements
            </h2>
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontWeight: 600, marginBottom: "8px", color: "var(--text-primary)" }}>
                Minimum: {post.enrichment.experience.minYears} year{post.enrichment.experience.minYears !== 1 ? 's' : ''}
              </p>
              {post.enrichment.experience.countedFrom && (
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                  Counted from: {post.enrichment.experience.countedFrom}
                </p>
              )}
            </div>
            {post.enrichment.experience.domains && post.enrichment.experience.domains.length > 0 && (
              <div>
                <p style={{ fontWeight: 600, marginBottom: "8px", color: "var(--text-primary)" }}>
                  Relevant domains:
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {post.enrichment.experience.domains.map((domain, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: "#ffffff",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "14px",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-light)",
                      }}
                    >
                      {domain}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Education Requirements */}
        {post.enrichment?.education && (
          <section id="education" className={styles.section} aria-labelledby="edu-h">
            <h2 id="edu-h" className={styles.sectionTitle}>
              Education Requirements
            </h2>
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ padding: "12px", background: "#ffffff", borderRadius: "6px" }}>
                <p style={{ margin: "0 0 6px 0", fontWeight: 600, color: "var(--text-primary)" }}>
                  {post.enrichment.education.degree}
                </p>
                {post.enrichment.education.university && (
                  <p style={{ margin: "4px 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                    University: {post.enrichment.education.university}
                  </p>
                )}
                {post.enrichment.education.registration && (
                  <p style={{ margin: "4px 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                    Registration: {post.enrichment.education.registration}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Eligibility Pathways */}
        {post.enrichment?.eligibilityPathways && post.enrichment.eligibilityPathways.length > 0 && (
          <section id="pathways" className={styles.section} aria-labelledby="path-h">
            <h2 id="path-h" className={styles.sectionTitle}>
              Eligibility Pathways
            </h2>
            <div style={{ display: "grid", gap: "16px" }}>
              {post.enrichment.eligibilityPathways.map((pathway, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "16px",
                    background: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid var(--border-light)",
                  }}
                >
                  <h4 style={{ fontWeight: 700, marginBottom: "8px", color: "var(--text-primary)" }}>
                    Pathway {pathway.pathway}: {pathway.description}
                  </h4>
                  {pathway.qualifications && pathway.qualifications.length > 0 && (
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                      <strong>Qualifications:</strong> {pathway.qualifications.join(", ")}
                    </p>
                  )}
                  {pathway.experienceYears && (
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                      <strong>Experience:</strong> {pathway.experienceYears} year{pathway.experienceYears !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Documents Checklist */}
        <section id="documents" className={styles.section} aria-labelledby="docs-h">
          <h2 id="docs-h" className={styles.sectionTitle}>
            Documents Checklist
          </h2>
          <p className={styles.note}>
            Tick the ones that apply to you. Your progress is saved on this device.
          </p>
          <DocumentsRequired post={post} embedded />
        </section>

        {/* Enhanced Documents Required Section */}
        {post.enrichment?.documentsRequired && (
          (post.enrichment.documentsRequired.required?.length > 0 ||
          post.enrichment.documentsRequired.common?.length > 0)
        ) && (
          <section id="documents-enriched" className={styles.section} aria-labelledby="docs-enrich-h">
            <h2 id="docs-enrich-h" className={styles.sectionTitle}>
              Complete Document List
            </h2>
            <div style={{ display: "grid", gap: "16px" }}>
              {post.enrichment.documentsRequired.required?.length > 0 && (
                <div style={{ padding: "12px", background: "#ffffff", borderRadius: "6px" }}>
                  <h4 style={{ fontWeight: 700, marginBottom: "8px", color: "var(--text-primary)" }}>
                    ✓ Mandatory Documents:
                  </h4>
                  <ul style={{ marginLeft: "20px", margin: 0, color: "var(--text-secondary)" }}>
                    {post.enrichment.documentsRequired.required.map((doc, idx) => (
                      <li key={idx} style={{ marginBottom: "6px", fontSize: "15px", lineHeight: "1.5" }}>
                        {doc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {post.enrichment.documentsRequired.common?.length > 0 && (
                <div style={{ padding: "12px", background: "#ffffff", borderRadius: "6px" }}>
                  <h4 style={{ fontWeight: 700, marginBottom: "8px", color: "var(--text-primary)" }}>
                    📋 Commonly Required Documents:
                  </h4>
                  <ul style={{ marginLeft: "20px", margin: 0, color: "var(--text-secondary)" }}>
                    {post.enrichment.documentsRequired.common.map((doc, idx) => (
                      <li key={idx} style={{ marginBottom: "6px", fontSize: "15px", lineHeight: "1.5" }}>
                        {doc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PRIORITY 3 SECTIONS (meta)                                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}

        {/* Data Quality & Verification */}
        {post.enrichment && (
          <section id="dataQuality" className={styles.section} aria-labelledby="quality-h">
            <h2 id="quality-h" className={styles.sectionTitle}>
              Data Quality & Verification
            </h2>
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ padding: "12px", background: "#ffffff", borderRadius: "6px" }}>
                <p style={{ margin: "0 0 4px 0", fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>
                  Verification Status
                </p>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-secondary)",
                    fontSize: "15px",
                    fontWeight: 500,
                  }}
                >
                  {post.enrichment.sourceVerificationStatus || "PENDING"}
                </p>
                {post.enrichment.sourceVerificationDate && (
                  <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "var(--text-tertiary)" }}>
                    Last verified:{" "}
                    {new Date(post.enrichment.sourceVerificationDate).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>

              <div style={{ padding: "12px", background: "#ffffff", borderRadius: "6px" }}>
                <p style={{ margin: "0 0 8px 0", fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>
                  Data Extraction Confidence
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      height: "8px",
                      flex: 1,
                      background: "#f3f4f6",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${post.enrichment.extractionConfidence || 0}%`,
                        background:
                          post.enrichment.extractionConfidence >= 80
                            ? "var(--success)"
                            : post.enrichment.extractionConfidence >= 60
                              ? "var(--warning)"
                              : "var(--danger)",
                        transition: "width 300ms ease",
                      }}
                    />
                  </div>
                  <span style={{ fontWeight: 600, color: "var(--text-secondary)", minWidth: "50px", fontSize: "14px" }}>
                    {post.enrichment.extractionConfidence || 0}%
                  </span>
                </div>
              </div>

              {post.enrichment.dataGaps && post.enrichment.dataGaps.length > 0 && (
                <div style={{ padding: "12px", background: "#fef3c7", borderRadius: "6px", borderLeft: "4px solid var(--warning)" }}>
                  <p style={{ margin: "0 0 8px 0", fontWeight: 600, color: "#92400e", fontSize: "14px" }}>
                    ⚠️ Data Gaps Identified:
                  </p>
                  <ul style={{ marginLeft: "20px", margin: 0, color: "#78350f" }}>
                    {post.enrichment.dataGaps.map((gap, idx) => (
                      <li key={idx} style={{ marginBottom: "4px", fontSize: "13px" }}>
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Official Resources Links */}
        <OfficialResourcesLinks
          post={post}
          recruitmentResolvedFacts={recruitmentResolvedFacts}
        />

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

        {/* Other posts in this recruitment */}
        {siblingPosts.length > 0 && (
          <section id="other" className={styles.section} aria-labelledby="other-h">
            <h2 id="other-h" className={styles.sectionTitle}>
              Other posts in this recruitment ({siblingPosts.length})
            </h2>
            <div className={styles.postsGrid}>
              {siblingPosts.map((p) => (
                <Link
                  key={p.id}
                  href={`${localePrefix}/jobs/${post.recruitmentSlug}/${p.slug}`}
                  className={styles.postCard}
                >
                  <div className={styles.postCardTitle}>{p.title}</div>
                  <div className={styles.postCardMeta}>
                    <span>View details →</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQs */}
        <FAQSection post={post} embedded={false} />

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

        </JobPostingTabs>
      </article>

      {/* ── Related posts: position hub, org jobs, state jobs ──────────── */}
      {relatedPosts && (
        <RelatedPostsLinks
          related={relatedPosts}
          localePrefix={localePrefix}
          currentOrganizationName={post.organizationName ?? null}
          currentLocationState={post.locationState ?? null}
        />
      )}

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
