/**
 * Job Posting Header Section
 * Displays title, organization, status, and meta info
 */

import { JobPostingData } from "@/types/job-posting";
import styles from "../job-posting-page.module.css";

interface JobPostingHeaderProps {
  post: JobPostingData;
}

export default function JobPostingHeader({ post }: JobPostingHeaderProps) {
  const daysUntilClose = post.enrichment?.applicationClosingDate
    ? Math.ceil(
        (new Date(post.enrichment.applicationClosingDate).getTime() -
          new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const statusColor =
    daysUntilClose !== null && daysUntilClose <= 7 ? "danger" : "success";
  const statusText =
    daysUntilClose !== null
      ? daysUntilClose > 0
        ? `${daysUntilClose} DAYS LEFT`
        : "CLOSED"
      : "OPEN";

  return (
    <div style={headerStyles.container}>
      <div style={headerStyles.headerTop}>
        <span style={headerStyles.orgBadge}>{post.organizationName}</span>
        <span
          style={{
            ...headerStyles.statusBadge,
            background: statusColor === "danger" ? "#ef4444" : "#059669",
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
          <span style={headerStyles.metaValue}>Permanent</span>
        </div>
        {post.enrichment?.vacanciesTotal && (
          <div style={headerStyles.metaItem}>
            <span style={headerStyles.metaLabel}>Vacancies:</span>
            <span style={headerStyles.metaValue}>
              {post.enrichment.vacanciesTotal}
            </span>
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
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
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
