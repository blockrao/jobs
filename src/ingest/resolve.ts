/**
 * Canonical entity resolution.
 *
 * Replaces the keyword/substring matching that used to live in
 * write-postings(.ts/-v2.ts) (`inferPositionId`/`inferRecruitmentId`) — the
 * exact mechanism that produced a "PSU General Recruitment" catch-all
 * bucket spanning unrelated organizations. Resolution here uses a real
 * identity key and only ever does one of two things: match an existing
 * Recruitment/Post, or create a new one. It never falls back to "closest
 * existing entity" below some similarity threshold.
 *
 * Organization resolution (slug lookup) isn't here — it's already reliable
 * and stays where it is in the writer.
 */

import { eq, and } from "drizzle-orm";
import type { getDb } from "../db";
import { recruitments, posts, positions } from "../db/schema";
import { classifyPostLine, decidePostIdentity, POST_LINE_CLASSIFIER_VERSION, type PostLineVerdict } from "./post-lines";

type Db = ReturnType<typeof getDb>;

export interface RecruitmentIdentity {
  organizationId: number;
  examId: number | null;
  year: number | null;
  /** Government reference number, e.g. "No. 22/2026-RC". Preferred key. */
  officialNotificationNumber: string | null;
  /** Used only for the fallback match path and as the name for a new row. */
  title: string;
  /** Dates the source stated for the recruitment (never invented). */
  applicationStartDate?: Date | null;
  applicationEndDate?: Date | null;
}

/**
 * The advertisement / notification number as an identity key. Strips a leading label
 * ("Advt. No.", "Notification No:"), collapses whitespace, and rejects values that
 * carry no identifying digit or are too short to be a real reference (returns null,
 * which means "no strong key", never a guess).
 */
export function normalizeAdvertisementNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let v = raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(advertisement|advt|notification|notice|ref)\.?\s*(no\.?|number|#)?\s*[:\-.]?\s*/i, "")
    .trim();
  if (v.length < 3 || v.length > 200) return null;
  if (!/\d/.test(v)) return null;
  return v;
}

/**
 * Fill or extend recruitment dates from a later sighting. A start date is only filled when empty;
 * an end date is only moved later (an extension), never earlier. Nothing else on the row changes.
 */
export async function refreshRecruitmentDates(
  db: Db,
  recruitmentId: number,
  dates: { applicationStartDate?: Date | null; applicationEndDate?: Date | null },
): Promise<{ filledStart: boolean; extendedEnd: boolean }> {
  const row = await db.query.recruitments.findFirst({ where: eq(recruitments.id, recruitmentId) });
  if (!row) return { filledStart: false, extendedEnd: false };
  const patch: Record<string, unknown> = {};
  let filledStart = false;
  let extendedEnd = false;
  if (dates.applicationStartDate && !row.applicationStartDate) {
    patch.applicationStartDate = dates.applicationStartDate;
    filledStart = true;
  }
  if (dates.applicationEndDate && (!row.applicationEndDate || dates.applicationEndDate.getTime() > row.applicationEndDate.getTime())) {
    patch.applicationEndDate = dates.applicationEndDate;
    extendedEnd = true;
  }
  if (filledStart || extendedEnd) {
    patch.updatedAt = new Date();
    await db.update(recruitments).set(patch).where(eq(recruitments.id, recruitmentId));
  }
  return { filledStart, extendedEnd };
}

export interface ResolvedRecruitment {
  id: number;
  created: boolean;
}

// Fallback-match threshold when there's no notification number to key off.
// Deliberately conservative — a false match here is exactly the "unrelated
// postings glued onto one bucket" failure mode this module exists to avoid.
// Token-overlap ratio, not substring containment (the old bug: title.includes
// at any length counted as a match).
function titleSimilarity(a: string, b: string): number {
  const norm = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2),
    );
  const setA = norm(a);
  const setB = norm(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let overlap = 0;
  for (const w of setA) if (setB.has(w)) overlap++;
  return overlap / Math.max(setA.size, setB.size);
}

const FALLBACK_SIMILARITY_THRESHOLD = 0.6;

