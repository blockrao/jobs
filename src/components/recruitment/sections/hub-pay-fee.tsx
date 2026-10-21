/**
 * Hub Pay & Fee — two cards side by side (stacked on mobile).
 * Each card is omitted when it has no data; the wrapper is omitted when both are empty.
 */

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

export default function HubPayFee({ data }: { data: HubData }) {
  const { payLines, feeRows, feeNote, feeSummary, verified, sourceFactsUnverified } = data;
  const hasPay = payLines.length > 0;
  const hasFee = feeRows.length > 0 || Boolean(feeNote) || Boolean(feeSummary);
  if (!hasPay && !hasFee) return null;

  const getVerificationLabel = (isVerified?: boolean): string | null => {
    if (isVerified) return '(verified)';
    if (verified) return '(verified)';
    if (sourceFactsUnverified) return '(reported, not verified)';
    return '(from notification)';
  };

  return (
    <div className={styles.cardGrid}>
      {hasPay && (
        <section id="pay" aria-labelledby="pay-heading" className={styles.card}>
          <h2 id="pay-heading" className={styles.sectionTitle}>Pay</h2>
          {payLines.length === 1 && !payLines[0].label
            ? (
              <p className={styles.bigFact}>
                {payLines[0].value}
                {payLines[0].verified !== undefined && (
                  <span className={styles.verificationNote}>
                    {' '}<small>{getVerificationLabel(payLines[0].verified)}</small>
                  </span>
                )}
              </p>
            )
            : (
              <dl className={styles.kv}>
                {payLines.map((l, i) => (
                  <div key={`${l.label ?? ''}-${i}`} className={styles.kvRow}>
                    <dt>{l.label ?? 'Pay'}</dt>
                    <dd>
                      {l.value}
                      {l.verified !== undefined && (
                        <span className={styles.verificationNote}>
                          {' '}<small>{getVerificationLabel(l.verified)}</small>
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
        </section>
      )}

      {hasFee && (
        <section id="fee" aria-labelledby="fee-heading" className={styles.card}>
          <h2 id="fee-heading" className={styles.sectionTitle}>Application fee</h2>
          {feeRows.length > 0 ? (
            <dl className={styles.kv}>
              {feeRows.map((r) => (
                <div key={r.category} className={styles.kvRow}>
                  <dt>{r.category}</dt>
                  <dd>
                    {r.amount}
                    <span className={styles.verificationNote}>
                      {' '}<small>{getVerificationLabel()}</small>
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className={styles.bigFact}>
              {feeSummary ?? feeNote}
              <span className={styles.verificationNote}>
                {' '}<small>{getVerificationLabel()}</small>
              </span>
            </p>
          )}
          {feeRows.length > 0 && feeNote && <p className={`${styles.note} ${styles.preLine}`}>{feeNote}</p>}
        </section>
      )}
    </div>
  );
}
