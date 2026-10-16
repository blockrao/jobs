/**
 * Vacancy Details Section
 * Displays category-wise vacancy breakdown in card grid format
 *
 * REFACTORED (Phase 2): Changed from table layout → card-based grid
 * Shows each category as a card with count and percentage
 */

import { JobPostingData } from "@/types/job-posting";
import { ResolvedLeafFacts } from "../job-posting-page";
import styles from "../job-posting-page.module.css";
import gridStyles from "./vacancy-details.module.css";

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
  const vacancyIsPending = resolvedFacts?.vacancyCount != null &&
    post.enrichment?.sourceVerificationStatus === "PENDING";

  if (!hasDetails) {
    if (resolvedTotal == null) return null;
    return (
      <div className={embedded ? undefined : styles.section}>
        {!embedded && (
          <h2 className={styles.sectionTitle}>
            Vacancies{vacancyIsPending ? " (reported)" : isReported ? " (reported)" : ""}
          </h2>
        )}
        <p style={{ color: "#334155", fontSize: "16px" }}>
          Total vacancies available: <strong>{resolvedTotal.toLocaleString("en-IN")}</strong>
        </p>
      </div>
    );
  }

  return (
    <div className={embedded ? undefined : styles.section}>
      {!embedded && (
        <h2 className={styles.sectionTitle}>
          Vacancies by Category{vacancyIsPending ? " (reported)" : isReported ? " (reported)" : ""}
        </h2>
      )}
      <div className={gridStyles.grid}>
        {Object.entries(vacanciesByCategory).map(([category, count]) => {
          const percentage = resolvedTotal && resolvedTotal > 0
            ? Math.round((count / resolvedTotal) * 100)
            : 0;
          return (
            <div key={category} className={gridStyles.card}>
              <div className={gridStyles.categoryName}>{category}</div>
              <div className={gridStyles.count}>{count}</div>
              <div className={gridStyles.percentage}>{percentage}% of total</div>
              <div className={gridStyles.progressBar}>
                <div
                  className={gridStyles.progressFill}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className={gridStyles.totalBar}>
        <span className={gridStyles.totalLabel}>Total Vacancies</span>
        <span className={gridStyles.totalValue}>
          {resolvedTotal != null
            ? resolvedTotal.toLocaleString("en-IN")
            : "See Notification"}
        </span>
      </div>
    </div>
  );
}
