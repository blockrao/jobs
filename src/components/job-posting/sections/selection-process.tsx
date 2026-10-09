/**
 * Selection Process Section
 * Displays exam/interview stages with details
 */

import { JobPostingData } from "@/types/job-posting";
import { ResolvedRecruitmentFacts } from "../job-posting-page";
import styles from "../job-posting-page.module.css";

interface SelectionProcessProps {
  post: JobPostingData;
  recruitmentResolvedFacts?: ResolvedRecruitmentFacts | null;
}

export default function SelectionProcess({ post, recruitmentResolvedFacts }: SelectionProcessProps) {
  const selectionProcess = post.enrichment?.selectionProcess || [];
  const recruitmentProcess = recruitmentResolvedFacts?.selectionProcess ?? null;

  if (selectionProcess.length === 0 && !recruitmentProcess) {
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🎯 Selection Process</h2>
        <p style={{ color: "#4b5563" }}>
          Selection process details not available
        </p>
      </div>
    );
  }

  if (selectionProcess.length === 0 && recruitmentProcess) {
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🎯 Selection Process</h2>
        <p style={{ color: "#4b5563", whiteSpace: "pre-line" }}>{recruitmentProcess}</p>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>🎯 Selection Process</h2>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.tableHead} style={{ width: "80px" }}>
              Stage
            </th>
            <th className={styles.tableHead}>Name</th>
            <th className={styles.tableHead}>Marks</th>
            <th className={styles.tableHead}>Duration</th>
          </tr>
        </thead>
        <tbody>
          {selectionProcess.map((stage) => (
            <tr key={stage.step} className={styles.tableRow}>
              <td className={styles.tableCell}>
                <strong>{stage.step}</strong>
              </td>
              <td className={styles.tableCell}>{stage.name}</td>
              <td className={styles.tableCell}>
                {stage.totalMarks ? `${stage.totalMarks} marks` : "—"}
              </td>
              <td className={styles.tableCell}>{stage.duration || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Detailed stage info if available */}
      {selectionProcess.some(
        (s) =>
          s.description ||
          (s.minQualifyingMarks && Object.keys(s.minQualifyingMarks).length > 0)
      ) && (
        <div style={{ marginTop: "24px" }}>
          {selectionProcess.map((stage) => (
            (stage.description ||
              (stage.minQualifyingMarks &&
                Object.keys(stage.minQualifyingMarks).length > 0)) && (
              <div
                key={stage.step}
                style={{
                  marginBottom: "16px",
                  paddingBottom: "16px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <strong>Stage {stage.step}: {stage.name}</strong>
                {stage.description && (
                  <p style={{ margin: "8px 0", color: "#4b5563" }}>
                    {stage.description}
                  </p>
                )}
                {stage.minQualifyingMarks &&
                  Object.keys(stage.minQualifyingMarks).length > 0 && (
                    <div style={{ marginTop: "8px" }}>
                      <strong style={{ fontSize: "13px" }}>
                        Minimum Qualifying Marks:
                      </strong>
                      <ul style={{ margin: "4px 0 0 0", paddingLeft: "20px" }}>
                        {Object.entries(stage.minQualifyingMarks).map(
                          ([category, marks]) => (
                            <li key={category} style={{ color: "#4b5563" }}>
                              {category}: {marks} marks
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
