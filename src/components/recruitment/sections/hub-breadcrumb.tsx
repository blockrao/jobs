/**
 * Hub Breadcrumb — Jobs › State › Organisation › Recruitment
 * State and organisation appear only when known; the state is always a name,
 * never an ISO code.
 */

import Link from 'next/link';
import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

export default function HubBreadcrumb({ data }: { data: HubData }) {
  const { recruitment, orgName, orgHref, state } = data;

  return (
    <nav aria-label="Breadcrumb" className={styles.crumbs}>
      <ol className={styles.crumbsList}>
        <li><Link href="/jobs">Jobs</Link></li>
        {state && (
          <li><Link href={state.href}>{state.name}</Link></li>
        )}
        {orgName && (
          <li>{orgHref ? <Link href={orgHref}>{orgName}</Link> : <span>{orgName}</span>}</li>
        )}
        <li><span aria-current="page">{recruitment.name}</span></li>
      </ol>
    </nav>
  );
}
