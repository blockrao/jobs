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
  let year: string | null = null;
  const yearMatch = recruitmentName?.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    year = yearMatch[1];
  } else if (deadline?.date) {
    year = String(deadline.date.getFullYear());
  } else if (notificationPublicationDate) {
    year = String(new Date(notificationPublicationDate).getFullYear());
  }

  const org = organizationName ? `, ${organizationName}` : "";
  const yearPart = year ? ` (${recruitmentName?.match(/\b(20\d{2})\b/)?.[0] ? recruitmentName : year})` : "";
  let suffix = "";
  if (deadline?.state === "OPEN" && deadline.date) {
    const dateStr = fmtDateLong(deadline.date);
    suffix = dateStr ? `: Apply by ${dateStr}` : "";
  } else if (deadline?.state === "CLOSED") {
    suffix = ": Applications closed";
  }

  // Build: "Post Title, Org Name (Recruitment Name Year): Apply by Date"
  // But keep it clean — only add org if different from what's already in title
  const orgPart = organizationName && !title.includes(organizationName) ? `${org}` : "";
  const recPart = recruitmentName && !title.includes(recruitmentName)
    ? ` (${recruitmentName})`
    : yearPart;

  return `${title}${orgPart}${recPart}${suffix}`;
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

  // Lead: show employment type, pay level, vacancy count
  const employmentType = post.employmentType
    ? post.employmentType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  const payLevel = (() => {
    const pl = post.enrichment?.payLevel || post.payLevel;
    if (!pl) return null;
    if (typeof pl === "string") return `Pay Level-${pl}`;
    if (pl && typeof pl === "object") {
      const level = (pl as any).level;
      const scheme = (pl as any).scheme;
      return scheme ? `Pay Level-${level} (${scheme})` : `Pay Level-${level}`;
    }
    return null;
  })();

  const vacancyCount = resolvedFacts?.vacancyCount;

  // Build a compact lead sentence from available facts
  const leadParts: string[] = [];
  if (vacancyCount != null) {
    leadParts.push(`${vacancyCount.toLocaleString("en-IN")} ${vacancyCount === 1 ? "vacancy" : "vacancies"}`);
  }
  if (payLevel) leadParts.push(payLevel);
  if (employmentType) leadParts.push(employmentType.toLowerCase());

  const deadlineDatetimeStr = effectiveDeadlineDate ? fmtDatetime(effectiveDeadlineDate) : null;

  // Eligibility summary for lead (Phase 1: display text only — no eligibility engine)
  const qualText: string | null =
    post.fjaExtract?.eligibilityRaw ?? post.fjaExtract?.qualificationRaw ?? null;
  const expText: string | null = post.fjaExtract?.experienceRaw ?? null;

  return (
    <header className={`${styles.card} ${styles.hero}`}>
      {/* Status + category chips */}
      <ul className={styles.chips}>
        <li
          className={getChipClass(effectiveState)}
          data-status="true"
        >
          {getChipText(effectiveState)}{isDeadlineUnknown && effectiveState !== "UNKNOWN" ? " (reported)" : ""}
        </li>
        {employmentType && (
          <li className={styles.chip}>{employmentType}</li>
        )}
        {post.organizationName && (
          <li className={styles.chip}>{post.organizationName}</li>
        )}
      </ul>

      {/* H1 */}
      <h1 className={styles.jobTitle}>{richH1}</h1>

      {/* Lead paragraph */}
      {leadParts.length > 0 && (
        <p className={styles.lead}>
          {leadParts.join(", ").replace(/^./, (c) => c.toUpperCase())}.
          {effectiveDeadlineDateStr && effectiveState === "OPEN" && (
            <> Apply by <strong>{effectiveDeadlineDateStr}</strong>{isDeadlineUnknown ? " (reported)" : ""}.</>
          )}
          {qualText && (
            <> Requires: {qualText}.</>
          )}
        </p>
      )}

      {/* Deadline box */}
      {effectiveDeadlineDateStr && (
        <div className={styles.deadline}>
          <strong className={styles.deadlineLabel}>
            Last date to apply{isDeadlineUnknown ? " (reported)" : ""}
          </strong>
          <time
            className={styles.deadlineDate}
            dateTime={deadlineDatetimeStr ?? undefined}
          >
            {effectiveDeadlineDateStr}
          </time>
          <span className={styles.deadlineCountdown} data-countdown="true">
            {effectiveState === "CLOSED"
              ? "Applications are closed."
              : `Closing ${effectiveDeadlineDateStr}`}
          </span>
        </div>
      )}

      {/* Closed notice */}
      {effectiveState === "CLOSED" && (
        <p
          className={styles.closedNote}
          style={{ display: "block" }}
        >
          Applications for this post are closed. This page will be updated when results or next steps are announced.
        </p>
      )}

      {/* Action buttons */}
      <p className={styles.actions}>
        {applyUrl && deadline?.state !== "CLOSED" && (
          <a
            className={`${styles.btn} ${styles.btnPrimary}`}
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Apply on official portal
          </a>
        )}
        {sourceUrl && (
          <a
            className={styles.btn}
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Official notification
          </a>
        )}
        {post.recruitmentSlug && (
          <a
            className={styles.btnQuiet}
            href={`${localePrefix}/jobs/${post.recruitmentSlug}`}
          >
            All posts in this recruitment
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
