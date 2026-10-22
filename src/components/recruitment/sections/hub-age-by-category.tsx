/**
 * Hub Age By Category — age limits and relaxations per category for a single post.
 * Shows category, max age, relaxation (for general category), and PwBD relaxation.
 * Mobile: table scrolls horizontally.
 */

import styles from '../recruitment-hub.module.css';

interface AgeCategory {
  categoryName: string;
  maxAge: number | null;
  relaxation?: number | null;
  relaxationPwbd?: number | null;
}

interface Props {
  postTitle: string;
  ageBreakdown: AgeCategory[];
  ageAsOnDate?: string;
  verificationStatus?: string;
}

export default function HubAgeByCategory({
  postTitle,
  ageBreakdown,
  ageAsOnDate,
  verificationStatus,
}: Props) {
  if (!ageBreakdown || ageBreakdown.length === 0) return null;

  // Filter categories that have a maxAge value
  const filtered = ageBreakdown.filter((cat) => cat.maxAge !== null && cat.maxAge !== undefined);
  if (filtered.length === 0) return null;

  return (
    <div className={styles.subCard}>
      <h3 className={styles.subTitle}>
        Age Limits: {postTitle}
        {ageAsOnDate && <span className={styles.verificationNote}> (as on {ageAsOnDate})</span>}
      </h3>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Max Age</th>
              <th scope="col">Relaxation</th>
              <th scope="col">PwBD Relaxation</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((cat) => (
              <tr key={cat.categoryName}>
                <td>{cat.categoryName}</td>
                <td>{cat.maxAge ?? '—'}</td>
                <td>{cat.relaxation ? `+${cat.relaxation}` : '—'}</td>
                <td>{cat.relaxationPwbd ? `+${cat.relaxationPwbd}` : '—'}</td>
              </tr>
            ))}
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
