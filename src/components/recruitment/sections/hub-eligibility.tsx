/**
 * Hub Eligibility — ELIG-001 Phase 1: display stored text only
 * No computed logic — raw qualification/experience/age text per post.
 */

import Link from 'next/link';
import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

interface HubEligibilityProps {
  data: HubData;
}

export default function HubEligibility({ data }: HubEligibilityProps) {
  const { posts, hasEligibilityData, recruitment, localePrefix } = data;

  if (!hasEligibilityData) return null;

  const postsWithEligibility = posts.filter((p) => p.eligibilities && p.eligibilities.length > 0);

  return (
    <section id="eligibility" aria-labelledby="eligibility-heading" className={`${styles.card} ${styles.tintViolet}`}>
      <h2 id="eligibility-heading" className={styles.sectionTitle}>Eligibility at a Glance</h2>
      <p style={{ opacity: 0.75, fontSize: '0.9em', marginBottom: '1rem' }}>
        Eligibility shown as stored. Verify exact requirements in the official notification.
      </p>

      {postsWithEligibility.map((post) => {
        const title = post.name ?? post.position?.name ?? `Post ${post.id}`;
        const leafHref = recruitment.slug && post.slug
          ? `${localePrefix}/jobs/${recruitment.slug}/${post.slug}`
          : null;

        return (
          <div key={post.id} style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {leafHref ? <Link href={leafHref}>{title}</Link> : title}
            </h3>
            {post.eligibilities!.map((elig, i) => (
              <div key={i} style={{ marginBottom: '0.5rem' }}>
                {elig.qualificationText && (
                  <p style={{ marginBottom: '0.25rem' }}>
                    <strong>Qualification:</strong> {elig.qualificationText}
                  </p>
                )}
                {elig.experienceText && (
                  <p style={{ marginBottom: '0.25rem' }}>
                    <strong>Experience:</strong> {elig.experienceText}
                  </p>
                )}
                {(elig.ageMin != null || elig.ageMax != null) && (
                  <p>
                    <strong>Age:</strong>{' '}
                    {elig.ageMin != null && elig.ageMax != null
                      ? `${elig.ageMin}–${elig.ageMax} years`
                      : elig.ageMin != null
                      ? `Min ${elig.ageMin} years`
                      : `Max ${elig.ageMax} years`}
                  </p>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}
