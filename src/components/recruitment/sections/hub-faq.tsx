/**
 * Hub FAQ — native <details>; exactly the items in HubData.faqItems, which
 * exist only for facts that are known (last date, vacancies, fee, salary,
 * selection process, eligibility). Mirrored 1:1 in the FAQPage schema.
 */

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

export default function HubFaq({ data }: { data: HubData }) {
  const { faqItems } = data;
  if (faqItems.length === 0) return null;

  return (
    <section id="faq" aria-labelledby="faq-heading" className={styles.card}>
      <h2 id="faq-heading" className={styles.sectionTitle}>Frequently asked questions</h2>
      {faqItems.map(({ q, a }) => (
        <details key={q} className={styles.details}>
          <summary className={styles.summary}>{q}</summary>
          <div className={styles.dbody}><p className={styles.preLine}>{a}</p></div>
        </details>
      ))}
    </section>
  );
}
