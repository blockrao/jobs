/**
 * Approval guard (owner direction 2026-10-05): a posting that carries an
 * aggregator name or link in any public text or URL field is never approved.
 * Pure functions plus one dependency-injected workflow so the refusal is
 * testable without a database. Used by the admin approve action, the
 * promotion step and the bulk approve script.
 */
import { containsAggregatorReference, isAggregatorUrl } from "./aggregators";

export interface ApprovalSubject {
  title?: string | null;
  titleHi?: string | null;
  description?: string | null;
  descriptionHi?: string | null;
  eligibility?: string | null;
  eligibilityHi?: string | null;
  responsibilities?: string | null;
  requirements?: string | null;
  ageRelaxationNotes?: string | null;
  ageRelaxationNotesHi?: string | null;
  locationCity?: string | null;
  locationRegion?: string | null;
  applyUrl?: string | null;
  officialNotificationUrl?: string | null;
  postNames?: string[] | null;
  extraContent?: unknown;
}

export interface ApprovalUpdateRow {
  title?: string | null;
  titleHi?: string | null;
  description?: string | null;
  descriptionHi?: string | null;
  linkUrl?: string | null;
}

const TEXT_FIELDS = [
  "title", "titleHi", "description", "descriptionHi", "eligibility", "eligibilityHi", "responsibilities",
  "requirements", "ageRelaxationNotes", "ageRelaxationNotesHi", "locationCity", "locationRegion",
] as const;
const URL_FIELDS = ["applyUrl", "officialNotificationUrl"] as const;

/** Names of the public fields that reference an aggregator; empty means approvable. */
export function findAggregatorViolations(p: ApprovalSubject, updates: ApprovalUpdateRow[] = []): string[] {
  const bad: string[] = [];
  for (const f of TEXT_FIELDS) if (containsAggregatorReference(p[f])) bad.push(f);
  // A present URL that is an aggregator (or unparseable) is a violation.
  for (const f of URL_FIELDS) if (p[f] && isAggregatorUrl(p[f])) bad.push(f);
  if ((p.postNames ?? []).some((n) => containsAggregatorReference(n))) bad.push("postNames");
  if (p.extraContent != null && containsAggregatorReference(JSON.stringify(p.extraContent))) bad.push("extraContent");
  updates.forEach((u, i) => {
    for (const f of ["title", "titleHi", "description", "descriptionHi"] as const) {
      if (containsAggregatorReference(u[f])) bad.push(`update[${i}].${f}`);
    }
    if (u.linkUrl && isAggregatorUrl(u.linkUrl)) bad.push(`update[${i}].linkUrl`);
  });
  return bad;
}

export type ApprovalResult = { ok: true } | { ok: false; error: string };

export interface ApprovalDeps {
  load(postingId: number): Promise<{ posting: ApprovalSubject; updates: ApprovalUpdateRow[] } | null>;
  markApproved(postingId: number): Promise<void>;
}

/** Approves only when no public field references an aggregator; otherwise refuses and writes nothing. */
export async function approveIfClean(deps: ApprovalDeps, postingId: number): Promise<ApprovalResult> {
  const row = await deps.load(postingId);
  if (!row) return { ok: false, error: "Posting not found." };
  const bad = findAggregatorViolations(row.posting, row.updates);
  if (bad.length > 0) {
    return { ok: false, error: `Approval refused: aggregator reference in ${bad.join(", ")}. Remove it first.` };
  }
  await deps.markApproved(postingId);
  return { ok: true };
}
