/**
 * Quick Facts Section
 * Displays key facts in a grid layout
 */

import { JobPostingData } from "@/types/job-posting";
import { ResolvedLeafFacts } from "../job-posting-page";
import styles from "../job-posting-page.module.css";

interface QuickFactsProps {
  post: JobPostingData;
  resolvedFacts?: ResolvedLeafFacts;
}

export default function QuickFacts({ post, resolvedFacts }: QuickFactsProps) {
  const deadline = resolvedFacts?.deadline;
  const reportedDeadline = Array.isArray(post.fjaExtract?.milestonesRaw)
    ? post.fjaExtract.milestonesRaw
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        .find((item) => typeof item.event === "string" && /application deadline/i.test(item.event) && typeof item.date === "string")
    : null;
  const officialDeadlineDate =
    deadline?.state === "OPEN" || deadline?.state === "CLOSED" ? deadline.date : null;
  const deadlineDisplay = officialDeadlineDate
    ? new Date(officialDeadlineDate).toLocaleDateString("en-IN", {
        month: "short", day: "numeric", year: "numeric",
      })
    : reportedDeadline && typeof reportedDeadline.date === "string"
      ? new Date(`${reportedDeadline.date}T12:00:00`).toLocaleDateString("en-IN", {
          month: "short", day: "numeric", year: "numeric",
        })
      : "See Notification";
  const deadlineLabel = !officialDeadlineDate && reportedDeadline
    ? "Application Deadline (reported)"
    : "Application Closes";

  const facts = [
    {
      label: post.fjaExtract && post.fjaExtract.verificationStatus !== "VERIFIED" ? "Vacancies (reported)" : "Vacancies",
      value: resolvedFacts?.vacancyCount != null
        ? resolvedFacts.vacancyCount.toLocaleString("en-IN")
        : "See Notification",
    },
    {
      label: deadlineLabel,
      value: deadlineDisplay,
    },
    {
      label: "Exam Date",
      value: post.enrichment?.examDate
        ? new Date(post.enrichment.examDate).toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "See official notification",
    },
    {
      label: post.fjaExtract && post.fjaExtract.verificationStatus !== "VERIFIED" ? "Job Type (reported)" : "Job Type",
      value: post.employmentType
        ? post.employmentType.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
        : "See Notification",
    },
  ];

  return (
    <div style={quickFactsStyles.section}>
      <div style={quickFactsStyles.grid}>
        {facts.map((fact, index) => (
          <div key={index} style={quickFactsStyles.factCard}>
            <div style={quickFactsStyles.factLabel}>{fact.label}</div>
            <div style={quickFactsStyles.factValue}>{fact.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const quickFactsStyles = {
  section: {
    marginBottom: "32px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
  },
  factCard: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "20px",
    textAlign: "center" as const,
  },
  factLabel: {
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    color: "#4b5563",
    marginBottom: "8px",
    letterSpacing: "0.5px",
  },
  factValue: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#111827",
  },
};
