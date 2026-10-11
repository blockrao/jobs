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
  const applyPortalUrl = recruitmentResolvedFacts?.applicationUrl ?? null;
  const hasApplicationUrl = Boolean(applyPortalUrl);
  const extractedApplicationModes = Array.isArray(post.fjaExtract?.applicationSelectionRaw)
    ? post.fjaExtract.applicationSelectionRaw
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        .map((item) => typeof item.application_mode === "string" ? item.application_mode : null)
        .filter((item): item is string => Boolean(item))
    : [];

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>🔗 How to Apply</h2>

      {extractedApplicationModes.length > 0 && !hasApplicationUrl && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Application method reported in listing</div>
          <div className={styles.infoValue}>
            {extractedApplicationModes.join(", ")} application was reported, but a verified
            application address or direct application link is not available in the current record.
            Confirm the instructions with the official recruitment source.
          </div>
        </div>
      )}

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
