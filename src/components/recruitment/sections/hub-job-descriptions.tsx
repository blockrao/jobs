'use client';

import type { RecruitmentHubPost } from './types';
import styles from '../recruitment-hub.module.css';

interface JobDescriptionsProps {
  posts: RecruitmentHubPost[];
}

function str(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.replace(/\s+/g, ' ').trim();
  return t.length > 0 ? t : null;
}

export default function HubJobDescriptions({ posts }: JobDescriptionsProps) {
  const postsWithDescriptions = posts
    .map((post) => ({
      ...post,
      displayName: str(post.name) || `Post #${post.id}`,
      description: str(post.jobDescription) || str(post.description),
    }))
    .filter((p) => p.description);

  if (postsWithDescriptions.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeading}>📝 Job Descriptions</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {postsWithDescriptions.map((post) => (
          <div
            key={post.id}
            style={{
              padding: '12px',
              backgroundColor: '#fafafa',
              borderLeft: '4px solid var(--hub-blue)',
              borderRadius: '4px',
            }}
          >
            <h3 style={{
              margin: '0 0 8px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--hub-ink)',
            }}>
              {post.displayName}
            </h3>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: 'var(--hub-ink2)',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {post.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
