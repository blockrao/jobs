/**
 * How to Apply Section
 * Displays step-by-step application instructions
 */

import { JobPostingData } from "@/types/job-posting";
import { ResolvedRecruitmentFacts } from "../job-posting-page";
import styles from "../job-posting-page.module.css";

interface HowToApplyProps {
  post: JobPostingData;
  recruitmentResolvedFacts?: ResolvedRecruitmentFacts | null;
}

export default function HowToApply({ post, recruitmentResolvedFacts }: HowToApplyProps) {
  const applyPortalUrl = recruitmentResolvedFacts?.applicationUrl ?? post.applyPortalUrl ?? null;
  const hasApplicationUrl = Boolean(applyPortalUrl);

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>🔗 How to Apply</h2>

      <div className={styles.infoGroup}>
        <div className={styles.infoLabel}>Application Portal</div>
        <div className={styles.infoValue}>
          {applyPortalUrl ? (
            <a
              href={applyPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#1e40af",
                textDecoration: "underline",
                fontWeight: 600,
              }}
            >
              Click here to apply on official portal →
            </a>
          ) : (
            "Application link is not available in the current record. Check the official notification for application instructions."
          )}
        </div>
      </div>

      {hasApplicationUrl && (
        <p style={{ color: "#4b5563" }}>
          Follow the application instructions on the linked portal and in the
          official notification. Requirements, account setup, documents, and
          payment steps vary by recruitment.
        </p>
      )}

      <div className={styles.featureBox} style={{ marginTop: "20px" }}>
        <strong>Important:</strong> JobOye does not process applications. Check
        the linked portal and official notification for the requirements and
        submission steps that apply to this recruitment.
      </div>
    </div>
  );
}
