/**
 * Hub Links — Important links list
 * Official notification, application portal, and any other resolved URLs.
 */

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

interface HubLinksProps {
  data: HubData;
}

function ExternalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}

export default function HubLinks({ data }: HubLinksProps) {
  const { displayOfficialSource, displayApplicationUrl, sharedApplicationEmail, closed } = data;

  const links: { label: string; href: string; type: 'ext' | 'email' }[] = [];

  if (displayOfficialSource) {
    links.push({ label: 'Official notification / advertisement', href: displayOfficialSource, type: 'ext' });
  }
  if (displayApplicationUrl && !closed) {
    links.push({ label: 'Official application portal', href: displayApplicationUrl, type: 'ext' });
  }
  if (sharedApplicationEmail) {
    links.push({ label: `Apply by email: ${sharedApplicationEmail}`, href: `mailto:${sharedApplicationEmail}`, type: 'email' });
  }

  if (links.length === 0) return null;

  return (
    <section id="links" aria-labelledby="links-heading" className={styles.card}>
      <h2 id="links-heading" className={styles.sectionTitle}>Official Links</h2>
      <ul className={styles.links}>
        {links.map(({ label, href, type }) => (
          <li key={href} className={styles.linkItem}>
            <a
              href={href}
              target={type === 'email' ? undefined : '_blank'}
              rel={type === 'email' ? undefined : 'noopener noreferrer'}
            >
              {label}
              {type === 'ext' && <ExternalIcon />}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
