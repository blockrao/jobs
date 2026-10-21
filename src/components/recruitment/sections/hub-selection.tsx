/**
 * Hub Selection — selection process from stored rows / text. Omitted when none.
 */

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

export default function HubSelection({ data }: { data: HubData }) {
  const { selectionRows, selectionText } = data;
  if (selectionRows.length === 0 && !selectionText) return null;

  return (
    <section id="selection" aria-labelledby="selection-heading" className={styles.card}>
      <h2 id="selection-heading" className={styles.sectionTitle}>Selection process</h2>
      {selectionRows.length > 0 ? (
        <ol className={styles.numbered}>
          {selectionRows.map((row, i) => (
            <li key={i}>
              {row.title && <strong>{row.title}</strong>}
              {row.detail && <span className={styles.muted}>{row.title ? ' — ' : ''}{row.detail}</span>}
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.preLine}>{selectionText}</p>
      )}
      {selectionRows.length > 0 && selectionText && <p className={`${styles.note} ${styles.preLine}`}>{selectionText}</p>}
    </section>
  );
}
