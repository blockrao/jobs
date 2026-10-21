/**
 * Hub Links — official links table: Apply online, Notification PDF, Official
 * website. Rows exist only for URLs on record; identical URLs are deduped in
 * buildHubData.
 */

import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

export default function HubLinks({ data }: { data: HubData }) {
  const { links } = data;
  if (links.length === 0) return null;

  return (
    <section id="links" aria-labelledby="links-heading" className={styles.card}>
      <h2 id="links-heading" className={styles.sectionTitle}>Official links</h2>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Link</th>
              <th scope="col">URL</th>
            </tr>
          </thead>
          <tbody>
            {links.map(({ label, href }) => (
              <tr key={href}>
                <th scope="row">{label}</th>
                <td className={styles.urlCell}>
                  <a href={href} target="_blank" rel="noopener noreferrer">{href}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
