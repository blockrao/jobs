/**
 * Important Dates Section
 * Displays key dates timeline
 */

import { JobPostingData } from "@/types/job-posting";
import styles from "../job-posting-page.module.css";

interface ImportantDatesProps {
  post: JobPostingData;
}

export default function ImportantDates({ post }: ImportantDatesProps) {
  const enrichment = post.enrichment;

  const extractedMilestones = Array.isArray(post.fjaExtract?.milestonesRaw)
    ? post.fjaExtract.milestonesRaw
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        .filter((item) => typeof item.date === "string" && typeof item.event === "string")
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

  const availableDates = [
    ...dates.filter((d) => d.date).map((d) => ({ ...d, key: d.label })),
    ...extractedMilestones,
  ];

  if (availableDates.length === 0) return null;

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>📅 Important Dates</h2>
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
