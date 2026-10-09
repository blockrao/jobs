/**
 * Application Fee Section
 * Displays category-wise application fees
 */

import { JobPostingData } from "@/types/job-posting";
import styles from "../job-posting-page.module.css";

interface ApplicationFeeProps {
  post: JobPostingData;
}

export default function ApplicationFee({ post }: ApplicationFeeProps) {
  const feesByCategory = post.enrichment?.feesByCategory || {};
  const hasDetails = Object.keys(feesByCategory).length > 0;

  if (!hasDetails) return null;

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>💳 Application Fee</h2>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.tableHead}>Category</th>
            <th className={styles.tableHead} style={{ textAlign: "right" }}>
              Fee
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(feesByCategory).map(([category, fee]) => (
            <tr key={category} className={styles.tableRow}>
              <td className={styles.tableCell}>{category}</td>
              <td
                className={styles.tableCell}
                style={{ textAlign: "right", fontWeight: 600 }}
              >
                {typeof fee === "string" ? fee : `₹${fee}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {post.enrichment?.feeNote && (
        <div className={styles.featureBox} style={{ marginTop: "16px" }}>
          <strong>Fee Note:</strong> {post.enrichment.feeNote}
        </div>
      )}
    </div>
  );
}
