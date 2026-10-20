/**
 * Hub Breadcrumb — Sticky top breadcrumb bar
 * Jobs > Organisation > Recruitment name
 */

import Link from 'next/link';
import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

interface HubBreadcrumbProps {
  data: HubData;
}

export default function HubBreadcrumb({ data }: HubBreadcrumbProps) {
  const { recruitment, displayOrg, orgSlug, localePrefix } = data;

  return (
    <nav aria-label="Breadcrumb" className={styles.crumbs}>
      <ol className={styles.crumbsList}>
        <li>
          <Link href={`${localePrefix}/jobs`}>Jobs</Link>
        </li>
        {displayOrg && (
          <li>
            {orgSlug ? (
              <Link href={`${localePrefix}/exams/${orgSlug}`}>{displayOrg}</Link>
            ) : (
              <span>{displayOrg}</span>
            )}
          </li>
        )}
        <li>
          <span aria-current="page">{recruitment.name}</span>
        </li>
      </ol>
    </nav>
  );
}
