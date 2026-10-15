/**
 * Job Posting Header Section
 * Blue hero card: chips, H1, lead, yellow deadline box, action buttons.
 * Matches the BhartiDesk post-leaf reference design.
 */

import { JobPostingData } from "@/types/job-posting";
import { ResolvedLeafFacts, ResolvedRecruitmentFacts } from "../job-posting-page";
import styles from "../job-posting-page.module.css";

interface JobPostingHeaderProps {
  post: JobPostingData;
  resolvedFacts?: ResolvedLeafFacts;
  recruitmentResolvedFacts?: ResolvedRecruitmentFacts | null;
  localePrefix?: string;
  reportedDeadline?: Date | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDateLong(d: Date | null | undefined): string | null {
  if (!d) return null;
  try {
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return null;
  }
}

function fmtDatetime(d: Date | null | undefined): string | null {
  if (!d) return null;
  try {
    return d.toISOString().replace(/\.\d{3}Z$/, "+05:30");
  } catch {
    return null;
  }
}

function buildH1(
  title: string,
  organizationName: string | null | undefined,
  deadline: { date: Date | null; state: "OPEN" | "CLOSED" | "UNKNOWN" } | null | undefined,
  recruitmentName: string | null | undefined,
  notificationPublicationDate: Date | null | undefined
): string {
  // Extract year: prefer recruitmentName, then deadline, then notification date
  let year: string | null = null;
  const yearMatch = recruitmentName?.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    year = yearMatch[1];
  } else if (deadline?.date) {
    year = String(deadline.date.getFullYear());
  } else if (notificationPublicationDate) {
    year = String(new Date(notificationPublicationDate).getFullYear());
  }

  // Build: "Post Title at Org – Recruitment Year"
  // - Org: append only when not already present in title
  // - Year: append as "– Recruitment YYYY" to signal recency without the full recruitment name
  // - Deadline and full recruitment name are intentionally excluded:
  //   the deadline has its own dedicated box; the full recruitment name belongs on the hub.
  const orgPart = organizationName && !title.toLowerCase().includes(organizationName.toLowerCase())
    ? ` at ${organizationName}`
    : "";
  const yearPart = year ? ` – Recruitment ${year}` : "";

  return `${title}${orgPart}${yearPart}`;
}

// ---------------------------------------------------------------------------
// Chip state
// ---------------------------------------------------------------------------

function getChipClass(state: "OPEN" | "CLOSED" | "UNKNOWN"): string {
  if (state === "OPEN") return `${styles.chip} ${styles.chipOpen}`;
  if (state === "CLOSED") return `${styles.chip} ${styles.chipClosed}`;
  return styles.chip;
}

function getChipText(state: "OPEN" | "CLOSED" | "UNKNOWN"): string {
  if (state === "OPEN") return "Open";
  if (state === "CLOSED") return "Closed";
  return "Check Notification";
}

