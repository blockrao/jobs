/**
 * Canonical public URL for a recruitment: always the recruitment hub.
 *
 * URL contract (2026-10-20): recruitment and post are distinct entities and
 * each is canonical to itself. A single-post recruitment is still a
 * recruitment page; it is never silently swapped for its post leaf.
 */
export function recruitmentHref(row: { slug: string }): string {
  return `/jobs/${row.slug}`;
}

/** Canonical public URL for a post leaf. */
export function postHref(row: { recruitmentSlug: string; slug: string }): string {
  return `/jobs/${row.recruitmentSlug}/${row.slug}`;
}

/**
 * Public URL for a legacy `postings` row. Legacy slugs are not routes; the row
 * is navigable only when it has been matched to a canonical recruitment.
 * Returns null when there is nothing valid to link to.
 */
export function legacyPostingHref(row: {
  inferredRecruitment?: { slug: string } | null;
}): string | null {
  const slug = row.inferredRecruitment?.slug;
  return slug ? `/jobs/${slug}` : null;
}
