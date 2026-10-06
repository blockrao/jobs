/**
 * SEM-001: a field may only hold a value that means what the field means.
 * Every case below is a real value found in production on 2026-10-06, or the
 * real source row it came from.
 */
import { describe, expect, test } from "vitest";
import { recordToRaw } from "@/ingest/adapters/freejobalert-file";
import { LabelBag } from "@/ingest/adapters/util";
import { sanitizeForStorage } from "@/ingest/enrich-facts";
import { buildCoreFaqs, type CoreFaqInput } from "@/lib/content/faq-gate";
import { buildFAQSchema } from "@/lib/structured-data";
import {
  applySemanticGate,
  isDateLabel,
  validateAge,
  validateEligibility,
  validateFee,
  validateLastDate,
  validateMonthlyPay,
  validateVacancies,
} from "@/lib/semantic-fields";

// Production values that are NOT an eligibility (posting id in the comment).
const CONTAMINATED_ELIGIBILITY: Array<[number, string, string]> = [
  [484, "Last date of receipt of online application", "date-label"],
  [706, "Closing date of online application (20 October 2026)", "date-label"],
  [166, "Closing date for submission of online application (16 October 2026)", "date-label"],
  [920, "Last date for submission of application forms (22-10-2026), as per Punjab Govt notification No. G.S.R.7/Const./Art.309/Amd.(23)/2026 dated 21.01.2026", "date-label"],
  [1033, "08.10.2026 (last date of application)", "date-value"],
  [145, "30.09.2026 (same as closing date)", "date-value"],
  [415, "Date of issue of the notification", "date-label"],
  [12, "26/02/2026", "date-value"],
  [44, "Click Here", "placeholder"],
  [56, "As per Schedule", "placeholder"],
  [58, "Not specified — verify in official notification", "placeholder"],
];

// Real eligibility text that must keep passing.
const GENUINE_ELIGIBILITY = [
  "12th standard pass (Higher Secondary/10+2) from a recognised Board or University.",
  "B.A with Sanskrit/ Sahityacharya",
  "Serving / Retired Defence Forces Officers",
  "CA/ICWA, Inter CA, Inter ICWA, MBA (Finance)",
  "M.D.S. (Orthodontics) recognized by DCI",
  "M.A. in Sanskrit, M.D. in Ayurveda",
  "Age: not exceeding 38 years (OBC) as on the closing date. Educational qualification: a Bachelor's degree in Science or Engineering",
  "Graduate in any discipline; age as on last date of receipt of application must not exceed 35 years",
];

describe("SEM-001 eligibility validator", () => {
  test.each(CONTAMINATED_ELIGIBILITY)("posting %i: %s is not an eligibility", (_id, value, reason) => {
    const r = validateEligibility(value);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe(reason);
  });

  test.each(GENUINE_ELIGIBILITY)("genuine eligibility passes: %s", (value) => {
    const r = validateEligibility(value);
    expect(r.ok).toBe(true);
  });

  test("empty and label-only values fail", () => {
    expect(validateEligibility(null).ok).toBe(false);
    expect(validateEligibility("  ").ok).toBe(false);
    expect(validateEligibility("Qualification").ok).toBe(false);
  });
});

describe("SEM-001 label matching never lets a date label stand for a qualification", () => {
  test("date, deadline and cut-off labels are recognised", () => {
    for (const k of ["Eligibility Cut-off Date", "Date of eligibility", "Last Date", "Closing deadline"]) {
      expect(isDateLabel(k)).toBe(true);
    }
    for (const k of ["Educational Qualification", "Eligibility", "Qualification"]) {
      expect(isDateLabel(k)).toBe(false);
    }
  });

  test("LabelBag.findQualification skips a date label even when it matches /eligib/", () => {
    const bag = new LabelBag();
    bag.add("Eligibility Cut-off Date", "Last date of receipt of online application");
    expect(bag.findQualification(/qualification/i, /eligib/i)).toBeUndefined();
    bag.add("Educational Qualification", "Ph.D. in the relevant discipline");
    expect(bag.findQualification(/eligib/i, /qualification/i)).toBe("Ph.D. in the relevant discipline");
  });

  test("the plain find() is unchanged for other fields", () => {
    const bag = new LabelBag();
    bag.add("Last Date", "20 October 2026");
    expect(bag.find(/last date/i)).toBe("20 October 2026");
  });

  test("posting 484 source rows: 'Eligibility Cut-off Date' is not stored as the qualification", () => {
    const raw = recordToRaw({
      id: "t-484",
      url: "",
      title: "IGNOU Teaching Recruitment 2026 - Apply Online 43 Professor, Associate & Assistant Professor Posts",
      published: "2026-09-18T18:01:16+05:30",
      rows: [
        ["Particulars", "Details"],
        ["Organization", "Indira Gandhi National Open University (IGNOU)"],
        ["Advertisement No.", "01/2026/ACD"],
        ["Total Posts", "43 across 14 Schools of Studies"],
        ["Online Application Last Date", "20 October 2026"],
        ["Eligibility Cut-off Date", "Last date of receipt of online application"],
      ],
      links: [],
    });
    expect(raw.eligibility).toBeUndefined();
  });

  test("a real qualification row after a cut-off row is still found", () => {
    const raw = recordToRaw({
      id: "t-2",
      url: "",
      title: "Example Recruitment 2026",
      rows: [
        ["Organization", "Example Board"],
        ["Eligibility Cut-off Date", "Last date of receipt of online application"],
        ["Educational Qualification", "Graduate in any discipline from a recognised university"],
      ],
      links: [],
    });
    expect(raw.eligibility).toBe("Graduate in any discipline from a recognised university");
  });
});

