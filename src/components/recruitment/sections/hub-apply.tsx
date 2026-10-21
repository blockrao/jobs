/**
 * Hub Apply — how to apply, ONLY from extracted source text
 * (sourceExtract.otherInfoRaw how-to-apply strings). No templated steps.
 */

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

export default function HubApply({ data }: { data: HubData }) {
  const { howToApply, sourceFactsUnverified } = data;
  if (howToApply.length === 0) return null;

  return (
    <section id="apply" aria-labelledby="apply-heading" className={styles.card}>
      <h2 id="apply-heading" className={styles.sectionTitle}>How to apply</h2>
      {howToApply.length === 1
        ? <p className={styles.preLine}>{howToApply[0]}</p>
        : (
          <ol className={styles.numbered}>
            {howToApply.map((step) => <li key={step} className={styles.preLine}>{step}</li>)}
          </ol>
        )}
      {sourceFactsUnverified && (
        <p className={styles.note}>As reported in the source listing. Confirm the procedure in the official notification.</p>
      )}
    </section>
  );
}
