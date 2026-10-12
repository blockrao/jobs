/**
 * Hub Apply — 3-phase how-to-apply guide
 * Phase 1: Check eligibility, Phase 2: Fill form, Phase 3: Submit.
 * Only shown when we have an application URL or fee details and not closed.
 */

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

interface HubApplyProps {
  data: HubData;
}

export default function HubApply({ data }: HubApplyProps) {
  const {
    displayApplicationUrl, hasFeeDetails, closed, appEnd,
    feeGeneral, feeReserved, feeNote, sharedApplicationEmail,
    sourceApplicationMode, displayOfficialSource,
  } = data;

  if (closed) return null;
  if (!displayApplicationUrl && !hasFeeDetails && !sharedApplicationEmail) return null;

  const isOnline = displayApplicationUrl || sourceApplicationMode?.toLowerCase().includes('online');
  const isEmail = !displayApplicationUrl && sharedApplicationEmail;

  return (
    <section id="apply" aria-labelledby="apply-heading" className={`${styles.card} ${styles.tintYellow}`}>
      <h2 id="apply-heading" className={styles.sectionTitle}>How to Apply</h2>

      <ol className={styles.listUl} style={{ paddingLeft: 0, listStyle: 'none' }}>
        {/* Phase 1 */}
        <li className={styles.phase}>
          <div className={styles.phaseNum}>1</div>
          <div>
            <div className={styles.phaseTitle}>Check eligibility</div>
            <p>Review the official notification carefully. Confirm you meet the age, qualification and experience requirements for the post you are applying to.</p>
          </div>
        </li>

        {/* Phase 2 */}
        <li className={styles.phase}>
          <div className={styles.phaseNum}>2</div>
          <div>
            <div className={styles.phaseTitle}>
              {isOnline
                ? 'Fill the online application form'
                : isEmail
                ? 'Prepare your application'
                : 'Complete the application'}
            </div>
            {isOnline && displayApplicationUrl && (
              <p>
                Go to the{' '}
                <a href={displayApplicationUrl} target="_blank" rel="noopener noreferrer">
                  official application portal
                </a>{' '}
                and fill in your details. Keep your documents ready (photo, signature, certificates).
              </p>
            )}
            {isEmail && (
              <p>
                Prepare your application as per the official notification instructions and send it to{' '}
                <a href={`mailto:${sharedApplicationEmail}`}>{sharedApplicationEmail}</a>.
              </p>
            )}
            {!isOnline && !isEmail && (
              <p>Follow the application instructions in the official notification.</p>
            )}
            {hasFeeDetails && feeGeneral != null && (
              <p>
                Application fee:{' '}
                <strong>
                  {Number(feeGeneral) === 0
                    ? 'No fee required'
                    : `₹${Number(feeGeneral).toLocaleString('en-IN')} (General)`}
                  {feeReserved != null && Number(feeReserved) !== Number(feeGeneral)
                    ? `, ₹${Number(feeReserved).toLocaleString('en-IN')} (SC/ST/PwBD/Women)`
                    : ''}
                </strong>
                {feeNote && `. ${feeNote}`}
              </p>
            )}
          </div>
        </li>

        {/* Phase 3 */}
        <li className={styles.phase}>
          <div className={styles.phaseNum}>3</div>
          <div>
            <div className={styles.phaseTitle}>Submit before the deadline</div>
            <p>
              {appEnd
                ? <>Submit your application by <strong>{appEnd}</strong>. Late submissions are not accepted.</>
                : <>Submit your application before the last date shown in the official notification.</>}
              {' '}
              {displayOfficialSource && (
                <>
                  Download and keep a copy of the{' '}
                  <a href={displayOfficialSource} target="_blank" rel="noopener noreferrer">
                    official notification
                  </a>{' '}
                  for reference.
                </>
              )}
            </p>
          </div>
        </li>
      </ol>
    </section>
  );
}
