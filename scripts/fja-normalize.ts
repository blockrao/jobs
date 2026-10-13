/**
 * Conservative normalizers for FreeJobAlert discovery candidates.
 * These functions never establish official verification or canonical facts.
 */
export type SalaryPeriod = "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR";
export type SalaryType = "FIXED" | "RANGE" | "PAY_SCALE" | "STIPEND" | "CONSOLIDATED" | "CTC" | "OTHER";
export type NormalizationStatus = "NOT_PRESENT" | "NORMALIZED" | "NEEDS_REVIEW";

export type SalaryCandidate = {
  min: number | null;
  max: number | null;
  currency: "INR" | null;
  period: SalaryPeriod | null;
  type: SalaryType | null;
  status: NormalizationStatus;
  reason: string | null;
};

const collapse = (value: string) => value.replace(/\s+/g, " ").trim();
const AMOUNT = String.raw`(?:₹|INR\s*|Rs\.?\s*)(\d[\d,]*(?:\.\d{1,2})?)`;
function amountValue(raw: string): number | null {
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}
function explicitAmounts(text: string): number[] {
  const values: number[] = [];
  const re = new RegExp(AMOUNT, "gi");
  for (const match of text.matchAll(re)) {
    const n = amountValue(match[1]);
    if (n !== null) values.push(n);
    const tail = text.slice((match.index ?? 0) + match[0].length);
    const rangeContinuation = tail.match(/^\s*(?:to|[-–—])\s*(?:(?:₹|INR\s*|Rs\.?\s*))?(\d[\d,]*(?:\.\d{1,2})?)/i);
    if (rangeContinuation) {
      const upper = amountValue(rangeContinuation[1]);
      if (upper !== null) values.push(upper);
    }
  }
  return [...new Set(values)];
}
function salaryPeriod(text: string): SalaryPeriod | null {
  if (/\b(?:per\s+hour|hourly)\b/i.test(text)) return "HOUR";
  if (/\b(?:per\s+day|daily)\b/i.test(text)) return "DAY";
  if (/\b(?:per\s+week|weekly)\b/i.test(text)) return "WEEK";
  if (/\b(?:per\s+month|monthly|a\s+month)\b/i.test(text)) return "MONTH";
  if (/\b(?:per\s+annum|per\s+year|yearly|annually)\b/i.test(text)) return "YEAR";
  return null;
}

export function normalizeSalary(rawValue: string | null | undefined): SalaryCandidate {
  const raw = collapse(rawValue ?? "");
  if (!raw || /^(?:n\/?a|not (?:mentioned|specified|disclosed)|[-–—]+)$/i.test(raw)) {
    return { min: null, max: null, currency: null, period: null, type: null, status: "NOT_PRESENT", reason: null };
  }
  if (/\b(?:lakh|lac|crore|million|thousand|lpa)\b|\d\s*k\b/i.test(raw)) {
    const currency = /₹|\bINR\b|\bRs\.?\s*\d/i.test(raw) ? "INR" : null;
    return { min: null, max: null, currency, period: salaryPeriod(raw), type: "OTHER", status: "NEEDS_REVIEW", reason: "Salary uses an abbreviated scale (for example lakh/LPA); convert only after explicit review." };
  }
  const values = explicitAmounts(raw);
  const currency = /₹|\bINR\b|\bRs\.?\s*\d/i.test(raw) ? "INR" : null;
  let type: SalaryType | null = null;
  if (/\b(?:pay scale|scale of pay|pay matrix|grade pay|pay level|level[- ]?\d|band pay)\b/i.test(raw)) type = "PAY_SCALE";
  else if (/\bCTC\b|cost to company/i.test(raw)) type = "CTC";
  else if (/\bstipend\b/i.test(raw)) type = "STIPEND";
  else if (/consolidated|fixed remuneration/i.test(raw)) type = "CONSOLIDATED";
  else if (values.length > 1 || /\bto\b|[-–—]/.test(raw)) type = "RANGE";
  else if (values.length === 1) type = "FIXED";
  else if (/salary|remuneration|emoluments|pay/i.test(raw)) type = "OTHER";

  if (values.length === 0) {
    return { min: null, max: null, currency, period: salaryPeriod(raw), type, status: "NEEDS_REVIEW", reason: "No explicit currency-marked numeric amount found; retain the source wording for review." };
  }
  const min = values.length > 1 ? Math.min(...values) : values[0];
  const max = values.length > 1 ? Math.max(...values) : values[0];
  const period = salaryPeriod(raw);
  const ambiguousScale = /\b(?:level[- ]?\d|grade pay|pay matrix|pay scale|scale of pay|pay band)\b/i.test(raw) && type !== "PAY_SCALE";
  const status: NormalizationStatus = currency && type && (period || type === "PAY_SCALE") && !ambiguousScale
    ? "NORMALIZED"
    : "NEEDS_REVIEW";
  return {
    min, max, currency, period, type, status,
    reason: status === "NORMALIZED" ? null : "Amount extracted conservatively; currency, period or salary structure needs review.",
  };
}

