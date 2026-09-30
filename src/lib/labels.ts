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

export const KIND_LABELS: Record<string, string> = {
  GOVERNMENT: "Government",
  PRIVATE: "Private",
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

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
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
