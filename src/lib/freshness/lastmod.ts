/**
 * Sitemap lastmod for a posting (PQ-004): the date of the last meaningful change,
 * else the generic row-update time. Never the Last Verified date.
 */
export function pickSitemapLastmod(
  contentChangedAt: Date | string | null | undefined,
  updatedAt: Date | string | null | undefined,
): Date | undefined {
  for (const v of [contentChangedAt, updatedAt]) {
    if (v == null) continue;
    const d = v instanceof Date ? v : new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return undefined;
}
