/**
 * Job Posting Header Section
 * Displays title, organization, status, and meta info
 */

import { JobPostingData } from "@/types/job-posting";
import { ResolvedLeafFacts } from "../job-posting-page";
import styles from "../job-posting-page.module.css";

interface JobPostingHeaderProps {
  post: JobPostingData;
  resolvedFacts?: ResolvedLeafFacts;
}

// ---------------------------------------------------------------------------
// Helpers — date formatting and deadline suffix for the H1
// ---------------------------------------------------------------------------

/** Format a Date to "20 Oct 2026" style (en-IN locale). */
function fmtDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  try {
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return null;
  }
}

/**
 * Build the display-H1 string for a post leaf page.
 *
 * Pattern (discoverability-framework Task #30):
 *   "[Post Title] – [Org] [Year]: Apply by [Date]"  (open, deadline known)
 *   "[Post Title] – [Org] [Year]"                   (open, no deadline)
 *   "[Post Title] – [Org] [Year]: Applications closed"  (closed)
 *
 * The recruitment year is extracted from:
 *   1. post.recruitmentName (e.g. "IIIT Kota JRF Recruitment 2026" → 2026)
 *   2. deadline.date year
 *   3. notificationPublicationDate year
 * Kept short: org and year are capped; the recruitment name is NOT repeated verbatim
 * to avoid a 36px line that wraps badly on mobile.
 */
function buildH1(
  title: string,
  organizationName: string | null | undefined,
  deadline: { date: Date | null; state: "OPEN" | "CLOSED" | "UNKNOWN" } | null | undefined,
  recruitmentName: string | null | undefined,
  notificationPublicationDate: Date | null | undefined
): string {
  // Extract year
  let year: string | null = null;
  const yearMatch = recruitmentName?.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    year = yearMatch[1];
  } else if (deadline?.date) {
    year = String(deadline.date.getFullYear());
  } else if (notificationPublicationDate) {
    year = String(new Date(notificationPublicationDate).getFullYear());
  }

  // Build suffix
  const org = organizationName ? ` – ${organizationName}` : "";
  const yearPart = year ? ` ${year}` : "";
  let suffix = "";
  if (deadline?.state === "OPEN" && deadline.date) {
    const dateStr = fmtDate(deadline.date);
    suffix = dateStr ? `: Apply by ${dateStr}` : "";
  } else if (deadline?.state === "CLOSED") {
    suffix = ": Applications closed";
  }

  return `${title}${org}${yearPart}${suffix}`;
}

export default function JobPostingHeader({ post, resolvedFacts }: JobPostingHeaderProps) {
  // Use resolver output — never compute deadline from raw enrichment
  const deadline = resolvedFacts?.deadline;
  const statusColor =
    deadline?.state === "OPEN"
      ? "success"
      : "neutral";
  // UNKNOWN deadline must never be shown as "OPEN"
  const statusText =
    deadline?.state === "OPEN"
      ? "APPLICATION OPEN"
      : deadline?.state === "CLOSED"
        ? "CLOSED"
        : "CHECK NOTIFICATION";

  const employmentType = post.employmentType
    ? post.employmentType.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    : "See Notification";

  // Rich H1: "[Post Title] – [Org] [Year]: Apply by [Date]"
  // Visible H1 is enriched; screen readers and crawlers get the full context inline.
  const richH1 = buildH1(
    post.title,
    post.organizationName,
    deadline,
    post.recruitmentName,
    post.notificationPublicationDate
  );

  return (
    <div style={headerStyles.container}>
      <div style={headerStyles.headerTop}>
        <span style={headerStyles.orgBadge}>{post.organizationName}</span>
        <span
          style={{
            ...headerStyles.statusBadge,
            background: statusColor === "neutral" ? "#6b7280" : "#059669",
          }}
        >
          {statusText}
        </span>
      </div>
      <h1 style={headerStyles.jobTitle}>{richH1}</h1>
      <div style={headerStyles.jobMeta}>
        {post.enrichment?.payLevel && (
          <div style={headerStyles.metaItem}>
            <span style={headerStyles.metaLabel}>Grade:</span>
            <span style={headerStyles.metaValue}>
              Level {post.enrichment.payLevel}
            </span>
          </div>
        )}
        <div style={headerStyles.metaItem}>
          <span style={headerStyles.metaLabel}>Type:</span>
          <span style={headerStyles.metaValue}>{employmentType}</span>
        </div>
        {resolvedFacts?.vacancyCount != null && (
          <div style={headerStyles.metaItem}>
            <span style={headerStyles.metaLabel}>{post.fjaExtract && post.fjaExtract.verificationStatus !== "VERIFIED" ? "Vacancies reported:" : "Vacancies:"}</span>
            <span style={headerStyles.metaValue}>
              {resolvedFacts.vacancyCount.toLocaleString("en-IN")}
            </span>
          </div>
        )}
        {post.fjaExtract?.locationRaw && (
          <div style={headerStyles.metaItem}>
            <span style={headerStyles.metaLabel}>Location reported:</span>
            <span style={headerStyles.metaValue}>{post.fjaExtract.locationRaw}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const headerStyles = {
  container: {
    background: "white",
    borderRadius: "12px",
    padding: "32px",
    marginBottom: "32px",
    border: "1px solid #e5e7eb",
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },
  orgBadge: {
    background: "#0f172a",
    color: "#ffd60a",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 700,
  },
  statusBadge: {
    color: "white",
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 700,
  },
  jobTitle: {
    fontSize: "36px",
    fontWeight: 800,
    lineHeight: 1.2,
    color: "#111827",
    marginBottom: "8px",
    margin: 0,
  },
  jobMeta: {
    fontSize: "16px",
    color: "#4b5563",
    display: "flex" as const,
    gap: "20px",
    flexWrap: "wrap" as const,
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  metaLabel: {
    color: "#4b5563",
  },
  metaValue: {
    fontWeight: 600,
    color: "#111827",
  },
};
