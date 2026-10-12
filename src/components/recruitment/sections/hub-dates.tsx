/**
 * Hub Dates — Important dates table / timeline
 * Notification date, application open/close, tentative interview date.
 */

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

interface HubDatesProps {
  data: HubData;
}

export default function HubDates({ data }: HubDatesProps) {
  const {
    notificationDate, notificationDateLabel, appStart, appEnd, appEndLabel,
    tentativeInterviewDate, sourceFactsUnverified, hasTimeline,
  } = data;

  if (!hasTimeline) return null;

  type DateRow = { label: string; value: string; note?: string };
  const rows: DateRow[] = [];

  if (notificationDate) {
    rows.push({ label: notificationDateLabel, value: notificationDate });
  }
  if (appStart) {
    rows.push({ label: 'Application opens', value: appStart });
  }
  if (appEnd) {
    rows.push({
      label: appEndLabel,
      value: appEnd,
      note: sourceFactsUnverified ? 'reported' : undefined,
    });
  }
  if (tentativeInterviewDate) {
    rows.push({ label: 'Tentative interview date', value: tentativeInterviewDate, note: 'tentative' });
  }

  if (rows.length === 0) return null;

  return (
    <section id="dates" aria-labelledby="dates-heading" className={`${styles.card} ${styles.tintMint}`}>
      <h2 id="dates-heading" className={styles.sectionTitle}>Important Dates</h2>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Event</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, value, note }) => (
              <tr key={label}>
                <td>{label}</td>
                <td>
                  <strong>{value}</strong>
                  {note && <span style={{ fontWeight: 400, fontSize: '0.85em', opacity: 0.7, marginLeft: '0.4em' }}>({note})</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
