/**
 * Evidence-based, conservative state resolution for a posting.
 *
 * A wrong state on a page is worse than none, so every ambiguous case returns
 * null. Priority order:
 *   1. location_region    - an explicit state in the posting's own location
 *                           (or a single unambiguous city from CITY_STATE)
 *   2. organization_state - the organization's recorded state, but never for
 *                           national / central bodies (their state is only HQ)
 *   3. organization_name  - state name or state-level body alias in the name
 *   4. title              - the same, in the title
 *   5. place              - a reviewed, unambiguous city/town/district named in
 *                           the organization name (then, for a single workplace,
 *                           the title): "Indian Institute of Management Lucknow".
 *                           This is the only tier that may resolve institutions
 *                           on the central-body list (IIT, IIM, AIIMS, CSIR, ...)
 *                           because their physical location is what is named.
 *                           National bodies, banks and railways never resolve.
 * Central bodies (UPSC, SSC, IBPS, SBI, RRB, ...) and central bodies whose
 * names embed a state (Punjab National Bank, Assam Rifles, ...) never resolve
 * from a name or title mention. Location evidence is still honoured.
 *
 * All matching is done on NFKC-lowercased text with every non letter/number
 * replaced by a single space, then phrase matched between spaces. That is
 * Unicode-safe and gives true word boundaries without regex lookbehind.
 */
import { PLACE_TO_STATE } from "./place-state";
import { STATES } from "./states";

export type StateBasis = "location_region" | "organization_state" | "organization_name" | "title" | "place";

export interface ResolveStateInput {
  title: string;
  organizationName: string | null;
  locationRegion: string | null;
  locationCity: string | null;
  organizationState: string | null;
}

export interface ResolvedState {
  slug: string;
  basis: StateBasis;
}

// ---------- normalisation ----------

function norm(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, " ")
    .trim();
}

const pad = (n: string) => ` ${n} `;
const hasPhrase = (padded: string, phrase: string) => padded.includes(` ${phrase} `);

// ---------- state names ----------

const STATE_NAME_TERMS: Record<string, string[]> = {
  "andhra-pradesh": ["andhra pradesh"],
  "arunachal-pradesh": ["arunachal pradesh"],
  assam: ["assam"],
  bihar: ["bihar"],
  chhattisgarh: ["chhattisgarh", "chattisgarh", "chhatisgarh"],
  goa: ["goa"],
  gujarat: ["gujarat"],
  haryana: ["haryana"],
  "himachal-pradesh": ["himachal pradesh"],
  "jammu-kashmir": ["jammu and kashmir", "jammu kashmir", "j and k"],
  jharkhand: ["jharkhand"],
  karnataka: ["karnataka"],
  kerala: ["kerala"],
  "madhya-pradesh": ["madhya pradesh"],
  maharashtra: ["maharashtra"],
  manipur: ["manipur"],
  meghalaya: ["meghalaya"],
  mizoram: ["mizoram"],
  nagaland: ["nagaland"],
  odisha: ["odisha", "orissa"],
  punjab: ["punjab"],
  rajasthan: ["rajasthan"],
  sikkim: ["sikkim"],
  "tamil-nadu": ["tamil nadu", "tamilnadu"],
  telangana: ["telangana"],
  tripura: ["tripura"],
  "uttar-pradesh": ["uttar pradesh"],
  uttarakhand: ["uttarakhand", "uttaranchal"],
  "west-bengal": ["west bengal"],
  "andaman-nicobar": ["andaman and nicobar islands", "andaman and nicobar", "andaman nicobar"],
  chandigarh: ["chandigarh"],
  "dadra-nagar-haveli-daman-diu": ["dadra and nagar haveli", "dadra nagar haveli", "daman and diu", "daman diu"],
  delhi: ["delhi", "nct of delhi"],
  ladakh: ["ladakh"],
  lakshadweep: ["lakshadweep"],
  puducherry: ["puducherry", "pondicherry"],
};

// Sanity: every known state has a name term entry.
for (const st of STATES) {
  if (!STATE_NAME_TERMS[st.slug]) throw new Error(`resolve-state: no name terms for ${st.slug}`);
}

const NAME_ENTRIES: Array<[string, string]> = Object.entries(STATE_NAME_TERMS).flatMap(([slug, terms]) =>
  terms.map((t): [string, string] => [slug, t]),
);

