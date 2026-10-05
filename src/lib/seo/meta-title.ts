/**
 * Job page <title> composition (SEARCH-001).
 *
 * Scraped and curated posting titles often already end with the issuing body
 * ("... — National Sugar Institute, Kanpur"). Appending the organization again
 * produced "X — Org — Org | JobOye". The organization is appended only when the
 * title does not already name it, and the Hindi page uses the Hindi
 * organization name when one exists (a Hindi title with an English suffix reads
 * as a mismatch in search results).
 */
const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function composeJobMetaTitle(
  displayTitle: string,
  orgNames: ReadonlyArray<string | null | undefined>
): string {
  const title = displayTitle.trim();
  const haystack = normalize(title);
  const names = orgNames.map((n) => (n ?? "").trim()).filter(Boolean);
  if (names.length === 0) return title;
  if (names.some((n) => haystack.includes(normalize(n)))) return title;
  return `${title} — ${names[0]}`;
}
