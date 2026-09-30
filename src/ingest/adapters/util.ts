import axios, { type AxiosError } from "axios";
import type { RawPosting } from "../types";

// Realistic desktop UA. Some portals (indiasarkarinaukri) WAF-block obvious
// bot agents, so we present as a browser by default.
export const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

// Honest self-identifying UA, used where robots.txt explicitly allows
// ClaudeBot / anthropic-ai (freejobalert).
export const CLAUDE_UA =
  "Mozilla/5.0 (compatible; ClaudeBot/1.0; +https://jobs-one-tau.vercel.app/about)";

export class WafBlockError extends Error {
  constructor(url: string) {
    super(`WAF/anti-bot block while fetching ${url}`);
    this.name = "WafBlockError";
  }
}

export interface FetchOpts {
  ua?: string;
  /** Extra retry attempts after the first try (0 = no retry). */
  retries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Cheap heuristics for anti-bot interstitials that return HTTP 200 with a
// block page rather than an error status.
const BLOCK_MARKERS =
  /your request was blocked|access denied|are you a human|captcha|cf-browser-verification|attention required/i;

/**
 * GET a URL as text with a configurable UA, timeout and retry. Detects both
 * HTTP 403 and 200-with-block-page anti-bot responses and surfaces them as
 * WafBlockError so callers can log them for manual review.
 */
export async function fetchHtml(url: string, opts: FetchOpts = {}): Promise<string> {
  const {
    ua = BROWSER_UA,
    retries = 0,
    retryDelayMs = 2000,
    timeoutMs = 25000,
  } = opts;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await axios.get<string>(url, {
        responseType: "text",
        timeout: timeoutMs,
        maxRedirects: 5,
        headers: {
          "User-Agent": ua,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-IN,en;q=0.9",
        },
        // We handle non-2xx ourselves so 403 becomes a WafBlockError.
        validateStatus: (s) => s >= 200 && s < 400,
      });
      const body = typeof res.data === "string" ? res.data : String(res.data);
      if (BLOCK_MARKERS.test(body.slice(0, 4000))) throw new WafBlockError(url);
      return body;
    } catch (err) {
      lastErr = err;
      const status = (err as AxiosError).response?.status;
      const isBlock = err instanceof WafBlockError || status === 403 || status === 429;
      if (attempt < retries) {
        await sleep(retryDelayMs);
        continue;
      }
      // Normalise 403/429 into a WafBlockError for the caller's log.
      if (isBlock && !(err instanceof WafBlockError)) throw new WafBlockError(url);
      throw err;
    }
  }
  throw lastErr;
}

/** Run `fn` over `items` with bounded concurrency, preserving input order. */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Text / field normalisation helpers
// ---------------------------------------------------------------------------

export function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parse the messy date formats these portals use into a Date (UTC midnight):
 *   "07 September 2026", "07/09/2026", "21-08-2020", "07 Sep 2026 | 10:11 PM",
 *   "07 October 2026 (23:00 Hours)". Returns undefined if nothing parseable.
 */
export function parseIndianDate(input: string | undefined | null): Date | undefined {
  if (!input) return undefined;
  // Strip trailing time / notes: "| 10:11 PM", "(23:00 Hours)", "23:00 Hrs".
  const s = collapse(input)
    .replace(/\|.*$/, "")
    .replace(/\((?:[^)]*\d{1,2}[:.]\d{2}[^)]*)\)/g, "")
    .replace(/\b\d{1,2}[:.]\d{2}\s*(?:hrs?|hours|am|pm)?\b/gi, "")
    .trim();

  // dd Month yyyy
  let m = s.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})\b/);
  if (m) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mo != null) return safeUTC(+m[3], mo, +m[1]);
  }
  // dd/mm/yyyy or dd-mm-yyyy (Indian order, day first)
  m = s.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (m) {
    const yr = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return safeUTC(yr, +m[2] - 1, +m[1]);
  }
  return undefined;
}

function safeUTC(y: number, mo: number, d: number): Date | undefined {
  if (mo < 0 || mo > 11 || d < 1 || d > 31 || y < 2000 || y > 2100) return undefined;
  const dt = new Date(Date.UTC(y, mo, d));
  return isNaN(dt.getTime()) ? undefined : dt;
}

/** First integer in the text, commas stripped: "Approx. 2,536 (tentative)" -> 2536. */
export function extractInt(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const m = collapse(text).replace(/,/g, "").match(/\b(\d{1,7})\b/);
  return m ? parseInt(m[1], 10) : undefined;
}