function stateNamesIn(padded: string): Set<string> {
  const found = new Set<string>();
  for (const [slug, term] of NAME_ENTRIES) if (hasPhrase(padded, term)) found.add(slug);
  return found;
}

// ---------- small city map (location evidence only) ----------
// Cities that map to exactly one state. Deliberately small; ambiguous names
// (Aurangabad, Srinagar, Hamirpur, ...) are left out.
export const CITY_STATE: Record<string, string> = {
  mumbai: "maharashtra",
  pune: "maharashtra",
  nagpur: "maharashtra",
  bengaluru: "karnataka",
  bangalore: "karnataka",
  hyderabad: "telangana",
  chennai: "tamil-nadu",
  kolkata: "west-bengal",
  lucknow: "uttar-pradesh",
  jaipur: "rajasthan",
  ahmedabad: "gujarat",
  gandhinagar: "gujarat",
  bhopal: "madhya-pradesh",
  indore: "madhya-pradesh",
  patna: "bihar",
  bhubaneswar: "odisha",
  thiruvananthapuram: "kerala",
  kochi: "kerala",
  dehradun: "uttarakhand",
  ranchi: "jharkhand",
  raipur: "chhattisgarh",
  guwahati: "assam",
  shimla: "himachal-pradesh",
  visakhapatnam: "andhra-pradesh",
  amaravati: "andhra-pradesh",
};

// ---------- central bodies / denylist ----------

/** Central bodies whose names embed a state name (or are ambiguous banks/forces). */
export const DENYLIST_PHRASES: string[] = [
  "punjab national bank",
  "bank of maharashtra",
  "bank of india",
  "bank of baroda",
  "assam rifles",
  "indian overseas bank",
  "central bank of india",
  "punjab and sind bank",
  "andhra bank",
  "karnataka bank",
  "jammu and kashmir bank",
  "gramin bank",
  "grameen bank",
  "regional rural bank",
  "delhi university",
  "university of delhi",
  "central university",
  "goa shipyard",
  "shipyard",
];

/** National bodies: a state in a branch/circle name is not evidence. */
export const CENTRAL_TERMS: string[] = [
  "ssc",
  "staff selection commission",
  "upsc",
  "union public service commission",
  "ibps",
  "sbi",
  "state bank of india",
  "rrb",
  "rrc",
  "railway",
  "railways",
  "ongc",
  "ntpc",
  "isro",
  "aiims",
  "drdo",
  "bsf",
  "crpf",
  "cisf",
  "itbp",
  "ssb",
  "rpf",
  "nsg",
  "nia",
  "cbi",
  "indian army",
  "army",
  "indian navy",
  "navy",
  "indian air force",
  "air force",
  "coast guard",
  "agniveer",
  "ordnance",
  "rbi",
  "reserve bank of india",
  "nabard",
  "sebi",
  "lic",
  "life insurance corporation",
  "esic",
  "epfo",
  "bhel",
  "sail",
  "hal",
  "hindustan aeronautics",
  "bharat electronics",
  "iocl",
  "bpcl",
  "hpcl",
  "gail",
  "coal india",
  "power grid",
  "nhpc",
  "nhai",
  "npcil",
  "airports authority of india",
  "india post",
  "indian post",
  "gramin dak sevak",
  "cuet",
  "nta",
  "ugc",
  "cbse",
  "kvs",
  "kendriya vidyalaya",
  "nvs",
  "navodaya",
  "iit",
  "nit",
  "iim",
  "iiser",
  "csir",
  "icar",
  "icmr",
  "nielit",
  "bsnl",
  "mtnl",
  "canara bank",
  "union bank",
  "indian bank",
  "uco bank",
  "idbi",
];

// ---------- state-level body aliases ----------

