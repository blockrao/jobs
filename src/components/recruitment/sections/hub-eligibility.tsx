/**
 * Hub Eligibility — three cards: Education & licence, Physical / medical, Age.
 * ELIG-001 Phase 1: stored text only, no "Can I apply?" logic. Empty cards
 * are omitted; the section itself is omitted when all three are empty.
 */

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

function Card({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className={styles.subCard}>
      <h3 className={styles.subTitle}>{title}</h3>
      {items.length === 1
        ? <p className={styles.preLine}>{items[0]}</p>
        : (
          <ul className={styles.list}>
            {items.map((t) => <li key={t} className={styles.preLine}>{t}</li>)}
          </ul>
        )}
    </div>
  );
}

export default function HubEligibility({ data }: { data: HubData }) {
  const { educationTexts, physicalTexts, ageTexts } = data;
  if (educationTexts.length === 0 && physicalTexts.length === 0 && ageTexts.length === 0) return null;

  return (
    <section id="eligibility" aria-labelledby="eligibility-heading" className={styles.card}>
      <h2 id="eligibility-heading" className={styles.sectionTitle}>Eligibility</h2>
      <div className={styles.cardGrid}>
        <Card title="Education & licence" items={educationTexts} />
        <Card title="Physical / medical" items={physicalTexts} />
        <Card title="Age" items={ageTexts} />
      </div>
    </section>
  );
}
