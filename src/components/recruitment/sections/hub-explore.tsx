/**
 * Hub Explore — pills to the organisation page, state page, qualification hub
 * (only when a single stored education level maps cleanly) and closing-soon.
 */

import Link from 'next/link';
import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

export default function HubExplore({ data }: { data: HubData }) {
  const { explore } = data;
  if (explore.length === 0) return null;

  return (
    <nav aria-label="Explore more" className={styles.explore}>
      <span className={styles.exploreLabel}>Explore</span>
      {explore.map(({ label, href }) => (
        <Link key={href} href={href} className={styles.pill}>{label}</Link>
      ))}
    </nav>
  );
}
