/**
 * How to Apply Section
 * Displays step-by-step application instructions
 */

import { JobPostingData } from "@/types/job-posting";
import styles from "../job-posting-page.module.css";

interface HowToApplyProps {
  post: JobPostingData;
}

export default function HowToApply({ post }: HowToApplyProps) {
  const applyPortalUrl = post.applyPortalUrl;

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
            "Application URL not available"
          )}
        </div>
      </div>

      <ol style={{ paddingLeft: "20px", color: "#4b5563" }}>
        <li style={{ marginBottom: "12px" }}>
          Visit the official application portal
        </li>
        <li style={{ marginBottom: "12px" }}>
          Create an account or login with your credentials
        </li>
        <li style={{ marginBottom: "12px" }}>
          Fill in the application form with accurate information
        </li>
        <li style={{ marginBottom: "12px" }}>
          Upload all required documents (as per document checklist)
        </li>
        <li style={{ marginBottom: "12px" }}>
          Pay the application fee (if applicable for your category)
        </li>
        <li style={{ marginBottom: "12px" }}>
          Review your application and submit
        </li>
        <li>Download and keep a copy of your confirmation for records</li>
      </ol>

      <div className={styles.featureBox} style={{ marginTop: "20px" }}>
        <strong>Important:</strong> JobOye does not handle applications directly.
        All applications must be submitted through the official portal. Keep
        your login credentials and application reference number safe.
      </div>
    </div>
  );
}
