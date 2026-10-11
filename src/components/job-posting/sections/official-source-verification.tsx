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
  const officialSourceUrl = recruitmentResolvedFacts?.officialSource ?? null;
  const applicationUrl = recruitmentResolvedFacts?.applicationUrl ?? null;
  const verificationStatus =
    enrichment?.sourceVerificationStatus === "VERIFIED"
      ? "VERIFIED"
      : enrichment?.sourceVerificationStatus === "UNVERIFIABLE"
        ? "UNVERIFIABLE"
        : !enrichment && post.fjaExtract?.verificationStatus === "VERIFIED"
          ? "VERIFIED"
          : !enrichment && post.fjaExtract?.verificationStatus === "NOT_FOUND"
            ? "UNVERIFIABLE"
            : "PENDING";
  const verificationDate = enrichment?.sourceVerificationDate;
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

      {/* Extraction completeness is separate from official verification. */}
      {enrichment?.extractionConfidence != null ? (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Extraction Confidence</div>
          <p style={{ fontSize: "13px", color: "#4b5563", marginTop: "8px" }}>
            {enrichment.extractionConfidence}% extraction confidence. This measures extraction quality only;
            official verification is tracked separately above.
          </p>
        </div>
      ) : post.fjaExtract?.extractionStatus ? (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Extraction Completeness</div>
          <div className={styles.infoValue}>
            {post.fjaExtract.extractionStatus.replace(/_/g, " ").toLowerCase()}
          </div>
          <p style={{ fontSize: "13px", color: "#4b5563", marginTop: "8px" }}>
            Some listing details have been extracted. This status does not mean the details have been
            checked against the official notice.
          </p>
        </div>
      ) : null}

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

      {post.fjaExtract && verificationStatus !== "VERIFIED" && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Still to confirm</div>
          <ul style={{ paddingLeft: "20px", color: "#4b5563" }}>
            <li>The specific official notice and reference number for this role have not yet been confirmed.</li>
            {!officialSourceUrl && <li>Official recruitment source link is not available in this record.</li>}
            {!applicationUrl && <li>Verified application link or contact address is not available in this record.</li>
            {post.fjaExtract.ageLimitRaw && /not resolved|unknown|not available/i.test(post.fjaExtract.ageLimitRaw) && <li>Age limit has not been resolved from the extracted listing.</li>}
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
              📄 Official Recruitment Source
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
        <strong>About This Data:</strong> JobOye organizes available information and tracks its verification state.
        Until official verification is complete, confirm critical details (dates, fees, eligibility and application
        instructions) with the responsible organization before applying. We are not affiliated with{" "}
        <strong>{post.organizationName}</strong> and do not handle applications.
      </div>
    </div>
  );
}
