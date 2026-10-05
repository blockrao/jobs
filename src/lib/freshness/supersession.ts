/**
 * Supersession and stale-page rules (PQ-004). Pure: no database, no clock except `now` passed in.
 * These only FLAG for human review; nothing here changes data.
 */

export interface NoticeFacts {
  id: number;
  advertisementNumber?: string | null;
  /** Publication date of the notice (datePosted). */
  publishedAt?: Date | null;
  /** Title plus description/summary text. */
  text?: string | null;
}

export type SupersessionSignal =
  | "NEWER_REFERENCES_OLDER_AD_NUMBER"
  | "NEWER_SAYS_CANCELS_OR_REPLACES"
  | "OLDER_SAYS_CANCELLED"
  | "NEWER_DATE_DIFFERENT_AD_NUMBER";

export interface SupersessionResult {
  /** True when the older notice should be reviewed (link, description, stage). */
  flagOlder: boolean;
  olderId: number | null;
  newerId: number | null;
  signals: SupersessionSignal[];
  /** STRONG = the text says so; WEAK = only a newer date with a different number. */
  strength: "STRONG" | "WEAK" | "NONE";
}

const REPLACE_RE = /\b(cancel(?:l?ed|s|ling)?|withdrawn|replaces?|replaced|supersed(?:e|es|ed|ing)|in\s+(?:partial\s+)?modification\s+of|in\s+place\s+of|revised\s+notice)\b/i;
const CANCELLED_RE = /\b(cancel(?:l?ed)|withdrawn)\b/i;

const normAd = (s?: string | null) => (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

function adReferenced(text: string | null | undefined, ad: string | null | undefined): boolean {
  const n = normAd(ad);
  if (n.length < 3) return false; // too short to match without false positives
  return normAd(text).includes(n);
}

/** Two notices for ONE recruitment (caller guarantees that). Order is decided by publishedAt. */
export function evaluateSupersession(a: NoticeFacts, b: NoticeFacts): SupersessionResult {
  const none: SupersessionResult = { flagOlder: false, olderId: null, newerId: null, signals: [], strength: "NONE" };
  const ta = a.publishedAt?.getTime();
  const tb = b.publishedAt?.getTime();
  if (ta == null || tb == null || ta === tb) return none; // cannot order them: say nothing
  const [older, newer] = ta < tb ? [a, b] : [b, a];

  const signals: SupersessionSignal[] = [];
  if (adReferenced(newer.text, older.advertisementNumber)) signals.push("NEWER_REFERENCES_OLDER_AD_NUMBER");
  if (REPLACE_RE.test(newer.text ?? "")) signals.push("NEWER_SAYS_CANCELS_OR_REPLACES");
  if (CANCELLED_RE.test(older.text ?? "")) signals.push("OLDER_SAYS_CANCELLED");

  const strong = signals.length > 0;
  const differentAd =
    normAd(older.advertisementNumber) !== "" &&
    normAd(newer.advertisementNumber) !== "" &&
    normAd(older.advertisementNumber) !== normAd(newer.advertisementNumber);
  if (!strong && differentAd) signals.push("NEWER_DATE_DIFFERENT_AD_NUMBER");

  return {
    flagOlder: signals.length > 0,
    olderId: older.id,
    newerId: newer.id,
    signals,
    strength: strong ? "STRONG" : signals.length ? "WEAK" : "NONE",
  };
}

export type StaleKind = "OK" | "DEADLINE_SOON_UNVERIFIED" | "DEADLINE_PASSED_STAGE_OPEN";

export interface StaleInput {
  validThrough?: Date | null;
  lastVerifiedAt?: Date | null;
  currentStage: string;
  now: Date;
}

// Same set as src/lib/content-quality/gate.ts OPEN_STAGES.
const OPEN_STAGES = new Set(["NOTIFICATION_OUT", "APPLICATION_OPEN", "ACTIVE"]);
const DAY = 86_400_000;

export function classifyStalePage(i: StaleInput): StaleKind {
  if (!i.validThrough || !OPEN_STAGES.has(i.currentStage)) return "OK";
  const dl = i.validThrough.getTime();
  const now = i.now.getTime();
  if (dl < now) return "DEADLINE_PASSED_STAGE_OPEN";
  if (dl - now <= 7 * DAY) {
    const v = i.lastVerifiedAt?.getTime();
    if (v == null || now - v > 14 * DAY) return "DEADLINE_SOON_UNVERIFIED";
  }
  return "OK";
}
