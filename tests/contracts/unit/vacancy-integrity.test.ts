import { describe, expect, it } from "vitest";
import {
  isPlausibleRecruitmentVacancyCount,
  MAX_TRUSTED_RECRUITMENT_VACANCIES,
} from "../../../src/lib/vacancy-integrity";

describe("homepage recruitment vacancy trust gate", () => {
  it("accepts positive integer counts within the review threshold", () => {
    expect(isPlausibleRecruitmentVacancyCount(1)).toBe(true);
    expect(isPlausibleRecruitmentVacancyCount(32_388)).toBe(true);
    expect(isPlausibleRecruitmentVacancyCount(MAX_TRUSTED_RECRUITMENT_VACANCIES)).toBe(true);
  });

  it("rejects missing, non-integer, invalid, and extreme counts", () => {
    for (const value of [null, undefined, 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, 100_001, 2_904_070, "32388"]) {
      expect(isPlausibleRecruitmentVacancyCount(value)).toBe(false);
    }
  });
});
