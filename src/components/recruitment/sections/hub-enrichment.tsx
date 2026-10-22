/**
 * Hub Enrichment Tabs
 *
 * Displays enriched data extracted from FJA pages:
 * - At a Glance
 * - Important Dates
 * - Selection Process
 * - Application Requirements
 */

import styles from './hub-enrichment.module.css';

interface EnrichmentData {
  url?: string;
  at_a_glance?: Record<string, string>;
  important_dates?: Record<string, string>;
  selection_process?: string[];
  application_requirements?: string[];
  posts_detail?: Array<{ post: string; vacancies: string; pay: string }>;
  [key: string]: any;
}

export default function HubEnrichment({ data }: { data: EnrichmentData | null | undefined }) {
  if (!data || typeof data !== 'object') return null;

  const hasGlance = data.at_a_glance && Object.keys(data.at_a_glance).length > 0;
  const hasDates = data.important_dates && Object.keys(data.important_dates).length > 0;
  const hasSelection = data.selection_process && Array.isArray(data.selection_process) && data.selection_process.length > 0;
  const hasRequirements = data.application_requirements && Array.isArray(data.application_requirements) && data.application_requirements.length > 0;

  if (!hasGlance && !hasDates && !hasSelection && !hasRequirements) {
    return null;
  }

  return (
    <section className={styles.enrichment}>
      <div className={styles.container}>
        <h2>Complete Recruitment Details</h2>
        
        {/* At a Glance */}
        {hasGlance && (
          <div className={styles.tab}>
            <h3>At a Glance</h3>
            <div className={styles.grid}>
              {Object.entries(data.at_a_glance!).map(([key, value]) => (
                <div key={key} className={styles.row}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Important Dates */}
        {hasDates && (
          <div className={styles.tab}>
            <h3>Important Dates</h3>
            <div className={styles.grid}>
              {Object.entries(data.important_dates!).map(([key, value]) => (
                <div key={key} className={styles.row}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selection Process */}
        {hasSelection && (
          <div className={styles.tab}>
            <h3>Selection Process</h3>
            <ul className={styles.list}>
              {data.selection_process!.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Application Requirements */}
        {hasRequirements && (
          <div className={styles.tab}>
            <h3>Application Requirements</h3>
            <ul className={styles.list}>
              {data.application_requirements!.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
