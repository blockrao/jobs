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
  at_a_glance?: Record<string, string>;
  important_dates?: Record<string, string>;
  selection_process?: string[];
  application_requirements?: string[];
}

export default function HubDetails({
  data,
  enrichment
}: {
  data: HubData;
  enrichment?: EnrichmentData | null;
}) {
  const { glance } = data;

  // Merge enrichment at_a_glance into the main glance rows
  const enhancedGlance = [...glance];

  if (enrichment?.at_a_glance) {
    // Add enrichment items (salary, age limit, qualification, etc.)
    Object.entries(enrichment.at_a_glance).forEach(([label, value]) => {
      // Avoid duplicates - check if label already exists
      if (!enhancedGlance.some(row => row.label === label)) {
        enhancedGlance.push({ label, value });
      }
    });
  }

  const hasEnrichmentData = enrichment && (
    enrichment.important_dates ||
    enrichment.selection_process ||
    enrichment.application_requirements
  );

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

      {/* Important Dates subsection */}
      {enrichment?.important_dates && Object.keys(enrichment.important_dates).length > 0 && (
        <>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginTop: '20px', marginBottom: '12px', color: 'var(--hub-ink)' }}>
            Important Dates
          </h3>
          <dl className={styles.glance}>
            {Object.entries(enrichment.important_dates).map(([label, value]) => (
              <div key={label} className={styles.glanceRow}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {/* Selection Process subsection */}
      {enrichment?.selection_process && enrichment.selection_process.length > 0 && (
        <>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginTop: '20px', marginBottom: '12px', color: 'var(--hub-ink)' }}>
            Selection Process
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {enrichment.selection_process.map((step, idx) => (
              <li key={idx} style={{ padding: '8px 0', color: 'var(--hub-ink2)' }}>
                • {step}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Application Requirements subsection */}
      {enrichment?.application_requirements && enrichment.application_requirements.length > 0 && (
        <>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginTop: '20px', marginBottom: '12px', color: 'var(--hub-ink)' }}>
            Application Requirements
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {enrichment.application_requirements.map((req, idx) => (
              <li key={idx} style={{ padding: '8px 0', color: 'var(--hub-ink2)' }}>
                • {req}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
