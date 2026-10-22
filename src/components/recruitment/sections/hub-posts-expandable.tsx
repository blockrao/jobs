'use client';

import { useState } from 'react';
import type { PostTableRow } from './types';
import type { RecruitmentHubPost } from './types';
import styles from '../recruitment-hub.module.css';

interface HubPostsExpandableProps {
  postRows: PostTableRow[];
  posts: RecruitmentHubPost[];
}

function ExpandIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s',
      }}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
}

function str(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.replace(/\s+/g, ' ').trim();
  return t.length > 0 ? t : null;
}

export default function HubPostsExpandable({ postRows, posts }: HubPostsExpandableProps) {
  const [expandedId, setExpandedId] = useState<number | string | null>(null);

  if (!postRows || postRows.length === 0) {
    return <p>No posts available.</p>;
  }

  const toggleExpand = (id: number | string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <>
      {/* Consolidated posts table */}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 14,
            lineHeight: 1.6,
          }}
          className={styles.table}
        >
          <thead>
            <tr style={{ borderBottom: '2px solid var(--hub-line)', backgroundColor: 'var(--hub-bg)' }}>
              <th
                style={{
                  padding: '12px 8px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: 'var(--hub-ink2)',
                  width: '24px',
                }}
                aria-label="Expand details"
              >
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--hub-ink2)' }}>
                Post Name
              </th>
              <th
                style={{
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontWeight: 600,
                  color: 'var(--hub-ink2)',
                }}
              >
                Vacancies
              </th>
              <th
                style={{
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontWeight: 600,
                  color: 'var(--hub-ink2)',
                }}
              >
                Age Limit
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--hub-ink2)' }}>
                Qualification
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--hub-ink2)' }}>
                Experience
              </th>
            </tr>
          </thead>
          <tbody>
            {postRows.map((postRow) => {
              const postData = posts.find((p) => p.id === postRow.id);
              const qualText = postData?.eligibilities?.[0]
                ? str(postData.eligibilities[0].qualification_text || postData.eligibilities[0].qualificationText)
                : postRow.qualification;
              const expText = postData?.eligibilities?.[0]
                ? str(postData.eligibilities[0].experience_text || postData.eligibilities[0].experienceText)
                : postRow.experience;
              const isExpanded = expandedId === postRow.id;

              return (
                <tbody key={`group-${postRow.id}`}>
                  <tr style={{ borderBottom: '1px solid var(--hub-line)', cursor: 'pointer' }}>
                    <td
                      style={{
                        padding: '12px 8px',
                        textAlign: 'center',
                        color: 'var(--hub-ink3)',
                      }}
                      onClick={() => toggleExpand(postRow.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          toggleExpand(postRow.id);
                        }
                      }}
                    >
                      <ExpandIcon isOpen={isExpanded} />
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 500 }}>
                      {postRow.href ? (
                        <a href={postRow.href} style={{ color: 'var(--hub-blue)' }}>
                          {postRow.name}
                        </a>
                      ) : (
                        postRow.name
                      )}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>{postRow.vacanciesLabel || '—'}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      {postData?.eligibilities?.[0]?.age_max || postData?.eligibilities?.[0]?.ageMax
                        ? `${postData.eligibilities[0].age_max || postData.eligibilities[0].ageMax} years`
                        : '—'}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: 13, color: 'var(--hub-ink2)' }}>
                      {qualText ? qualText.substring(0, 60) + (qualText.length > 60 ? '...' : '') : '—'}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: 13, color: 'var(--hub-ink2)' }}>
                      {expText ? expText.substring(0, 50) + (expText.length > 50 ? '...' : '') : '—'}
                    </td>
                  </tr>

                  {/* Expandable details row */}
                  {isExpanded && postData && (
                    <tr style={{ backgroundColor: 'var(--hub-bg)', borderBottom: '1px solid var(--hub-line)' }}>
                      <td colSpan={6} style={{ padding: '16px 12px' }}>
                        <div className={styles.expandedDetails}>
                          {/* Full Qualification */}
                          {qualText && (
                            <div style={{ marginBottom: '12px' }}>
                              <h4 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 600, color: 'var(--hub-ink)' }}>
                                📚 Full Qualification Requirement
                              </h4>
                              <p style={{ margin: 0, fontSize: '13px', color: 'var(--hub-ink2)', lineHeight: 1.5 }}>
                                {qualText}
                              </p>
                            </div>
                          )}

                          {/* Full Experience */}
                          {expText && (
                            <div style={{ marginBottom: '12px' }}>
                              <h4 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 600, color: 'var(--hub-ink)' }}>
                                💼 Experience Required
                              </h4>
                              <p style={{ margin: 0, fontSize: '13px', color: 'var(--hub-ink2)', lineHeight: 1.5 }}>
                                {expText}
                              </p>
                            </div>
                          )}

                          {/* Vacancy Breakdown */}
                          {postRow.vacancyBreakdown && postRow.vacancyBreakdown.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                              <h4 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 600, color: 'var(--hub-ink)' }}>
                                📊 Vacancies by Category
                              </h4>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px' }}>
                                {postRow.vacancyBreakdown.map((vb) => (
                                  <div
                                    key={vb.categoryName}
                                    style={{
                                      padding: '8px',
                                      backgroundColor: 'var(--hub-blue-t)',
                                      border: '1px solid #c7d6fb',
                                      borderRadius: '6px',
                                      textAlign: 'center',
                                    }}
                                  >
                                    <div style={{ fontSize: '12px', color: 'var(--hub-ink3)' }}>{vb.categoryName}</div>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--hub-blue)' }}>{vb.count}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Age Breakdown */}
                          {postRow.ageBreakdown && postRow.ageBreakdown.length > 0 && (
                            <div>
                              <h4 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 600, color: 'var(--hub-ink)' }}>
                                📅 Age Limits by Category
                              </h4>
                              <table
                                style={{
                                  width: '100%',
                                  fontSize: '12px',
                                  borderCollapse: 'collapse',
                                }}
                              >
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--hub-line)' }}>
                                    <th style={{ padding: '6px 0', textAlign: 'left', fontWeight: 500, color: 'var(--hub-ink2)' }}>
                                      Category
                                    </th>
                                    <th style={{ padding: '6px 0', textAlign: 'center', fontWeight: 500, color: 'var(--hub-ink2)' }}>
                                      Max Age
                                    </th>
                                    {postRow.ageBreakdown.some((ab) => ab.relaxation) && (
                                      <th style={{ padding: '6px 0', textAlign: 'center', fontWeight: 500, color: 'var(--hub-ink2)' }}>
                                        Relaxation
                                      </th>
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {postRow.ageBreakdown.map((ab) => (
                                    <tr key={ab.categoryName} style={{ borderBottom: '1px solid var(--hub-line)' }}>
                                      <td style={{ padding: '6px 0', color: 'var(--hub-ink2)' }}>{ab.categoryName}</td>
                                      <td style={{ padding: '6px 0', textAlign: 'center', color: 'var(--hub-ink2)', fontWeight: 500 }}>
                                        {ab.maxAge ? `${ab.maxAge} years` : '—'}
                                      </td>
                                      {postRow.ageBreakdown.some((ab) => ab.relaxation) && (
                                        <td style={{ padding: '6px 0', textAlign: 'center', color: 'var(--hub-ink2)' }}>
                                          {ab.relaxation ? `+${ab.relaxation} years` : '—'}
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Full Details Link */}
                          {postRow.href && (
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--hub-line)' }}>
                              <a
                                href={postRow.href}
                                style={{
                                  display: 'inline-block',
                                  padding: '8px 12px',
                                  backgroundColor: 'var(--hub-blue)',
                                  color: 'white',
                                  borderRadius: '6px',
                                  textDecoration: 'none',
                                  fontSize: '13px',
                                  fontWeight: 500,
                                }}
                              >
                                View Full Details →
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
