/**
 * Duties & Responsibilities Section
 * Displays job duties and responsibilities
 */

import { JobPostingData } from "@/types/job-posting";
import styles from "../job-posting-page.module.css";

interface DutiesResponsibilitiesProps {
  post: JobPostingData;
}

export default function DutiesResponsibilities({
  post,
}: DutiesResponsibilitiesProps) {
  const duties = post.enrichment?.duties || [];
  const responsibilities = post.enrichment?.responsibilities || [];

  if (duties.length === 0 && responsibilities.length === 0) {
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📝 Duties & Responsibilities</h2>
        <p style={{ color: "#4b5563" }}>
          Duties and responsibilities not available
        </p>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>📝 Duties & Responsibilities</h2>

      {/* Duties */}
      {duties.length > 0 && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Key Duties</div>
          <ul className={styles.infoList}>
            {duties.map((duty, index) => (
              <li key={index} className={styles.infoListItem}>
                {duty}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Responsibilities */}
      {responsibilities.length > 0 && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Responsibilities</div>
          <ul className={styles.infoList}>
            {responsibilities.map((resp, index) => (
              <li key={index} className={styles.infoListItem}>
                {resp}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
