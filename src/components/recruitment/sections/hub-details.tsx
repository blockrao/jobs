/**
 * Hub Details — "At a glance" key/value grid (2 columns desktop, 1 mobile).
 * Rows come from buildHubData. A null value renders "Not stated in this
 * notification" — buildHubData only emits a null-valued row for age limit,
 * application fee and apply-from; every other unknown row is omitted.
 */

import Link from 'next/link';
import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

export default function HubDetails({ data }: { data: HubData }) {
  const { glance } = data;
  if (glance.length === 0) return null;

  return (
    <section id="overview" aria-labelledby="overview-heading" className={styles.card}>
      <h2 id="overview-heading" className={styles.sectionTitle}>At a glance</h2>
      <dl className={styles.glance}>
        {glance.map(({ label, value, href, verificationNote }) => (
          <div key={label} className={styles.glanceRow}>
            <dt>{label}</dt>
            <dd>
              {value === null
                ? <span className={styles.unknown}>Not stated in this notification</span>
                : (
                  <>
                    {href
                      ? <Link href={href}>{value}</Link>
                      : value}
                    {verificationNote && (
                      <span className={styles.verificationNote} title={verificationNote}>
                        {' '}
                        <small>({verificationNote})</small>
                      </span>
                    )}
                  </>
                )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
