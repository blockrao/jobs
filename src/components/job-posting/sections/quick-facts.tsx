/**
 * Quick Facts Section
 * Displays key facts in a grid layout
 */

import { JobPostingData } from "@/types/job-posting";
import styles from "../job-posting-page.module.css";

interface QuickFactsProps {
  post: JobPostingData;
}

export default function QuickFacts({ post }: QuickFactsProps) {
  const facts = [
    {
      label: "Vacancies",
      value: post.enrichment?.vacanciesTotal || "N/A",
    },
    {
      label: "Application Closes",
      value: post.enrichment?.applicationClosingDate
        ? new Date(post.enrichment.applicationClosingDate).toLocaleDateString(
            "en-IN",
            { month: "short", day: "numeric", year: "numeric" }
          )
        : "N/A",
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
