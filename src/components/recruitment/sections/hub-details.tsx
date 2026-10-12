/**
 * Hub Details — Recruitment facts definition list
 * Organisation, notification number, pay range, application mode, location, etc.
 */

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

interface HubDetailsProps {
  data: HubData;
}

export default function HubDetails({ data }: HubDetailsProps) {
  const {
    displayOrg, displayTotalVacancies, appStart, appEnd, sourceApplicationMode,
    sourcePayRange, sharedApplicationEmail, feeGeneral, feeReserved, feeNote,
    hasFeeDetails, displaySelectionProcess, selectionDisplayRows, displayEmploymentType,
    sourceLocation, examName, notificationNumber, sourceFactsUnverified, closed,
    isClosingSoon,
  } = data;

  type Row = { label: string; value: React.ReactNode; id?: string; colSpan?: boolean };
  const rows: Row[] = [];

  if (displayOrg) {
    rows.push({ label: 'Organisation', value: displayOrg, colSpan: true });
  }
  if (notificationNumber) {
    rows.push({ label: 'Advertisement no.', value: notificationNumber });
  }
  if (examName) {
    rows.push({ label: 'Exam / test', value: examName });
  }
  if (displayTotalVacancies != null) {
    rows.push({
      label: 'Total vacancies',
      value: (
        <>
          <strong>{displayTotalVacancies.toLocaleString('en-IN')}</strong>
          {sourceFactsUnverified && <span style={{ fontWeight: 400, opacity: 0.7 }}> (reported)</span>}
        </>
      ),
    });
  }
  if (appStart) {
    rows.push({ label: 'Apply from', value: appStart });
  }
  if (appEnd) {
    rows.push({
      label: 'Last date',
      value: (
        <>
          <strong className={!closed && isClosingSoon ? '' : undefined}>{appEnd}</strong>
          {sourceFactsUnverified && <span style={{ fontWeight: 400, opacity: 0.7 }}> (reported)</span>}
        </>
      ),
    });
  }
  if (sourceApplicationMode) {
    rows.push({ label: 'Application mode', value: sourceApplicationMode });
  }
  if (sourcePayRange) {
    rows.push({
      label: `Pay range${sourceFactsUnverified ? ' †' : ''}`,
      value: <strong>{sourcePayRange}</strong>,
    });
  }
  if (sourceLocation) {
    rows.push({ label: 'Location', value: sourceLocation });
  }
  if (sharedApplicationEmail) {
    rows.push({
      label: 'Apply by email',
      value: <a href={`mailto:${sharedApplicationEmail}`}>{sharedApplicationEmail}</a>,
      colSpan: true,
    });
  }
  if (hasFeeDetails) {
    rows.push({
      label: 'Fee',
      value: feeGeneral != null
        ? Number(feeGeneral) === 0
          ? 'No fee'
          : `₹${Number(feeGeneral).toLocaleString('en-IN')} (General)${feeReserved != null ? `, ₹${Number(feeReserved).toLocaleString('en-IN')} (Reserved)` : ''}`
        : feeNote ?? 'See details',
    });
  }
  if (displaySelectionProcess) {
    rows.push({ label: 'Selection', value: displaySelectionProcess });
  } else if (selectionDisplayRows.length > 0 && selectionDisplayRows[0]?.title) {
    rows.push({ label: 'Selection', value: String(selectionDisplayRows[0].title) });
  }
  if (displayEmploymentType) {
    rows.push({ label: 'Employment', value: displayEmploymentType });
  }

  if (rows.length === 0) return null;

  return (
    <section id="details" aria-labelledby="details-heading" className={styles.card}>
      <h2 id="details-heading" className={styles.sectionTitle}>Recruitment Details</h2>
      <dl className="hub-dl">
        {rows.map(({ label, value, id, colSpan }) => (
          <div
            key={label}
            id={id}
            style={{ gridColumn: colSpan ? '1 / -1' : undefined }}
            className="hub-dl-row"
          >
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {sourceFactsUnverified && (
        <p className={styles.note} style={{ marginTop: '1rem' }}>
          † Facts marked as reported come from aggregator sources. Confirm each detail in the official notification before applying.
        </p>
      )}
    </section>
  );
}
