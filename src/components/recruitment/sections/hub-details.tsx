/**
 * Hub Details — "At a glance" section with integrated enrichment data.
 *
 * Combines:
 * - Original glance rows (organisation, job type, application dates, etc.)
 * - Enrichment data (salary, age limit, qualifications from Excel/FJA)
 *
 * Renders as:
 * 1. Main "At a glance" grid with all key/value pairs
 * 2. Subsections for Important Dates, Selection Process, Application Requirements
 */

import Link from 'next/link';
import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

interface EnrichmentData {
  [key: string]: string | number | boolean | null | undefined;
}

export default function HubDetails({
  data,
  enrichment
}: {
  data: HubData;
  enrichment?: EnrichmentData | null;
}) {
  const { glance } = data;

  // Merge enrichment data into the main glance rows
  const enhancedGlance = [...glance];

  if (enrichment && typeof enrichment === 'object') {
    // Add enrichment items as key-value pairs
    Object.entries(enrichment).forEach(([key, value]) => {
      // Format the label: convert snake_case/camelCase to Title Case
      const label = key
        .replace(/([A-Z])/g, ' $1') // camelCase
        .replace(/_/g, ' ') // snake_case
        .replace(/\b\w/g, c => c.toUpperCase()) // title case
        .trim();

      // Convert value to string
      const strValue = value ? String(value) : null;

      if (strValue && !enhancedGlance.some(row => row.label.toLowerCase() === label.toLowerCase())) {
        enhancedGlance.push({ label, value: strValue });
      }
    });
  }

  const hasEnrichmentData = enrichment && typeof enrichment === 'object' && Object.keys(enrichment).length > 0;

  if (enhancedGlance.length === 0 && !hasEnrichmentData) return null;

  return (
    <section id="overview" aria-labelledby="overview-heading" className={styles.card}>
      <h2 id="overview-heading" className={styles.sectionTitle}>At a glance</h2>

      {/* Main glance grid - all key/value pairs */}
      <dl className={styles.glance}>
        {enhancedGlance.map(({ label, value, href, verificationNote }) => (
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
