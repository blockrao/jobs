/**
 * Page Completeness Standard (PQ-002)
 *
 * Reports how complete a posting's page is, as a score BESIDE the index tier.
 * It does not decide indexing (that stays in gate.ts); it makes gaps visible.
 * Pure and deterministic: a check passes only when the stored value exists.
 * Nothing is inferred or guessed.
 */

import type { ExtraContent } from "@/db/schema";

export interface CompletenessInput {
  officialNotificationUrl: string | null;
  applyUrl: string | null;
  totalVacancies: number | null;
  salaryMin: number | null;
  ageLimitMin: number | null;
  ageLimitMax: number | null;
  applicationFeeGeneral: number | null;
  eligibility: string | null;
  requirements: string | null;
  description: string | null;
  datePosted: Date | null;
  validThrough: Date | null;
  lastVerifiedAt: Date | null;
  titleHi: string | null;
  descriptionHi: string | null;
  eligibilityHi: string | null;
  extraContent: ExtraContent | null;
}

export const COMPLETENESS_CHECKS = [
  "official_link",
  "apply_link",
  "vacancies",
  "pay",
  "age",
  "fee",
  "qualification",
  "selection_process",
  "dates",
  "verified_date",
  "notice_faqs",
  "hindi",
] as const;

export type CompletenessCheck = (typeof COMPLETENESS_CHECKS)[number];

export type CompletenessBand = "complete" | "partial" | "thin";

export interface CompletenessResult {
  passed: CompletenessCheck[];
  missing: CompletenessCheck[];
  score: number;
  total: number;
  band: CompletenessBand;
}

/** Notice-specific FAQs needed beyond the four generic template questions. */
export const MIN_NOTICE_FAQS = 3;

const SELECTION_PATTERN = /\b(selection (process|procedure)|written exam|exam pattern|interview|merit list)\b|चयन प्रक्रिया/i;

const filled = (s: string | null | undefined, min = 1) => (s ?? "").trim().length >= min;

export function evaluateCompleteness(p: CompletenessInput): CompletenessResult {
  const x = p.extraContent;
  const checks: Record<CompletenessCheck, boolean> = {
    official_link: filled(p.officialNotificationUrl),
    apply_link: filled(p.applyUrl),
    vacancies: p.totalVacancies != null && p.totalVacancies > 0,
    pay: p.salaryMin != null && p.salaryMin > 0,
    age: p.ageLimitMin != null || p.ageLimitMax != null,
    fee: p.applicationFeeGeneral != null,
    qualification: filled(p.eligibility, 30) || filled(p.requirements, 30),
    selection_process:
      SELECTION_PATTERN.test(p.description ?? "") ||
      (x?.notices ?? []).some((n) => SELECTION_PATTERN.test(`${n.title} ${n.body}`)) ||
      (x?.tables ?? []).some((t) => SELECTION_PATTERN.test(t.title)),
    dates: p.datePosted != null && p.validThrough != null,
    verified_date: p.lastVerifiedAt != null,
    notice_faqs: (x?.faqs ?? []).length >= MIN_NOTICE_FAQS,
    hindi: filled(p.titleHi) && filled(p.descriptionHi) && filled(p.eligibilityHi),
  };
  const passed = COMPLETENESS_CHECKS.filter((c) => checks[c]);
  const missing = COMPLETENESS_CHECKS.filter((c) => !checks[c]);
  const total = COMPLETENESS_CHECKS.length;
  const score = passed.length;
  const band: CompletenessBand = score >= 11 ? "complete" : score >= 7 ? "partial" : "thin";
  return { passed, missing, score, total, band };
}
