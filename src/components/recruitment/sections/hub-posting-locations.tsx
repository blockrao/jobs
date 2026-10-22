'use client';

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

interface PostingLocationsProps {
  data: HubData;
}

export default function HubPostingLocations({ data }: PostingLocationsProps) {
  if (!data.postingLocations || data.postingLocations.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeading}>📍 Posting Locations</h2>
      <p className={styles.sectionDescription}>
        Positions are available in the following cities:
      </p>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        {data.postingLocations.map((city) => (
          <span
            key={city}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f0f0f0',
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#333',
            }}
          >
            {city}
          </span>
        ))}
      </div>
    </section>
  );
}
