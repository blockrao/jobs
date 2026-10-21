/**
 * Hub Source — source & verification.
 * Notification number/date, verification status line, last updated, a legend
 * for the markers actually used on this page, and a report link.
 */

import Link from 'next/link';
import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

export default function HubSource({ data }: { data: HubData }) {
  const {
    notificationNumber, notificationDate, notificationDateLabel, verificationLine,
    updatedAtLabel, sourceFactsUnverified, anyVacancyUnverified, discoverySourceUrl, notificationUrl,
  } = data;

  const legend: string[] = [];
  if (sourceFactsUnverified) legend.push('"(reported)" — value comes from the source listing, not yet checked against the official notice.');
  if (anyVacancyUnverified) legend.push('"*" — vacancy count reported by the source listing.');

  return (
    <section id="source" aria-labelledby="source-heading" className={styles.card}>
      <h2 id="source-heading" className={styles.sectionTitle}>Source &amp; verification</h2>
      <dl className={styles.kv}>
        {notificationNumber && (
          <div className={styles.kvRow}><dt>Notification no.</dt><dd>{notificationNumber}</dd></div>
        )}
        {notificationDate && (
          <div className={styles.kvRow}><dt>{notificationDateLabel}</dt><dd>{notificationDate}</dd></div>
        )}
        <div className={styles.kvRow}><dt>Verification</dt><dd>{verificationLine}</dd></div>
        {updatedAtLabel && (
          <div className={styles.kvRow}><dt>Last updated</dt><dd>{updatedAtLabel}</dd></div>
        )}
        {discoverySourceUrl && discoverySourceUrl !== notificationUrl && (
          <div className={styles.kvRow}>
            <dt>Discovery source</dt>
            <dd><a href={discoverySourceUrl} target="_blank" rel="noopener noreferrer">{discoverySourceUrl}</a></dd>
          </div>
        )}
      </dl>
      {legend.length > 0 && (
        <ul className={`${styles.list} ${styles.note}`}>
          {legend.map((l) => <li key={l}>{l}</li>)}
        </ul>
      )}
      <p className={styles.note}>
        Spotted a mistake? <Link href="/contact">Report an error</Link>.
      </p>
    </section>
  );
}
