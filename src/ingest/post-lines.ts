/**
 * Post-line classifier and Post identity rules (Post/Vacancy increment, A1).
 * Pure functions, no database. Prototype and measurement:
 * docs/architecture/evidence/postvac_a1_*. Conservative by design: a line that
 * is not clearly one post designation is rejected and stays unresolved.
 * Do not weaken to raise Post counts; change only through change control with
 * a fresh labelled sample.
 */

export const POST_LINE_CLASSIFIER_VERSION = "pl1";

export type PostLineVerdict =
  | "OK"
  | "LEN"
  | "NUMERIC_NAME"
  | "DEPARTMENT_LINE"
  | "CATEGORY_LABEL"
  | "GENERIC"
  | "SPORT_DISCIPLINE"
  | "ACADEMIC_DISCIPLINE"
  | "COMBINED"
  | "BAD_COUNT"
  | "NO_ROLE_NOUN";

const CATEGORY = new Set(["ur","gen","general","obc","sc","st","ews","pwbd","pwd","total","others","other"]);
const GENERIC = /^(no\.? ?of|number of|sl\.? ?no|s\.? ?no|various|other posts?|misc|total|grand total|posts?$|vacanc)/i;
const SPORTS = new Set("athletics archery boxing wrestling hockey kabaddi football volleyball basketball judo swimming shooting weightlifting gymnastics handball cycling rowing kayaking canoeing fencing taekwondo wushu cricket badminton tennis".split(" "));
const DISCIPLINES = new Set(`plastic neurosurgery cardiothoracic vascular dentistry dental venereology leprosy transfusion immunology genetics emergency critical care community family sports rehabilitation nuclear preventive journalism education punjabi bengali tamil telugu kannada malayalam marathi gujarati odia assamese anatomy physiology biochemistry pathology microbiology pharmacology paediatrics pediatrics medicine surgery orthopaedics orthopedics ophthalmology ent dermatology psychiatry radiology anaesthesia anesthesiology obstetrics gynaecology gynecology forensic cardiology neurology nephrology urology oncology physics chemistry mathematics maths botany zoology english hindi history geography economics sociology philosophy commerce management law biology statistics geology psychology sanskrit urdu political science`.split(" "));
const COMBINED = /\/|\s(and|&)\s|\bor\b/i;
const ROLE = /\b(officer|engineers?|assistants?|asst|clerk|teachers?|professor|lecturer|fellow|associate|scientist|manager|director|supervisor|technician|driver|constable|inspector|consultant|analyst|specialist|librarian|registrar|dean|accountant|superintendent|operator|attendant|helper|peon|watchman|chowkidar|nurse|pharmacist|physician|doctor|surgeon|radiologist|advocate|editor|translator|counsellor|programmer|developer|trainee|apprentice|stenographer|steno|typist|sweeper|cook|guard|head|principal|secretary|member|executive|trainer|instructor|tutor|demonstrator|resident|gdmo|mechanic|electrician|fitter|welder|surveyor|draughtsman|draftsman|modeller|servant|volunteer|worker|educator|investigator|researcher|coordinator|administrator|jailor|warder|fireman|ranger|forester|patwari|lineman|tradesman|cashier|auditor|avp|ciso|dgm|agm|mts|pgt|tgt|prt|jrf|srf|professional|intensivist|pathologist|anaesthetist|anesthetist|optometrist|technologist|physiotherapist|perfusionist|librarian|physician|electrician|dietician|dietitian|pharmacist|chemist|geologist|economist|lawyer|commander|controller|warden|dietician|support|staff|personnel|sister|boy|reporter|expert|commissioner|in-charge|incharge|carpenter|faculty|keeper)\b/i;

/** Classify one source post-table line. `count` is the line's own vacancy count. */
export function classifyPostLine(name: string | null | undefined, count: number | null | undefined): PostLineVerdict {
  const n = (name ?? "").trim();
  const l = n.toLowerCase();
  if (n.length < 3 || n.length > 200) return "LEN";
  if (/^[\d\s.,()-]+$/.test(n)) return "NUMERIC_NAME";
  if (/^(department|dept\.?|faculty|school|college|centre|center|institute|division|unit) (of|for)\b/.test(l)) return "DEPARTMENT_LINE";
  if (CATEGORY.has(l)) return "CATEGORY_LABEL";
  if (GENERIC.test(l)) return "GENERIC";
  const toks = l.match(/[a-z]+/g) ?? [];
  if (toks.length && toks.every((t) => SPORTS.has(t) || t === "sports" || t === "sport") && toks.some((t) => SPORTS.has(t))) return "SPORT_DISCIPLINE";
  if (toks.length && toks.length <= 3 && toks.every((t) => DISCIPLINES.has(t))) return "ACADEMIC_DISCIPLINE";
  if (COMBINED.test(n.replace(/\([^)]*\)/g, ""))) return "COMBINED";
  if (count == null || !Number.isInteger(count) || count <= 0) return "BAD_COUNT";
  if (!ROLE.test(n)) return "NO_ROLE_NOUN";
  return "OK";
}

