/**
 * Eligibility Criteria Section
 * Displays education, experience, and age requirements
 */

import { JobPostingData } from "@/types/job-posting";
import styles from "../job-posting-page.module.css";

interface EligibilityCriteriaProps {
  post: JobPostingData;
}

export default function EligibilityCriteria({ post }: EligibilityCriteriaProps) {
  const enrichment = post.enrichment;
  const hasEligibilityContent = Boolean(
    enrichment?.education ||
    enrichment?.experience ||
    (enrichment?.ageRulesByCategory && Object.keys(enrichment.ageRulesByCategory).length > 0) ||
    enrichment?.ageReferenceDate ||
    enrichment?.ageNote ||
    enrichment?.ageRelaxationRules ||
    (enrichment?.eligibilityPathways && enrichment.eligibilityPathways.length > 0)
  );

  if (!hasEligibilityContent) return null;

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>✓ Eligibility Criteria</h2>

      {/* Education */}
      {enrichment?.education && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Education Required</div>
          <div className={styles.infoValue}>
            <strong>{enrichment.education.degree}</strong>
            {enrichment.education.university && (
              <>
                <br />
                University: {enrichment.education.university}
              </>
            )}
          </div>
        </div>
      )}

      {/* Experience */}
      {enrichment?.experience && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Experience Required</div>
          <div className={styles.infoValue}>
            Minimum {enrichment.experience.minYears} year
            {enrichment.experience.minYears !== 1 ? "s" : ""}{" "}
            {Array.isArray(enrichment.experience.domains) && enrichment.experience.domains.length > 0 ? (
              <>in <strong>{enrichment.experience.domains.join(", ")}</strong></>
            ) : (
              "of relevant experience"
            )}
            {enrichment.experience.countedFrom && (
              <>
                <br />
                Counted from: {enrichment.experience.countedFrom}
              </>
            )}
          </div>
        </div>
      )}

      {/* Age Limits */}
      {enrichment?.ageRulesByCategory && Object.keys(enrichment.ageRulesByCategory).length > 0 && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Age Limits by Category</div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.tableHead}>Category</th>
                <th className={styles.tableHead}>Minimum Age</th>
                <th className={styles.tableHead}>Maximum Age</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(enrichment.ageRulesByCategory).map(
                ([category, limits]) => (
                  <tr key={category} className={styles.tableRow}>
                    <td className={styles.tableCell}>{category}</td>
                    <td className={styles.tableCell}>{limits.min} years</td>
                    <td className={styles.tableCell}>{limits.max} years</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Age Reference Date */}
      {enrichment?.ageReferenceDate && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Age Reference Date</div>
          <div className={styles.infoValue}>
            {new Date(enrichment.ageReferenceDate).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      )}

      {/* Age Note */}
      {enrichment?.ageNote && (
        <div className={styles.featureBox}>
          <strong>Age Note:</strong> {enrichment.ageNote}
        </div>
      )}

      {/* Age Relaxation Rules */}
      {enrichment?.ageRelaxationRules && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Age Relaxation</div>
          <div className={styles.infoValue}>{enrichment.ageRelaxationRules}</div>
        </div>
      )}

      {/* Eligibility Pathways */}
      {enrichment?.eligibilityPathways &&
        enrichment.eligibilityPathways.length > 0 && (
          <div className={styles.infoGroup}>
            <div className={styles.infoLabel}>Eligibility Pathways</div>
            {enrichment.eligibilityPathways.map((pathway) => (
              <div
                key={pathway.pathway}
                style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #e5e7eb" }}
              >
                <strong>Pathway {pathway.pathway}:</strong>
                <div style={{ marginTop: "8px", color: "#4b5563" }}>
                  {pathway.description}
                </div>
                {pathway.qualifications && pathway.qualifications.length > 0 && (
                  <ul className={styles.infoList} style={{ marginTop: "8px" }}>
                    {pathway.qualifications.map((qual, idx) => (
                      <li key={idx} className={styles.infoListItem}>
                        {qual}
                      </li>
                    ))}
                  </ul>
                )}
                {pathway.experienceYears && (
                  <div style={{ marginTop: "8px", fontSize: "14px", color: "#4b5563" }}>
                    Experience Required: {pathway.experienceYears} year
                    {pathway.experienceYears !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
