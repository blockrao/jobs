/**
 * Pure organization-name rules (no database). Shared by ingestion (candidate vs
 * canonical) and the JobPosting eligibility gate (hiring organization).
 */

export type CandidateReason =
  | "UNRECOGNIZED" // looks like a real name, but no alias or existing organization matches
  | "BUCKET_NAME" // a generic bucket ("Educational Institution", "<State> State Recruitment")
  | "POST_TITLE_LIKE" // looks like a job title / notice headline, not an issuing body
  | "AMBIGUOUS_ABBREVIATION" // too short to identify without an alias
  | "TOO_LONG";

export function normalizeOrgName(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^the /, "");
}

/** Name without a trailing "(ABBR)" group, normalized. Same as the full form if there is none. */
export function normalizeWithoutParens(raw: string): string {
  return normalizeOrgName(raw.replace(/\([^)]*\)/g, " "));
}

/** The lookup forms for a raw name: full, then without parentheses. Abbreviations alone are never looked up. */
export function lookupForms(raw: string): string[] {
  const forms = [normalizeOrgName(raw), normalizeWithoutParens(raw)].filter((f) => f.length > 0);
  return [...new Set(forms)];
}

const BUCKET_PATTERNS: RegExp[] = [
  /^(government of india|educational institution|public sector undertaking|indian armed forces)$/,
  /^aiims( and)? medical institute$/,
  /\bstate recruitment$/,
  /^various (departments|organi[sz]ations|posts)/,
  /^(central|state) government( departments?)?$/,
];

const POST_TITLE_PATTERNS: RegExp[] = [
  /\b(vacanc(y|ies)|notification|online form|offline form|walk in|various posts?)\b/,
  /^[a-z]{2,8}( [a-z]{2,8})? \d{2,}( \d{3})? [a-z]/, // "ecil 310 iti ...", "gsssb 131 staff nurse", "jssc jtaacce 7299 para ..."
  /\b\d[\d ]*\s+(posts?|vacanc\w*|aww|iti|trade|various)\b/, // "... 6 843 aww", "178 various posts"
  /^[a-z]{3,8} (assistant|junior|senior|deputy|stenographer|hostel|registrar|co pilot)\b/, // "UPPSC Assistant Town Planner ATP"
  /\b(teachers?|lecturer|constable|stenographer|apprentices?|trainee|co pilot|nurse|veterinary officer|junior engineer|associate engineer|ai engineer|supervisor|clerk|scaler|enumerator|principals?|manager|restorer|assistant professor)\b$/,
];

export function orgNameVerdict(raw: string | null | undefined): { ok: boolean; reason?: CandidateReason | "EMPTY" } {
  const n = raw ? normalizeOrgName(raw) : "";
  if (!n) return { ok: false, reason: "EMPTY" };
  if (n.length > 150) return { ok: false, reason: "TOO_LONG" };
  if (BUCKET_PATTERNS.some((p) => p.test(n))) return { ok: false, reason: "BUCKET_NAME" };
  if (POST_TITLE_PATTERNS.some((p) => p.test(n))) return { ok: false, reason: "POST_TITLE_LIKE" };
  if (n.length < 4) return { ok: false, reason: "AMBIGUOUS_ABBREVIATION" };
  return { ok: true };
}
