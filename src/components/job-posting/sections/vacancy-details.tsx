/**
 * Vacancy Details Section
 * Displays category-wise vacancy breakdown
 */

import { JobPostingData } from "@/types/job-posting";
import styles from "../job-posting-page.module.css";

interface VacancyDetailsProps {
  post: JobPostingData;
}

export default function VacancyDetails({ post }: VacancyDetailsProps) {
  const vacanciesByCategory = post.enrichment?.vacanciesByCategory || {};
  const hasDetails = Object.keys(vacanciesByCategory).length > 0;

  if (!hasDetails) {
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📊 Vacancy Details</h2>
        <p style={{ color: "#4b5563" }}>
          Total Vacancies: <strong>{post.enrichment?.vacanciesTotal || "N/A"}</strong>
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
              {post.enrichment?.vacanciesTotal || 0}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
