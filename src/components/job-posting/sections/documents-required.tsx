/**
 * Documents Required Section
 * Displays required and common documents checklist
 */

import { JobPostingData } from "@/types/job-posting";
import styles from "../job-posting-page.module.css";

interface DocumentsRequiredProps {
  post: JobPostingData;
}

export default function DocumentsRequired({ post }: DocumentsRequiredProps) {
  const docsRequired = post.enrichment?.documentsRequired;

  const hasRequired = Boolean(docsRequired?.required && docsRequired.required.length > 0);
  const hasCommon = Boolean(docsRequired?.common && docsRequired.common.length > 0);

  if (!hasRequired && !hasCommon) return null;

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>📋 Documents Required</h2>

      {/* Required Documents */}
      {docsRequired?.required && docsRequired.required.length > 0 && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Required Documents</div>
          <div className={styles.checklist}>
            {docsRequired.required.map((doc, index) => (
              <div key={index} className={styles.checklistItemRequired}>
                <span>{doc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Common Documents */}
      {docsRequired?.common && docsRequired.common.length > 0 && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Common Documents</div>
          <div className={styles.checklist}>
            {docsRequired.common.map((doc, index) => (
              <div key={index} className={styles.checklistItemCommon}>
                <span>{doc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.featureBox} style={{ marginTop: "20px" }}>
        <strong>Note:</strong> Keep scanned copies of all documents ready before
        starting the application. Ensure documents are clear and in the specified
        format (usually PDF or JPG). Scans should not be more than 500 KB each.
      </div>
    </div>
  );
}
