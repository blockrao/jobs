export const STAGE_LABELS: Record<string, string> = {
  NOTIFICATION_OUT: "Notification Out",
  APPLICATION_OPEN: "Application Open",
  APPLICATION_CLOSED: "Application Closed",
  ADMIT_CARD_RELEASED: "Admit Card Released",
  EXAM_SCHEDULED: "Exam Scheduled",
  EXAM_CONDUCTED: "Exam Conducted",
  ANSWER_KEY_OUT: "Answer Key Out",
  OBJECTION_WINDOW: "Objection Window Open",
  RESULT_OUT: "Result Out",
  MERIT_LIST_OUT: "Merit List Out",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  FINAL_RESULT_OUT: "Final Result Out",
  ACTIVE: "Actively Hiring",
  FILLED: "Position Filled",
  CLOSED: "Closed",
};

// Hindi labels for the same stage keys, for pages that render a posting's
// stage outside the [locale] detail-page templates (which define their own
// inline Hindi strings) — e.g. the /jobs listing page.
export const STAGE_LABELS_HI: Record<string, string> = {
  NOTIFICATION_OUT: "अधिसूचना जारी",
  APPLICATION_OPEN: "आवेदन शुरू",
  APPLICATION_CLOSED: "आवेदन बंद",
  ADMIT_CARD_RELEASED: "प्रवेश पत्र जारी",
  EXAM_SCHEDULED: "परीक्षा निर्धारित",
  EXAM_CONDUCTED: "परीक्षा संपन्न",
  ANSWER_KEY_OUT: "उत्तर कुंजी जारी",
  OBJECTION_WINDOW: "आपत्ति विंडो खुली",
  RESULT_OUT: "परिणाम घोषित",
  MERIT_LIST_OUT: "मेरिट सूची जारी",
  INTERVIEW_SCHEDULED: "साक्षात्कार निर्धारित",
  FINAL_RESULT_OUT: "अंतिम परिणाम घोषित",
  ACTIVE: "भर्ती जारी",
  FILLED: "पद भरा गया",
  CLOSED: "बंद",
};

export const KIND_LABELS: Record<string, string> = {
  GOVERNMENT: "Government",
  PRIVATE: "Private",
};

export const KIND_LABELS_HI: Record<string, string> = {
  GOVERNMENT: "सरकारी",
  PRIVATE: "निजी",
};

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACTOR: "Contract",
  INTERN: "Internship",
  TEMPORARY: "Temporary",
  OTHER: "Other",
};

export const WORKPLACE_TYPE_LABELS: Record<string, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
};

export const ARTICLE_TYPE_LABELS: Record<string, string> = {
  GUIDE: "Guide",
  SYLLABUS: "Syllabus",
  EXAM_PATTERN: "Exam Pattern",
  PREVIOUS_PAPERS: "Previous Papers",
  ADMIT_CARD_GUIDE: "Admit Card Guide",
  RESULT_GUIDE: "Result Guide",
  CUTOFF: "Cutoff",
  SALARY_REPORT: "Salary Report",
  INTERVIEW_PREP: "Interview Prep",
  COMPARISON: "Comparison",
  NEWS: "News",
  COMPANY_REVIEW: "Company Review",
};

// localeTag defaults to "en-IN" so every existing call site (none of which
// pass a second argument) is unaffected; pages that know the visitor is in
// Hindi mode can pass "hi-IN" to get Devanagari month names/digits.
export function formatDate(
  date: Date | string | null | undefined,
  localeTag: "en-IN" | "hi-IN" = "en-IN",
) {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  // Dates are Indian dates: render in IST, not the server's timezone (the
  // server runs in UTC, which showed an IST-midnight date as the day before).
  return d.toLocaleDateString(localeTag, {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrencyRange(
  min: number | null | undefined,
  max: number | null | undefined,
  currency = "INR",
  period = "MONTH",
) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  const periodLabel =
    { HOUR: "/hr", DAY: "/day", WEEK: "/wk", MONTH: "/mo", YEAR: "/yr" }[
      period
    ] ?? "";
  if (min && max && min !== max) return `${fmt(min)} – ${fmt(max)}${periodLabel}`;
  return `${fmt(min ?? max ?? 0)}${periodLabel}`;
}

/** "Up to 38 yrs", "18–38 yrs", or null. Never prints a placeholder dash. */
export function formatAgeRange(
  min: number | null | undefined,
  max: number | null | undefined,
  isHi = false,
): string | null {
  const yrs = isHi ? "वर्ष" : "yrs";
  if (min != null && max != null) return `${min}–${max} ${yrs}`;
  if (max != null) return isHi ? `अधिकतम ${max} ${yrs}` : `Up to ${max} ${yrs}`;
  if (min != null) return isHi ? `न्यूनतम ${min} ${yrs}` : `From ${min} ${yrs}`;
  return null;
}

/** "₹25 (General) · ₹0 (Reserved)" using only the fees that are stored. */
export function formatFee(
  general: number | null | undefined,
  reserved: number | null | undefined,
  isHi = false,
): string | null {
  const parts: string[] = [];
  if (general != null) parts.push(`₹${general} (${isHi ? "सामान्य" : "General"})`);
  if (reserved != null) parts.push(`₹${reserved} (${isHi ? "आरक्षित" : "Reserved"})`);
  return parts.length ? parts.join(" · ") : null;
}

/** "1 vacancy", "3 vacancies". */
export function vacanciesPhrase(n: number): string {
  return `${n} ${n === 1 ? "vacancy" : "vacancies"}`;
}