export type AgeCandidate = {
  min: number | null;
  max: number | null;
  referenceDate: string | null;
  status: NormalizationStatus;
  reason: string | null;
};
function parseExplicitDate(text: string): string | null {
  const m = text.match(/\b(?:as on|as of|age as on|age limit as on)\s+(\d{1,2})[.\-/ ]([A-Za-z]{3,9}|\d{1,2})[.\-/ ,]+(20\d{2})\b/i);
  if (!m) return null;
  const months: Record<string,string> = {jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"};
  const month = /^\d+$/.test(m[2]) ? m[2].padStart(2,"0") : months[m[2].slice(0,3).toLowerCase()];
  const day = Number(m[1]), year = Number(m[3]), monthNum = Number(month);
  if (!month || monthNum < 1 || monthNum > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, monthNum - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== monthNum - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0,10);
}
export function normalizeAge(rawValue: string | null | undefined, referenceRaw?: string | null): AgeCandidate {
  const raw = collapse(rawValue ?? "");
  const refRaw = collapse(referenceRaw ?? "");
  const combined = [raw, refRaw].filter(Boolean).join(" ");
  if ((!raw || /^(?:n\/?a|not (?:mentioned|specified|disclosed)|[-–—]+)$/i.test(raw)) && !refRaw) {
    return { min: null, max: null, referenceDate: null, status: "NOT_PRESENT", reason: null };
  }
  const years = /\b(?:years?|yrs?)\b/i.test(raw);
  const nums = [...raw.matchAll(/\b(\d{1,3})\b/g)].map(m => Number(m[1])).filter(n => n >= 14 && n <= 100);
  let min: number | null = null, max: number | null = null;
  const range = raw.match(/\b(\d{1,3})\s*(?:to|[-–—])\s*(\d{1,3})\s*(?:years?|yrs?)?\b/i);
  if (range && years) {
    const a = Number(range[1]), b = Number(range[2]);
    if (a >= 14 && b <= 100 && a <= b) { min = a; max = b; }
  } else if (years) {
    const minMatch = raw.match(/\b(?:minimum age|min\.? age|not less than|at least)\D{0,30}(\d{1,3})\s*(?:years?|yrs?)\b/i);
    const maxMatch = raw.match(/\b(?:maximum age|max\.? age|upper age limit|not more than|up to)\D{0,30}(\d{1,3})\s*(?:years?|yrs?)\b/i);
    if (minMatch && Number(minMatch[1]) >= 14 && Number(minMatch[1]) <= 100) min = Number(minMatch[1]);
    if (maxMatch && Number(maxMatch[1]) >= 14 && Number(maxMatch[1]) <= 100) max = Number(maxMatch[1]);
    if (min === null && max === null && nums.length === 1 && /\bage limit\b/i.test(raw)) max = nums[0];
  }
  const referenceDate = parseExplicitDate(combined);
  const status: NormalizationStatus = min !== null || max !== null ? "NORMALIZED" : "NEEDS_REVIEW";
  return {
    min, max, referenceDate, status,
    reason: status === "NORMALIZED" ? null : "Age wording is not an unambiguous numeric bound; manual review required.",
  };
}
