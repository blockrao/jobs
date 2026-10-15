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
  embedded?: boolean;
}

export default function VacancyDetails({ post, resolvedFacts, embedded }: VacancyDetailsProps) {
  // Use enrichment vacanciesByCategory when available; fall back to posts.vacancy_details
  const vacanciesByCategory: Record<string, number> =
    (post.enrichment?.vacanciesByCategory && Object.keys(post.enrichment.vacanciesByCategory).length > 0)
      ? post.enrichment.vacanciesByCategory
      : (post.vacancyDetails && Object.keys(post.vacancyDetails).length > 0)
        ? post.vacancyDetails
        : {};
  const hasDetails = Object.keys(vacanciesByCategory).length > 0;
  // Use resolver output — never display raw enrichment vacanciesTotal
  const reportedCount = post.fjaExtract?.vacancyCountRaw
    ? Number(post.fjaExtract.vacancyCountRaw.replace(/,/g, "").trim())
    : null;
  const extractedTotal = reportedCount != null && Number.isSafeInteger(reportedCount) && reportedCount >= 0
    ? reportedCount
    : null;
  const resolvedTotal = resolvedFacts?.vacancyCount ?? extractedTotal;

  const isReported = post.fjaExtract && post.fjaExtract.verificationStatus !== "VERIFIED";
  // PENDING policy: check resolver's vacancyCount for verification status
  // The resolver now returns vacancy counts for PENDING facts as well
  const vacancyIsPending = resolvedFacts?.vacancyCount != null &&
    post.enrichment?.sourceVerificationStatus === "PENDING";

  if (!hasDetails) {
    if (resolvedTotal == null) return null;
    return (
      <div className={embedded ? undefined : styles.section}>
        {!embedded && (
          <h2 className={styles.sectionTitle}>
            Vacancy Details{vacancyIsPending ? " (reported)" : isReported ? " (reported)" : ""}
          </h2>
        )}
        <p style={{ color: "#334155" }}>
          Total Vacancies: <strong>{resolvedTotal.toLocaleString("en-IN")}</strong>
        </p>
      </div>
    );
  }

  return (
    <div className={embedded ? undefined : styles.section}>
      {!embedded && (
        <h2 className={styles.sectionTitle}>
          Vacancy Details{vacancyIsPending ? " (reported)" : isReported ? " (reported)" : ""}
        </h2>
      )}
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
