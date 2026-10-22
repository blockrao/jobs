'use client';

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

interface CutoffMarksProps {
  data: HubData;
}

export default function HubCutoffMarks({ data }: CutoffMarksProps) {
  if (!data || !Array.isArray(data.cutoffMarks) || data.cutoffMarks.length === 0) {
    return null;
  }

  const validMarks = data.cutoffMarks.filter((row) => row && row.category && row.marks);
  if (validMarks.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeading}>✓ Cutoff Marks</h2>
      <p className={styles.sectionDescription}>
        Last year cutoff marks by category:
      </p>
      <div style={{
        overflowX: 'auto',
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px',
        }}>
          <thead>
            <tr style={{
              borderBottom: '2px solid #ddd',
              backgroundColor: '#f9f9f9',
            }}>
              <th style={{
                textAlign: 'left',
                padding: '10px',
                fontWeight: 600,
              }}>Category</th>
              <th style={{
                textAlign: 'right',
                padding: '10px',
                fontWeight: 600,
              }}>Marks</th>
            </tr>
          </thead>
          <tbody>
            {validMarks.map((row, idx) => (
              <tr
                key={`${row.category}-${idx}`}
                style={{
                  borderBottom: '1px solid #eee',
                }}
              >
                <td style={{
                  padding: '10px',
                  fontWeight: 500,
                }}>{row.category}</td>
                <td style={{
                  textAlign: 'right',
                  padding: '10px',
                  color: '#333',
                }}>
                  {row.marks}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