export default function JobPostingHeader({
  post,
  resolvedFacts,
  recruitmentResolvedFacts,
  localePrefix = "",
  reportedDeadline,
}: JobPostingHeaderProps) {
  const deadline = resolvedFacts?.deadline;
  const applyUrl = recruitmentResolvedFacts?.applicationUrl ?? null;
  const sourceUrl = recruitmentResolvedFacts?.officialSource ?? null;

  // When the resolver returned UNKNOWN, use the reported deadline (from aggregator) for display
  const isDeadlineUnknown = !deadline || deadline.state === "UNKNOWN";
  const effectiveDeadlineDate = deadline?.date ?? (isDeadlineUnknown ? (reportedDeadline ?? null) : null);
  const effectiveDeadlineDateStr = fmtDateLong(effectiveDeadlineDate);
  // When resolver returned UNKNOWN, derive a provisional open/closed state from the reported date
  const effectiveState: "OPEN" | "CLOSED" | "UNKNOWN" = deadline?.state !== "UNKNOWN"
    ? (deadline?.state ?? "UNKNOWN")
    : effectiveDeadlineDate
      ? (effectiveDeadlineDate.getTime() > Date.now() ? "OPEN" : "CLOSED")
      : "UNKNOWN";

  // Pass effective deadline to H1 builder so it can include "Apply by" when resolver returned UNKNOWN
  const richH1 = buildH1(
    post.title,
    post.organizationName,
    effectiveDeadlineDate ? { date: effectiveDeadlineDate, state: effectiveState } : deadline,
    post.recruitmentName,
    post.notificationPublicationDate
  );

  // Employment type
  const employmentType = post.employmentType
    ? post.employmentType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  // Pay level
  const payLevel = (() => {
    const pl = post.enrichment?.payLevel || post.payLevel;
    if (!pl) return null;
    if (typeof pl === "string") return `Pay Level-${pl}`;
    if (pl && typeof pl === "object") {
      const level = (pl as { level?: unknown }).level;
      const scheme = (pl as { scheme?: unknown }).scheme;
      return scheme ? `Level-${level} (${scheme})` : `Level-${level}`;
    }
    return null;
  })();

  const vacancyCount = resolvedFacts?.vacancyCount;

  const deadlineDatetimeStr = effectiveDeadlineDate ? fmtDatetime(effectiveDeadlineDate) : null;

  // Eligibility summary (Phase 1: display text only — no eligibility engine)
  const qualText: string | null =
    post.fjaExtract?.eligibilityRaw ?? post.fjaExtract?.qualificationRaw ?? null;
  const expText: string | null = post.fjaExtract?.experienceRaw ?? null;

  // Location
  const location: string | null =
    post.locationCity ??
    (typeof post.fjaExtract?.locationRaw === "string" ? post.fjaExtract.locationRaw : null) ??
    null;

  // Get exam type from post
  const examType = post.examType ?? null;

  // Get fee if available (take first category fee for display)
  const applicationFee = post.enrichment?.feesByCategory
    ? Object.values(post.enrichment.feesByCategory)[0] ?? null
    : null;

  // Get age limits if available (take first category for display)
  const ageRules = post.enrichment?.ageRulesByCategory
    ? Object.values(post.enrichment.ageRulesByCategory)[0] ?? null
    : null;
  const ageMin = ageRules?.min ?? null;
  const ageMax = ageRules?.max ?? null;

  return (
    <header className={`${styles.card} ${styles.hero}`}>
      {/* Status chip — single, minimal */}
      <ul className={styles.chips}>
        <li className={getChipClass(effectiveState)} data-status="true">
          {getChipText(effectiveState)}{isDeadlineUnknown && effectiveState !== "UNKNOWN" ? " (reported)" : ""}
        </li>
      </ul>

      {/* H1 — main title */}
      <h1 className={styles.jobTitle}>{richH1}</h1>

      {/* ENRICHMENT FACTS ROW — Fee, Age, Vacancy, Exam inline for immediate visibility */}
      {(applicationFee !== null || (ageMin && ageMax) || vacancyCount !== null || examType) && (
        <div className={styles.enrichmentRow}>
          {applicationFee !== null && (
            <div className={styles.enrichmentItem}>
              <span className={styles.enrichmentLabel}>Fee</span>
              <span className={styles.enrichmentValue}>
                {typeof applicationFee === "number" ? `₹${applicationFee.toLocaleString("en-IN")}` : applicationFee}
              </span>
            </div>
          )}
          {ageMin && ageMax && (
            <div className={styles.enrichmentItem}>
              <span className={styles.enrichmentLabel}>Age</span>
              <span className={styles.enrichmentValue}>{ageMin}–{ageMax} yrs</span>
            </div>
          )}
          {vacancyCount !== null && (
            <div className={styles.enrichmentItem}>
              <span className={styles.enrichmentLabel}>Vacancies</span>
              <span className={styles.enrichmentValue}>{vacancyCount.toLocaleString("en-IN")}</span>
            </div>
          )}
          {examType && (
            <div className={styles.enrichmentItem}>
              <span className={styles.enrichmentLabel}>Exam</span>
              <span className={styles.enrichmentValue}>{examType}</span>
            </div>
          )}
          {location && (
            <div className={styles.enrichmentItem}>
              <span className={styles.enrichmentLabel}>Location</span>
              <span className={styles.enrichmentValue}>{location}</span>
            </div>
          )}
        </div>
      )}

      {/* Context paragraph — organization, employment type, pay, deadline */}
      <p className={styles.contextPara}>
        {post.organizationName && <span>{post.organizationName}</span>}
        {employmentType && <span>{employmentType}</span>}
        {payLevel && <span>{payLevel}</span>}
        {effectiveDeadlineDateStr && effectiveState === "OPEN" && (
          <span className={styles.deadlineInline}>
            Apply by <strong>{effectiveDeadlineDateStr}</strong>
          </span>
        )}
        {effectiveState === "CLOSED" && effectiveDeadlineDateStr && (
          <span className={styles.closedInline}>
            Closed {effectiveDeadlineDateStr}
          </span>
        )}
      </p>

      {/* Deadline box — prominent only if needed */}
      {effectiveDeadlineDateStr && effectiveState !== "CLOSED" && (
        <div className={styles.deadline}>
          <strong className={styles.deadlineLabel}>
            Last date to apply
          </strong>
          <time className={styles.deadlineDate} dateTime={deadlineDatetimeStr ?? undefined}>
            {effectiveDeadlineDateStr}
          </time>
          <span className={styles.deadlineCountdown} data-countdown="true">
            {`Closing ${effectiveDeadlineDateStr}`}
          </span>
        </div>
      )}

      {/* Closed notice */}
      {effectiveState === "CLOSED" && (
        <p className={styles.closedNote} style={{ display: "block" }}>
          Applications for this post are closed. This page will be updated when results or next steps are announced.
        </p>
      )}

      {/* Action buttons */}
      <p className={styles.actions}>
        {applyUrl && effectiveState !== "CLOSED" && (
          <a
            className={`${styles.btn} ${styles.btnPrimary}`}
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Apply on official portal →
          </a>
        )}
        {sourceUrl && (
          <a className={styles.btn} href={sourceUrl} target="_blank" rel="noopener noreferrer">
            Official notification
          </a>
        )}
        {post.recruitmentSlug && (
          <a className={styles.btnQuiet} href={`${localePrefix}/jobs/${post.recruitmentSlug}`}>
            All posts in recruitment
          </a>
        )}
      </p>

      {/* Verified meta */}
      {post.fjaExtract?.verificationStatus === "VERIFIED" && (
        <p className={styles.heroMeta}>
          Verified against official notification.
        </p>
      )}
    </header>
  );
}
