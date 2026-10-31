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

import { createHash } from "node:crypto";
import { eq, and, isNull, sql } from "drizzle-orm";
import type { getDb } from "../db";
import { recruitments, posts, positions } from "../db/schema";
import { classifyPostLine, decidePostIdentity, POST_LINE_CLASSIFIER_VERSION, type PostLineVerdict } from "./post-lines";
import { buildDescriptiveRecruitmentSlug } from "./slug-generator";
import { canFillMissingCanonicalDeadline, decideOfficialDeadlineReconciliation, type DeadlineEvidence } from "./deadline-authority";

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
  const v = raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(advertisement|advt|notification|notice|ref)\.?\s*(no\.?|number|#)?\s*[:\-.]?\s*/i, "")
    .trim();
  if (v.length < 3 || v.length > 200) return null;
  if (!/\d/.test(v)) return null;
  return v;
}

/**
 * Fill missing recruitment dates and reconcile official deadline extensions.
 *
 * A populated deadline is changed only when a prior OFFICIAL observation exactly
 * explains the stored instant and the new official candidate is later with equal-or-
 * better precision. Untraceable legacy values, corrections and precision conflicts
 * are left untouched and surfaced on the current source observation for review.
 */
export async function refreshRecruitmentDates(
  db: Db,
  recruitmentId: number,
  dates: {
    applicationStartDate?: Date | null;
    applicationEndDate?: Date | null;
    deadlineEvidence?: DeadlineEvidence | null;
  },
): Promise<{ filledStart: boolean; extendedEnd: boolean; deadlineReviewReason?: string }> {
  // Serialize all reconciliation for this recruitment. The row lock must cover
  // the existing-value read, official-evidence lookup, decision and write;
  // otherwise concurrent ingestions can both decide from a stale deadline.
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT id
      FROM public.recruitments
      WHERE id = ${recruitmentId}
      FOR UPDATE
    `);

    const row = await tx.query.recruitments.findFirst({
      where: eq(recruitments.id, recruitmentId),
    });
    if (!row) return { filledStart: false, extendedEnd: false };

    const patch: Record<string, unknown> = {};
    let filledStart = false;
    let extendedEnd = false;
    let deadlineReviewReason: string | undefined;

    if (dates.applicationStartDate && !row.applicationStartDate) {
      patch.applicationStartDate = dates.applicationStartDate;
      filledStart = true;
    }

    if (canFillMissingCanonicalDeadline(row.applicationEndDate, dates.applicationEndDate)) {
      patch.applicationEndDate = dates.applicationEndDate;
      extendedEnd = true;
    } else if (
      row.applicationEndDate &&
      dates.applicationEndDate &&
      row.applicationEndDate.getTime() !== dates.applicationEndDate.getTime()
    ) {
      try {
        // The observation is linked through its posting; source registry authority is
        // joined independently and must be OFFICIAL + is_official=true.
        const evidenceResult = await tx.execute(sql`
          SELECT so.facts
          FROM public.source_observations so
          INNER JOIN public.postings source_posting ON source_posting.id = so.posting_id
          INNER JOIN public.posts canonical_post ON canonical_post.id = source_posting.inferred_post_id
          INNER JOIN public.sources s ON s.slug = so.source
          WHERE canonical_post.recruitment_id = ${recruitmentId}
            AND s.authority = 'OFFICIAL'
            AND s.is_official IS TRUE
            AND so.outcome = 'LOADED'
            AND so.facts->>'lastDate' = ${row.applicationEndDate.toISOString()}
          ORDER BY so.observed_at DESC, so.id DESC
          LIMIT 1
        `);
        const evidenceRows = Array.isArray(evidenceResult)
          ? evidenceResult as unknown as Array<{ facts: Record<string, unknown> }>
          : [];
        const facts = evidenceRows[0]?.facts;
        const existingEvidence: DeadlineEvidence | null = facts
          ? {
              precision: facts.deadlinePrecision === "DATE_ONLY" || facts.deadlinePrecision === "DATE_TIME"
                ? facts.deadlinePrecision
                : "UNKNOWN",
              sourceText: typeof facts.deadlineSourceText === "string" ? facts.deadlineSourceText : null,
              timezone: typeof facts.deadlineTimezone === "string" ? facts.deadlineTimezone : null,
              timezoneBasis: facts.deadlineTimezoneBasis === "EXPLICIT_SOURCE" || facts.deadlineTimezoneBasis === "INDIA_SOURCE_DEFAULT"
                ? facts.deadlineTimezoneBasis
                : "UNKNOWN",
            }
          : null;

        const decision = decideOfficialDeadlineReconciliation(
          row.applicationEndDate,
          dates.applicationEndDate,
          existingEvidence,
          dates.deadlineEvidence ?? null,
        );
        if (decision.action === "EXTEND") {
          patch.applicationEndDate = dates.applicationEndDate;
          extendedEnd = true;
        } else if (decision.action === "REVIEW") {
          deadlineReviewReason = `DEADLINE_REVIEW_REQUIRED:${decision.reason}`;
        }
      } catch {
        // Fail closed: a query/shape failure must never turn into an automatic overwrite.
        deadlineReviewReason = "DEADLINE_REVIEW_REQUIRED:EXISTING_DEADLINE_EVIDENCE_LOOKUP_FAILED";
      }
    }

    if (filledStart || extendedEnd) {
      patch.updatedAt = new Date();
      await tx.update(recruitments).set(patch).where(eq(recruitments.id, recruitmentId));
    }
    return {
      filledStart,
      extendedEnd,
      ...(deadlineReviewReason ? { deadlineReviewReason } : {}),
    };
  });
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
  // New canonical URLs are descriptive. Existing legacy slugs are never
  // rewritten; this path runs only when creating a genuinely new recruitment.
  const finalYear = identity.year ?? new Date().getFullYear();
  // The unique constraint is the collision guard. If a concurrent or unrelated
  // record already owns this URL, the insert fails closed; entity recovery below
  // uses the structured recruitment identity, never the slug.
  const finalSlug = buildDescriptiveRecruitmentSlug(identity.title);

  if (!finalSlug) {
    throw new Error(
      `resolveRecruitment: unable to generate slug for organization ${identity.organizationId}`,
    );
  }

  const [created] = await db
    .insert(recruitments)
    .values({
      organizationId: identity.organizationId,
      examId: identity.examId,
      year: finalYear,
      name: truncateForColumn(identity.title, RECRUITMENT_NAME_MAX_LENGTH),
      slug: finalSlug,
      officialNotificationNumber: identity.officialNotificationNumber,
      applicationStartDate: identity.applicationStartDate ?? null,
      applicationEndDate: identity.applicationEndDate ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: recruitments.id });

  if (created) return { id: created.id, created: true };

  // A slug collision is only a concurrency signal, never an entity identity.
  // Recover the winning insert by the same structured identity used above.
  // This prevents a URL slug from attaching an observation to an unrelated row.
  const finalName = truncateForColumn(identity.title, RECRUITMENT_NAME_MAX_LENGTH);
  const collisionIdentity = identity.officialNotificationNumber
    ? and(
        eq(recruitments.organizationId, identity.organizationId),
        eq(recruitments.officialNotificationNumber, identity.officialNotificationNumber),
      )
    : and(
        eq(recruitments.organizationId, identity.organizationId),
        eq(recruitments.year, finalYear),
        eq(recruitments.name, finalName),
        identity.examId === null ? isNull(recruitments.examId) : eq(recruitments.examId, identity.examId),
        isNull(recruitments.officialNotificationNumber),
      );
  const existingByIdentity = await db.query.recruitments.findFirst({ where: collisionIdentity });
  if (existingByIdentity) return { id: existingByIdentity.id, created: false };

  // A descriptive title can legitimately repeat across organizations or
  // separate notices. If the plain title slug belongs to another identity,
  // retry once with a stable identity suffix rather than rejecting the job.
  // This preserves readable URLs and never attaches the incoming job to the
  // unrelated row that owns the unsuffixed slug.
  const collisionSuffix = createHash("sha1")
    .update([
      identity.organizationId,
      finalYear,
      identity.examId ?? "",
      identity.officialNotificationNumber ?? "",
      identity.title.trim().toLowerCase(),
    ].join("|"))
    .digest("hex")
    .slice(0, 8);
  const fallbackSlug = `${finalSlug.slice(0, 125).replace(/-+$/g, "")}-${identity.organizationId}-${collisionSuffix}`;
  const [retried] = await db
    .insert(recruitments)
    .values({
      organizationId: identity.organizationId,
      examId: identity.examId,
      year: finalYear,
      name: truncateForColumn(identity.title, RECRUITMENT_NAME_MAX_LENGTH),
      slug: fallbackSlug,
      officialNotificationNumber: identity.officialNotificationNumber,
      applicationStartDate: identity.applicationStartDate ?? null,
      applicationEndDate: identity.applicationEndDate ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: recruitments.id });
  if (retried) return { id: retried.id, created: true };

  // Re-check identity after the retry in case a concurrent writer won.
  const afterRetry = await db.query.recruitments.findFirst({ where: collisionIdentity });
  if (afterRetry) return { id: afterRetry.id, created: false };

  // Do not guess if both the base and deterministic fallback slug are taken.
  throw new Error(`resolveRecruitment: slug conflicts without a matching identity row: ${finalSlug} / ${fallbackSlug}`);
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
  const positionId = await resolvePositionId(db, safeName, identity.positionCategory);

  const [created] = await db
    .insert(posts)
    .values({
      recruitmentId: identity.recruitmentId,
      positionId,
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

/**
 * DISC-001 (2026-10-14): positions are roles. Resolve a post to its role by
 * normalised name (the same `normalize_role_key()` the DB backfill used, so
 * ingest and backfill agree), falling back to the coarse category bucket
 * (`category-<x>`) only when no role row exists. Buckets are found by SLUG:
 * looking them up by category enum would now return an arbitrary role row of
 * that category (e.g. a specific teacher role for every TEACHING post).
 */
async function resolvePositionId(
  db: Db,
  postName: string,
  category: PostIdentity["positionCategory"],
): Promise<number> {
  const byRole = await db.execute<{ id: number }>(sql`
    SELECT id FROM public.positions
    WHERE slug NOT LIKE 'category-%'
      AND public.normalize_role_key(name) = public.normalize_role_key(${postName})
    ORDER BY id LIMIT 1
  `);
  const roleRow = (byRole as unknown as { id: number }[])[0];
  if (roleRow) return roleRow.id;
  return getOrCreatePositionId(db, category);
}

async function getOrCreatePositionId(db: Db, category: PostIdentity["positionCategory"]): Promise<number> {
  const bucketSlug = slugifyPositionCategory(category);
  const foundBySlug = await db.query.positions.findFirst({
    where: eq(positions.slug, bucketSlug),
  });
  if (foundBySlug) return foundBySlug.id;

  const canonicalName = titleCasePositionCategory(category);
  const [createdPosition] = await db
    .insert(positions)
    .values({ name: canonicalName, slug: bucketSlug, category })
    .returning();
  return createdPosition.id;
}

/**
 * Canonical post-leaf slug: role title only, scoped by recruitment in the URL.
 * Do not embed the recruitment slug, source hash, classifier version, or "-jobs"
 * suffix. The database's unique (recruitment_id, slug) index scopes uniqueness.
 */
export function postLineSlug(name: string, existing: Array<{ id: number; name: string; slug: string | null }> = []): string {
  const stem = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post";
  const collision = existing.some((post) =>
    post.slug === stem && post.name.toLowerCase() !== name.toLowerCase()
  );
  if (!collision) return stem;
  const suffix = createHash("sha1").update(name.toLowerCase().trim()).digest("hex").slice(0, 6);
  return `${stem.slice(0, 73)}-${suffix}`;
}

export async function resolvePostLines(
  db: Db,
  recruitmentId: number,
  lines: PostLineInput[],
  opts: { countOptional?: boolean } = {},
): Promise<PostLinesResult> {
  const result: PostLinesResult = { lines: [], created: 0, existing: 0, rejected: 0, unresolved: 0, singlePostId: null };
  let existing = (await db.query.posts.findMany({ where: eq(posts.recruitmentId, recruitmentId) })).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
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
    positionId ??= await resolvePositionId(db, name, "OTHER");
    const [row] = await db
      .insert(posts)
      .values({ recruitmentId, positionId, name, slug: postLineSlug(name, existing), vacancyTotal: count })
      .onConflictDoNothing()
      .returning({ id: posts.id });
    if (!row) {
      // Lost a race on the unique (recruitment, lower(name)) index: it exists now, never duplicate.
      result.existing++;
      result.lines.push({ name, verdict, action: "existing", postId: null, detail: "CONFLICT_EXISTING" });
      continue;
    }
    result.created++;
    existing = [...existing, { id: row.id, name, slug: postLineSlug(name, existing), vacancyTotal: count }];
    result.lines.push({ name, verdict, action: "created", postId: row.id });
  }
  if (lines.length === 1 && result.lines[0].postId != null) result.singlePostId = result.lines[0].postId;
  return result;
}
