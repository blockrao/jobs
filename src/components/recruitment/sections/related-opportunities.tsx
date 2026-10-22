import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

interface RelatedOpportunitiesProps {
  data: HubData;
}

export default function RelatedOpportunities({ data }: RelatedOpportunitiesProps) {
  // Show explore opportunities (similar jobs)
  if (!data.explore || data.explore.length === 0) {
    return null;
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.card} style={{ marginTop: 0 }}>
        <h3 className={styles.sectionTitle} style={{ marginBottom: '12px' }}>
          🎯 Similar Opportunities
        </h3>

        <p style={{ fontSize: '13px', color: 'var(--hub-ink2)', margin: '0 0 12px' }}>
          You might also be interested in these roles:
        </p>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.explore.map((opportunity) => (
            <li key={opportunity.href}>
              <a
                href={opportunity.href}
                style={{
                  display: 'block',
                  padding: '10px 12px',
                  backgroundColor: 'var(--hub-blue-t)',
                  border: '1px solid #c7d6fb',
                  borderRadius: '8px',
                  color: 'var(--hub-blue)',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.backgroundColor = 'var(--hub-blue)';
                  el.style.color = 'white';
                  el.style.borderColor = 'var(--hub-blue)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.backgroundColor = 'var(--hub-blue-t)';
                  el.style.color = 'var(--hub-blue)';
                  el.style.borderColor = '#c7d6fb';
                }}
              >
                {opportunity.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA for more jobs */}
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--hub-line)' }}>
          <a
            href="/jobs"
            style={{
              display: 'inline-block',
              padding: '8px 12px',
              backgroundColor: 'var(--hub-blue)',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Browse all jobs →
          </a>
        </div>
      </div>

      {/* Alert frequency preferences */}
      <div className={styles.card}>
        <h3 className={styles.sectionTitle} style={{ marginBottom: '12px', fontSize: '14px' }}>
          ⏰ Alert Preferences
        </h3>

        <p style={{ fontSize: '12px', color: 'var(--hub-ink2)', margin: '0 0 10px' }}>
          Choose how often you want to receive job alerts:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {['Daily', 'Weekly', 'Monthly'].map((freq) => (
            <label
              key={freq}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px',
                cursor: 'pointer',
                borderRadius: '6px',
                backgroundColor: 'var(--hub-grey-t)',
                fontSize: '12px',
              }}
            >
              <input
                type="radio"
                name="frequency"
                value={freq.toLowerCase()}
                defaultChecked={freq === 'Daily'}
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              <span>{freq}</span>
            </label>
          ))}
        </div>

        <p style={{ fontSize: '11px', color: 'var(--hub-ink3)', margin: '10px 0 0', fontStyle: 'italic' }}>
          Note: Configure in your account settings after subscribing
        </p>
      </div>
    </aside>
  );
}
