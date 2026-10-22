/**
 * Hub Post Card — wrapper component for multi-post recruitments.
 * For multi-post recruitment: renders as distinct card with H2 heading and visual border.
 * For single-post: renders with minimal styling.
 * Integrates vacancy breakdown, age limits, and other post-specific information.
 */

import Link from 'next/link';
import type { RecruitmentHubPost } from './types';
import HubVacancyBreakdown from './hub-vacancy-breakdown';
import HubAgeByCategory from './hub-age-by-category';
import styles from '../recruitment-hub.module.css';

interface Props {
  post: RecruitmentHubPost & {
    name: string;
    href?: string | null;
    vacancyBreakdown?: Array<{ categoryName: string; count: number }>;
    vacanciesLabel?: string | null;
    qualification?: string | null;
    experience?: string | null;
    pay?: string | null;
  };
  isSinglePost: boolean;
  postIndex?: number;
}

export default function HubPostCard({
  post,
  isSinglePost,
  postIndex,
}: Props) {
  const {
    name,
    href,
    vacancyBreakdown,
    vacanciesLabel,
    qualification,
    experience,
    pay,
    ageRules,
  } = post;

  // Calculate total vacancies from breakdown
  const totalVacancies = vacancyBreakdown
    ? vacancyBreakdown.reduce((sum, cat) => sum + cat.count, 0)
    : null;

  // Determine container styling
  const containerClass = isSinglePost ? styles.card : styles.card;
  const headerLevel = isSinglePost ? 'h2' : 'h2';

  // Transform ageRules to ageBreakdown format
  const ageBreakdown = ageRules
    ? ageRules.map((rule) => ({
        categoryName: rule.category,
        maxAge: rule.maxAge,
        relaxation: rule.relaxationYears,
        relaxationPwbd: rule.relaxationYears, // may need adjustment based on actual data
      }))
    : [];

  const Header = headerLevel as keyof JSX.IntrinsicElements;

  return (
    <div className={containerClass}>
      {!isSinglePost && (
        <Header
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 12,
            marginTop: postIndex === 0 ? 0 : 16,
          }}
        >
          {href ? <Link href={href}>{name}</Link> : name}
        </Header>
      )}

      {isSinglePost && (
        <h2 className={styles.sectionTitle}>
          {href ? <Link href={href}>{name}</Link> : name}
        </h2>
      )}

      {/* Key info grid for single post or details row for multi */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px 16px',
          fontSize: 14,
          marginBottom: 16,
        }}
      >
        {vacanciesLabel && (
          <>
            <dt style={{ color: 'var(--hub-ink3)' }}>Vacancies</dt>
            <dd style={{ fontWeight: 500, margin: 0 }}>{vacanciesLabel}</dd>
          </>
        )}
        {qualification && (
          <>
            <dt style={{ color: 'var(--hub-ink3)' }}>Qualification</dt>
            <dd style={{ fontWeight: 500, margin: 0 }}>{qualification}</dd>
          </>
        )}
        {experience && (
          <>
            <dt style={{ color: 'var(--hub-ink3)' }}>Experience</dt>
            <dd style={{ fontWeight: 500, margin: 0 }}>{experience}</dd>
          </>
        )}
        {pay && (
          <>
            <dt style={{ color: 'var(--hub-ink3)' }}>Pay</dt>
            <dd style={{ fontWeight: 500, margin: 0 }}>{pay}</dd>
          </>
        )}
      </div>

      {/* Vacancy breakdown table */}
      {vacancyBreakdown && vacancyBreakdown.length > 0 && totalVacancies !== null && (
        <HubVacancyBreakdown
          postTitle={name}
          vacancyBreakdown={vacancyBreakdown}
          total={totalVacancies}
        />
      )}

      {/* Age by category table */}
      {ageBreakdown.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <HubAgeByCategory
            postTitle={name}
            ageBreakdown={ageBreakdown}
          />
        </div>
      )}

      {/* Apply button per post */}
      <div style={{ marginTop: 16 }}>
        <a href="#apply" className={`${styles.btn} ${styles.btnPrimary}`}>
          Apply for {name}
        </a>
      </div>
    </div>
  );
}
