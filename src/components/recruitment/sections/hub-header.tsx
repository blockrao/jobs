/**
 * Hub Header — Hero card
 * Blue hero card: chips, H1, lead stats, yellow deadline box, action buttons, trust line, tools row.
 * Matches BhartiDesk v2 reference design.
 */

import Link from 'next/link';
import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

interface HubHeaderProps {
  data: HubData;
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

export default function HubHeader({ data }: HubHeaderProps) {
  const {
    recruitment, posts, sourceFactsUnverified, displayOrg, displayTotalVacancies,
    displayApplicationUrl, displayOfficialSource, appEnd, closed, isClosingSoon, isLastDay,
    daysLeft, hasPosts, isSinglePost, notificationNumber, feeGeneral, feeReserved,
    hasFeeDetails, feeNote, displayDescription, descriptionIsInternal, sourceStatusLabel,
    localePrefix,
  } = data;

  // Chip state
  // upcoming: app start date is in the future (not yet open)
  const appStartRaw = recruitment.applicationStartDate ?? null;
  const appStartIsUpcoming = appStartRaw
    ? new Date(appStartRaw).getTime() > Date.now()
    : false;

  let chipState: 'open' | 'closed' | 'upcoming' | 'unverified' = 'open';
  if (closed) chipState = 'closed';
  else if (appStartIsUpcoming) chipState = 'upcoming';
  else if (sourceFactsUnverified) chipState = 'unverified';

  const chipClass = chipState === 'open'
    ? `${styles.chip} ${styles.chipOpen}`
    : chipState === 'closed'
    ? `${styles.chip} ${styles.chipClosed}`
    : chipState === 'upcoming'
    ? `${styles.chip} ${styles.chipUpcoming}`
    : styles.chip;

  const chipText = chipState === 'open' ? 'Open'
    : chipState === 'closed' ? 'Closed'
    : chipState === 'upcoming' ? 'Upcoming'
    : sourceStatusLabel ? `${sourceStatusLabel} (reported)` : 'Check notification';

  // Employment type chip
  const employmentTypes = Array.from(new Set(
    posts.map((p) => (p as typeof p & { employmentType?: string | null }).employmentType).filter(Boolean)
  ));
  const empChip = employmentTypes.length === 1
    ? employmentTypes[0]!.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : employmentTypes.length > 1 ? 'Multiple types' : null;

  // Lead: vacancy + post count
  const leadParts: string[] = [];
  if (displayTotalVacancies != null) {
    leadParts.push(`${displayTotalVacancies.toLocaleString('en-IN')} ${displayTotalVacancies === 1 ? 'vacancy' : 'vacancies'}`);
  }
  if (posts.length > 0) {
    leadParts.push(`${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`);
  }

  // WhatsApp share URL
  const waText = encodeURIComponent(
    `${recruitment.name} — Last date: ${appEnd ?? 'see notification'}${displayApplicationUrl ? `\nApply: ${displayApplicationUrl}` : displayOfficialSource ? `\nNotification: ${displayOfficialSource}` : ''}`
  );
  const waUrl = `https://wa.me/?text=${waText}`;

  // Google Calendar URL
  let calUrl: string | null = null;
  if (!closed && recruitment.applicationEndDate) {
    const endDate = new Date(recruitment.applicationEndDate);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}`;
    const nextDay = new Date(endDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = `${nextDay.getFullYear()}${pad(nextDay.getMonth() + 1)}${pad(nextDay.getDate())}`;
    const calText = encodeURIComponent(`Last date — ${recruitment.name}`);
    const calDetails = encodeURIComponent(
      `Apply by this date${displayApplicationUrl ? `\n${displayApplicationUrl}` : displayOfficialSource ? `\n${displayOfficialSource}` : ''}`
    );
    calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calText}&dates=${dateStr}/${nextDayStr}&details=${calDetails}`;
  }

