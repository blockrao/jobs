export const JOBS_PAGE_SIZE = 50;

/** A positive integer page number; anything else is page 1. Capped so a crafted value cannot ask for an absurd offset. */
export function parsePage(raw: string | undefined | null, max = 200): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, max);
}

/** Link to a listing page, keeping the other query parameters; page 1 has no `page` parameter. */
export function pageHref(basePath: string, params: Record<string, string | undefined>, page: number): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}
