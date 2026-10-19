/**
 * RelatedPostsLinks — internal linking for post leaf pages.
 *
 * Renders three contextual link groups:
 *   1. Position hub — all government jobs for this role type
 *   2. Other posts in this organisation
 *   3. Other posts in this state
 *
 * These serve three purposes:
 *   - SEO: crawlable graph prevents orphan posts (P0 #3)
 *   - Users: discovery of related opportunities
 *   - Google for Jobs: contextual signals about the role
 *
 * Rules:
 *   - Never shows links to aggregators (standing rule)
 *   - Only shows sections when there is at least 1 related post
 *   - Gracefully omits empty sections rather than showing empty UI
 */

import Link from "next/link";
import type { RelatedPostsForLeaf } from "@/db/operations/get-posts";
import styles from "../job-posting-page.module.css";

interface RelatedPostsLinksProps {
  related: RelatedPostsForLeaf;
  localePrefix: string;
  currentOrganizationName: string | null;
  currentLocationState: string | null;
}

/** Short display date: "Oct 2026" */
function shortDate(d: Date | null): string | null {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  } catch {
    return null;
  }
}

export default function RelatedPostsLinks({
  related,
  localePrefix,
  currentOrganizationName,
  currentLocationState,
}: RelatedPostsLinksProps) {
  const { samePosition, sameOrg, sameState, positionSlug, positionName } = related;

  const hasPosition = positionSlug && positionName && positionName !== "Other";
  const hasSameOrg = sameOrg.length > 0;
  const hasSameState = sameState.length > 0;
  const hasSamePosition = samePosition.length > 0;

  // Nothing to show
  if (!hasPosition && !hasSameOrg && !hasSameState) return null;

  return (
    <aside aria-label="Related jobs and position hub" style={{ marginTop: "32px" }}>

      {/* ── 1. Position hub ─────────────────────────────────────────────── */}
      {hasPosition && (
        <section
          id="position-hub"
          className={styles.section}
          aria-labelledby="pos-hub-h"
          style={{ marginBottom: "24px" }}
        >
          <h2 id="pos-hub-h" className={styles.sectionTitle}>
            All {positionName} vacancies
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "12px" }}>
            Browse every {positionName} recruitment currently listed on JobOye.
          </p>
          <Link
            href={`${localePrefix}/posts/${positionSlug}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 16px",
              background: "var(--accent-soft, #eff6ff)",
              color: "var(--accent, #2563eb)",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid var(--accent-border, #bfdbfe)",
            }}
          >
            View all {positionName} jobs →
          </Link>

          {/* Recent same-position posts */}
          {hasSamePosition && (
            <div style={{ marginTop: "16px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Recent {positionName} recruitments
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "8px" }}>
                {samePosition.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`${localePrefix}/jobs/${p.recruitmentSlug}/${p.slug}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        background: "#ffffff",
                        borderRadius: "6px",
                        border: "1px solid var(--border-light)",
                        textDecoration: "none",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500, flex: 1 }}>
                        {p.title}
                        {p.organizationName && (
                          <span style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 400, marginTop: "2px" }}>
                            {p.organizationName}
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                        {shortDate(p.postedAt) ?? ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ── 2. Other posts from this organisation ───────────────────────── */}
      {hasSameOrg && (
        <section
          id="org-other-jobs"
          className={styles.section}
          aria-labelledby="org-other-h"
          style={{ marginBottom: "24px" }}
        >
          <h2 id="org-other-h" className={styles.sectionTitle}>
            Other jobs from {currentOrganizationName ?? "this organisation"}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "8px" }}>
            {sameOrg.map((p) => (
              <li key={p.id}>
                <Link
                  href={`${localePrefix}/jobs/${p.recruitmentSlug}/${p.slug}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "#ffffff",
                    borderRadius: "6px",
                    border: "1px solid var(--border-light)",
                    textDecoration: "none",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500, flex: 1 }}>
                    {p.title}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                    {shortDate(p.postedAt) ?? ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── 3. Other posts in this state ────────────────────────────────── */}
      {hasSameState && (
        <section
          id="state-other-jobs"
          className={styles.section}
          aria-labelledby="state-other-h"
          style={{ marginBottom: "24px" }}
        >
          <h2 id="state-other-h" className={styles.sectionTitle}>
            More jobs in {currentLocationState}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "8px" }}>
            {sameState.map((p) => (
              <li key={p.id}>
                <Link
                  href={`${localePrefix}/jobs/${p.recruitmentSlug}/${p.slug}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "#ffffff",
                    borderRadius: "6px",
                    border: "1px solid var(--border-light)",
                    textDecoration: "none",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500, flex: 1 }}>
                    {p.title}
                    {p.organizationName && (
                      <span style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 400, marginTop: "2px" }}>
                        {p.organizationName}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                    {shortDate(p.postedAt) ?? ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

    </aside>
  );
}
