/**
 * Application Fee Section
 * Displays category-wise application fees.
 * Falls back to fjaExtract.applicationSelectionRaw fee info when no
 * canonical enrichment feesByCategory is available.
 */

import { JobPostingData } from "@/types/job-posting";
import styles from "../job-posting-page.module.css";

interface ApplicationFeeProps {
  post: JobPostingData;
  embedded?: boolean;
}

export default function ApplicationFee({ post, embedded }: ApplicationFeeProps) {
  const feesByCategory = post.enrichment?.feesByCategory || {};
  const hasStructuredFees = Object.keys(feesByCategory).length > 0;

  // Extract fee info from fjaExtract.applicationSelectionRaw when no structured fees
  const extractedFeeItems: Array<{ category: string; fee: string }> = [];
  if (!hasStructuredFees && Array.isArray(post.fjaExtract?.applicationSelectionRaw)) {
    for (const item of post.fjaExtract!.applicationSelectionRaw) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const rec = item as Record<string, unknown>;
        if (typeof rec.fee_category === "string" && rec.fee_category &&
            (typeof rec.fee_amount === "string" || typeof rec.fee_amount === "number")) {
          extractedFeeItems.push({
            category: rec.fee_category,
            fee: String(rec.fee_amount),
          });
        }
      }
    }
  }

  // Also check otherInfoRaw for a fee_note
  const extractedFeeNote: string | null =
    !hasStructuredFees &&
    post.fjaExtract?.otherInfoRaw &&
    typeof post.fjaExtract.otherInfoRaw === "object" &&
    !Array.isArray(post.fjaExtract.otherInfoRaw)
      ? ((post.fjaExtract.otherInfoRaw as Record<string, unknown>).fee_note as string | null) ?? null
      : null;

  const hasAnyFees = hasStructuredFees || extractedFeeItems.length > 0;

  if (!hasAnyFees) return null;

  const isReported = !hasStructuredFees && extractedFeeItems.length > 0;

  return (
    <div className={embedded ? undefined : styles.section}>
      {!embedded && (
        <h2 className={styles.sectionTitle}>
          Application Fee{isReported ? " (reported)" : ""}
        </h2>
      )}

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
          {hasStructuredFees
            ? Object.entries(feesByCategory).map(([category, fee]) => (
                <tr key={category} className={styles.tableRow}>
                  <td className={styles.tableCell}>{category}</td>
                  <td
                    className={styles.tableCell}
                    style={{ textAlign: "right", fontWeight: 600 }}
                  >
                    {typeof fee === "string" ? fee : `₹${fee}`}
                  </td>
                </tr>
              ))
            : extractedFeeItems.map(({ category, fee }, idx) => (
                <tr key={idx} className={styles.tableRow}>
                  <td className={styles.tableCell}>{category}</td>
                  <td
                    className={styles.tableCell}
                    style={{ textAlign: "right", fontWeight: 600 }}
                  >
                    {fee}
                  </td>
                </tr>
              ))}
        </tbody>
      </table>

      {(post.enrichment?.feeNote || extractedFeeNote) && (
        <div className={styles.featureBox} style={{ marginTop: "16px" }}>
          <strong>Fee Note:</strong> {post.enrichment?.feeNote ?? extractedFeeNote}
        </div>
      )}

      {isReported && (
        <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "12px" }}>
          Fee details are reported from the listing and have not been verified against the official notice.
        </p>
      )}
    </div>
  );
}
