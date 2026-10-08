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
  const deadlineDisplay =
    deadline?.state === "OPEN" && deadline.date
      ? new Date(deadline.date).toLocaleDateString("en-IN", {
          month: "short", day: "numeric", year: "numeric",
        })
      : deadline?.state === "CLOSED" && deadline.date
      ? new Date(deadline.date).toLocaleDateString("en-IN", {
          month: "short", day: "numeric", year: "numeric",
        })
      : "See Notification";

  const facts = [
    {
      label: "Vacancies",
      value: resolvedFacts?.vacancyCount != null
        ? resolvedFacts.vacancyCount.toLocaleString("en-IN")
        : "See Notification",
    },
    {
      label: "Application Closes",
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
        : "N/A",
    },
    {
      label: "Job Type",
      value: "Permanent",
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
