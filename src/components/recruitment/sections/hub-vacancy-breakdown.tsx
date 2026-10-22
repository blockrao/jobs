/**
 * Hub Vacancy Breakdown — category-wise vacancy table for a single post.
 * Shows only categories with count > 0. Optionally displays source indicator.
 * Mobile: table scrolls horizontally.
 */

import styles from '../recruitment-hub.module.css';

interface Props {
  postTitle: string;
  vacancyBreakdown: Array<{ categoryName: string; count: number }>;
  total: number;
  source?: 'official' | 'estimated';
  verificationStatus?: string;
}

export default function HubVacancyBreakdown({
  postTitle,
  vacancyBreakdown,
  total,
  source,
  verificationStatus,
}: Props) {
  // Filter out categories with no vacancies
  const filtered = vacancyBreakdown.filter((row) => row.count > 0);
  if (filtered.length === 0) return null;

  return (
    <div className={styles.subCard}>
      <h3 className={styles.subTitle}>
        Vacancies: {postTitle}
        {source && <span className={styles.verificationNote}> ({source})</span>}
      </h3>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Count</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.categoryName}>
                <td>{row.categoryName}</td>
                <td>{row.count}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 600 }}>
              <td>Total</td>
              <td>{total}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {verificationStatus && (
        <p className={styles.note} style={{ marginTop: 8 }}>
          {verificationStatus}
        </p>
      )}
    </div>
  );
}
