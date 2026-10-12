/**
 * Eligibility Criteria Section
 *
 * Renders education, experience, and age requirements.
 * Enrichment JSONB fields are passed through typed normalizers.
 * Extracted source facts (fjaExtract) are shown only when no
 * canonical enrichment field exists for that slot, and are always
 * labeled as "reported in listing" — never promoted as verified.
 *
 * Display rules:
 *   - No shape may cause blank sections or empty lists to render.
 *   - No fabricated values: if a field cannot be interpreted, omit it.
 *   - Provenance metadata (e.g. "xlsx_freejobsalert") is never shown in UI.
 *   - {source, pathway} stubs display as a simple "Qualification Pathways"
 *     list — they are names only, not structured qualification details.
 */

import { JobPostingData } from "@/types/job-posting";
import {
  normalizeEducation,
  normalizeExperience,
  normalizeEligibilityPathways,
} from "@/lib/enrichment-normalizers";
import styles from "../job-posting-page.module.css";

interface EligibilityCriteriaProps {
  post: JobPostingData;
}

export default function EligibilityCriteria({ post }: EligibilityCriteriaProps) {
  const enrichment = post.enrichment;
  const extracted = post.fjaExtract;

  // Normalize variable-shape enrichment fields upfront
  const education = enrichment?.education
    ? normalizeEducation(enrichment.education)
    : null;
  const experience = enrichment?.experience
    ? normalizeExperience(enrichment.experience)
    : null;
  const pathways = enrichment?.eligibilityPathways
    ? normalizeEligibilityPathways(enrichment.eligibilityPathways)
    : [];

  const hasAgeRules =
    enrichment?.ageRulesByCategory &&
    Object.keys(enrichment.ageRulesByCategory).length > 0;

  // Extracted source facts — only used when no enrichment canonical field exists
  const extractedEligibility = !education
    ? (extracted?.eligibilityRaw || extracted?.qualificationRaw || null)
    : null;
  const extractedExperience = !experience ? (extracted?.experienceRaw || null) : null;
  const extractedAge = !hasAgeRules &&
    extracted?.ageLimitRaw &&
    !/^(not resolved|unknown|not available)$/i.test(extracted.ageLimitRaw.trim())
      ? extracted.ageLimitRaw
      : null;
  const extractedAgeUnresolved = !hasAgeRules &&
    extracted?.ageLimitRaw &&
    /^(not resolved|unknown|not available)$/i.test(extracted.ageLimitRaw.trim())
      ? true
      : false;

  // Phase 1 posts table fields: use fjaExtract raw as the eligibility source when
  // no enrichment canonical field exists. qualificationRaw / eligibilityRaw cover the
  // "what do you need to apply?" slot; experienceRaw covers the experience slot.
  const hasEligibilityContent = Boolean(
    education ||
      experience ||
      hasAgeRules ||
      enrichment?.ageReferenceDate ||
      enrichment?.ageNote ||
      enrichment?.ageRelaxationRules ||
      pathways.length > 0 ||
      extractedEligibility ||
      extractedExperience ||
      extractedAge ||
      extracted?.ageRelaxationRulesRaw ||
      // fjaExtract raw fields that weren't already covered above
      extracted?.otherInfoRaw
  );

  if (!hasEligibilityContent) return null;

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>✓ Eligibility Criteria</h2>

      {/* Raw extracted eligibility — shown only when no canonical enrichment field exists */}
      {extractedEligibility && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Qualification reported in listing</div>
          <div className={styles.infoValue} style={{ whiteSpace: "pre-line" }}>{extractedEligibility}</div>
        </div>
      )}
      {extractedExperience && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Experience reported in listing</div>
          <div className={styles.infoValue} style={{ whiteSpace: "pre-line" }}>{extractedExperience}</div>
        </div>
      )}
      {extractedAgeUnresolved && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Age limit</div>
          <div className={styles.infoValue}>Not resolved from the extracted listing. Check the official notice.</div>
        </div>
      )}
      {extractedAge && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Age limit reported in listing</div>
          <div className={styles.infoValue}>{extractedAge}</div>
        </div>
      )}
      {!enrichment?.ageRelaxationRules && extracted?.ageRelaxationRulesRaw && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Age relaxation reported in listing</div>
          <div className={styles.infoValue}>{extracted.ageRelaxationRulesRaw}</div>
        </div>
      )}

      {/* Education */}
      {education && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Education Required</div>
          <div className={styles.infoValue}>
            {/* qualification_options shape */}
            {education.options && education.options.length > 0 ? (
              <ul className={styles.infoList} style={{ marginTop: "4px" }}>
                {education.options.map((opt, idx) => (
                  <li key={idx} className={styles.infoListItem}>
                    {opt}
                  </li>
                ))}
              </ul>
            ) : (
              <>
                {education.degree && <strong>{education.degree}</strong>}
                {education.university && (
                  <>
                    <br />
                    University: {education.university}
                  </>
                )}
                {education.notes && (
                  <>
                    <br />
                    <span style={{ color: "#4b5563" }}>{education.notes}</span>
                  </>
                )}
                {education.preferredNote && (
                  <>
                    <br />
                    <span style={{ color: "#6b7280", fontSize: "13px" }}>
                      {education.preferredNote}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Experience */}
      {experience && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Experience Required</div>
          <div className={styles.infoValue}>
            {/* keyed-object shape */}
            {experience.keyedEntries ? (
              <ul className={styles.infoList} style={{ marginTop: "4px" }}>
                {experience.keyedEntries.map((entry, idx) => (
                  <li key={idx} className={styles.infoListItem}>
                    <strong>{entry.role}:</strong> {entry.description}
                  </li>
                ))}
              </ul>
            ) : (
              <>
                {experience.minYears !== undefined && (
                  <>
                    Minimum{" "}
                    <strong>
                      {experience.minYears} year
                      {experience.minYears !== 1 ? "s" : ""}
                    </strong>{" "}
                    {experience.domains && experience.domains.length > 0 ? (
                      <>
                        in{" "}
                        <strong>{experience.domains.join(", ")}</strong>
                      </>
                    ) : (
                      "of relevant experience"
                    )}
                  </>
                )}
                {experience.countedFrom && (
                  <>
                    <br />
                    Counted from: {experience.countedFrom}
                  </>
                )}
                {experience.notes && (
                  <>
                    <br />
                    <span style={{ color: "#4b5563" }}>{experience.notes}</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Age Limits */}
      {hasAgeRules && (
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
              {Object.entries(enrichment!.ageRulesByCategory).map(
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
          <div className={styles.infoValue}>
            {enrichment.ageRelaxationRules}
          </div>
        </div>
      )}

      {/* Eligibility Pathways */}
      {pathways.length > 0 && (
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Eligibility Pathways</div>

          {/* Determine if all are stubs (simple name list) or mixed/rich */}
          {pathways.every((p) => p.kind === "stub") ? (
            /* Stub shape: simple qualification category list */
            <ul className={styles.infoList} style={{ marginTop: "4px" }}>
              {pathways.map((p, idx) => (
                <li key={idx} className={styles.infoListItem}>
                  {p.label}
                </li>
              ))}
            </ul>
          ) : (
            /* Mixed or rich shapes */
            pathways.map((p, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: "16px",
                  paddingBottom: "16px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <strong>{p.label}</strong>
                {p.description && (
                  <div style={{ marginTop: "8px", color: "#4b5563" }}>
                    {p.description}
                  </div>
                )}
                {p.qualifications && p.qualifications.length > 0 && (
                  <ul
                    className={styles.infoList}
                    style={{ marginTop: "8px" }}
                  >
                    {p.qualifications.map((qual, qi) => (
                      <li key={qi} className={styles.infoListItem}>
                        {qual}
                      </li>
                    ))}
                  </ul>
                )}
                {p.experienceYears !== undefined && (
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "14px",
                      color: "#4b5563",
                    }}
                  >
                    Experience Required: {p.experienceYears} year
                    {p.experienceYears !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
