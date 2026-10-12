/**
 * Hub Posts — Numbered post cards with mini DL, choose/skip boxes, full details accordion
 * Each card: number circle, post title, mini facts (org/vacancy/pay/age/qual), choose/skip, details.
 */

import Link from 'next/link';
import type { HubData, RecruitmentHubPost } from './types';
import styles from '../recruitment-hub.module.css';

interface HubPostsProps {
  data: HubData;
}

function parseReportedVacancy(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/,/g, '').trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function PostCard({
  post,
  index,
  recruitmentSlug,
  appEnd,
  localePrefix,
}: {
  post: RecruitmentHubPost;
  index: number;
  recruitmentSlug: string | null;
  appEnd: string | null;
  localePrefix: string;
}) {
  const postAny = post as typeof post & {
    employmentType?: string | null;
    payLevel?: Record<string, unknown> | null;
    vacancyTotal?: number | null;
  };

  const title = post.name ?? post.position?.name ?? `Post ${index + 1}`;
  const vacancies = post.resolvedVacancyCount
    ?? parseReportedVacancy(post.fjaExtract?.vacancyCountRaw)
    ?? postAny.vacancyTotal
    ?? null;
  const vacanciesVerified = post.resolvedVacancyCount != null
    && post.fjaExtract?.verificationStatus === 'VERIFIED';
  const vacanciesLabel = vacancies != null
    ? `${vacancies.toLocaleString('en-IN')}${vacanciesVerified ? '' : '*'}`
    : null;

  const payRaw = typeof postAny.payLevel?.raw === 'string' ? postAny.payLevel.raw : null;
  const payDisplay = payRaw ?? post.fjaExtract?.salaryRaw ?? null;

  const qual = post.fjaExtract?.qualificationRaw ?? null;
  const exp = post.fjaExtract?.experienceRaw ?? null;
  const location = post.fjaExtract?.locationRaw ?? null;
  const tenure = post.fjaExtract?.tenureRaw ?? null;

  const status = post.status ?? post.lifecycle_status ?? null;
  const isClosed = status && ['closed', 'expired'].includes(String(status).toLowerCase());

  const leafHref = recruitmentSlug && post.slug
    ? `${localePrefix}/jobs/${recruitmentSlug}/${post.slug}`
    : null;

  const miniDlRows: { label: string; value: string }[] = [];
  if (vacanciesLabel) miniDlRows.push({ label: 'Vacancies', value: vacanciesLabel });
  if (payDisplay) miniDlRows.push({ label: 'Pay', value: payDisplay });
  if (location) miniDlRows.push({ label: 'Location', value: location });
  if (tenure) miniDlRows.push({ label: 'Tenure', value: tenure });

  return (
    <article className={`${styles.post}${isClosed ? ` ${styles.postClosed}` : ''}`}>
      <header className={styles.postHeader}>
        <span className={styles.postNumber}>{index + 1}</span>
        <h3 className={styles.postTitle}>
          {leafHref ? (
            <Link href={leafHref}>{title}</Link>
          ) : title}
        </h3>
      </header>

      {miniDlRows.length > 0 && (
        <dl className={styles.miniDl}>
          {miniDlRows.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Eligibility snapshot (display text only — ELIG-001 Phase 1) */}
      {(qual || exp) && (
        <div className={styles.cs}>
          {qual && (
            <div className={styles.chooseBox}>
              <span className={styles.csLabel}>Qualification</span>
              {qual}
            </div>
          )}
          {exp && (
            <div className={styles.chooseBox} style={{ '--cs-color': 'var(--hub-violet)' } as React.CSSProperties}>
              <span className={styles.csLabel}>Experience</span>
              {exp}
            </div>
          )}
        </div>
      )}

      {/* Full details link / accordion */}
      {leafHref ? (
        <p style={{ marginTop: '0.75rem' }}>
          <Link href={leafHref} className={`${styles.btn} ${styles.btnSecondary}`} style={{ fontSize: '0.85em', padding: '0.4em 1em' }}>
            Full post details →
          </Link>
          {!vacanciesVerified && vacanciesLabel && (
            <span style={{ fontSize: '0.78em', opacity: 0.6, marginLeft: '0.75em' }}>
              * vacancy count unverified
            </span>
          )}
        </p>
      ) : (
        <details className={styles.details}>
          <summary className={styles.summary}>Full details</summary>
          <div className={styles.dbody}>
            {qual && <p><strong>Qualification:</strong> {qual}</p>}
            {exp && <p><strong>Experience:</strong> {exp}</p>}
            {!qual && !exp && <p>No additional details available.</p>}
          </div>
        </details>
      )}
    </article>
  );
}

export default function HubPosts({ data }: HubPostsProps) {
  const { posts, hasPosts, recruitment, appEnd, localePrefix, postsTableRows, hasPostsTable } = data;

  if (!hasPosts) return null;

  return (
    <>
      <section id="posts" aria-labelledby="posts-heading" className={styles.card}>
        <h2 id="posts-heading" className={styles.sectionTitle}>
          Posts &amp; Opportunities
          <span style={{ fontWeight: 400, fontSize: '0.75em', marginLeft: '0.5em', opacity: 0.6 }}>
            ({posts.length})
          </span>
        </h2>
        <div>
          {posts.map((post, i) => (
            <PostCard
              key={post.id}
              post={post}
              index={i}
              recruitmentSlug={recruitment.slug ?? null}
              appEnd={appEnd}
              localePrefix={localePrefix}
            />
          ))}
        </div>
      </section>

      {/* Compare table — only when multiple posts with comparable facts */}
      {hasPostsTable && (
        <section id="posts-table" aria-labelledby="posts-table-heading" className={styles.card}>
          <h2 id="posts-table-heading" className={styles.sectionTitle}>Compare Posts</h2>
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Post</th>
                  <th scope="col">Vacancies</th>
                  <th scope="col">Pay</th>
                  <th scope="col">Type</th>
                </tr>
              </thead>
              <tbody>
                {postsTableRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.slug && recruitment.slug ? (
                        <Link href={`${localePrefix}/jobs/${recruitment.slug}/${row.slug}`}>
                          {row.name ?? row.slug}
                        </Link>
                      ) : (row.name ?? '—')}
                    </td>
                    <td>{row.vacanciesLabel ?? '—'}</td>
                    <td>{row.payDisplay ?? '—'}</td>
                    <td>{row.employmentType ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.note}>
            * Vacancy counts marked with * are unverified (sourced from aggregators, not confirmed against official notification).
          </p>
        </section>
      )}
    </>
  );
}
