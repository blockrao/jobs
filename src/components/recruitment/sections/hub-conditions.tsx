/**
 * Hub Conditions — Age relaxation rules, general conditions
 * Tint-coral card. Only rendered when ageNote is present.
 */

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

interface HubConditionsProps {
  data: HubData;
}

export default function HubConditions({ data }: HubConditionsProps) {
  const { recruitment } = data;

  if (!recruitment.ageNote) return null;

  return (
    <section id="conditions" aria-labelledby="conditions-heading" className={`${styles.card} ${styles.tintCoral}`}>
      <h2 id="conditions-heading" className={styles.sectionTitle}>Age &amp; Conditions</h2>
      <p style={{ whiteSpace: 'pre-line' }}>{recruitment.ageNote}</p>
    </section>
  );
}
