/**
 * Official Source Verification Section
 * Displays data quality, verification status, and source information
 */

import { JobPostingData } from "@/types/job-posting";
import { ResolvedRecruitmentFacts } from "../job-posting-page";
import styles from "../job-posting-page.module.css";

interface OfficialSourceVerificationProps {
  post: JobPostingData;
  recruitmentResolvedFacts?: ResolvedRecruitmentFacts | null;
}

export default function OfficialSourceVerification({
  post,
  recruitmentResolvedFacts,
}: OfficialSourceVerificationProps) {
  const enrichment = post.enrichment;
  // Only resolver-approved official URLs may be rendered here.
  const officialSourceUrl = recruitmentResolvedFacts?.officialSource ?? null;
  const applicationUrl = recruitmentResolvedFacts?.applicationUrl ?? null;
  const verificationStatus = enrichment?.sourceVerificationStatus || "PENDING";
  const verificationDate = enrichment?.sourceVerificationDate;
  const extractionConfidence = enrichment?.extractionConfidence || 0;
  const dataGaps = enrichment?.dataGaps || [];

  const statusColor =
    verificationStatus === "VERIFIED"
      ? "#059669"
      : verificationStatus === "PENDING"
        ? "#f59e0b"
        : "#ef4444";

  const statusLabel =
    verificationStatus === "VERIFIED"
      ? "✓ Verified"
      : verificationStatus === "PENDING"
        ? "◐ Pending"
        : "✗ Unverifiable";

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>🔍 Data Quality & Verification</h2>

      {/* Verification Badge */}
      <div className={styles.verification}>
        <div
          className={styles.verificationIcon}
          style={{ color: statusColor }}
        >
          {verificationStatus === "VERIFIED"
            ? "✓"
            : verificationStatus === "PENDING"
              ? "◐"
              : "✗"}
        </div>
        <div className={styles.verificationText}>
          <strong>Verification Status: {statusLabel}</strong>
          <br />
          {verificationDate && (
            <>
              Last verified:{" "}
              {new Date(verificationDate).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </>
          )}
        </div>
      </div>

      {/* Extraction Confidence */}
      <div className={styles.infoGroup}>
        <div className={styles.infoLabel}>Data Extraction Confidence</div>
        <div style={{ marginTop: "8px" }}>
          <div
            style={{
              width: "100%",
              height: "24px",
              background: "#e5e7eb",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${extractionConfidence}%`,
                height: "100%",
                background:
                  extractionConfidence >= 80
                    ? "#059669"
                    : extractionConfidence >= 60
                      ? "#f59e0b"
                      : "#ef4444",
                transition: "width 0.3s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              {extractionConfidence >= 30 && `${extractionConfidence}%`}
            </div>
          </div>
          <p style={{ fontSize: "13px", color: "#4b5563", marginTop: "8px" }}>
            {extractionConfidence >= 80
              ? "High confidence"
              : extractionConfidence >= 60
                ? "Medium confidence"
                : "Low confidence"}
            {" — "}
            {extractionConfidence >= 80
              ? "This data has been carefully verified against the official notification."
              : extractionConfidence >= 60
                ? "Most fields have been verified, but some details may need confirmation."
                : "This data requires verification against the official source."}
          </p>
        </div>
      </div>

      {/* Data Gaps */}
      {dataGaps.length > 0 && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Missing or Incomplete Information</div>
          <ul style={{ paddingLeft: "20px", color: "#4b5563" }}>
            {dataGaps.map((gap, index) => (
              <li key={index} style={{ marginBottom: "6px" }}>
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Official Source Links */}
      <div className={styles.infoGroup}>
        <div className={styles.infoLabel}>Official Sources</div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {officialSourceUrl && (
            <a
              href={officialSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 16px",
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                textDecoration: "none",
                color: "#1e40af",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              📄 Official Notification
            </a>
          )}
          {applicationUrl && (
            <a
              href={applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 16px",
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                textDecoration: "none",
                color: "#1e40af",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              🔗 Application Portal
            </a>
          )}
        </div>
      </div>

      <div className={styles.featureBox} style={{ marginTop: "20px" }}>
        <strong>About This Data:</strong> JobOye carefully extracts and verifies
        job posting information from official notifications. While we strive for
        accuracy, always cross-check critical details (dates, fees, eligibility)
        with the official source before applying. We are not affiliated with{" "}
        <strong>{post.organizationName}</strong> and do not handle applications.
      </div>
    </div>
  );
}
