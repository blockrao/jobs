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
  if (names.length === 0) return fitTitle(title);
  if (names.some((n) => haystack.includes(normalize(n)))) return fitTitle(title);
  return fitTitle(`${title} — ${names[0]}`);
}

/** Titles longer than this are cut by search engines; shorten before that. */
export const MAX_META_TITLE = 70;

/**
 * PQ-004: when a title is too long, drop its trailing " — Organization" part
 * (the organization is in the h1, breadcrumb and structured data). Nothing is
 * cut mid-word, and a title with no dash segment is left as it is.
 */
export function fitTitle(title: string): string {
  if (title.length <= MAX_META_TITLE) return title;
  const i = title.lastIndexOf(" — ");
  if (i > 0) return title.slice(0, i).trim();
  return title;
}

/** Cut at a word boundary (never mid-word) and add an ellipsis only when cut. */
export function cutAtWord(text: string, maxLen: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  const slice = t.slice(0, maxLen - 1);
  const sp = slice.lastIndexOf(" ");
  return `${(sp > maxLen * 0.6 ? slice.slice(0, sp) : slice).replace(/[\s,;:–—-]+$/, "")}…`;
}

export interface MetaDescriptionFacts {
  postName: string | null;
  orgName: string;
  vacancies: number | null;
  lastDate: string | null;
}

/**
 * English meta description led by the facts a searcher wants. Uses only stored
 * values; returns null when there is not enough to say anything specific.
 */
export function composeJobMetaDescription(f: MetaDescriptionFacts, maxLen = 155): string | null {
  if (!f.postName) return null;
  const parts = [`${f.postName} at ${f.orgName}.`];
  if (f.vacancies != null && f.vacancies > 0) {
    parts.push(`${f.vacancies} ${f.vacancies === 1 ? "vacancy" : "vacancies"}.`);
  }
  if (f.lastDate) parts.push(`Last date ${f.lastDate}.`);
  parts.push("Eligibility, age limit, fee and how to apply.");
  return cutAtWord(parts.join(" "), maxLen);
}
