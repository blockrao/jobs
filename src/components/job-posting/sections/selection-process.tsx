/**
 * Selection Process Section
 *
 * REFACTORED (Phase 2): Changed from table/list layout → visual timeline
 *
 * Renders the stages of the selection process as a visual timeline.
 * The enrichment JSONB column stores data in four confirmed shapes (see enrichment-normalizers.ts);
 * we normalize all shapes before rendering so no real data is silently dropped.
 *
 * Extracted source facts (fjaExtract.applicationSelectionRaw) are shown only
 * when no canonical enrichment or resolver selection process exists, and are
 * always labeled as "reported in listing".
 *
 * Display rules:
 *   - String-array shape (most common, 41 rows): each string becomes a timeline stage.
 *   - Structured shapes ({step, name/label, …}): timeline cards with details.
 *   - Fallback to recruitment-level text when no enrichment stages exist.
 *   - Visual timeline with stage connectors and descriptions.
 */

import { JobPostingData } from "@/types/job-posting";
import { ResolvedRecruitmentFacts } from "../job-posting-page";
import { normalizeSelectionProcess } from "@/lib/enrichment-normalizers";
import styles from "../job-posting-page.module.css";
import timelineStyles from "./selection-process.module.css";

interface SelectionProcessProps {
  post: JobPostingData;
  recruitmentResolvedFacts?: ResolvedRecruitmentFacts | null;
  embedded?: boolean;
}

export default function SelectionProcess({
  post,
  recruitmentResolvedFacts,
  embedded,
}: SelectionProcessProps) {
  const raw = post.enrichment?.selectionProcess;
  const stages = normalizeSelectionProcess(raw);
  const recruitmentProcess = recruitmentResolvedFacts?.selectionProcess ?? null;

  // Extracted source selection — only shown when no canonical field exists
  const extractedSelection = stages.length === 0 && !recruitmentProcess
    ? (Array.isArray(post.fjaExtract?.applicationSelectionRaw)
        ? (post.fjaExtract!.applicationSelectionRaw as unknown[])
            .filter((item): item is Record<string, unknown> =>
              Boolean(item) && typeof item === "object" && !Array.isArray(item)
            )
            .map((item) => typeof item.selection === "string" ? item.selection : null)
            .filter((item): item is string => Boolean(item))
        : [])
    : [];

  // Nothing to show
  if (stages.length === 0 && !recruitmentProcess && extractedSelection.length === 0) return null;

  // Extracted fallback: listing-reported selection steps
  if (stages.length === 0 && !recruitmentProcess && extractedSelection.length > 0) {
    return (
      <div className={embedded ? undefined : styles.section}>
        {!embedded && <h2 className={styles.sectionTitle}>Selection Process</h2>}
        <div className={styles.infoGroup}>
          <div className={styles.infoLabel}>Selection details reported in listing</div>
          <ul className={styles.infoList}>
            {extractedSelection.map((step, index) => (
              <li key={index} className={styles.infoListItem}>{step}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // Fallback: recruitment-level plain text (e.g. resolver returned a text block)
  if (stages.length === 0 && recruitmentProcess) {
    return (
      <div className={embedded ? undefined : styles.section}>
        {!embedded && <h2 className={styles.sectionTitle}>Selection Process</h2>}
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
    <div className={embedded ? undefined : styles.section}>
      {!embedded && <h2 className={styles.sectionTitle}>How This Post Is Filled</h2>}

      {/* Visual Timeline */}
      <div className={timelineStyles.timeline}>
        {stages.map((stage, idx) => (
          <div key={idx} className={timelineStyles.timelineItem}>
            {/* Stage Connector (line to next stage) */}
            {idx < stages.length - 1 && <div className={timelineStyles.connector} />}

            {/* Stage Marker Circle */}
            <div className={timelineStyles.stageMarker}>
              <div className={timelineStyles.markerCircle}>
                {stage.step !== null ? stage.step : idx + 1}
              </div>
            </div>

            {/* Stage Content Card */}
            <div className={timelineStyles.stageCard}>
              <div className={timelineStyles.stageName}>
                {stage.name}
              </div>

              {/* Stage Details Grid */}
              <div className={timelineStyles.detailsGrid}>
                {stage.totalMarks !== undefined && (
                  <div className={timelineStyles.detail}>
                    <span className={timelineStyles.detailLabel}>Marks:</span>
                    <span className={timelineStyles.detailValue}>{stage.totalMarks}</span>
                  </div>
                )}
                {stage.duration && (
                  <div className={timelineStyles.detail}>
                    <span className={timelineStyles.detailLabel}>Duration:</span>
                    <span className={timelineStyles.detailValue}>{stage.duration}</span>
                  </div>
                )}
              </div>

              {/* Stage Description */}
              {stage.description && (
                <p className={timelineStyles.description}>
                  {stage.description}
                </p>
              )}

              {/* Qualifying Marks by Category */}
              {stage.minQualifyingMarks && Object.keys(stage.minQualifyingMarks).length > 0 && (
                <div className={timelineStyles.qualifyingMarks}>
                  <div className={timelineStyles.qualifyingMarksLabel}>
                    Minimum Qualifying Marks
                  </div>
                  <ul className={timelineStyles.qualifyingMarksList}>
                    {Object.entries(stage.minQualifyingMarks).map(([category, marks]) => (
                      <li key={category} className={timelineStyles.qualifyingMarksItem}>
                        <span>{category}</span>
                        <strong>{marks} marks</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
