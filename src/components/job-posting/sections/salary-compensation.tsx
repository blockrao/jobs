/**
 * Salary & Compensation Section
 * Displays pay scale, salary range, and benefits
 */

import { JobPostingData } from "@/types/job-posting";
import styles from "../job-posting-page.module.css";

interface SalaryCompensationProps {
  post: JobPostingData;
}

export default function SalaryCompensation({ post }: SalaryCompensationProps) {
  const enrichment = post.enrichment;

  if (
    !enrichment?.payScale &&
    !enrichment?.salaryMin &&
    !enrichment?.salaryMax &&
    !enrichment?.benefits
  ) {
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>💰 Salary & Compensation</h2>
        <p style={{ color: "#4b5563" }}>Salary details not available</p>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>💰 Salary & Compensation</h2>

      {/* Pay Scale */}
      {enrichment?.payScale && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Pay Scale / Level</div>
          <div className={styles.infoValue}>
            <strong>{enrichment.payScale}</strong>
          </div>
        </div>
      )}

      {/* Salary Range */}
      {(enrichment?.salaryMin || enrichment?.salaryMax) && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Salary Range</div>
          <div className={styles.infoValue}>
            {enrichment.salaryMin && enrichment.salaryMax ? (
              <>
                ₹{enrichment.salaryMin.toLocaleString("en-IN")} - ₹
                {enrichment.salaryMax.toLocaleString("en-IN")} per month
              </>
            ) : enrichment?.salaryMin ? (
              <>₹{enrichment.salaryMin.toLocaleString("en-IN")} per month</>
            ) : (
              <>₹{enrichment?.salaryMax?.toLocaleString("en-IN")} per month</>
            )}
          </div>
        </div>
      )}

      {/* Salary Note */}
      {enrichment?.salaryNote && (
        <div className={styles.featureBox}>{enrichment.salaryNote}</div>
      )}

      {/* Benefits */}
      {enrichment?.benefits && enrichment.benefits.length > 0 && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Benefits & Perquisites</div>
          <ul className={styles.infoList}>
            {enrichment.benefits.map((benefit, index) => (
              <li key={index} className={styles.infoListItem}>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
