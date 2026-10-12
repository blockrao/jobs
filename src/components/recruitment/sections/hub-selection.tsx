/**
 * Hub Selection — Selection process with fee minis and RT/exam-centre accordion
 */

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

interface HubSelectionProps {
  data: HubData;
}

export default function HubSelection({ data }: HubSelectionProps) {
  const {
    selectionDisplayRows, displaySelectionProcess,
    feeGeneral, feeReserved, feeNote, hasFeeDetails, feeRows,
  } = data;

  const hasContent = selectionDisplayRows.length > 0 || displaySelectionProcess || hasFeeDetails;
  if (!hasContent) return null;

  return (
    <section id="selection" aria-labelledby="selection-heading" className={styles.card}>
      <h2 id="selection-heading" className={styles.sectionTitle}>Selection Process</h2>

      {/* Selection stages */}
      {(selectionDisplayRows.length > 0 || displaySelectionProcess) && (
        <div style={{ marginBottom: '1.25rem' }}>
          {selectionDisplayRows.length > 0 ? (
            <ol className={styles.listUl} style={{ paddingLeft: '1.25rem', listStyleType: 'decimal' }}>
              {selectionDisplayRows.map((row, i) => (
                <li key={i}>
                  {row.title && <strong>{row.title}</strong>}
                  {row.detail && <span style={{ display: 'block', opacity: 0.8, fontSize: '0.9em' }}>{row.detail}</span>}
                </li>
              ))}
            </ol>
          ) : displaySelectionProcess ? (
            <p>{displaySelectionProcess}</p>
          ) : null}
        </div>
      )}

      {/* Fee details */}
      {hasFeeDetails && (
        <div>
          <h3 className={styles.sectionTitle} style={{ fontSize: '1rem', marginTop: '1rem', marginBottom: '0.75rem' }}>
            Application Fee
          </h3>
          {feeRows.length > 0 ? (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col">Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {feeRows.map((row, i) => {
                    const cat = String(row.category ?? row.cat ?? `Category ${i + 1}`);
                    const amt = row.amount ?? row.fee ?? row.amt;
                    const amtDisplay = amt != null
                      ? (Number(amt) === 0 ? 'No fee' : `₹${Number(amt).toLocaleString('en-IN')}`)
                      : '—';
                    return (
                      <tr key={i}>
                        <td>{cat}</td>
                        <td><strong>{amtDisplay}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.minis}>
              {feeGeneral != null && (
                <div className={styles.miniStat}>
                  <div className={styles.miniStatValue}>
                    {Number(feeGeneral) === 0 ? 'No fee' : `₹${Number(feeGeneral).toLocaleString('en-IN')}`}
                  </div>
                  <div>General</div>
                </div>
              )}
              {feeReserved != null && (
                <div className={styles.miniStat}>
                  <div className={styles.miniStatValue}>
                    {Number(feeReserved) === 0 ? 'No fee' : `₹${Number(feeReserved).toLocaleString('en-IN')}`}
                  </div>
                  <div>Reserved</div>
                </div>
              )}
            </div>
          )}
          {feeNote && <p className={styles.note} style={{ marginTop: '0.75rem' }}>{feeNote}</p>}
        </div>
      )}
    </section>
  );
}
