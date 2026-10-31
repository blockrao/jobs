import { describe, expect, test } from "vitest";
import { hasHindiSearchConstraints } from "@/lib/search-query-guards";

describe("Hindi/Hinglish search constraint guard", () => {
  test("does not turn an unparsed non-empty query into a broad browse", () => {
    expect(hasHindiSearchConstraints({
      query: "मुझे सरकारी नौकरी चाहिए",
      examsCount: 0,
      statesCount: 0,
      qualificationsCount: 0,
      hasExplicitFilter: false,
    })).toBe(false);
  });

  test("allows a query resolved to a known exam, state or qualification", () => {
    for (const key of ["examsCount", "statesCount", "qualificationsCount"] as const) {
      expect(hasHindiSearchConstraints({
        query: "हरियाणा में नौकरी",
        examsCount: key === "examsCount" ? 1 : 0,
        statesCount: key === "statesCount" ? 1 : 0,
        qualificationsCount: key === "qualificationsCount" ? 1 : 0,
        hasExplicitFilter: false,
      })).toBe(true);
    }
  });

  test("allows an explicit supported filter and empty-query browse", () => {
    expect(hasHindiSearchConstraints({
      query: "सरकारी नौकरी",
      examsCount: 0,
      statesCount: 0,
      qualificationsCount: 0,
      hasExplicitFilter: true,
    })).toBe(true);
    expect(hasHindiSearchConstraints({
      query: "",
      examsCount: 0,
      statesCount: 0,
      qualificationsCount: 0,
      hasExplicitFilter: false,
    })).toBe(true);
  });
});
