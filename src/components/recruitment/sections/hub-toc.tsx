/**
 * Hub TOC — Scrollable pill navigation strip
 * Links to each major section on the hub page.
 */

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

interface HubTocProps {
  data: HubData;
}

export default function HubToc({ data }: HubTocProps) {
  const {
    faqItems, hasPosts, hasPostsTable, hasEligibilityData,
    displayOfficialSource, displayApplicationUrl, selectionDisplayRows,
    displaySelectionProcess, hasFeeDetails, sourceDocuments, closed,
    hasTimeline, recruitment,
  } = data;

  const links: { href: string; label: string }[] = [];

  if (faqItems.length > 0) links.push({ href: '#quick', label: 'Quick Answers' });
  links.push({ href: '#details', label: 'Details' });
  if (hasTimeline) links.push({ href: '#dates', label: 'Key Dates' });
  if (hasPosts) links.push({ href: '#posts', label: 'Posts' });
  if (hasPostsTable) links.push({ href: '#posts-table', label: 'Compare' });
  if (hasEligibilityData) links.push({ href: '#eligibility', label: 'Eligibility' });
  if (selectionDisplayRows.length > 0 || displaySelectionProcess) links.push({ href: '#selection', label: 'Selection' });
  if ((displayApplicationUrl || hasFeeDetails) && !closed) links.push({ href: '#apply', label: 'How to Apply' });
  if (sourceDocuments.length > 0) links.push({ href: '#documents', label: 'Documents' });
  if (recruitment.ageNote) links.push({ href: '#conditions', label: 'Age & Conditions' });
  if (displayApplicationUrl || displayOfficialSource) links.push({ href: '#links', label: 'Links' });

  if (links.length === 0) return null;

  return (
    <nav aria-label="Page sections" className={styles.toc}>
      {links.map(({ href, label }) => (
        <a key={href} href={href} className={styles.tocLink}>
          {label}
        </a>
      ))}
    </nav>
  );
}
