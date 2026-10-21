/**
 * Hub Posts — posts & vacancies table, one row per post.
 * Post names are plain text (no leaf links: no Hub → Leaf inheritance).
 * Vacancy counts that are not verified against the official notice carry an
 * asterisk and the footnote explains it.
 */

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

export default function HubPosts({ data }: { data: HubData }) {
  const { postRows, anyVacancyUnverified } = data;
  if (postRows.length === 0) return null;

  const showExperience = postRows.some((r) => r.experience);

  return (
    <section id="posts" aria-labelledby="posts-heading" className={styles.card}>
      <h2 id="posts-heading" className={styles.sectionTitle}>
        Posts &amp; vacancies <span className={styles.count}>({postRows.length})</span>
      </h2>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Post</th>
              <th scope="col">Vacancies</th>
              <th scope="col">Qualification</th>
              {showExperience && <th scope="col">Experience</th>}
              <th scope="col">Pay</th>
            </tr>
          </thead>
          <tbody>
            {postRows.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.name}</th>
                <td>{row.vacanciesLabel ?? '—'}</td>
                <td>{row.qualification ?? '—'}</td>
                {showExperience && <td>{row.experience ?? '—'}</td>}
                <td>{row.pay ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {anyVacancyUnverified && (
        <p className={styles.note}>
          * Vacancy count reported by the source listing, not yet confirmed against the official notification.
        </p>
      )}
    </section>
  );
}
