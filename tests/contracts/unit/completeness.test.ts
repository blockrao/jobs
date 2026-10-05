/** PQ-002: Page Completeness Standard contracts. */
import { describe, expect, test } from "vitest";
import { evaluateCompleteness, COMPLETENESS_CHECKS, type CompletenessInput } from "@/lib/content-quality/completeness";

const empty: CompletenessInput = {
  officialNotificationUrl: null, applyUrl: null, totalVacancies: null, salaryMin: null,
  ageLimitMin: null, ageLimitMax: null, applicationFeeGeneral: null, eligibility: null,
  requirements: null, description: null, datePosted: null, validThrough: null,
  lastVerifiedAt: null, titleHi: null, descriptionHi: null, eligibilityHi: null, extraContent: null,
};
const full: CompletenessInput = {
  officialNotificationUrl: "https://x.gov.in/a.pdf", applyUrl: "https://x.gov.in/apply", totalVacancies: 10,
  salaryMin: 25000, ageLimitMin: 18, ageLimitMax: 37, applicationFeeGeneral: 100,
  eligibility: "Graduate with the required teacher qualification.", requirements: null,
  description: "Selection process: one written exam.", datePosted: new Date(), validThrough: new Date(),
  lastVerifiedAt: new Date(), titleHi: "शीर्षक", descriptionHi: "विवरण", eligibilityHi: "पात्रता",
  extraContent: { faqs: [{ q: "a", a: "b" }, { q: "c", a: "d" }, { q: "e", a: "f" }] },
};

describe("evaluateCompleteness", () => {
  test("empty posting is thin with every check missing", () => {
    const r = evaluateCompleteness(empty);
    expect(r.score).toBe(0);
    expect(r.band).toBe("thin");
    expect(r.missing).toEqual([...COMPLETENESS_CHECKS]);
  });
  test("full posting is complete", () => {
    const r = evaluateCompleteness(full);
    expect(r.score).toBe(r.total);
    expect(r.band).toBe("complete");
  });
  test("verified date comes only from lastVerifiedAt", () => {
    expect(evaluateCompleteness({ ...full, lastVerifiedAt: null }).missing).toContain("verified_date");
  });
  test("fewer than 3 notice FAQs fails", () => {
    expect(evaluateCompleteness({ ...full, extraContent: { faqs: [{ q: "a", a: "b" }] } }).missing).toContain("notice_faqs");
  });
  test("selection process found in a notice block", () => {
    const r = evaluateCompleteness({ ...full, description: "x", extraContent: { ...full.extraContent, notices: [{ title: "Selection process", body: "Written exam" }] } });
    expect(r.passed).toContain("selection_process");
  });
  test("Hindi needs title, description and eligibility", () => {
    expect(evaluateCompleteness({ ...full, eligibilityHi: null }).missing).toContain("hindi");
  });
});