/** Vacancy count: prefer a number adjacent to "post/vacanc/seat", else first
 * non-year integer (so "Recruitment 2026" doesn't become 2026 vacancies). */
export function extractVacancies(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const t = collapse(text).replace(/,/g, "");
  const near =
    t.match(/\b(\d{1,7})\s*(?:posts?|vacan\w*|seats?)\b/i) ||
    t.match(/\bfor\s+(\d{1,7})\b/i);
  if (near) return parseInt(near[1], 10);
  for (const m of t.matchAll(/\b(\d{1,7})\b/g)) {
    const n = parseInt(m[1], 10);
    if (!(n >= 1990 && n <= 2099)) return n; // skip plausible year values
  }
  return undefined;
}

/**
 * Best-effort monthly salary range. Looks for two rupee-ish numbers
 * ("25500 - 81100", "Rs. 25,500 to 81,100"). Returns only plausible pay
 * figures (>= 1000) to avoid picking up post counts or fee amounts.
 */
export function parseSalary(text: string | undefined): {
  salaryMin?: number;
  salaryMax?: number;
} {
  if (!text) return {};
  const t = collapse(text).replace(/,/g, "");
  const range = t.match(/(?:₹|rs\.?|inr)?\s*(\d{4,7})\s*(?:-|–|to)\s*(?:₹|rs\.?|inr)?\s*(\d{4,7})/i);
  if (range) {
    const a = +range[1], b = +range[2];
    if (a >= 1000 && b >= a) return { salaryMin: a, salaryMax: b };
  }
  const single = t.match(/(?:₹|rs\.?|inr)\s*(\d{4,7})/i);
  if (single && +single[1] >= 1000) return { salaryMin: +single[1] };
  return {};
}

// ---------------------------------------------------------------------------
// LabelBag: fuzzy label -> value store harvested from tables and prose.
// ---------------------------------------------------------------------------

export class LabelBag {
  private pairs: { key: string; value: string }[] = [];

  add(key: string, value: string): void {
    const k = collapse(key).replace(/[:•\-–]+$/, "").trim();
    const v = collapse(value);
    // Real field labels are short. Reject overlong keys so a whole multi-line
    // cell (e.g. an Important Dates blob) can't shadow the granular <li> pairs
    // harvested from the same cell (find() returns the first match).
    if (k && v && k.length >= 2 && k.length <= 60) this.pairs.push({ key: k, value: v });
  }

