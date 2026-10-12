/**
 * Hub FAQ — Accordion FAQ section
 * Only questions with non-null answers from the hub data.
 */

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

interface HubFaqProps {
  data: HubData;
}

export default function HubFaq({ data }: HubFaqProps) {
  const { faqItems } = data;

  if (faqItems.length === 0) return null;

  return (
    <section id="faq" aria-labelledby="faq-heading" className={styles.card}>
      <h2 id="faq-heading" className={styles.sectionTitle}>Frequently Asked Questions</h2>
      <dl className={styles.qa}>
        {faqItems.map(({ q, a }, i) => (
          <details key={i} className={styles.details}>
            <summary className={styles.summary}>{q}</summary>
            <div className={styles.dbody}>
              <p>{a}</p>
            </div>
          </details>
        ))}
      </dl>
    </section>
  );
}
