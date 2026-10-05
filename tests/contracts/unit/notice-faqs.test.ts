/** Notice FAQs and timeline: deterministic, fact-only content from stored values. */
import { describe, expect, test } from "vitest";
import {
  buildNoticeFaqs,
  buildNoticeTimeline,
  formatIstDate,
  formatRupees,
  noticeSubject,
  type NoticeFacts,
} from "@/lib/content/notice-faqs";

const base: NoticeFacts = {
  id: 1,
  title: "ABC Board Clerk Recruitment 2026 - Apply Online for 10 Posts",
  org: "ABC Board",
  vac: 10,
  pay_min: 25500,
  pay_max: 81100,
  age_min: 18,
  age_max: 27,
  date_posted: "2026-09-20T05:00:00+00:00",
  valid_through: "2026-10-10T18:29:59+00:00",
  exam_date: null,
  has_apply: true,
  post_names: ["Clerk", "Typist"],
  extra_tables: [],
  existing_faqs: 0,
  n_updates: 0,
};
const f = (o: Partial<NoticeFacts> = {}): NoticeFacts => ({ ...base, ...o });
const qs = (x: NoticeFacts) => buildNoticeFaqs(x).map((p) => p.q);

describe("NF notice FAQs", () => {
  test("NF-01 full facts give every applicable question", () => {
    const q = qs(f({ extra_tables: ["Selection process", "Age limit"] }));
    expect(q).toHaveLength(6);
    expect(q[0]).toMatch(/important dates/);
  });
  test("NF-02 fewer than 3 FAQs returns []", () => {
    expect(
      buildNoticeFaqs(f({ pay_min: null, pay_max: null, age_min: null, age_max: null, has_apply: false, post_names: [] })),
    ).toEqual([]);
  });
  test("NF-03 never duplicates the page template questions", () => {
    const all = qs(f({ extra_tables: ["Selection process"] })).join(" ");
    expect(all).not.toMatch(/vacanc|eligibility|last date to apply for|application fee/i);
  });
  test("NF-04 missing age yields no age FAQ", () => {
    expect(qs(f({ age_min: null, age_max: null })).some((q) => /age limit/.test(q))).toBe(false);
  });
  test("NF-05 age range, max-only and min-only wording", () => {
    const a = (o: Partial<NoticeFacts>) => buildNoticeFaqs(f(o)).find((p) => /age limit/.test(p.q))!.a;
    expect(a({})).toBe("The age limit is 18 to 27 years.");
    expect(a({ age_min: null })).toBe("The maximum age limit is 27 years.");
    expect(a({ age_max: null })).toBe("The minimum age is 18 years.");
  });
  test("NF-06 relaxation sentence only when an age table exists", () => {
    const a = (t: string[]) => buildNoticeFaqs(f({ extra_tables: t })).find((p) => /age limit/.test(p.q))!.a;
    expect(a([])).not.toMatch(/relaxation/);
    expect(a(["Age limit (as on 01.08.2026)"])).toMatch(/relaxation as per the rules/);
  });
  test("NF-07 implausible age is skipped", () => {
    expect(qs(f({ age_min: null, age_max: 99 })).some((q) => /age limit/.test(q))).toBe(false);
    expect(qs(f({ age_min: 40, age_max: 30 })).some((q) => /age limit/.test(q))).toBe(false);
  });
  test("NF-08 pay range, single value and implausible values", () => {
    const a = (o: Partial<NoticeFacts>) => buildNoticeFaqs(f(o)).find((p) => /pay scale/.test(p.q))?.a;
    expect(a({})).toBe("The pay scale is ₹25,500 to ₹81,100.");
    expect(a({ pay_max: null })).toBe("The pay is ₹25,500.");
    expect(a({ pay_min: 120, pay_max: null })).toBeUndefined();
    expect(a({ pay_min: 600000, pay_max: 900000 })).toBeUndefined();
  });
  test("NF-09 how to apply only with an apply link, and never a URL", () => {
    expect(qs(f({ has_apply: false })).some((q) => /How can I apply/.test(q))).toBe(false);
    const a = buildNoticeFaqs(f()).find((p) => /How can I apply/.test(p.q))!.a;
    expect(a).toMatch(/Apply Now button/);
    expect(a).not.toMatch(/https?:|www\./);
  });
  test("NF-10 selection FAQ only when a selection or exam pattern table exists", () => {
    expect(qs(f({ extra_tables: ["Important dates"] })).some((q) => /selection/.test(q))).toBe(false);
    expect(qs(f({ extra_tables: ["Exam pattern"] })).some((q) => /selection/.test(q))).toBe(true);
  });
  test("NF-11 posts FAQ needs two distinct posts and lists them", () => {
    expect(qs(f({ post_names: ["Clerk", "clerk"] })).some((q) => /Which posts/.test(q))).toBe(false);
    const a = buildNoticeFaqs(f()).find((p) => /Which posts/.test(p.q))!.a;
    expect(a).toBe("This notice covers 2 posts: Clerk, Typist.");
  });
  test("NF-12 long post lists are capped with a remainder count", () => {
    const names = Array.from({ length: 15 }, (_, i) => `Post ${i + 1}`);
    const a = buildNoticeFaqs(f({ post_names: names })).find((p) => /Which posts/.test(p.q))!.a;
    expect(a).toMatch(/covers 15 posts/);
    expect(a).toMatch(/and 3 more\.$/);
  });
  test("NF-13 dates answer lists only known dates", () => {
    const a = (o: Partial<NoticeFacts>) => buildNoticeFaqs(f(o)).find((p) => /important dates/.test(p.q))!.a;
    expect(a({})).toBe(
      "For this notice, the notification was published on 20 Sep 2026 and the last date to apply is 10 Oct 2026.",
    );
    expect(a({ exam_date: "2026-11-02T00:00:00+05:30" })).toMatch(
      /, the last date to apply is 10 Oct 2026 and the exam date is 02 Nov 2026\.$/,
    );
    expect(a({ valid_through: null, exam_date: "2026-11-02T00:00:00+05:30" })).not.toMatch(/last date/);
  });
  test("NF-14 a single known date gives no dates FAQ", () => {
    expect(qs(f({ valid_through: null })).some((q) => /important dates/.test(q))).toBe(false);
  });
  test("NF-15 existing FAQs are never overwritten", () => {
    expect(buildNoticeFaqs(f({ existing_faqs: 2 }))).toEqual([]);
  });
  test("NF-16 aggregator names never reach a question or answer", () => {
    const out = buildNoticeFaqs(
      f({ title: "FreeJobAlert Clerk Recruitment 2026", post_names: ["Clerk", "SarkariResult Typist", "Typist"] }),
    );
    expect(JSON.stringify(out)).not.toMatch(/sarkari|free\s*job/i);
  });
});