  return (
    <header className={`${styles.card} ${styles.hero}`}>
      {/* Status + category chips */}
      <ul className={styles.chips}>
        <li className={chipClass} data-status="true">{chipText}</li>
        {empChip && <li className={styles.chip}>{empChip}</li>}
        {displayOrg && <li className={styles.chip}>{displayOrg}</li>}
        {notificationNumber && <li className={styles.chip}>Advt {notificationNumber}</li>}
      </ul>

      {/* H1 */}
      <h1 className={styles.heroTitle}>{recruitment.name}</h1>

      {/* Lead */}
      {leadParts.length > 0 && (
        <p className={styles.lead}>
          {leadParts.join(' · ')}{sourceFactsUnverified ? ' (reported)' : ''}.
          {appEnd && !closed && (
            <> Apply by <strong>{appEnd}</strong>{sourceFactsUnverified ? ' (reported)' : ''}.</>
          )}
        </p>
      )}

      {/* Description */}
      {displayDescription && !descriptionIsInternal && (
        <p className={styles.lead} style={{ opacity: 0.85 }}>{displayDescription}</p>
      )}

      {/* Yellow deadline box */}
      {appEnd && !closed && (
        <div className={`${styles.deadline}${isLastDay || isClosingSoon ? ' ' + styles.deadlineUrgent : ''}`}>
          <strong className={styles.deadlineLabel}>
            Last date to apply{sourceFactsUnverified ? ' (reported)' : ''}
          </strong>
          <time className={styles.deadlineDate}>{appEnd}</time>
          <span className={styles.deadlineCountdown} data-countdown="true">
            {isLastDay
              ? 'Today is the last day!'
              : isClosingSoon && daysLeft !== null
              ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`
              : `Closing ${appEnd}`}
          </span>
        </div>
      )}

      {/* Closed notice */}
      {closed && (
        <p className={styles.closedNote} style={{ display: 'block' }}>
          Applications for this recruitment are closed.
          Check the official notification for results or next steps.
        </p>
      )}

      {/* Quick facts mini-strip (fee + selection mode if available) */}
      {hasFeeDetails && (
        <p className={styles.lead} style={{ fontSize: '0.92em', opacity: 0.9 }}>
          Fee:{' '}
          {feeGeneral != null
            ? Number(feeGeneral) === 0
              ? 'No fee'
              : `₹${Number(feeGeneral).toLocaleString('en-IN')} (General)${feeReserved != null ? `, ₹${Number(feeReserved).toLocaleString('en-IN')} (Reserved)` : ''}`
            : feeNote ?? 'See details'}
        </p>
      )}

      {/* Action buttons */}
      <p className={styles.actions}>
        {isSinglePost && posts[0]?.slug ? (
          <Link
            className={`${styles.btn} ${styles.btnPrimary}`}
            href={`${localePrefix}/jobs/${recruitment.slug}/${posts[0].slug}`}
          >
            View post details
          </Link>
        ) : hasPosts ? (
          <a className={`${styles.btn} ${styles.btnPrimary}`} href="#posts">
            View all posts ({posts.length})
          </a>
        ) : null}

        {displayApplicationUrl && !closed && (
          <a
            className={`${styles.btn} ${styles.btnSecondary}`}
            href={displayApplicationUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Apply on official portal
          </a>
        )}

        {displayOfficialSource && (
          <a
            className={styles.btn}
            href={displayOfficialSource}
            target="_blank"
            rel="noopener noreferrer"
          >
            Official notification
          </a>
        )}
      </p>

      {/* Trust line */}
      <p className={styles.trust}>
        {sourceFactsUnverified
          ? 'Facts sourced from aggregators — verify each detail in the official notification before applying.'
          : 'Facts sourced from official notifications.'}
      </p>

      {/* Tools row: WhatsApp share + Google Calendar */}
      <p className={styles.tools}>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on WhatsApp"
        >
          <WhatsAppIcon /> Share
        </a>
        {calUrl && (
          <a
            href={calUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Add last date to Google Calendar"
          >
            <CalendarIcon /> Add to calendar
          </a>
        )}
      </p>
    </header>
  );
}
