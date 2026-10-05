/**
 * Promotion: the only step that can make an ingested posting publicly visible
 * (WP-001: ingestion is not publication). Conservative pilot rule; the
 * aggregator is never authoritative, official/issuer-domain evidence is
 * required, and source/verification state stays on the row.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import type { getDb } from "../db";
import { postings, sourceObservations } from "../db/schema";
import { findAggregatorViolations } from "../lib/approval-guard";

type Db = ReturnType<typeof getDb>;

const OFFICIAL_HOST = /(\.gov\.in|\.nic\.in|\.gov|\.ac\.in|\.edu\.in|\.res\.in|\.mil\.in|\.bank\.in)$|(^|\.)(ibps\.in|sbi\.co\.in)$/;
const NOT_ISSUER = /(docs\.google|drive\.google|forms\.gle|bit\.ly|tinyurl|t\.me|freejobalert|sarkari|whatsapp)/;

/** Official-style issuer domain. Drive links, shorteners and aggregator hosts never count. */
export function isOfficialStyleUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return !NOT_ISSUER.test(host) && OFFICIAL_HOST.test(host);
}

export interface PromotionCandidate {
  reviewStatus: string;
  publishingStatus: string | null;
  totalVacancies: number | null;
  validThrough: Date | null;
  officialNotificationUrl: string | null;
  currentStage: string;
  postCountMismatch: boolean;
}

export interface PromotionVerdict {
  eligible: boolean;
  failed: string[];
}

export function evaluatePromotion(p: PromotionCandidate, now: Date = new Date()): PromotionVerdict {
  const failed: string[] = [];
  if (p.reviewStatus !== "PENDING") failed.push("NOT_PENDING"); // never resurrect or re-decide a reviewed row
  if (p.publishingStatus !== "DRAFT") failed.push("NOT_DRAFT");
  if (!p.totalVacancies || p.totalVacancies <= 0) failed.push("NO_VACANCIES");
  if (!p.validThrough) failed.push("NO_LAST_DATE");
  else {
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    if (p.validThrough.getTime() < today) failed.push("LAST_DATE_PASSED");
  }
  if (!p.officialNotificationUrl) failed.push("NO_OFFICIAL_LINK");
  else if (!isOfficialStyleUrl(p.officialNotificationUrl)) failed.push("LINK_NOT_ISSUER_DOMAIN");
  if (!["NOTIFICATION_OUT", "APPLICATION_OPEN"].includes(p.currentStage)) failed.push("STAGE_NOT_OPEN");
  if (p.postCountMismatch) failed.push("POST_COUNT_MISMATCH");
  return { eligible: failed.length === 0, failed };
}

/** Post-table sum vs the stated total, from the latest raw observation. */
export function postCountMismatchFromFacts(facts: unknown, totalVacancies: number | null): boolean {
  const stated = (facts as { stated?: { postTable?: Array<{ vacancies?: number }>; postTableStatedTotal?: number | null } } | null)?.stated;
  const table = stated?.postTable ?? [];
  if (table.length < 2) return false;
  const sum = table.reduce((a, r) => a + (r.vacancies ?? 0), 0);
  const target = stated?.postTableStatedTotal ?? totalVacancies;
  return target != null && sum !== target;
}

export interface PromotionReport {
  considered: number;
  eligible: number;
  promoted: number;
  failedReasons: Record<string, number>;
  eligibleIds: number[];
}

/**
 * Evaluate every PENDING/DRAFT posting. With apply=false (the default) nothing
 * is written. With apply=true eligible rows become APPROVED +
 * AUTOMATED_VALIDATION_PASS, which is what the lifecycle job and search expect.
 */
export async function promotePending(db: Db, opts: { apply?: boolean; now?: Date } = {}): Promise<PromotionReport> {
  const now = opts.now ?? new Date();
  const rows = await db
    .select()
    .from(postings)
    .where(and(eq(postings.reviewStatus, "PENDING"), eq(postings.publishingStatus, "DRAFT")));
  const report: PromotionReport = { considered: rows.length, eligible: 0, promoted: 0, failedReasons: {}, eligibleIds: [] };
  for (const row of rows) {
    const latest = await db.query.sourceObservations.findFirst({
      where: and(eq(sourceObservations.source, row.source), eq(sourceObservations.externalId, row.externalId ?? "")),
      orderBy: [desc(sourceObservations.id)],
    });
    const verdict = evaluatePromotion(
      {
        reviewStatus: row.reviewStatus,
        publishingStatus: row.publishingStatus,
        totalVacancies: row.totalVacancies,
        validThrough: row.validThrough,
        officialNotificationUrl: row.officialNotificationUrl,
        currentStage: row.currentStage,
        postCountMismatch: postCountMismatchFromFacts(latest?.facts, row.totalVacancies),
      },
      now,
    );
    if (verdict.eligible && findAggregatorViolations(row).length > 0) {
      verdict.eligible = false;
      verdict.failed.push("AGGREGATOR_REFERENCE");
    }
    if (verdict.eligible) {
      report.eligible++;
      report.eligibleIds.push(row.id);
      if (opts.apply) {
        await db
          .update(postings)
          .set({ reviewStatus: "APPROVED", publishingStatus: "AUTOMATED_VALIDATION_PASS", updatedAt: now })
          .where(eq(postings.id, row.id));
        report.promoted++;
      }
    } else {
      for (const f of verdict.failed) report.failedReasons[f] = (report.failedReasons[f] ?? 0) + 1;
    }
  }
  // SEARCH-001: newly published rows are searchable only once search_text is
  // filled by refresh_posting_urgency_states(). Best effort: scratch databases
  // without the function, or a transient error, must not undo the promotion.
  if (opts.apply && report.promoted > 0) {
    try {
      await db.execute(sql.raw("SELECT * FROM refresh_posting_urgency_states()"));
    } catch (error) {
      console.error("Search text refresh after promotion failed:", error);
    }
  }
  return report;
}