describe("SEM-001 storage-time gate", () => {
  test("a date or placeholder eligibility is dropped, not stored", () => {
    for (const [, value] of CONTAMINATED_ELIGIBILITY) {
      const h = sanitizeForStorage({ title: "Example Board Recruitment 2026", description: "d", eligibility: value });
      expect(h.clean.eligibility).toBeNull();
      expect(h.invalid.some((x) => x.startsWith("eligibility:"))).toBe(true);
    }
  });

  test("a genuine eligibility is stored unchanged", () => {
    const h = sanitizeForStorage({ title: "Example Board Recruitment 2026", description: "d", eligibility: GENUINE_ELIGIBILITY[0] });
    expect(h.clean.eligibility).toBe(GENUINE_ELIGIBILITY[0]);
    expect(h.invalid).toEqual([]);
  });
});

describe("SEM-001 numeric and date validators", () => {
  test("age: impossible or inverted values are dropped", () => {
    expect(validateAge(18, 1)).toEqual({ min: 18, max: null }); // posting 140: maximum age 1
    expect(validateAge(40, 30)).toEqual({ min: null, max: null });
    expect(validateAge(18, 27)).toEqual({ min: 18, max: 27 });
  });

  test("fee: reserved above general is a probable swap and neither is trusted (posting 163)", () => {
    expect(validateFee(55, 175)).toEqual({ general: null, reserved: null });
    expect(validateFee(100, 0)).toEqual({ general: 100, reserved: 0 });
    expect(validateFee(100, null)).toEqual({ general: 100, reserved: null });
    expect(validateFee(99999, 0)).toEqual({ general: null, reserved: 0 });
  });

  test("pay: annual-looking figures are not shown as monthly (postings 511, 653)", () => {
    expect(validateMonthlyPay(800000, null)).toEqual({ min: null, max: null });
    expect(validateMonthlyPay(1200000, 1400000)).toEqual({ min: null, max: null });
    expect(validateMonthlyPay(19900, 92300)).toEqual({ min: 19900, max: 92300 });
    expect(validateMonthlyPay(135020, null)).toEqual({ min: 135020, max: null });
  });

  test("vacancies: zero and absurd counts are dropped", () => {
    expect(validateVacancies(0)).toBeNull();
    expect(validateVacancies(2536)).toBe(2536);
    expect(validateVacancies(10_000_000)).toBeNull();
  });

  test("last date before the posted date is dropped only while applications are open (posting 512)", () => {
    const posted = "2026-09-17T00:00:00Z";
    const last = "2026-09-15T00:00:00Z";
    expect(validateLastDate({ posted, last, applicationOpen: true })).toBeNull();
    // A result notice legitimately carries an older application deadline.
    expect(validateLastDate({ posted, last, applicationOpen: false })).not.toBeNull();
  });

  test("applySemanticGate nulls bad values and never substitutes another field", () => {
    const gated = applySemanticGate({
      eligibility: "Last date of receipt of online application",
      ageLimitMin: 18,
      ageLimitMax: 1,
      applicationFeeGeneral: 55,
      applicationFeeReserved: 175,
      salaryMin: 800000,
      salaryMax: null,
      salaryPeriod: "MONTH",
      totalVacancies: 6,
      currentStage: "APPLICATION_OPEN",
      datePosted: "2026-09-17T00:00:00Z",
      validThrough: "2026-09-15T00:00:00Z",
    });
    expect(gated.eligibility).toBeNull();
    expect(gated.ageLimitMax).toBeNull();
    expect(gated.ageLimitMin).toBe(18);
    expect(gated.applicationFeeGeneral).toBeNull();
    expect(gated.applicationFeeReserved).toBeNull();
    expect(gated.salaryMin).toBeNull();
    expect(gated.totalVacancies).toBe(6);
    expect(gated.validThrough).toBeNull();
  });

  test("a yearly salary period is not judged by the monthly range", () => {
    const gated = applySemanticGate({ salaryMin: 800000, salaryMax: 1200000, salaryPeriod: "YEAR" });
    expect(gated.salaryMin).toBe(800000);
  });
});

