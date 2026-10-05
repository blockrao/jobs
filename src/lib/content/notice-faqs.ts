/**
 * Deterministic, fact-only notice content: notice-specific FAQs and timeline rows
 * built from values already stored on a posting. Nothing here invents a fact;
 * every sentence is a template filled from a stored value, and a FAQ is emitted
 * only when its fact exists.
 *
 * The job page already renders four template FAQs (vacancies, eligibility, last
 * date, application fee). These FAQs are deliberately different questions, so the
 * page never shows the same fact twice: important dates (a combined question),
 * posts covered, age limit, pay scale, how to apply, selection process.
 */
import { mentionsAggregator } from "@/lib/aggregators";

export type NoticeFacts = {
  id: number;
  title: string;
  org: string | null;
  vac: number | null;
  pay_min: number | null;
  pay_max: number | null;
  age_min: number | null;
  age_max: number | null;
  date_posted: string | null;
  valid_through: string | null;
  exam_date: string | null;
  has_apply: boolean;
  post_names: string[];
  extra_tables: string[];
  existing_faqs: number;
  n_updates: number;
};

export type NoticeFaq = { q: string; a: string };

export const MIN_NOTICE_FAQS = 3;
const MAX_LISTED_POSTS = 12;

/** Indian digit grouping: 1234567 -> "₹12,34,567". */
export function formatRupees(n: number): string {
  const s = String(Math.round(Math.abs(n)));
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
  return `${n < 0 ? "-" : ""}₹${grouped}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "28 Sep 2026" in Indian Standard Time (UTC+5:30), independent of server timezone. */
export function formatIstDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const d = new Date(t + 5.5 * 3600_000);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** What the notice is called inside a question: the cleaned title, else the organization. */
export function noticeSubject(f: Pick<NoticeFacts, "title" | "org">): string {
  const fromTitle = (f.title ?? "")
    .split("|")[0]
    .replace(/\s*[-–:]?\s*(Apply|Walk-?in|Notification Out)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const ok = fromTitle.length >= 8 && fromTitle.length <= 120 && !mentionsAggregator(fromTitle);
  if (ok) return fromTitle;
  const org = (f.org ?? "").trim();
  return org && !mentionsAggregator(org) ? `${org} recruitment` : "this recruitment";
}

function distinctPosts(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names ?? []) {
    const n = (raw ?? "").replace(/\s+/g, " ").trim();
    if (!n || mentionsAggregator(n) || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    out.push(n);
  }
  return out;
}

export function buildNoticeFaqs(f: NoticeFacts): NoticeFaq[] {
  if (f.existing_faqs > 0) return [];
  const subject = noticeSubject(f);
  const faqs: NoticeFaq[] = [];

  // Important dates: a combined question; needs at least two known dates.
  const posted = formatIstDate(f.date_posted);
  const last = formatIstDate(f.valid_through);
  const exam = formatIstDate(f.exam_date);
  const parts: string[] = [];
  if (posted) parts.push(`the notification was published on ${posted}`);
  if (last) parts.push(`the last date to apply is ${last}`);
  if (exam) parts.push(`the exam date is ${exam}`);
  if (parts.length >= 2) {
    const sentence =
      parts.length === 2 ? parts.join(" and ") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
    faqs.push({
      q: `What are the important dates for ${subject}?`,
      a: `For this notice, ${sentence}.`,
    });
  }

  // Posts covered.
  const posts = distinctPosts(f.post_names);
  if (posts.length >= 2) {
    const shown = posts.slice(0, MAX_LISTED_POSTS);
    const more = posts.length - shown.length;
    faqs.push({
      q: `Which posts are included in ${subject}?`,
      a: `This notice covers ${posts.length} posts: ${shown.join(", ")}${more > 0 ? ` and ${more} more` : ""}.`,
    });
  }

  // Age limit. Implausible values are skipped rather than published.
  const amin = f.age_min != null && f.age_min >= 14 && f.age_min <= 60 ? f.age_min : null;
  const amax = f.age_max != null && f.age_max >= 14 && f.age_max <= 70 ? f.age_max : null;
  const rangeOk = amin == null || amax == null || amin <= amax;
  if (rangeOk && (amin != null || amax != null)) {
    let a: string;
    if (amin != null && amax != null) a = `The age limit is ${amin} to ${amax} years.`;
    else if (amax != null) a = `The maximum age limit is ${amax} years.`;
    else a = `The minimum age is ${amin} years.`;
    if ((f.extra_tables ?? []).some((t) => /age limit/i.test(t))) {
      a += " Age relaxation as per the rules is given in the notification; see the age limit table on this page.";
    }
    faqs.push({ q: `What is the age limit for ${subject}?`, a });
  }

  // Pay scale. Values outside a plausible monthly range are skipped (period is not stored).
  const pmin = f.pay_min != null && f.pay_min >= 5000 && f.pay_min <= 500000 ? f.pay_min : null;
  const pmax = f.pay_max != null && f.pay_max >= 5000 && f.pay_max <= 500000 ? f.pay_max : null;
  if ((pmin != null || pmax != null) && (pmin == null || pmax == null || pmin <= pmax)) {
    const a =
      pmin != null && pmax != null && pmin !== pmax
        ? `The pay scale is ${formatRupees(pmin)} to ${formatRupees(pmax)}.`
        : `The pay is ${formatRupees((pmin ?? pmax) as number)}.`;
    faqs.push({ q: `What is the salary or pay scale for ${subject}?`, a });
  }

  // How to apply: only when an application link is stored; never a URL.
  if (f.has_apply) {
    faqs.push({
      q: `How can I apply for ${subject}?`,
      a: "While applications are open, use the Apply Now button on this page to go to the application.",
    });
  }

  // Selection stages: only when the notice has a selection / exam-pattern table.
  const selTable = (f.extra_tables ?? []).find((t) => /exam pattern|selection/i.test(t));
  if (selTable) {
    faqs.push({
      q: `What is the selection process for ${subject}?`,
      a: `The selection process is given in the "${selTable.replace(/\s+/g, " ").trim()}" table on this page.`,
    });
  }

  return faqs.length >= MIN_NOTICE_FAQS ? faqs : [];
}

export type NoticeTimelineRow = {
  stage: "NOTIFICATION_OUT" | "APPLICATION_OPEN" | "EXAM_SCHEDULED";
  title: string;
  eventDate: string; // ISO timestamp
};

/** One row per known date; only for postings that have no updates yet. */
export function buildNoticeTimeline(f: NoticeFacts): NoticeTimelineRow[] {
  if (f.n_updates !== 0) return [];
  const rows: NoticeTimelineRow[] = [];
  const add = (stage: NoticeTimelineRow["stage"], title: string, iso: string | null) => {
    if (!iso || !Number.isFinite(new Date(iso).getTime())) return;
    rows.push({ stage, title, eventDate: new Date(iso).toISOString() });
  };
  add("NOTIFICATION_OUT", "Notification released", f.date_posted);
  add("APPLICATION_OPEN", "Last date to apply", f.valid_through);
  add("EXAM_SCHEDULED", "Exam scheduled", f.exam_date);
  return rows;
}
