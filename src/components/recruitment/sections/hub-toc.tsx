/**
 * Hub TOC — horizontally scrollable section nav.
 * Only sections that actually render get an anchor.
 */

import type { HubData, HubSectionId } from './types';
import styles from '../recruitment-hub.module.css';

const LABELS: Record<HubSectionId, string> = {
  overview: 'Overview',
  posts: 'Posts',
  eligibility: 'Eligibility',
  pay: 'Pay',
  fee: 'Fee',
  dates: 'Dates',
  selection: 'Selection',
  apply: 'How to apply',
  links: 'Links',
  source: 'Source',
  faq: 'FAQ',
};

export default function HubToc({ data }: { data: HubData }) {
  if (data.sections.length === 0) return null;
  return (
    <nav aria-label="Page sections" className={styles.toc}>
      {data.sections.map((id) => (
        <a key={id} href={`#${id}`} className={styles.tocLink}>{LABELS[id]}</a>
      ))}
    </nav>
  );
}
