/** Canonical public URL for a recruitment: the Post leaf when it is the canonical unit, else the hub. */
export function recruitmentHref(row: { slug: string; singlePostSlug: string | null }): string {
  return row.singlePostSlug ? `/jobs/${row.slug}/${row.singlePostSlug}` : `/jobs/${row.slug}`;
}
