/**
 * Selection Process Section
 *
 * Renders the stages of the selection process.  The enrichment JSONB
 * column stores data in four confirmed shapes (see enrichment-normalizers.ts);
 * we normalize all shapes before rendering so no real data is silently dropped.
 *
 * Display rules:
 *   - String-array shape (most common, 41 rows): each string becomes a named row.
 *   - Structured shapes ({step, name/label, …}): table with step number and details.
 *   - Fallback to recruitment-level text when no enrichment stages exist.
 *   - Never renders blank table rows or empty cells.
 */

import { JobPostingData } from "@/types/job-posting";
import { ResolvedRecruitmentFacts } from "../job-posting-page";
import { normalizeSelectionProcess } from "@/lib/enrichment-normalizers";
import styles from "../job-posting-page.module.css";

interface SelectionProcessProps {
  post: JobPostingData;
  recruitmentResolvedFacts?: ResolvedRecruitmentFacts | null;
}

export default function SelectionProcess({
  post,
  recruitmentResolvedFacts,
}: SelectionProcessProps) {
  const raw = post.enrichment?.selectionProcess;
  const stages = normalizeSelectionProcess(raw);
  const recruitmentProcess = recruitmentResolvedFacts?.selectionProcess ?? null;

  // Nothing to show
  if (stages.length === 0 && !recruitmentProcess) return null;

  // Fallback: recruitment-level plain text (e.g. resolver returned a text block)
  if (stages.length === 0 && recruitmentProcess) {
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🎯 Selection Process</h2>
        <p style={{ color: "#4b5563", whiteSpace: "pre-line" }}>
          {recruitmentProcess}
        </p>
      </div>
    );
  }

  // Determine whether any stages carry structured details worth a rich table,
  // or whether we have simple name-only entries (string-array origin).
  const hasStepNumbers = stages.some((s) => s.step !== null);
  const hasMarks = stages.some((s) => s.totalMarks !== undefined);
  const hasDuration = stages.some((s) => s.duration !== undefined);
  const isRichTable = hasStepNumbers || hasMarks || hasDuration;

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>🎯 Selection Process</h2>

      {isRichTable ? (
        /* Rich structured table — shapes B, C, D */
        <table className={styles.table}>
          <thead>
            <tr>
              {hasStepNumbers && (
                <th className={styles.tableHead} style={{ width: "70px" }}>
                  Stage
                </th>
              )}
              <th className={styles.tableHead}>Name</th>
              {hasMarks && <th className={styles.tableHead}>Marks</th>}
              {hasDuration && <th className={styles.tableHead}>Duration</th>}
            </tr>
          </thead>
          <tbody>
            {stages.map((stage, idx) => (
              <tr key={idx} className={styles.tableRow}>
                {hasStepNumbers && (
                  <td className={styles.tableCell}>
                    {stage.step !== null ? (
                      <strong>{stage.step}</strong>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
                <td className={styles.tableCell}>{stage.name}</td>
                {hasMarks && (
                  <td className={styles.tableCell}>
                    {stage.totalMarks !== undefined
                      ? `${stage.totalMarks} marks`
                      : "—"}
                  </td>
                )}
                {hasDuration && (
                  <td className={styles.tableCell}>
                    {stage.duration ?? "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        /* Simple ordered list — string-array shape (most common) */
        <ol className={styles.infoList} style={{ paddingLeft: "20px" }}>
          {stages.map((stage, idx) => (
            <li key={idx} className={styles.infoListItem}>
              {stage.name}
            </li>
          ))}
        </ol>
      )}

      {/* Per-stage detail blocks — only when descriptions / qualifying marks exist */}
      {stages.some(
        (s) =>
          s.description ||
          (s.minQualifyingMarks &&
            Object.keys(s.minQualifyingMarks).length > 0)
      ) && (
        <div style={{ marginTop: "24px" }}>
          {stages.map((stage, idx) => {
            const hasDetail =
              stage.description ||
              (stage.minQualifyingMarks &&
                Object.keys(stage.minQualifyingMarks).length > 0);
            if (!hasDetail) return null;
            return (
              <div
                key={idx}
                style={{
                  marginBottom: "16px",
                  paddingBottom: "16px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <strong>
                  {stage.step !== null
                    ? `Stage ${stage.step}: ${stage.name}`
                    : stage.name}
                </strong>
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
                      <ul
                        style={{
                          margin: "4px 0 0 0",
                          paddingLeft: "20px",
                        }}
                      >
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
            );
          })}
        </div>
      )}
    </div>
  );
}