  /** Harvest "Label : value" pairs from a blob of decoded text/HTML-stripped prose. */
  addFromText(text: string): void {
    // Insert line breaks at <br>, list items and block boundaries so each
    // "Label : value" ends up on its own line before tags are stripped.
    const lines = text
      .replace(/<\s*(?:br|\/li|\/p|\/h[1-6]|\/div|\/tr|\/td)\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .split(/\n|(?<=\))\s{2,}/);
    for (const line of lines) {
      const m = collapse(line).match(/^([A-Za-z][A-Za-z0-9 .,/&()'-]{2,45}?)\s*[:\-–]\s*(.+)$/);
      if (m) this.add(m[1], m[2]);
    }
  }

  /** First value whose key matches any of the patterns. */
  find(...patterns: RegExp[]): string | undefined {
    for (const p of patterns) {
      const hit = this.pairs.find((pair) => p.test(pair.key));
      if (hit) return hit.value;
    }
    return undefined;
  }

  get size(): number {
    return this.pairs.length;
  }
}

// ---------------------------------------------------------------------------
// Organisation inference from a job title
// ---------------------------------------------------------------------------

type OrgSector = NonNullable<RawPosting["organizationSector"]>;

interface OrgRule {
  re: RegExp;
  name: string;
  sector: OrgSector;
  state?: string;
}

// Ordered; first match wins. Covers the common recruiters seen across portals.
const ORG_RULES: OrgRule[] = [
  { re: /\bUPSC\b|Union Public Service/i, name: "Union Public Service Commission", sector: "GOVERNMENT_CENTRAL" },
  { re: /\bSSC\b|Staff Selection/i, name: "Staff Selection Commission", sector: "GOVERNMENT_CENTRAL" },
  // Banking rules come before the Railway rule: "RRB" is ambiguous (Railway
  // Recruitment Board vs Regional Rural Bank), and IBPS RRB / Gramin Bank
  // postings must classify as BANKING, not RAILWAY.
  { re: /\bIBPS\b|Regional Rural Bank|Gramin Bank/i, name: "Institute of Banking Personnel Selection", sector: "BANKING" },
  { re: /\bSBI\b/i, name: "State Bank of India", sector: "BANKING" },
  { re: /\bRBI\b|Reserve Bank/i, name: "Reserve Bank of India", sector: "BANKING" },
  { re: /Canara Bank|Bank of Baroda|Bank of India|\bPNB\b|\bLIC\b/i, name: "Public Sector Bank", sector: "BANKING" },
  { re: /Railway|\bRailways\b|\bRRC\b|\bRRB\b/i, name: "Railway Recruitment Board", sector: "RAILWAY" },
  { re: /\bCRPF\b|\bBSF\b|\bITBP\b|\bCISF\b|\bSSB\b|Assam Rifles|Central Armed Police/i, name: "Central Armed Police Forces", sector: "DEFENCE" },
  { re: /Indian Army|Indian Navy|Indian Air Force|\bIAF\b|\bDRDO\b|Defence/i, name: "Indian Armed Forces", sector: "DEFENCE" },
  { re: /\bNTPC\b|\bONGC\b|\bBHEL\b|\bGAIL\b|\bSAIL\b|\bNPCIL\b|\bCPRI\b/i, name: "Public Sector Undertaking", sector: "PSU" },
  { re: /\bUPSSSC\b|\bUPESSC\b|Uttar Pradesh|\bUP\b/i, name: "Uttar Pradesh State Recruitment", sector: "GOVERNMENT_STATE", state: "Uttar Pradesh" },
  { re: /\bBPSC\b|Bihar/i, name: "Bihar Public Service Commission", sector: "GOVERNMENT_STATE", state: "Bihar" },
  { re: /\bRPSC\b|\bRSMSSB\b|Rajasthan/i, name: "Rajasthan Public Service Commission", sector: "GOVERNMENT_STATE", state: "Rajasthan" },
  { re: /\bMPESB\b|\bMPPSC\b|Madhya Pradesh/i, name: "Madhya Pradesh State Recruitment", sector: "GOVERNMENT_STATE", state: "Madhya Pradesh" },
  { re: /\bJKSSB\b|Jammu|Kashmir/i, name: "J&K Services Selection Board", sector: "GOVERNMENT_STATE", state: "Jammu and Kashmir" },
  { re: /Karnataka|\bKPSC\b|\bKEA\b/i, name: "Karnataka State Recruitment", sector: "GOVERNMENT_STATE", state: "Karnataka" },
  { re: /\bAIIMS\b|Medical College|\bICMR\b/i, name: "AIIMS / Medical Institute", sector: "GOVERNMENT_CENTRAL" },
  { re: /\bIIT\b|\bNIT\b|\bIIIT\b|University|Vidyalaya|\bIGNOU\b/i, name: "Educational Institution", sector: "GOVERNMENT_CENTRAL" },
];

/**
 * Infer the recruiting organisation from a job title. Falls back to the
 * leading proper-noun phrase before "Recruitment/Online Form" when no known
 * acronym matches.
 */
export function inferOrg(title: string): {
  organizationName: string;
  organizationSector: OrgSector;
  organizationState?: string;
} {
  for (const rule of ORG_RULES) {
    if (rule.re.test(title)) {
      return {
        organizationName: rule.name,
        organizationSector: rule.sector,
        organizationState: rule.state,
      };
    }
  }
  // Fallback: words before the first recruitment keyword.
  const m = title.match(/^(.*?)\s+(?:Recruitment|Online Form|Vacanc|Notification|Apply)/i);
  const name = collapse(m ? m[1] : title).slice(0, 120) || "Government of India";
  return { organizationName: name, organizationSector: "GOVERNMENT_CENTRAL" };
}

// ---------------------------------------------------------------------------
// Confidence scoring -> drives normalize.reviewStatusForConfidence (>=70 auto)
// ---------------------------------------------------------------------------

export function scoreConfidence(p: Partial<RawPosting>): number {
  let score = 35;
  if (p.datePosted) score += 12;
  if (p.validThrough) score += 15;
  if (p.totalVacancies) score += 12;
  if (p.eligibility) score += 10;
  if (p.examDate) score += 6;
  if (p.salaryMin) score += 6;
  if (p.locationRegion || p.locationCity) score += 4;
  return Math.min(score, 100);
}

export function logCrawlCap(source: string, crawled: number, cap: number): void {
  console.log(
    `  [${source}] Crawled ${crawled} pages, capped at ${cap} (to avoid rate-limiting)`,
  );
}
