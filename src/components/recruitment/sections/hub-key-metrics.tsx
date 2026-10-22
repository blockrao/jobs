/**
 * Hub Key Metrics — compact row display of critical recruitment metrics.
 * Shows application deadline (with days left), post count, vacancy count, and exam date.
 * Urgency color-coding: red if < 7 days, orange if < 14 days, green if > 14 days.
 * Shows "CLOSED" status when application is closed.
 */

import styles from '../recruitment-hub.module.css';

interface Props {
  applicationDeadline: string | null;
  daysUntilDeadline: number | null;
  postsCount: number;
  vacanciesCount: number | null;
  examDate?: string | null;
  applicationStatus: 'open' | 'closed' | 'extended';
}

export default function HubKeyMetrics({
  applicationDeadline,
  daysUntilDeadline,
  postsCount,
  vacanciesCount,
  examDate,
  applicationStatus,
}: Props) {
  // Determine urgency color
  let deadlineColor: string = '';
  if (applicationStatus === 'closed') {
    deadlineColor = styles.chipClosed;
  } else if (daysUntilDeadline !== null && daysUntilDeadline !== undefined) {
    if (daysUntilDeadline < 7) {
      deadlineColor = styles.chipUrgent;
    } else if (daysUntilDeadline < 14) {
      deadlineColor = styles.chipUpcoming;
    } else {
      deadlineColor = styles.chipOpen;
    }
  }

  const deadlineText =
    applicationStatus === 'closed'
      ? 'Applications Closed'
      : applicationDeadline
        ? `Apply by: ${applicationDeadline}${
            daysUntilDeadline !== null ? ` (${daysUntilDeadline} days left)` : ''
          }`
        : 'Deadline not announced';

  const extendedIndicator =
    applicationStatus === 'extended' ? ' (Extended)' : '';

  return (
    <div className={styles.subCard} style={{ paddingTop: 12, paddingBottom: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <div style={{ flex: '1 1 auto' }}>
          <div style={{ fontSize: 13, color: 'var(--hub-ink3)', marginBottom: 4 }}>
            Deadline
            {extendedIndicator}
          </div>
          <div
            className={`${styles.chip} ${deadlineColor}`}
            style={{ display: 'inline-block' }}
          >
            {deadlineText}
          </div>
        </div>

        {postsCount > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--hub-ink3)', marginBottom: 4 }}>
              Posts
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--hub-font-head)' }}>
              {postsCount}
            </div>
          </div>
        )}

        {vacanciesCount !== null && vacanciesCount !== undefined && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--hub-ink3)', marginBottom: 4 }}>
              Vacancies
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--hub-font-head)' }}>
              {vacanciesCount.toLocaleString()}
            </div>
          </div>
        )}

        {examDate && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--hub-ink3)', marginBottom: 4 }}>
              Exam
            </div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              {examDate}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
