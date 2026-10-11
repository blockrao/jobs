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

  return (
    <div style={headerStyles.container}>
      <div style={headerStyles.headerTop}>
        <span style={headerStyles.orgBadge}>{post.organizationName}</span>
        <span
          style={{
            ...headerStyles.statusBadge,
            background:
              statusColor === "danger"
                ? "#ef4444"
                : statusColor === "neutral"
                  ? "#6b7280"
                  : "#059669",
          }}
        >
          {statusText}
        </span>
      </div>
      <h1 style={headerStyles.jobTitle}>{post.title}</h1>
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
    background: "#003366",
    color: "white",
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