describe("NF formatting", () => {
  test("NF-17 rupees use Indian digit grouping", () => {
    expect(formatRupees(999)).toBe("₹999");
    expect(formatRupees(1000)).toBe("₹1,000");
    expect(formatRupees(151100)).toBe("₹1,51,100");
    expect(formatRupees(12345678)).toBe("₹1,23,45,678");
  });
  test("NF-18 dates are IST: 18:30Z rolls to the next IST day", () => {
    expect(formatIstDate("2026-09-27T18:29:59+00:00")).toBe("27 Sep 2026");
    expect(formatIstDate("2026-09-27T18:30:00+00:00")).toBe("28 Sep 2026");
    expect(formatIstDate("2026-09-27T00:00:00+00:00")).toBe("27 Sep 2026");
    expect(formatIstDate("garbage")).toBeNull();
    expect(formatIstDate(null)).toBeNull();
  });
  test("NF-19 subject strips apply suffix and falls back to organization", () => {
    expect(
      noticeSubject({ title: "UPSSSC JE Recruitment 2026 Notification Out - Apply Online for 134 Posts", org: "X" }),
    ).toBe("UPSSSC JE Recruitment 2026");
    expect(noticeSubject({ title: "Apply Online", org: "ABC Board" })).toBe("ABC Board recruitment");
  });
});

describe("NF timeline", () => {
  test("NF-20 one row per known date with enum stages and plain titles", () => {
    const rows = buildNoticeTimeline(f({ exam_date: "2026-11-02T00:00:00+05:30" }));
    expect(rows.map((r) => [r.stage, r.title])).toEqual([
      ["NOTIFICATION_OUT", "Notification released"],
      ["APPLICATION_OPEN", "Last date to apply"],
      ["EXAM_SCHEDULED", "Exam scheduled"],
    ]);
  });
  test("NF-21 missing dates produce no row; postings with updates produce none", () => {
    expect(buildNoticeTimeline(f({ valid_through: null }))).toHaveLength(1);
    expect(buildNoticeTimeline(f({ n_updates: 2 }))).toEqual([]);
  });
});
