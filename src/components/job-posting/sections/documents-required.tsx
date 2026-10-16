/**
 * Documents Required Section
 * Displays required and common documents checklist
 */

import { JobPostingData } from "@/types/job-posting";
import styles from "../job-posting-page.module.css";

interface DocumentsRequiredProps {
  post: JobPostingData;
  embedded?: boolean;
}

export default function DocumentsRequired({ post, embedded }: DocumentsRequiredProps) {
  const docsRequired = post.enrichment?.documentsRequired;

  // FJA enrichment: simple array format (from extraction)
  const enrichmentDocsList = Array.isArray(post.enrichment?.documents)
    ? (post.enrichment.documents as string[]).filter(doc => typeof doc === "string")
    : [];

  const recruitmentOtherInfo = post.fjaExtract?.recruitmentOtherInfoRaw;
  const extractedDocs = recruitmentOtherInfo && typeof recruitmentOtherInfo === "object" && !Array.isArray(recruitmentOtherInfo)
    ? (recruitmentOtherInfo as Record<string, unknown>).application_documents
    : null;
  const extractedDocumentList = Array.isArray(extractedDocs)
    ? extractedDocs.filter((doc): doc is string => typeof doc === "string")
    : [];

  const hasRequired = Boolean(docsRequired?.required && docsRequired.required.length > 0);
  const hasCommon = Boolean(docsRequired?.common && docsRequired.common.length > 0);
  const hasEnrichment = enrichmentDocsList.length > 0;
  const hasExtracted = extractedDocumentList.length > 0;

  if (!hasRequired && !hasCommon && !hasEnrichment && !hasExtracted) return null;

  return (
    <div className={embedded ? undefined : styles.section}>
      {!embedded && <h2 className={styles.sectionTitle}>Documents Required</h2>}

      {/* FJA Enrichment: documents from extraction */}
      {!hasRequired && !hasCommon && hasEnrichment && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Required Documents</div>
          <div className={styles.checklist}>
            {enrichmentDocsList.map((doc, index) => (
              <div key={index} className={styles.checklistItemRequired}>
                <span>{doc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasRequired && !hasCommon && !hasEnrichment && hasExtracted && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Documents reported in listing · confirm against official notice</div>
          <ul className={styles.infoList}>
            {extractedDocumentList.map((doc, index) => (
              <li key={index} className={styles.infoListItem}>{doc}</li>
            ))}
          </ul>
        </div>
      )}

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
        <strong>Note:</strong> Prepare the documents listed in the official notice.
        Required formats, file-size limits and attestation rules vary by recruitment;
        confirm the exact requirements before submitting.
      </div>
    </div>
  );
}