/** Name-only check, for adapters that give a post name but no per-line count. */
export function classifyPostNameOnly(name: string | null | undefined): PostLineVerdict {
  return classifyPostLine(name, 1);
}

// ---------------------------------------------------------------------------
// Identity against the Posts that already exist under one Recruitment.

/** Exact-match key: case, spacing, dash and punctuation-at-the-ends differences only. */
export function normalizePostName(name: string): string {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[\s.,;:-]+|[\s.,;:-]+$/g, "");
}

function stripParens(s: string): string {
  return s.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

/** Grade/level markers: digits and roman numerals. A difference means a different post (Associate-I vs -II). */
function levelTokens(s: string): string {
  const t = s.toLowerCase().match(/\b(\d+|i{1,3}|iv|v|vi{1,3}|ix|x)\b/g) ?? [];
  return t.sort().join(",");
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  const t = ` ${s} `;
  for (let i = 0; i < t.length - 1; i++) m.set(t.slice(i, i + 2), (m.get(t.slice(i, i + 2)) ?? 0) + 1);
  return m;
}

/** Dice coefficient over character bigrams of the parenthesis-stripped normalized names. */
export function postNameSimilarity(a: string, b: string): number {
  const x = bigrams(normalizePostName(stripParens(a)));
  const y = bigrams(normalizePostName(stripParens(b)));
  let inter = 0;
  let total = 0;
  for (const [k, v] of x) inter += Math.min(v, y.get(k) ?? 0);
  for (const v of x.values()) total += v;
  for (const v of y.values()) total += v;
  return total === 0 ? 0 : (2 * inter) / total;
}

export interface ExistingPostRef {
  id: number;
  name: string;
  vacancyTotal: number | null;
}

export type PostIdentityDecision =
  | { kind: "EXISTING"; postId: number; basis: "EXACT_NAME" | "SIMILAR_WITH_SUPPORT" }
  | { kind: "CREATE" }
  | { kind: "UNRESOLVED"; reason: "SIMILAR_WITHOUT_SUPPORT" | "AMBIGUOUS_SIMILAR" };

export const SIMILARITY_MIN = 0.85;
export const SIMILARITY_MARGIN = 0.1;

/**
 * Decide whether an accepted source line is an existing Post, a new Post, or
 * cannot be decided safely. Line position is never used. Count is supporting
 * evidence only, and only together with strong, unique name similarity.
 * Existing Posts are never modified by the caller.
 */
export function decidePostIdentity(
  line: { name: string; count: number | null },
  existing: ExistingPostRef[],
): PostIdentityDecision {
  const key = normalizePostName(line.name);
  const exact = existing.filter((p) => normalizePostName(p.name) === key);
  if (exact.length === 1) return { kind: "EXISTING", postId: exact[0].id, basis: "EXACT_NAME" };
  if (exact.length > 1) return { kind: "UNRESOLVED", reason: "AMBIGUOUS_SIMILAR" };

  const scored = existing
    .filter((p) => levelTokens(p.name) === levelTokens(line.name))
    .map((p) => ({ p, s: postNameSimilarity(line.name, p.name) }))
    .filter((x) => x.s >= SIMILARITY_MIN)
    .sort((a, b) => b.s - a.s);
  if (scored.length === 0) return { kind: "CREATE" };
  const [best, second] = scored;
  if (second && best.s - second.s < SIMILARITY_MARGIN) return { kind: "UNRESOLVED", reason: "AMBIGUOUS_SIMILAR" };
  const supported = line.count != null && best.p.vacancyTotal != null && best.p.vacancyTotal === line.count;
  return supported
    ? { kind: "EXISTING", postId: best.p.id, basis: "SIMILAR_WITH_SUPPORT" }
    : { kind: "UNRESOLVED", reason: "SIMILAR_WITHOUT_SUPPORT" };
}