// `recruitments.name` and `posts.name` are varchar-bounded, but the text
// feeding them (a scraped headline, sometimes a full portal title with a
// district list appended) is not. Truncate on a word boundary so a long
// raw title never crashes the insert — this isn't a display-formatting
// concern, it's the difference between "ingestion completes" and "ingestion
// throws a Postgres error on an attacker-sized headline nobody wrote."
export function truncateForColumn(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const ELLIPSIS = "…";
  const budget = maxLength - ELLIPSIS.length;
  const cut = trimmed.slice(0, budget);
  // Prefer breaking on whitespace so we don't cut mid-word, but only if that
  // doesn't throw away too much of the budget.
  const lastSpace = cut.lastIndexOf(" ");
  const safeCut = lastSpace > budget * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${safeCut.trimEnd()}${ELLIPSIS}`;
}

// Matches recruitments.name's declared length (schema.ts). Kept as a named
// constant here rather than imported from the column so this file doesn't
// need a Drizzle introspection dependency just to read a number.
const RECRUITMENT_NAME_MAX_LENGTH = 220;
// Matches posts.name's declared length (schema.ts).
const POST_NAME_MAX_LENGTH = 200;

export async function resolveRecruitment(
  db: Db,
  identity: RecruitmentIdentity,
  slug: string,
): Promise<ResolvedRecruitment> {
  // Strong key: organization + official notification number. Enforced
  // unique at the DB level (recruitments_org_notification_idx).
  if (identity.officialNotificationNumber) {
    const existing = await db.query.recruitments.findFirst({
      where: and(
        eq(recruitments.organizationId, identity.organizationId),
        eq(recruitments.officialNotificationNumber, identity.officialNotificationNumber),
      ),
    });
    if (existing) return { id: existing.id, created: false };
  }

  // Fallback: organization + exam + year, narrowed further by title
  // similarity so two different recruitments by the same exam/org/year
  // (it happens — e.g. two separate notifications in one cycle) don't
  // collapse into one.
  if (identity.examId && identity.year) {
    const candidates = await db.query.recruitments.findMany({
      where: and(
        eq(recruitments.organizationId, identity.organizationId),
        eq(recruitments.examId, identity.examId),
        eq(recruitments.year, identity.year),
      ),
    });
    const best = candidates
      .map((c) => ({ c, score: titleSimilarity(c.name, identity.title) }))
      .sort((a, b) => b.score - a.score)[0];
    if (best && best.score >= FALLBACK_SIMILARITY_THRESHOLD) {
      return { id: best.c.id, created: false };
    }
  }

  // No confident match — create a new recruitment rather than attaching to
  // the nearest existing one.
  //
  // `slug` is deterministic, derived from the driving posting's
  // (source, externalId) — so a slug collision here specifically means this
  // exact posting already created this exact recruitment on an earlier,
  // partially-failed run (the pipeline isn't wrapped in one transaction per
  // posting, so a crash downstream of this insert still leaves it
  // committed). That makes it safe to treat a collision as "already
  // resolved" rather than a real naming clash: onConflictDoNothing, then
  // look the row up by slug if nothing was inserted.
  const [created] = await db
    .insert(recruitments)
    .values({
      organizationId: identity.organizationId,
      examId: identity.examId,
      year: identity.year ?? new Date().getFullYear(),
      name: truncateForColumn(identity.title, RECRUITMENT_NAME_MAX_LENGTH),
      slug,
      officialNotificationNumber: identity.officialNotificationNumber,
      applicationStartDate: identity.applicationStartDate ?? null,
      applicationEndDate: identity.applicationEndDate ?? null,
    })
    .onConflictDoNothing({ target: recruitments.slug })
    .returning({ id: recruitments.id });

  if (created) return { id: created.id, created: true };

  const existingBySlug = await db.query.recruitments.findFirst({
    where: eq(recruitments.slug, slug),
  });
  if (existingBySlug) return { id: existingBySlug.id, created: false };

  // Insert raced and lost, but the winning row isn't visible yet (unlikely
  // outside real concurrency) — surface clearly rather than silently
  // returning a bogus id.
  throw new Error(`resolveRecruitment: slug "${slug}" conflicted but no row found`);
}

export interface PostIdentity {
  recruitmentId: number;
  /** The real extracted job title — e.g. "Research Associate III". */
  name: string;
  positionCategory:
    | "POLICE"
    | "ADMINISTRATIVE"
    | "BANKING"
    | "TEACHING"
    | "ENGINEERING"
    | "MEDICAL"
    | "DEFENCE"
    | "RAILWAY"
    | "POSTAL"
    | "CUSTOMS"
    | "TAX"
    | "JUDICIAL"
    | "LEGAL"
    | "PSU"
    | "OTHER";
}

export interface ResolvedPost {
  id: number;
  created: boolean;
}

// A Post requires a genuine extracted name. Callers must not invoke this
// with a headline/title as a stand-in — if extraction didn't produce a real
// job title, leave the posting's postId unresolved (null) rather than
// create a Post with a fabricated name. The gate already treats a missing
// extracted title as a Tier A blocker for exactly this reason.
export async function resolvePost(db: Db, identity: PostIdentity, slug: string): Promise<ResolvedPost> {
  const safeName = truncateForColumn(identity.name, POST_NAME_MAX_LENGTH);
  const normalizedName = safeName.trim().toLowerCase();

  // Scoped to one recruitment (typically single-digit post counts), so a
  // JS-side case-insensitive match is simpler than a functional-index query
  // through the relational API and costs nothing in practice.
  const siblings = await db.query.posts.findMany({
    where: eq(posts.recruitmentId, identity.recruitmentId),
  });
  const match = siblings.find((p) => p.name.trim().toLowerCase() === normalizedName);
  if (match) return { id: match.id, created: false };

  // Resolve/create the generic Position bucket this Post belongs to. This
  // is a coarse classification (e.g. "ENGINEERING"), not the job title —
  // it's fine for several unrelated posts to share one Position, unlike
  // the old bug where *postings themselves* were glued onto one bucket.
  let position = await db.query.positions.findFirst({
    where: eq(positions.slug, slugifyPositionCategory(identity.positionCategory)),
  });
  if (!position) {
    const [createdPosition] = await db
      .insert(positions)
      .values({
        name: titleCasePositionCategory(identity.positionCategory),
        slug: slugifyPositionCategory(identity.positionCategory),
        category: identity.positionCategory,
      })
      .returning();
    position = createdPosition;
  }

  const [created] = await db
    .insert(posts)
    .values({
      recruitmentId: identity.recruitmentId,
      positionId: position.id,
      name: safeName,
      slug,
    })
    .returning({ id: posts.id });

  return { id: created.id, created: true };
}

function slugifyPositionCategory(category: string): string {
  return `category-${category.toLowerCase().replace(/_/g, "-")}`;
}

function titleCasePositionCategory(category: string): string {
  return category
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Per-line Posts (Post/Vacancy increment, A1). Never updates an existing Post
// (A2), never invents a Post from a rejected line, and never copies a raw
// line count into vacancy_total: the value comes from the one accepted line.

export interface PostLineInput {
  name: string;
  vacancies?: number | null;
}

export interface PostLineOutcome {
  name: string;
  verdict: PostLineVerdict;
  action: "created" | "existing" | "rejected" | "unresolved";
  postId: number | null;
  detail?: string;
}

export interface PostLinesResult {
  lines: PostLineOutcome[];
  created: number;
  existing: number;
  rejected: number;
  unresolved: number;
  /** Set only when the table is exactly one accepted line: the single Post this notice stands for. */
  singlePostId: number | null;
}

async function getOrCreatePositionId(db: Db, category: PostIdentity["positionCategory"]): Promise<number> {
  const slug = slugifyPositionCategory(category);
  const found = await db.query.positions.findFirst({ where: eq(positions.slug, slug) });
  if (found) return found.id;
  const [createdPosition] = await db
    .insert(positions)
    .values({ name: titleCasePositionCategory(category), slug, category })
    .returning();
  return createdPosition.id;
}

function postLineSlug(recruitmentSlug: string, name: string): string {
  const stem = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);  // Reduced to make room for "-jobs" suffix
  // Append "-jobs" to make post title explicit in URLs (e.g., "/junior-engineer-jobs")
  const stemWithJobs = `${stem}-jobs`;
  // "-pl1-" marks Posts written by the post-line classifier, so they can be found and reversed.
  return `${recruitmentSlug.slice(0, 100)}-${POST_LINE_CLASSIFIER_VERSION}-${stemWithJobs}`.slice(0, 200);
}

export async function resolvePostLines(
  db: Db,
  recruitmentId: number,
  recruitmentSlug: string,
  lines: PostLineInput[],
  opts: { countOptional?: boolean } = {},
): Promise<PostLinesResult> {
  const result: PostLinesResult = { lines: [], created: 0, existing: 0, rejected: 0, unresolved: 0, singlePostId: null };
  let existing = (await db.query.posts.findMany({ where: eq(posts.recruitmentId, recruitmentId) })).map((p) => ({
    id: p.id,
    name: p.name,
    vacancyTotal: p.vacancyTotal,
  }));
  let positionId: number | null = null;
  for (const line of lines) {
    const count = typeof line.vacancies === "number" ? line.vacancies : null;
    // countOptional: adapters that give a name but no per-line count. The count then stays null (never invented).
    const verdict = classifyPostLine(line.name, count ?? (opts.countOptional ? 1 : null));
    if (verdict !== "OK") {
      result.rejected++;
      result.lines.push({ name: line.name, verdict, action: "rejected", postId: null });
      continue;
    }
    const name = truncateForColumn(line.name.trim(), POST_NAME_MAX_LENGTH);
    const decision = decidePostIdentity({ name, count }, existing);
    if (decision.kind === "EXISTING") {
      result.existing++;
      result.lines.push({ name, verdict, action: "existing", postId: decision.postId, detail: decision.basis });
      continue;
    }
    if (decision.kind === "UNRESOLVED") {
      result.unresolved++;
      result.lines.push({ name, verdict, action: "unresolved", postId: null, detail: decision.reason });
      continue;
    }
    positionId ??= await getOrCreatePositionId(db, "OTHER");
    const [row] = await db
      .insert(posts)
      .values({ recruitmentId, positionId, name, slug: postLineSlug(recruitmentSlug, name), vacancyTotal: count })
      .onConflictDoNothing()
      .returning({ id: posts.id });
    if (!row) {
      // Lost a race on the unique (recruitment, lower(name)) index: it exists now, never duplicate.
      result.existing++;
      result.lines.push({ name, verdict, action: "existing", postId: null, detail: "CONFLICT_EXISTING" });
      continue;
    }
    result.created++;
    existing = [...existing, { id: row.id, name, vacancyTotal: count }];
    result.lines.push({ name, verdict, action: "created", postId: row.id });
  }
  if (lines.length === 1 && result.lines[0].postId != null) result.singlePostId = result.lines[0].postId;
  return result;
}
