/**
 * Recruitment hub <title> and H1 composition.
 *
 * Pattern: `{orgShort} Recruitment {year}: {N} {post names} — Apply by {date}`
 *
 * - orgShort is the organisation name when known; otherwise the recruitment
 *   name with any trailing "Recruitment YYYY" stripped, so the composed title
 *   never reads "X Recruitment 2026 Recruitment 2026".
 * - N (total vacancies) and the post names are omitted when unknown.
 * - The title is capped at MAX_META_TITLE by dropping the post names first,
 *   then the "Apply by" suffix. The H1 is the same string without the suffix.
 */
import { MAX_META_TITLE } from "./meta-title";

export interface RecruitmentTitleFacts {
  /** organizations.name — null when unknown. */
  organizationName: string | null | undefined;
  /** recruitments.name — always present; used only when the org is unknown. */
  recruitmentName: string;
  /** Recruitment year (recruitments.year or derived from a date). */
  year: number | null | undefined;
  /** Total vacancies when known. */
  totalVacancies: number | null | undefined;
  /** Post names in display order; up to three are used. */
  postNames: ReadonlyArray<string | null | undefined>;
  /** Already-formatted last date (e.g. "22 Oct 2026") or null. */
  lastDate: string | null | undefined;
}

export interface RecruitmentTitle {
  /** Full <title> text (no site suffix). */
  title: string;
  /** H1 text: the title without the "— Apply by" suffix. */
  heading: string;
}

const TRAILING_RECRUITMENT_RE = /\s*[-–—:,]?\s*\b(recruitment|notification|vacanc(?:y|ies))\b(\s*[-–—:,]?\s*(19|20)\d{2})?\s*$/i;
const TRAILING_YEAR_RE = /\s*[-–—:,]?\s*\b(19|20)\d{2}\s*$/;

/** Strip a trailing "Recruitment 2026" / "Recruitment" / "2026" from a recruitment name. */
export function stripRecruitmentSuffix(name: string): string {
  let out = name.replace(/\s+/g, " ").trim();
  for (let i = 0; i < 3; i++) {
    const next = out.replace(TRAILING_RECRUITMENT_RE, "").replace(TRAILING_YEAR_RE, "").trim();
    if (next === out || next.length === 0) break;
    out = next;
  }
  return out.length > 0 ? out : name.trim();
}

function postNamesPart(names: ReadonlyArray<string | null | undefined>): string | null {
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const n of names) {
    const t = (n ?? "").replace(/\s+/g, " ").trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push(t);
    if (clean.length === 3) break;
  }
  return clean.length > 0 ? clean.join(", ") : null;
}

export function composeRecruitmentTitle(f: RecruitmentTitleFacts): RecruitmentTitle {
  const orgShort = (f.organizationName ?? "").replace(/\s+/g, " ").trim()
    || stripRecruitmentSuffix(f.recruitmentName);
  const year = f.year && f.year > 1900 ? ` ${f.year}` : "";
  const base = `${orgShort} Recruitment${year}`;

  const n = f.totalVacancies != null && f.totalVacancies > 0
    ? f.totalVacancies.toLocaleString("en-IN")
    : null;
  const names = postNamesPart(f.postNames);
  const applyBy = f.lastDate ? ` — Apply by ${f.lastDate}` : "";

  const detail = (withNames: boolean): string => {
    const parts = [n, withNames ? names : null].filter((p): p is string => Boolean(p));
    return parts.length > 0 ? `: ${parts.join(" ")}` : "";
  };
  const fit = (title: string, heading: string) => ({ title: title.trim(), heading: heading.trim() });

  // Try: full → without post names → without "Apply by" → both dropped.
  const candidates = [
    fit(`${base}${detail(true)}${applyBy}`, `${base}${detail(true)}`),
    fit(`${base}${detail(false)}${applyBy}`, `${base}${detail(false)}`),
    fit(`${base}${detail(true)}`, `${base}${detail(true)}`),
    fit(`${base}${detail(false)}`, `${base}${detail(false)}`),
  ];
  for (const c of candidates) {
    if (c.title.length <= MAX_META_TITLE) return c;
  }
  return candidates[candidates.length - 1];
}

/** Format a date as "22 Oct 2026" in IST; null when missing or implausible. */
export function formatTitleDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (!Number.isFinite(d.getTime())) return null;
  const y = d.getUTCFullYear();
  if (y < 1900 || y >= 2090) return null;
  return d.toLocaleDateString("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export interface RecruitmentDescriptionFacts {
  orgName: string;
  totalVacancies: number | null | undefined;
  postNames: ReadonlyArray<string | null | undefined>;
  lastDate: string | null | undefined;
  /** Already-formatted fee text (e.g. "₹500 (General)") or null. */
  fee: string | null | undefined;
}

/** Factual meta description (≤ maxLen) from known facts only. */
export function composeRecruitmentDescription(f: RecruitmentDescriptionFacts, maxLen = 160): string {
  const parts: string[] = [];
  const n = f.totalVacancies != null && f.totalVacancies > 0 ? f.totalVacancies : null;
  const names = postNamesPart(f.postNames);
  if (n != null && names) {
    parts.push(`${f.orgName} is recruiting ${n.toLocaleString("en-IN")} ${names}.`);
  } else if (n != null) {
    parts.push(`${f.orgName} is recruiting for ${n.toLocaleString("en-IN")} ${n === 1 ? "vacancy" : "vacancies"}.`);
  } else if (names) {
    parts.push(`${f.orgName} is recruiting ${names}.`);
  } else {
    parts.push(`${f.orgName} recruitment.`);
  }
  if (f.lastDate) parts.push(`Last date ${f.lastDate}.`);
  if (f.fee) parts.push(`Fee ${f.fee}.`);

  let out = "";
  for (const p of parts) {
    const next = out ? `${out} ${p}` : p;
    if (next.length > maxLen) break;
    out = next;
  }
  if (!out) {
    const t = parts[0].replace(/\s+/g, " ");
    out = t.length <= maxLen ? t : `${t.slice(0, maxLen - 1).replace(/[\s,;:–—-]+$/, "")}…`;
  }
  return out;
}
