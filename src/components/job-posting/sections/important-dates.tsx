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

  const dates = [
    { label: "Notification Date", date: enrichment?.notificationDate },
    { label: "Application Open Date", date: enrichment?.applicationOpenDate },
    {
      label: "Application Closing Date",
      date: enrichment?.applicationClosingDate,
    },
    { label: "Exam Date", date: enrichment?.examDate },
    { label: "Admit Card Date", date: enrichment?.admitCardDate },
    { label: "Result Date", date: enrichment?.resultDate },
    { label: "Interview Schedule", date: enrichment?.interviewScheduleDate },
    { label: "Appointment Date", date: enrichment?.appointmentDate },
  ];

  const availableDates = dates.filter((d) => d.date);

  if (availableDates.length === 0) {
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📅 Important Dates</h2>
        <p style={{ color: "#4b5563" }}>Dates information not available</p>
      </div>
    );
  }

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
            <tr key={item.label} className={styles.tableRow}>
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