describe("SEM-001 FAQ gate: no validated answer, no FAQ", () => {
  const base: CoreFaqInput = {
    isHi: false,
    displayTitle: "Example Board Recruitment 2026 : Apply Online for 12 Post",
    displayOrgName: "Example Board",
    displayEligibility: "Graduate in any discipline from a recognised university",
    postNames: ["Clerk"],
    totalVacancies: 12,
    validThrough: "2026-10-20T00:00:00Z",
    datePosted: "2026-09-20T00:00:00Z",
    currentStage: "APPLICATION_OPEN",
    applicationFeeGeneral: 100,
    applicationFeeReserved: 0,
  };
  const questions = (i: CoreFaqInput) => buildCoreFaqs(i).map((f) => f.question);

  test("a genuine eligibility produces an eligibility FAQ with that answer", () => {
    const faq = buildCoreFaqs(base).find((f) => /eligibility/i.test(f.question));
    expect(faq?.answer).toBe(base.displayEligibility);
  });

  test.each(CONTAMINATED_ELIGIBILITY)("posting %i: a contaminated eligibility yields no eligibility FAQ", (_id, value) => {
    const faqs = buildCoreFaqs({ ...base, displayEligibility: value });
    expect(faqs.some((f) => /eligibility/i.test(f.question))).toBe(false);
    // and the bad text appears in no answer at all
    expect(faqs.some((f) => f.answer.includes(value))).toBe(false);
  });

  test("the same holds in Hindi", () => {
    const faqs = buildCoreFaqs({ ...base, isHi: true, displayEligibility: "Last date of receipt of online application" });
    expect(faqs.some((f) => f.question.includes("पात्रता"))).toBe(false);
  });

  test("missing or invalid facts produce no FAQ for them", () => {
    const q = questions({
      ...base,
      displayEligibility: null,
      totalVacancies: 0,
      validThrough: null,
      applicationFeeGeneral: null,
      applicationFeeReserved: 175,
    });
    expect(q).toEqual([]);
  });

  test("a swapped fee pair yields no fee FAQ", () => {
    const q = questions({ ...base, applicationFeeGeneral: 55, applicationFeeReserved: 175 });
    expect(q.some((x) => /fee/i.test(x))).toBe(false);
  });

  test("an invalid last date yields no last-date FAQ while applications are open", () => {
    const q = questions({ ...base, validThrough: "2026-09-01T00:00:00Z" });
    expect(q.some((x) => /last date/i.test(x))).toBe(false);
  });

  test("multi-post notice: the vacancy figure is attributed to the notice, never to the first post", () => {
    const faqs = buildCoreFaqs({
      ...base,
      displayTitle: "SSC Combined Higher Secondary (10+2) Examination 2026 : Apply Online for 2536 Post",
      displayOrgName: "Staff Selection Commission",
      postNames: ["Lower Division Clerk (LDC)/Junior Secretariat Assistant (JSA)", "Data Entry Operator (DEO)", "Data Entry Operator Grade A"],
      totalVacancies: 2536,
      applicationFeeGeneral: 100,
      applicationFeeReserved: null,
    });
    const vac = faqs.find((f) => /vacancies/i.test(f.question));
    expect(vac).toBeDefined();
    expect(vac!.question).not.toMatch(/Lower Division Clerk/);
    expect(vac!.answer).toMatch(/in this notice/);
    // no question for the whole notice names only the first post
    for (const f of faqs) expect(f.question).not.toMatch(/for Lower Division Clerk/);
  });

  test("single-post notice keeps naming the post (PQ-004)", () => {
    const vac = buildCoreFaqs(base).find((f) => /vacancies/i.test(f.question));
    expect(vac!.question).toContain("Clerk");
  });

  test("curated FAQs need both a question and an answer", () => {
    const faqs = buildCoreFaqs({ ...base, extraFaqs: [{ q: "A?", a: "" }, { q: "", a: "B" }, { q: "C?", a: "D" }] });
    expect(faqs.filter((f) => f.question === "C?" && f.answer === "D")).toHaveLength(1);
    expect(faqs.some((f) => f.question === "A?" || f.answer === "B")).toBe(false);
  });
});

describe("SEM-001 FAQPage JSON-LD", () => {
  test("is not emitted when there are no validated answers", () => {
    expect(buildFAQSchema([])).toBeNull();
    expect(buildFAQSchema([{ question: "Q?", answer: "  " }])).toBeNull();
  });

  test("is built from the same list the page shows, and carries no contaminated answer", () => {
    const faqs = buildCoreFaqs({
      isHi: false,
      displayTitle: "IGNOU Teaching Recruitment 2026",
      displayOrgName: "IGNOU",
      displayEligibility: "Last date of receipt of online application",
      postNames: ["Professor", "Associate Professor", "Assistant Professor"],
      totalVacancies: 43,
      validThrough: "2026-10-20T00:00:00Z",
      datePosted: "2026-09-19T00:00:00Z",
      currentStage: "APPLICATION_OPEN",
      applicationFeeGeneral: null,
      applicationFeeReserved: null,
    });
    const schema = buildFAQSchema(faqs) as { mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> };
    expect(schema.mainEntity.map((m) => m.name)).toEqual(faqs.map((f) => f.question));
    expect(JSON.stringify(schema)).not.toMatch(/receipt of online application/i);
  });
});
