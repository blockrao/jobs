/**
 * Salary & Compensation Section
 * Displays pay scale, salary range, and benefits
 */

import { JobPostingData } from "@/types/job-posting";
import { ResolvedLeafFacts } from "../job-posting-page";
import styles from "../job-posting-page.module.css";

interface SalaryCompensationProps {
  post: JobPostingData;
  resolvedFacts?: ResolvedLeafFacts;
}

export default function SalaryCompensation({ post, resolvedFacts }: SalaryCompensationProps) {
  const enrichment = post.enrichment;
  // Use resolver output for salary range — never raw enrichment salaryMin/Max
  const resolvedSalary = resolvedFacts?.salary ?? null;

  if (
    !enrichment?.payScale &&
    !resolvedSalary &&
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

      {/* Salary Range — only from resolver, never raw enrichment */}
      {resolvedSalary && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Salary Range</div>
          <div className={styles.infoValue}>
            {resolvedSalary.min && resolvedSalary.max ? (
              <>
                ₹{resolvedSalary.min.toLocaleString("en-IN")} - ₹
                {resolvedSalary.max.toLocaleString("en-IN")} per month
              </>
            ) : resolvedSalary.min ? (
              <>₹{resolvedSalary.min.toLocaleString("en-IN")} per month</>
            ) : (
              <>₹{resolvedSalary.max?.toLocaleString("en-IN")} per month</>
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