const STRONG_ALIASES: Record<string, string[]> = {
  "uttar-pradesh": ["upsssc", "uppsc", "upessc", "upsrtc", "up police", "uppbpb", "upprpb", "uptet", "uppcl"],
  bihar: ["bpsc", "bssc", "bpssc", "csbc"],
  rajasthan: ["rpsc", "rsmssb", "rssb", "rsrtc", "reet"],
  "madhya-pradesh": ["mppsc", "mpesb", "mppeb", "mp vyapam"],
  haryana: ["hpsc", "hssc", "htet"],
  "himachal-pradesh": ["hppsc", "hprca", "hrtc"],
  punjab: ["psssb", "prtc", "pspcl"],
  "jammu-kashmir": ["jkssb", "jkpsc", "jk police"],
  odisha: ["ossc", "opsc", "osssc"],
  "tamil-nadu": ["tnpsc", "tnusrb", "tnstc"],
  karnataka: ["kea"],
  gujarat: ["gpsc", "gsssb", "gsrtc", "gpssb"],
  maharashtra: ["msrtc"],
  "west-bengal": ["wbpsc", "wbssc", "wbpolice", "wb police"],
  telangana: ["tspsc", "tgpsc", "tsrtc", "tgsrtc", "tslprb"],
  jharkhand: ["jpsc", "jssc"],
  chhattisgarh: ["cgpsc", "cgvyapam", "cg vyapam"],
  uttarakhand: ["ukpsc", "ukssc", "uksssc"],
  assam: ["apsc"],
  delhi: ["dsssb", "dpsc", "dmrc"],
  "andhra-pradesh": ["apsrtc"],
};

/**
 * Acronyms shared by more than one state's body. They resolve only when no
 * explicit state name is present (an explicit name always wins, e.g. MPSC with
 * "Manipur" -> manipur).
 */
const WEAK_ALIASES: Record<string, string[]> = {
  maharashtra: ["mpsc"],
  karnataka: ["kpsc"], // Kerala PSC is also abbreviated KPSC
  "andhra-pradesh": ["appsc"], // Arunachal PPSC is also abbreviated APPSC
  punjab: ["ppsc"],
};

function aliasEntries(table: Record<string, string[]>): Array<[string, string]> {
  return Object.entries(table).flatMap(([slug, terms]) => terms.map((t): [string, string] => [slug, norm(t)]));
}
const STRONG_ENTRIES = aliasEntries(STRONG_ALIASES);
const WEAK_ENTRIES = aliasEntries(WEAK_ALIASES);

// ---------- source classification (organization name / title) ----------

type Classified =
  | { kind: "none" }
  | { kind: "state"; slug: string }
  | { kind: "blocked"; reason: "aiims" | "central" | "denylist" };

const STATE_ALT = NAME_ENTRIES.map(([, t]) => t).join("|");
// "Haryana Staff Selection Commission" is a state body, not the central SSC.
const STATE_SSC_RE = new RegExp(`(${STATE_ALT}) (?:state )?staff selection (?:commission|board)`, "g");

function classifySource(text: string | null): Classified {
  const n = norm(text);
  if (!n) return { kind: "none" };
  const padded = pad(n.replace(STATE_SSC_RE, "$1"));

  for (const p of DENYLIST_PHRASES) if (hasPhrase(padded, p)) return { kind: "blocked", reason: "denylist" };
  for (const t of CENTRAL_TERMS) {
    if (hasPhrase(padded, t)) return { kind: "blocked", reason: t === "aiims" ? "aiims" : "central" };
  }

  const names = stateNamesIn(padded);
  const strong = new Set<string>();
  for (const [slug, term] of STRONG_ENTRIES) if (hasPhrase(padded, term)) strong.add(slug);

  if (names.size > 1) return { kind: "none" };
  if (names.size === 1) {
    const [slug] = [...names];
    for (const a of strong) if (a !== slug) return { kind: "none" }; // contradiction
    return { kind: "state", slug };
  }
  const all = new Set(strong);
  for (const [slug, term] of WEAK_ENTRIES) if (hasPhrase(padded, term)) all.add(slug);
  if (all.size === 1) return { kind: "state", slug: [...all][0] };
  return { kind: "none" };
}

// ---------- location strings ----------

type LocResult = { kind: "none" } | { kind: "multi" } | { kind: "state"; slug: string };

const ALL_INDIA_PHRASES = [
  "all india",
  "pan india",
  "across india",
  "anywhere in india",
  "anywhere india",
  "throughout india",
  "nationwide",
  "india wide",
  "any state",
  "all states",
  "multiple states",
  "various states",
];

