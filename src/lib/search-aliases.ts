/**
 * Search abbreviation expansion (SEARCH-001).
 *
 * Users search Indian government jobs by abbreviation ("ssc", "upsc", "rrb",
 * "ibps cgl"). Posting text mostly spells these out, so a plain full-text
 * match on the abbreviation misses them. Each known abbreviation maps to a
 * short distinguishing phrase; the search ORs the abbreviation with that phrase
 * per word and ANDs the words together, so "sbi po" means
 * (sbi OR state bank india) AND (po OR probationary officer).
 *
 * Query-time only: no stored data is read or written here. Expansion phrases
 * are kept to the distinguishing words on purpose (full-text matching ANDs the
 * words of a phrase, and spelling varies: organisation / organization).
 */

/** abbreviation (lower case, Latin) -> distinguishing phrase */
export const SEARCH_ALIASES: Readonly<Record<string, string>> = {
  // Central recruitment bodies
  ssc: "staff selection commission",
  upsc: "union public service commission",
  rrb: "railway recruitment board",
  rrc: "railway recruitment cell",
  rpf: "railway protection force",
  ibps: "institute banking personnel selection",
  nta: "national testing agency",
  kvs: "kendriya vidyalaya sangathan",
  nvs: "navodaya vidyalaya samiti",
  dsssb: "delhi subordinate services selection board",
  epfo: "employees provident fund",
  esic: "employees state insurance",
  // Banks and financial institutions
  sbi: "state bank india",
  rbi: "reserve bank india",
  lic: "life insurance corporation",
  nabard: "national bank agriculture rural development",
  // Science, defence and security
  drdo: "defence research development",
  isro: "indian space research",
  barc: "bhabha atomic research",
  aiims: "all india institute medical sciences",
  crpf: "central reserve police",
  cisf: "central industrial security",
  bsf: "border security force",
  itbp: "indo tibetan border police",
  ssb: "sashastra seema bal",
  // State commissions and boards
  bpsc: "bihar public service commission",
  bssc: "bihar staff selection commission",
  uppsc: "uttar pradesh public service commission",
  upsssc: "uttar pradesh subordinate service selection commission",
  rpsc: "rajasthan public service commission",
  rssb: "rajasthan staff selection board",
  mppsc: "madhya pradesh public service commission",
  mpesb: "madhya pradesh employees selection board",
  hpsc: "haryana public service commission",
  hssc: "haryana staff selection commission",
  tnpsc: "tamil nadu public service commission",
  kpsc: "karnataka public service commission",
  appsc: "andhra pradesh public service commission",
  tspsc: "telangana state public service commission",
  wbpsc: "west bengal public service commission",
  gpsc: "gujarat public service commission",
  opsc: "odisha public service commission",
  jpsc: "jharkhand public service commission",
  jssc: "jharkhand staff selection commission",
  // Exam and post names
  cgl: "combined graduate level",
  chsl: "combined higher secondary level",
  mts: "multi tasking staff",
  je: "junior engineer",
  po: "probationary officer",
  tet: "teacher eligibility test",
  nda: "national defence academy",
  cds: "combined defence services",
};

/**
 * Devanagari spellings of the most-searched abbreviations -> Latin abbreviation.
 * Used only when the whole query can be written in Latin after replacement, so
 * the existing Hindi filter search is untouched for genuine Hindi queries.
 */
export const DEVANAGARI_ABBREVIATIONS: Readonly<Record<string, string>> = {
  एसएससी: "ssc",
  यूपीएससी: "upsc",
  आरआरबी: "rrb",
  आईबीपीएस: "ibps",
  एसबीआई: "sbi",
  आरबीआई: "rbi",
  बीपीएससी: "bpsc",
  यूपीपीएससी: "uppsc",
  आरपीएससी: "rpsc",
  एमपीपीएससी: "mppsc",
  एचएसएससी: "hssc",
  एचपीएससी: "hpsc",
  यूपीएसएसएससी: "upsssc",
  आरएसएसबी: "rssb",
  सीजीएल: "cgl",
  सीएचएसएल: "chsl",
};

const DEVANAGARI = /[ऀ-ॿ]/;

/** One query word and, when it is a known abbreviation, its phrase. */
export interface QueryTerm {
  word: string;
  expansion: string | null;
}

/** Maximum words considered, so a pasted paragraph cannot build a huge query. */
export const MAX_QUERY_TERMS = 8;

/**
 * Replace known Devanagari abbreviations with their Latin form. Returns the
 * original text unchanged unless every Devanagari word was a known abbreviation
 * (so mixed or genuine Hindi queries keep going down the Hindi path).
 */
export function latinizeKnownAbbreviations(query: string): string {
  if (!DEVANAGARI.test(query)) return query;
  const words = query.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    if (DEVANAGARI.test(w)) {
      const latin = DEVANAGARI_ABBREVIATIONS[w];
      if (!latin) return query;
      out.push(latin);
    } else {
      out.push(w);
    }
  }
  return out.join(" ");
}

/** Split a query into words and attach the expansion phrase for known abbreviations. */
export function analyzeQuery(query: string): QueryTerm[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter(Boolean)
    .slice(0, MAX_QUERY_TERMS)
    .map((word) => ({ word, expansion: SEARCH_ALIASES[word] ?? null }));
}
