/**
 * Vacancy Details Section
 * Displays category-wise vacancy breakdown
 */

import { JobPostingData } from "@/types/job-posting";
import { ResolvedLeafFacts } from "../job-posting-page";
import styles from "../job-posting-page.module.css";

interface VacancyDetailsProps {
  post: JobPostingData;
  resolvedFacts?: ResolvedLeafFacts;
}

export default function VacancyDetails({ post, resolvedFacts }: VacancyDetailsProps) {
  const vacanciesByCategory = post.enrichment?.vacanciesByCategory || {};
  const hasDetails = Object.keys(vacanciesByCategory).length > 0;
  // Use resolver output — never display raw enrichment vacanciesTotal
  const resolvedTotal = resolvedFacts?.vacancyCount;

  if (!hasDetails) {
    if (resolvedTotal == null) return null;
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📊 Vacancy Details</h2>
        <p style={{ color: "#4b5563" }}>
          Total Vacancies: <strong>{resolvedTotal.toLocaleString("en-IN")}</strong>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>📊 Vacancy Details</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.tableHead}>Category</th>
            <th className={styles.tableHead} style={{ textAlign: "right" }}>
              Vacancies
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(vacanciesByCategory).map(([category, count]) => (
            <tr key={category} className={styles.tableRow}>
              <td className={styles.tableCell}>{category}</td>
              <td
                className={styles.tableCell}
                style={{ textAlign: "right", fontWeight: 600 }}
              >
                {count}
              </td>
            </tr>
          ))}
          <tr className={styles.tableRow} style={{ fontWeight: 700 }}>
            <td className={styles.tableCell}>Total</td>
            <td
              className={styles.tableCell}
              style={{ textAlign: "right", fontWeight: 700 }}
            >
              {resolvedTotal != null
                ? resolvedTotal.toLocaleString("en-IN")
                : "See Notification"}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
