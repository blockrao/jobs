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

  // PENDING policy: check resolver verificationStatus for PENDING facts
  // Also maintain backward compatibility with FJA extract verification status
  const salaryIsPending = resolvedSalary?.verificationStatus === "PENDING";
  const sourceFactsUnverified = Boolean(
    post.fjaExtract && post.fjaExtract.verificationStatus !== "VERIFIED"
  );

  if (
    !enrichment?.payScale &&
    !resolvedSalary &&
    !post.fjaExtract?.salaryRaw &&
    !post.fjaExtract?.payLevelRaw &&
    !post.fjaExtract?.tenureRaw &&
    (!enrichment?.benefits || enrichment.benefits.length === 0) &&
    !enrichment?.salaryNote
  ) {
    return null;
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

      {/* Source-extracted pay is useful context, but is never promoted to verified salary. */}
      {sourceFactsUnverified && post.fjaExtract?.salaryRaw && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Pay reported in listing · pending verification</div>
          <div className={styles.infoValue}>{post.fjaExtract.salaryRaw}</div>
        </div>
      )}
      {!enrichment?.payScale && post.fjaExtract?.payLevelRaw && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Pay level reported in listing</div>
          <div className={styles.infoValue}>{post.fjaExtract.payLevelRaw}</div>
        </div>
      )}
      {post.fjaExtract?.tenureRaw && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Project tenure reported in listing</div>
          <div className={styles.infoValue}>{post.fjaExtract.tenureRaw}</div>
        </div>
      )}

      {/* Salary Range — only from resolver, never raw enrichment */}
      {resolvedSalary && (!sourceFactsUnverified || !post.fjaExtract?.salaryRaw) && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>
            {salaryIsPending ? "Salary range (reported)" : sourceFactsUnverified ? "Salary range reported in current record" : "Salary Range"}
          </div>
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