function parseLocation(raw: string | null, useCities: boolean): LocResult {
  const whole = norm(raw);
  if (!whole) return { kind: "none" };
  const padded = pad(whole);
  if (whole === "india") return { kind: "multi" };
  for (const p of ALL_INDIA_PHRASES) if (hasPhrase(padded, p)) return { kind: "multi" };

  const names = stateNamesIn(padded);
  const cityStates = new Set<string>();
  const cities: string[] = [];
  if (useCities) {
    for (const [city, slug] of Object.entries(CITY_STATE)) {
      if (hasPhrase(padded, city)) {
        cityStates.add(slug);
        cities.push(city);
      }
    }
  }
  const all = new Set([...names, ...cityStates]);
  if (all.size > 1) return { kind: "multi" };
  if (all.size === 0) return { kind: "none" };
  const [slug] = [...all];

  if (names.size === 1) {
    // The state must be the leading or trailing component ("Nadia, West Bengal",
    // "Uttarakhand (Directorate office in Dehradun)"), not buried mid-list.
    const comps = (raw as string)
      .split(/[,;/|()[\]\n–—]+|\s-\s/)
      .map(norm)
      .filter((c) => c && c !== "india");
    const terms = STATE_NAME_TERMS[slug];
    const inComp = (c: string | undefined) => !!c && terms.some((t) => hasPhrase(pad(c), t));
    if (inComp(comps[0]) || inComp(comps[comps.length - 1])) return { kind: "state", slug };
    return { kind: "none" };
  }
  // City-only evidence: the entire region must be that single city.
  const stripped = whole.replace(/ india$/, "");
  if (cities.length === 1 && stripped === cities[0]) return { kind: "state", slug };
  return { kind: "none" };
}

// ---------- place evidence ----------

const PLACE_ENTRIES: Array<[string, string]> = Object.entries(PLACE_TO_STATE).sort(
  (a, b) => b[0].length - a[0].length,
);

/**
 * Bodies whose name or title never counts as place evidence: national
 * recruiters, forces, banks and railways. A place in their text is a posting
 * or branch location, not where the employer is.
 */
const PLACE_BLOCK_TERMS: string[] = [
  "ssc",
  "staff selection commission",
  "upsc",
  "union public service commission",
  "ibps",
  "institute of banking personnel selection",
  "sbi",
  "state bank of india",
  "bank",
  "banks",
  "banking",
  "rrb",
  "rrc",
  "railway",
  "railways",
  "rpf",
  "army",
  "indian army",
  "navy",
  "air force",
  "coast guard",
  "armed forces",
  "agniveer",
  "bsf",
  "crpf",
  "cisf",
  "itbp",
  "indo tibetan border police",
  "ssb",
  "assam rifles",
  "nsg",
  "nia",
  "cbi",
  "central bureau of investigation",
  "cabinet secretariat",
  "government emarketplace",
  "nic",
  "national informatics centre",
  "icmr",
  "indian council of medical research",
  "rbi",
  "reserve bank of india",
  "nabard",
  "sebi",
  "lic",
  "life insurance corporation",
  "epfo",
  "nta",
  "national testing agency",
  "india post",
  "indian post",
  "gramin dak sevak",
  "ugc",
  "cbse",
  "cuet",
  "supreme court of india",
];

function isPlaceBlocked(text: string | null): boolean {
  const n = norm(text);
  if (!n) return false;
  const padded = pad(n.replace(STATE_SSC_RE, "$1"));
  return PLACE_BLOCK_TERMS.some((t) => hasPhrase(padded, t));
}

/** Mapped places in `text`; a place nested in a longer matched place is dropped. */
function placesIn(text: string | null): Array<{ place: string; slug: string }> {
  const n = norm(text);
  if (!n) return [];
  const padded = pad(n);
  const hits: Array<{ place: string; slug: string }> = [];
  for (const [place, slug] of PLACE_ENTRIES) {
    if (!hasPhrase(padded, place)) continue;
    if (hits.some((h) => h.place.includes(place))) continue;
    hits.push({ place, slug });
  }
  return hits;
}

const placeSlugs = (hits: Array<{ slug: string }>) => new Set(hits.map((h) => h.slug));

/** "Central University of Haryana": a university named for its own state. */
function centralUniversityState(org: string | null): string | null {
  const m = / central university of (.+)$/.exec(pad(norm(org)).trimEnd());
  if (!m) return null;
  const names = stateNamesIn(pad(m[1]));
  return names.size === 1 ? [...names][0] : null;
}

const INSTITUTION_RE = /(institute|university|college|hospital|aiims|iit|iim|nit|iiser|iiit|laborator)/;

