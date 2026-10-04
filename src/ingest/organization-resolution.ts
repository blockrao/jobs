/**
 * Organization resolution (WP-001).
 *
 *   Known alias or existing clean canonical organization -> that organization
 *   Recognizable but not sufficiently resolved            -> Organization Candidate
 *   Sufficiently established identity                     -> canonical organization,
 *                                                            only by an explicit, reviewed act
 *
 * Ingestion never creates a canonical organization. The headline guess
 * `inferOrg(title)` creates nothing. A candidate is not a canonical
 * organization and is never linked from public pages.
 */

import { eq, sql } from "drizzle-orm";
import type { getDb } from "../db";
import { organizations, organizationAliases, organizationCandidates } from "../db/schema";

type Db = ReturnType<typeof getDb>;

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

type OrgRow = typeof organizations.$inferSelect;

export interface OrgIndex {
  aliases: Map<string, number>; // alias_normalized -> organization id
  byId: Map<number, OrgRow>;
  /** normalized forms of existing clean organizations -> ids (lowest id first) */
  existing: Map<string, number[]>;
}

export async function loadOrgIndex(db: Db): Promise<OrgIndex> {
  const [orgRows, aliasRows] = await Promise.all([
    db.select().from(organizations),
    db.select().from(organizationAliases),
  ]);
  const byId = new Map(orgRows.map((o) => [o.id, o]));
  const aliases = new Map(aliasRows.map((a) => [a.aliasNormalized, a.organizationId]));
  const existing = new Map<string, number[]>();
  for (const o of [...orgRows].sort((a, b) => a.id - b.id)) {
    // An existing organization only counts as a match target if its own name
    // would pass the validators: this keeps bucket and title-derived legacy
    // rows from attracting new postings.
    if (!orgNameVerdict(o.name).ok) continue;
    for (const form of lookupForms(o.name)) {
      const list = existing.get(form) ?? [];
      if (!list.includes(o.id)) list.push(o.id);
      existing.set(form, list);
    }
  }
  return { aliases, byId, existing };
}

function tokenSet(n: string): Set<string> {
  return new Set(n.split(" ").filter((w) => w.length > 2 && !["and", "the", "of", "for"].includes(w)));
}

function nearestExisting(index: OrgIndex, normalized: string): number | null {
  const a = tokenSet(normalized);
  if (a.size < 2) return null;
  let best: { id: number; score: number } | null = null;
  for (const [form, ids] of index.existing) {
    const b = tokenSet(form);
    if (b.size < 2) continue;
    let overlap = 0;
    for (const w of a) if (b.has(w)) overlap++;
    const score = overlap / (a.size + b.size - overlap);
    if (score >= 0.7 && (!best || score > best.score)) best = { id: ids[0], score };
  }
  return best ? best.id : null;
}

export type OrgResolution =
  | { kind: "ALIAS"; organization: OrgRow; matchedOn: string }
  | { kind: "EXISTING"; organization: OrgRow; matchedOn: string; ambiguous: boolean }
  | { kind: "CANDIDATE"; reason: CandidateReason; normalizedName: string; proposedOrganizationId: number | null }
  | { kind: "NONE"; reason: "NO_ORGANIZATION_NAME" };

export function resolveOrganization(index: OrgIndex, rawName: string | null | undefined): OrgResolution {
  if (!rawName || !normalizeOrgName(rawName)) return { kind: "NONE", reason: "NO_ORGANIZATION_NAME" };

  const forms = lookupForms(rawName);
  for (const f of forms) {
    const id = index.aliases.get(f);
    if (id != null && index.byId.has(id)) return { kind: "ALIAS", organization: index.byId.get(id)!, matchedOn: f };
  }

  const verdict = orgNameVerdict(rawName);
  if (verdict.ok) {
    for (const f of forms) {
      const ids = index.existing.get(f);
      if (ids && ids.length > 0) {
        return { kind: "EXISTING", organization: index.byId.get(ids[0])!, matchedOn: f, ambiguous: ids.length > 1 };
      }
    }
  }

  const normalizedName = normalizeOrgName(rawName);
  const reason: CandidateReason = verdict.ok ? "UNRECOGNIZED" : (verdict.reason as CandidateReason);
  return {
    kind: "CANDIDATE",
    reason,
    normalizedName,
    proposedOrganizationId: nearestExisting(index, normalizeWithoutParens(rawName)),
  };
}

/** Insert or refresh the candidate for (normalized name, source). Never touches `organizations`. */
export async function upsertCandidate(
  db: Db,
  input: {
    rawName: string;
    normalizedName: string;
    source: string;
    sourceUrl?: string | null;
    evidence?: unknown;
    reason: CandidateReason;
    confidence?: number | null;
    proposedOrganizationId: number | null;
  },
): Promise<number> {
  const [row] = await db
    .insert(organizationCandidates)
    .values({
      rawName: input.rawName.slice(0, 300),
      normalizedName: input.normalizedName.slice(0, 200),
      source: input.source,
      sourceUrl: input.sourceUrl ?? null,
      evidence: input.evidence ?? null,
      confidence: input.confidence ?? null,
      reason: input.reason,
      proposedOrganizationId: input.proposedOrganizationId,
    })
    .onConflictDoUpdate({
      target: [organizationCandidates.normalizedName, organizationCandidates.source],
      set: {
        observationCount: sql`${organizationCandidates.observationCount} + 1`,
        lastSeenAt: sql`now()`,
      },
    })
    .returning({ id: organizationCandidates.id });
  return row.id;
}

/** Explicit, reviewed act: register a known alias for a canonical organization. */
export async function addAlias(db: Db, organizationId: number, rawAlias: string, source = "manual") {
  const alias = normalizeOrgName(rawAlias);
  await db
    .insert(organizationAliases)
    .values({ organizationId, aliasNormalized: alias, aliasRaw: rawAlias.slice(0, 300), source })
    .onConflictDoNothing({ target: organizationAliases.aliasNormalized });
}

export async function getOrganizationById(db: Db, id: number) {
  return db.query.organizations.findFirst({ where: eq(organizations.id, id) });
}
