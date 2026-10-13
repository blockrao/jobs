import { describe, expect, test } from "vitest";
import { normalizeAge, normalizeSalary } from "../../../scripts/fja-normalize";

describe("FJA conservative salary normalization", () => {
  test("parses explicit INR monthly range", () => {
    expect(normalizeSalary("₹35,400 - ₹1,12,400 per month")).toMatchObject({
      min: 35400, max: 112400, currency: "INR", period: "MONTH", type: "RANGE", status: "NORMALIZED",
    });
  });
  test("does not infer currency or period from unmarked numbers", () => {
    expect(normalizeSalary("Salary 35400 to 112400")).toMatchObject({
      min: null, max: null, currency: null, period: null, status: "NEEDS_REVIEW",
    });
  });
  test("keeps pay scale distinct and does not invent a monthly period", () => {
    expect(normalizeSalary("Pay Matrix Level-7 (₹44,900 - ₹1,42,400)")).toMatchObject({
      min: 44900, max: 142400, currency: "INR", period: null, type: "PAY_SCALE", status: "NORMALIZED",
    });
  });
  test("parses a range when the currency marker appears only on the first endpoint", () => {
    expect(normalizeSalary("₹35,400 - 1,12,400 per month")).toMatchObject({ min: 35400, max: 112400, currency: "INR", period: "MONTH", type: "RANGE", status: "NORMALIZED" });
  });
  test("does not treat an unrelated age/duration number as the salary range endpoint", () => {
    expect(normalizeSalary("₹50,000 - 10 years")).toMatchObject({ min: 50000, max: null, status: "NEEDS_REVIEW" });
  });
  test("does not misread lakh or LPA amounts as single-digit rupees", () => {
    expect(normalizeSalary("₹4.5 LPA")).toMatchObject({ min: null, max: null, status: "NEEDS_REVIEW" });
  });
  test("does not normalize a bare amount without an explicit period", () => {
    expect(normalizeSalary("₹50,000")).toMatchObject({ min: 50000, max: 50000, currency: "INR", period: null, status: "NEEDS_REVIEW" });
  });
  test("keeps missing salary as null", () => {
    expect(normalizeSalary("Not mentioned")).toMatchObject({ min: null, max: null, status: "NOT_PRESENT" });
  });
});

describe("FJA conservative age normalization", () => {
  test("parses explicit age range and reference date", () => {
    expect(normalizeAge("Age limit: 18 to 27 years", "Age as on 01.01.2026")).toMatchObject({
      min: 18, max: 27, referenceDate: "2026-01-01", status: "NORMALIZED",
    });
  });
  test("parses separately labelled minimum and maximum ages", () => {
    expect(normalizeAge("Minimum Age: 18 years; Maximum Age: 30 years")).toMatchObject({ min: 18, max: 30, status: "NORMALIZED" });
  });
  test("parses explicit maximum age only", () => {
    expect(normalizeAge("Upper age limit 35 years")).toMatchObject({ min: null, max: 35, status: "NORMALIZED" });
  });
  test("does not treat category relaxations as the base age range", () => {
    expect(normalizeAge("Age limit varies by category: 30 years, 35 years for OBC, 40 years for SC")).toMatchObject({
      min: null, max: null, status: "NEEDS_REVIEW",
    });
  });
  test("keeps missing age null", () => {
    expect(normalizeAge("Not specified")).toMatchObject({ min: null, max: null, status: "NOT_PRESENT" });
  });
});
