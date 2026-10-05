/**
 * Aggregator hygiene (owner direction 2026-10-05): job aggregators are
 * discovery sources only. Their names and links must never appear on a public
 * page, in structured data, or in stored public text. The facts come from
 * public government notifications; we cite the official source instead.
 */
const AGGREGATOR_HOSTS = [
  "freejobalert.com", "sarkariresult.com", "sarkarinaukri.com", "indiasarkarinaukri.com",
  "sahisarkarijobs.com", "sarkariexam.com", "t.me", "telegram.me", "whatsapp.com",
  "arattai.in", "web.arattai.in", "wa.me", "telegram.org", "facebook.com", "twitter.com", "x.com", "instagram.com", "youtube.com",
];
const NAME_RE = /arattai|free\s*job\s*alert|sarkari[\s-]*result|sarkari[\s-]*naukri|sahi\s*sarkari|sarkari[\s-]*exam\b/i;
// Any host that looks like an aggregator even when it is not in the list (sarkari-naukri.in, freejobalert.in ...).
const HOST_RE = /sarkari|freejobalert|arattai/i;

export function isAggregatorUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return AGGREGATOR_HOSTS.some((a) => h === a || h.endsWith("." + a)) || HOST_RE.test(h);
  } catch {
    return true; // unparseable links are not published
  }
}

export function mentionsAggregator(text: string | null | undefined): boolean {
  return !!text && NAME_RE.test(text);
}

/** Removes provenance tags such as "(via freejobalert)" from public text. */
export function stripAggregatorTag(text: string): string {
  return text.replace(/\s*\(via [^)]*\)/gi, "").trim();
}

/** A link that is safe to publish: null when it points at an aggregator or cannot be parsed. */
export function publicLink(url: string | null | undefined): string | null {
  return url && !isAggregatorUrl(url) ? url : null;
}

const SOCIAL_CTA_RE = /\b(join|follow)\s+(our\s+)?(telegram|whatsapp)\b|\b(telegram|whatsapp)\s+(channel|group)\b/i;
const URL_IN_TEXT_RE = /https?:\/\/[^\s)"'<>]+|\b(?:t\.me|telegram\.me|wa\.me)\/\S*/gi;

/**
 * True when free text names an aggregator, carries an aggregator/social link
 * (full URL or bare host), a "(via ...)" provenance tag, or a join-our-channel call.
 * Used on every stored public text; stricter than mentionsAggregator alone.
 */
export function containsAggregatorReference(text: string | null | undefined): boolean {
  if (!text) return false;
  if (mentionsAggregator(text) || SOCIAL_CTA_RE.test(text) || /\(via\s/i.test(text)) return true;
  for (const m of text.matchAll(URL_IN_TEXT_RE)) {
    const u = /^https?:/i.test(m[0]) ? m[0] : `https://${m[0]}`;
    if (isAggregatorUrl(u)) return true;
  }
  return false;
}