const CENTRALISH_ORG_RE = /(^| )(india|indian|bharat|bharatiya|national|central|union|hindustan|all india)( |$)/;

// ---------- public API ----------

export function resolveState(input: ResolveStateInput): ResolvedState | null {
  const org = input.organizationName;
  const orgClass = classifySource(org);
  const orgNorm = norm(org);
  const orgPlaceBlocked = isPlaceBlocked(org);
  const orgPlaces = orgPlaceBlocked ? [] : placesIn(org);
  const orgPlaceStates = placeSlugs(orgPlaces);
  // A place in the organization name that contradicts a state-level finding
  // (or names two states) makes the whole posting unresolved.
  const contradicts = (slug: string) =>
    orgPlaceStates.size > 0 && !(orgPlaceStates.size === 1 && orgPlaceStates.has(slug));

  // 1. Posting location.
  const loc = parseLocation(input.locationRegion, true);
  if (loc.kind === "multi") return null;
  if (loc.kind === "state") return { slug: loc.slug, basis: "location_region" };

  // 2. Organization's recorded state, unless the org looks national/central.
  if (orgClass.kind !== "blocked") {
    const centralish = orgClass.kind === "none" && CENTRALISH_ORG_RE.test(orgNorm);
    if (!centralish) {
      const os = parseLocation(input.organizationState, false);
      if (os.kind === "multi") return null;
      if (os.kind === "state") return contradicts(os.slug) ? null : { slug: os.slug, basis: "organization_state" };
    }
  }

  // 3. Organization name.
  const titleClass = classifySource(input.title);
  if (orgClass.kind === "state") {
    return contradicts(orgClass.slug) ? null : { slug: orgClass.slug, basis: "organization_name" };
  }
  if (orgClass.kind === "blocked") {
    if (orgClass.reason === "aiims") {
      const a = aiims(org, input.title);
      if (a) return contradicts(a.slug) ? null : a;
    }
    const cu = centralUniversityState(org);
    if (cu) return contradicts(cu) ? null : { slug: cu, basis: "place" };
    if (orgPlaceStates.size === 1) return { slug: [...orgPlaceStates][0], basis: "place" };
    if (orgPlaceStates.size > 1) return null;
    return titlePlace(input.title, orgNorm, orgPlaceBlocked, true);
  }
  if (orgPlaceStates.size === 1) return { slug: [...orgPlaceStates][0], basis: "place" };
  if (orgPlaceStates.size > 1) return null;

  // 4. Title.
  if (titleClass.kind === "state") return { slug: titleClass.slug, basis: "title" };
  if (titleClass.kind === "blocked" && titleClass.reason === "aiims") {
    return aiims(null, input.title) ?? titlePlace(input.title, orgNorm, orgPlaceBlocked, true);
  }
  // 5. A single mapped place in the title.
  return titlePlace(input.title, orgNorm, orgPlaceBlocked, false);
}

/**
 * Place in the title: only when exactly one mapped place appears, the title
 * names no state and is not an all-India notice, and the employer is not a
 * national body. Centrally flavoured employers qualify only when they are
 * institutions (a campus has a location; "National Insurance" does not).
 */
function titlePlace(
  title: string,
  orgNorm: string,
  orgPlaceBlocked: boolean,
  institutionOrg: boolean,
): ResolvedState | null {
  if (orgPlaceBlocked || isPlaceBlocked(title)) return null;
  if (CENTRALISH_ORG_RE.test(orgNorm) && !institutionOrg && !INSTITUTION_RE.test(orgNorm)) return null;
  const padded = pad(norm(title));
  if (stateNamesIn(padded).size > 0) return null;
  for (const p of ALL_INDIA_PHRASES) if (hasPhrase(padded, p)) return null;
  const hits = placesIn(title);
  if (hits.length !== 1) return null;
  return { slug: hits[0].slug, basis: "place" };
}

/** AIIMS is central: only an explicit state name in its own name/title counts. */
function aiims(org: string | null, title: string): ResolvedState | null {
  const inOrg = stateNamesIn(pad(norm(org)));
  const inTitle = stateNamesIn(pad(norm(title)));
  const all = new Set([...inOrg, ...inTitle]);
  if (all.size !== 1) return null;
  const [slug] = [...all];
  return { slug, basis: inOrg.size ? "organization_name" : "title" };
}
