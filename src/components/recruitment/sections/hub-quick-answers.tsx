/**
 * Hub Quick Answers — FAQ / QA section
 * Highest-demand questions first. Only questions with non-null answers.
 */

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

interface HubQuickAnswersProps {
  data: HubData;
}

export default function HubQuickAnswers({ data }: HubQuickAnswersProps) {
  const {
    appEnd, closed, isClosingSoon, isLastDay, daysLeft, displayTotalVacancies,
    posts, hasFeeDetails, feeGeneral, feeReserved, feeNote, displayApplicationUrl,
    displayOfficialSource, sharedApplicationEmail, sourceApplicationMode,
    displayOrg, recruitment, notificationNumber, displaySelectionProcess,
    sourceFactsUnverified,
  } = data;

  const items: { id: string; label: string; value: React.ReactNode }[] = [];

  // Last date to apply
  if (appEnd) {
    items.push({
      id: 'qa-last-date',
      label: 'Last date to apply',
      value: sourceFactsUnverified
        ? `${appEnd} (reported — confirm in the official notice)`
        : closed
        ? `${appEnd} — applications are now closed`
        : isLastDay
        ? `${appEnd} — today is the last day`
        : isClosingSoon && daysLeft !== null
        ? `${appEnd} — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`
        : appEnd,
    });
  }

  // Vacancies / posts
  if (displayTotalVacancies != null) {
    items.push({
      id: 'qa-posts',
      label: 'Vacancies / posts',
      value: sourceFactsUnverified
        ? `${displayTotalVacancies.toLocaleString('en-IN')} vacancies reported across ${posts.length} post${posts.length !== 1 ? 's' : ''}. Verify each in the official notice.`
        : `${displayTotalVacancies.toLocaleString('en-IN')} ${displayTotalVacancies === 1 ? 'vacancy' : 'vacancies'} across ${posts.length} post${posts.length !== 1 ? 's' : ''}.`,
    });
  }

  // Application fee
  if (hasFeeDetails) {
    items.push({
      id: 'qa-fee',
      label: 'Application fee',
      value: feeGeneral != null
        ? Number(feeGeneral) === 0
          ? 'No application fee.'
          : `General: ₹${Number(feeGeneral).toLocaleString('en-IN')}${feeReserved != null ? `; Reserved: ₹${Number(feeReserved).toLocaleString('en-IN')}` : ''}.`
        : feeNote ?? 'See recruitment details for fee breakdown.',
    });
  }

  // How to apply
  if (displayApplicationUrl || displayOfficialSource || sharedApplicationEmail) {
    items.push({
      id: 'qa-apply',
      label: 'How to apply',
      value: displayApplicationUrl
        ? (
          <>
            Apply via the{' '}
            <a href={displayApplicationUrl} target="_blank" rel="noopener noreferrer">
              official application portal
            </a>.
          </>
        )
        : sharedApplicationEmail
        ? (
          <>
            Send your application to{' '}
            <a href={`mailto:${sharedApplicationEmail}`}>{sharedApplicationEmail}</a>
            {sourceApplicationMode ? ` (${sourceApplicationMode.toLowerCase()})` : ''}.
            {' '}Confirm instructions in the official notice.
          </>
        )
        : sourceApplicationMode
        ? `Apply ${sourceApplicationMode.toLowerCase()}. Confirm application instructions in the official notice.`
        : (
          <>
            Check the{' '}
            <a href={displayOfficialSource!} target="_blank" rel="noopener noreferrer">
              official notification
            </a>{' '}
            for application instructions.
          </>
        ),
    });
  }

  // Recruiting organisation
  if (displayOrg) {
    items.push({
      id: 'qa-who',
      label: 'Recruiting organisation',
      value: `${displayOrg}${recruitment.year ? ` (${recruitment.year})` : ''}.${notificationNumber ? ` Advertisement No. ${notificationNumber}.` : ''}`,
    });
  }

  // Selection process
  if (displaySelectionProcess) {
    items.push({
      id: 'qa-selection',
      label: 'Selection process',
      value: displaySelectionProcess,
    });
  }

  if (items.length === 0) return null;

  return (
    <section id="quick" aria-labelledby="quick-heading" className={styles.card}>
      <h2 id="quick-heading" className={styles.sectionTitle}>Quick Answers</h2>
      <dl className={styles.qa}>
        {items.map(({ id, label, value }) => (
          <div key={id} id={id} className={styles.qaItem}>
            <dt className={styles.qaQuestion}>{label}</dt>
            <dd className={styles.qaAnswer}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
