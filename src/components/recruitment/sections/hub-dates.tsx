/**
 * Hub Dates — vertical timeline.
 * Known steps show their date; unknown future steps are greyed "Not announced
 * yet"; the current/next step is highlighted. The tentative interview date is
 * surfaced only while source facts are unverified and is labelled tentative.
 * No "Alert me" button: there is no /alerts route to link to.
 */

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

export default function HubDates({ data }: { data: HubData }) {
  const { timeline } = data;
  if (!timeline.some((t) => t.date)) return null;

  return (
    <section id="dates" aria-labelledby="dates-heading" className={styles.card}>
      <h2 id="dates-heading" className={styles.sectionTitle}>Dates &amp; updates</h2>
      <ol className={styles.timeline}>
        {timeline.map((step) => (
          <li
            key={step.id}
            className={`${styles.step} ${
              step.state === 'current' ? styles.stepCurrent
              : step.state === 'past' ? styles.stepPast
              : step.state === 'future' ? styles.stepFuture
              : styles.stepUnknown
            }`}
            aria-current={step.state === 'current' ? 'step' : undefined}
          >
            <span className={styles.stepDot} aria-hidden="true" />
            <div className={styles.stepBody}>
              <span className={styles.stepLabel}>
                {step.label}
                {step.note && <span className={styles.stepNote}> ({step.note})</span>}
              </span>
              {step.date && step.iso
                ? <time className={styles.stepDate} dateTime={step.iso}>{step.date}</time>
                : <span className={styles.stepDateUnknown}>Not announced yet</span>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
