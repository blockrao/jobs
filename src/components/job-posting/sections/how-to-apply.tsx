/**
 * How to Apply Section
 * Displays step-by-step application instructions.
 * Uses posts table fields (applicationMethod, applicationChecklist, applicationEmail,
 * contactDepartment, contactPerson) plus recruitmentResolvedFacts for the apply URL.
 */

import { JobPostingData } from "@/types/job-posting";
import { ResolvedRecruitmentFacts } from "../job-posting-page";
import styles from "../job-posting-page.module.css";

interface HowToApplyProps {
  post: JobPostingData;
  recruitmentResolvedFacts?: ResolvedRecruitmentFacts | null;
  embedded?: boolean;
}

export default function HowToApply({ post, recruitmentResolvedFacts, embedded }: HowToApplyProps) {
  const applyPortalUrl = recruitmentResolvedFacts?.applicationUrl ?? null;

  // Posts table application fields
  const applicationMethod = post.applicationMethod ?? null;
  const applicationEmail = post.applicationEmail ?? null;
  const applicationUrl = post.applicationUrl ?? null;
  const contactDepartment = post.contactDepartment ?? null;
  const contactPerson = post.contactPerson ?? null;
  const applicationChecklist = post.applicationChecklist ?? null;

  // Extracted modes from fjaExtract as last resort
  const extractedApplicationModes = Array.isArray(post.fjaExtract?.applicationSelectionRaw)
    ? post.fjaExtract!.applicationSelectionRaw
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        .map((item) => typeof item.application_mode === "string" ? item.application_mode : null)
        .filter((item): item is string => Boolean(item))
    : [];

  const hasApplyUrl = Boolean(applyPortalUrl || applicationUrl);
  const effectiveApplyUrl = applyPortalUrl ?? applicationUrl;

  return (
    <div className={embedded ? undefined : styles.section}>
      {!embedded && <h2 className={styles.sectionTitle}>How to Apply</h2>}

      {/* Application method */}
      {applicationMethod && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Application Method</div>
          <div className={styles.infoValue}>{applicationMethod}</div>
        </div>
      )}

      {/* Application checklist (posts table) */}
      {applicationChecklist && applicationChecklist.length > 0 && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Steps to Apply</div>
          <ol style={{ paddingLeft: "20px", color: "#374151", margin: 0 }}>
            {applicationChecklist.map((step, idx) => (
              <li key={idx} style={{ marginBottom: "6px" }}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Application link */}
      <div className={styles.infoGroup}>
        <div className={styles.infoLabel}>Application Portal</div>
        <div className={styles.infoValue}>
          {effectiveApplyUrl ? (
            <a
              href={effectiveApplyUrl}
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
            "Application link is not available. Check the official notification for instructions."
          )}
        </div>
      </div>

      {/* Application email */}
      {applicationEmail && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Application Email</div>
          <div className={styles.infoValue}>
            <a
              href={`mailto:${applicationEmail}`}
              style={{ color: "#1e40af", textDecoration: "underline" }}
            >
              {applicationEmail}
            </a>
          </div>
        </div>
      )}

      {/* Contact */}
      {(contactDepartment || contactPerson) && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Contact</div>
          <div className={styles.infoValue}>
            {contactPerson && <div>{contactPerson}</div>}
            {contactDepartment && <div style={{ color: "#6b7280" }}>{contactDepartment}</div>}
          </div>
        </div>
      )}

      {/* Extracted modes fallback — only when no structured data */}
      {!applicationMethod && extractedApplicationModes.length > 0 && !hasApplyUrl && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Application method (reported)</div>
          <div className={styles.infoValue}>
            {extractedApplicationModes.join(", ")} — a usable direct application link was not captured. Check the official notification for submission instructions.
          </div>
        </div>
      )}

      <div className={styles.featureBox} style={{ marginTop: "20px" }}>
        <strong>Important:</strong> JobOye does not process applications. Confirm requirements,
        account setup, documents, and payment steps with the official notice and portal before applying.
      </div>
    </div>
  );
}
