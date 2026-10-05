/**
 * Aggregator hygiene (owner direction 2026-10-05): job aggregators are
 * discovery sources only. Their names and links must never appear on a public
 * page, in structured data, or in stored public text. The facts come from
 * public government notifications; we cite the official source instead.
 */
const AGGREGATOR_HOSTS = [
  "freejobalert.com", "sarkariresult.com", "sarkarinaukri.com", "indiasarkarinaukri.com",
  "sahisarkarijobs.com", "sarkariexam.com", "t.me", "telegram.me", "whatsapp.com",
  "arattai.in", "web.arattai.in", "facebook.com", "twitter.com", "x.com", "instagram.com", "youtube.com",
];
const NAME_RE = /free\s*job\s*alert|sarkari\s*result|sarkari\s*naukri|sahi\s*sarkari\s*jobs/i;

export function isAggregatorUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return AGGREGATOR_HOSTS.some((a) => h === a || h.endsWith("." + a));
  } catch {
    return true; // unparseable links are not published
  }
}

export function mentionsAggregator(text: string | null | undefined): boolean {
  return !!text && NAME_RE.test(text);
}
