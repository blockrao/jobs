/**
 * Important Dates Section
 * Displays key dates timeline
 */

import { JobPostingData } from "@/types/job-posting";
import styles from "../job-posting-page.module.css";
import { isDisplayableRecruitmentDate } from "@/lib/recruitment-dates";

interface ImportantDatesProps {
  post: JobPostingData;
  embedded?: boolean;
}

// Map keyDates JSON keys to display labels
const KEY_DATES_LABELS: Record<string, string> = {
  application_opening_date: "Application Open Date",
  application_closing_date: "Application Closing Date",
  last_date_to_apply: "Last Date to Apply",
  exam_date: "Exam Date",
  admit_card_date: "Admit Card Date",
  result_date: "Result Date",
  interview_date: "Interview Schedule",
  document_verification_date: "Document Verification",
  appointment_date: "Appointment Date",
  notification_date: "Notification Date",
  source_updated_date: "Listing Updated",
};

// Shared guard: see src/lib/recruitment-dates.ts. Re-exported so existing imports keep working.
export { isDisplayableRecruitmentDate } from "@/lib/recruitment-dates";

export default function ImportantDates({ post, embedded }: ImportantDatesProps) {
  const enrichment = post.enrichment;

  // keyDates from posts table — used when no enrichment dates are available
  const keyDateEntries: Array<{ label: string; date: string; key: string }> = [];
  if (post.keyDates && typeof post.keyDates === "object") {
    for (const [key, val] of Object.entries(post.keyDates)) {
      if (typeof val === "string" && val.trim() && isDisplayableRecruitmentDate(val)) {
        const label = KEY_DATES_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        keyDateEntries.push({ label, date: val, key: `keydate-${key}` });
      }
    }
  }

  const extractedMilestones = Array.isArray(post.fjaExtract?.milestonesRaw)
    ? post.fjaExtract.milestonesRaw
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        .filter((item) => typeof item.date === "string" && typeof item.event === "string" && isDisplayableRecruitmentDate(item.date))
        .map((item) => ({
          label: post.fjaExtract?.verificationStatus === "VERIFIED"
            ? String(item.event)
            : `${String(item.event)} (reported)`,
          date: String(item.date),
          key: `reported-${String(item.event)}-${String(item.date)}`,
        }))
    : [];

  const hasExtractedListing = Boolean(post.fjaExtract);
  const dates = hasExtractedListing
    ? [
        { label: "Source listing published", date: post.fjaExtract?.sourcePublishedDate ?? null },
        { label: "Notification Date", date: enrichment?.notificationDate ?? null },
        { label: "Application Open Date", date: enrichment?.applicationOpenDate ?? null },
        { label: "Application Closing Date", date: enrichment?.applicationClosingDate ?? null },
        { label: "Exam Date", date: enrichment?.examDate ?? null },
        { label: "Admit Card Date", date: enrichment?.admitCardDate ?? null },
        { label: "Result Date", date: enrichment?.resultDate ?? null },
        { label: "Interview Schedule", date: enrichment?.interviewScheduleDate ?? null },
        { label: "Appointment Date", date: enrichment?.appointmentDate ?? null },
      ]
    : [
        { label: "Notification Date", date: enrichment?.notificationDate ?? post.notificationPublicationDate },
        { label: "Application Open Date", date: enrichment?.applicationOpenDate ?? post.recruitmentApplicationStartDate },
        { label: "Application Closing Date", date: enrichment?.applicationClosingDate ?? post.recruitmentApplicationEndDate },
        { label: "Exam Date", date: enrichment?.examDate },
        { label: "Admit Card Date", date: enrichment?.admitCardDate },
        { label: "Result Date", date: enrichment?.resultDate },
        { label: "Interview Schedule", date: enrichment?.interviewScheduleDate },
        { label: "Appointment Date", date: enrichment?.appointmentDate },
      ];

  const enrichmentOrFjaDates = dates.filter((d) => isDisplayableRecruitmentDate(d.date));
  // Use keyDates from posts table when no other dates are available
  const keyDateFallbacks = enrichmentOrFjaDates.length === 0 && extractedMilestones.length === 0
    ? keyDateEntries
    : [];

  const availableDates = [
    ...enrichmentOrFjaDates.map((d) => ({ ...d, key: d.label })),
    ...extractedMilestones,
    ...keyDateFallbacks,
  ];

  if (availableDates.length === 0) return null;

  return (
    <div className={embedded ? undefined : styles.section}>
      {!embedded && <h2 className={styles.sectionTitle}>Important Dates</h2>}
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.tableHead}>Event</th>
            <th className={styles.tableHead}>Date</th>
          </tr>
        </thead>
        <tbody>
          {availableDates.map((item) => (
            <tr key={item.key} className={styles.tableRow}>
              <td className={styles.tableCell}>{item.label}</td>
              <td className={styles.tableCell}>
                {new Date(item.date!).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
