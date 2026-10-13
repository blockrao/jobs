/**
 * Hub Source — Source attribution and verification status
 * Shows where data came from and verification status.
 */

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';
import { publicLink } from '@/lib/aggregators';

interface HubSourceProps {
  data: HubData;
}

export default function HubSource({ data }: HubSourceProps) {
  const { recruitment, sourceFactsUnverified, displayOfficialSource } = data;

  const verificationStatus = recruitment.sourceVerificationStatus;
  const sourceUrl = publicLink(recruitment.sourceExtract?.sourceUrl ?? null);
  const detailStatus = typeof recruitment.sourceExtract?.detailStatus === 'string'
    ? recruitment.sourceExtract.detailStatus
    : null;

  const hasContent = verificationStatus || sourceUrl || displayOfficialSource || detailStatus;
  if (!hasContent) return null;

  return (
    <section id="sources" aria-labelledby="sources-heading" className={styles.card}>
      <h2 id="sources-heading" className={styles.sectionTitle}>Source &amp; Verification</h2>

      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {verificationStatus && (
              <tr>
                <td>Verification status</td>
                <td>
                  <strong>
                    {verificationStatus === 'VERIFIED'
                      ? '✓ Verified against official notification'
                      : verificationStatus === 'UNVERIFIED'
                      ? 'Unverified (aggregator source)'
                      : verificationStatus}
                  </strong>
                </td>
              </tr>
            )}
            {detailStatus && (
              <tr>
                <td>Detail status</td>
                <td>{detailStatus}</td>
              </tr>
            )}
            {displayOfficialSource && (
              <tr>
                <td>Official notification</td>
                <td>
                  <a href={displayOfficialSource} target="_blank" rel="noopener noreferrer">
                    View ↗
                  </a>
                </td>
              </tr>
            )}
            {sourceUrl && sourceUrl !== displayOfficialSource && (
              <tr>
                <td>Discovery source</td>
                <td>
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                    View ↗
                  </a>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sourceFactsUnverified && (
        <p className={styles.warn} style={{ marginTop: '1rem' }}>
          Facts on this page are sourced from aggregators and have not been independently verified against the official notification.
          Always confirm eligibility, vacancy count, fee and deadline in the official notice before applying.
        </p>
      )}
    </section>
  );
}
