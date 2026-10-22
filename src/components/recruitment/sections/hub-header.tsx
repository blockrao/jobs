/**
 * Hub Header — hero
 * Chips (lifecycle, days left, verification, updated) → H1 → plain summary →
 * CTAs (Apply online / Official notification / Share) → notice line.
 * Every chip and sentence comes from a stored fact; nothing is defaulted.
 */

import type { HubData } from './types';
import { lifecycleChip } from '../recruitment-hub';
import AlertSignup from './alert-signup';
import styles from '../recruitment-hub.module.css';

function daysLeftChip(daysLeft: number | null, closed: boolean): string | null {
  if (closed || daysLeft === null || daysLeft < 0 || daysLeft > 14) return null;
  if (daysLeft === 0) return 'Closes today';
  if (daysLeft === 1) return 'Closes tomorrow';
  return `${daysLeft} days left`;
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="none" stroke="currentColor" strokeWidth="2"/>
      <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M12 2v10M5.586 7.586a2 2 0 1 1 2.828 0" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 7-7 7-7a10.6 10.6 0 01-9 5"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

export default function HubHeader({ data }: { data: HubData }) {
  const {
    heading, summary, applyUrl, notificationUrl, whatsappUrl, noticeLine,
    closed, daysLeft, verified, updatedAtLabel, slug,
  } = data;

  const status = lifecycleChip(data);
  const days = daysLeftChip(daysLeft, closed);
  const toneClass = status
    ? status.tone === 'open' ? styles.chipOpen
      : status.tone === 'closed' ? styles.chipClosed
      : status.tone === 'upcoming' ? styles.chipUpcoming
      : ''
    : '';

  const primary = applyUrl && !closed
    ? { label: 'Apply online', href: applyUrl }
    : notificationUrl
    ? { label: 'Official notification', href: notificationUrl }
    : null;
  const secondary = primary && primary.href !== notificationUrl && notificationUrl
    ? { label: 'Official notification', href: notificationUrl }
    : null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const emailSubject = encodeURIComponent(`Check out: ${heading}`);
  const emailBody = encodeURIComponent(`I found this job posting: ${heading}\n\nLink: ${currentUrl}`);
  const emailUrl = `mailto:?subject=${emailSubject}&body=${emailBody}`;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl).then(() => {
        alert('Link copied to clipboard!');
      });
    }
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this job: ${heading}`)}&url=${encodeURIComponent(currentUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`;

  return (
    <header className={`${styles.card} ${styles.hero}`}>
      <ul className={styles.chips}>
        {status && <li className={`${styles.chip} ${toneClass}`}>{status.text}</li>}
        {days && <li className={`${styles.chip} ${styles.chipUrgent}`}>{days}</li>}
        {verified
          ? <li className={styles.chip}>✓ Verified against official PDF</li>
          : notificationUrl
          ? <li className={styles.chip}>From official notification</li>
          : null}
        {updatedAtLabel && <li className={`${styles.chip} ${styles.chipMuted}`}>Updated {updatedAtLabel}</li>}
      </ul>

      <h1 className={styles.heroTitle}>{heading}</h1>

      {summary && <p className={styles.lead}>{summary}</p>}

      <p className={styles.actions}>
          {primary && (
            <a className={`${styles.btn} ${styles.btnPrimary}`} href={primary.href} target="_blank" rel="noopener noreferrer">
              {primary.label}
            </a>
          )}
          {secondary && (
            <a className={`${styles.btn} ${styles.btnSecondary}`} href={secondary.href} target="_blank" rel="noopener noreferrer">
              {secondary.label}
            </a>
          )}
          <a className={`${styles.btn} ${styles.btnGhost}`} href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp">
            <WhatsAppIcon /> WhatsApp
          </a>
          <a className={`${styles.btn} ${styles.btnGhost}`} href={emailUrl} aria-label="Share via Email">
            <EmailIcon /> Email
          </a>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={handleCopyLink} aria-label="Copy link">
            <ShareIcon /> Copy
          </button>
          <a className={`${styles.btn} ${styles.btnGhost}`} href={twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="Share on Twitter">
            <TwitterIcon /> Tweet
          </a>
          <a className={`${styles.btn} ${styles.btnGhost}`} href={linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">
            <LinkedInIcon /> LinkedIn
          </a>
      </p>

      {noticeLine && <p className={styles.notice}>{noticeLine}</p>}

      {/* Alert signup CTA */}
      <AlertSignup
        recruitmentName={heading}
        recruitmentSlug={slug}
      />

      {/* Trust signals and reporting */}
      <div className={styles.trustFooter}>
        <small className={styles.trustText}>
          {verified ? '✓ Data verified against official PDF' : '📋 Data from official notification'}
          {updatedAtLabel && ` • Last updated ${updatedAtLabel}`}
          <br />
          <a href={`/report?page=${encodeURIComponent(currentUrl)}`} className={styles.reportLink}>💬 Report an issue</a>
          {' • '}
          <a href="/help" className={styles.reportLink}>📖 Help & FAQs</a>
        </small>
      </div>
    </header>
  );
}
