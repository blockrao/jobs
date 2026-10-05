/**
 * SEARCH-001: abbreviation expansion and job page title composition.
 * Pure functions, no DB or network.
 */
import { describe, expect, test } from "vitest";
import {
  DEVANAGARI_ABBREVIATIONS,
  MAX_QUERY_TERMS,
  SEARCH_ALIASES,
  analyzeQuery,
  latinizeKnownAbbreviations,
} from "@/lib/search-aliases";
import { composeJobMetaTitle } from "@/lib/seo/meta-title";

describe("SEARCH-001 abbreviation expansion", () => {
  test("S-6a: a known abbreviation carries its phrase", () => {
    expect(analyzeQuery("ssc")).toEqual([{ word: "ssc", expansion: "staff selection commission" }]);
  });

  test("S-6b: words are analysed independently and case-insensitively", () => {
    expect(analyzeQuery("SBI PO Clerk")).toEqual([
      { word: "sbi", expansion: "state bank india" },
      { word: "po", expansion: "probationary officer" },
      { word: "clerk", expansion: null },
    ]);
  });

  test("S-6c: an unknown word is left alone", () => {
    expect(analyzeQuery("teacher")).toEqual([{ word: "teacher", expansion: null }]);
  });

  test("S-6d: surrounding punctuation is stripped, empty input yields no terms", () => {
    expect(analyzeQuery("(ssc),")[0].word).toBe("ssc");
    expect(analyzeQuery("  ,, ")).toEqual([]);
  });

  test("S-6e: a pasted paragraph is capped", () => {
    expect(analyzeQuery(Array.from({ length: 50 }, (_, i) => `w${i}`).join(" "))).toHaveLength(MAX_QUERY_TERMS);
  });

  test("S-6f: every expansion is a non-empty lower-case phrase that does not repeat its key", () => {
    for (const [abbr, phrase] of Object.entries(SEARCH_ALIASES)) {
      expect(abbr).toBe(abbr.toLowerCase());
      expect(phrase.length).toBeGreaterThan(3);
      expect(phrase).toBe(phrase.toLowerCase());
      expect(phrase.split(" ")).not.toContain(abbr);
    }
  });
});

describe("SEARCH-001 Devanagari abbreviations", () => {
  test("S-7a: a Devanagari-only abbreviation query becomes its Latin form", () => {
    expect(latinizeKnownAbbreviations("एसएससी")).toBe("ssc");
    expect(latinizeKnownAbbreviations("यूपीएससी cgl")).toBe("upsc cgl");
  });

  test("S-7b: a genuine Hindi query is returned unchanged for the Hindi path", () => {
    expect(latinizeKnownAbbreviations("बिहार में शिक्षक भर्ती")).toBe("बिहार में शिक्षक भर्ती");
    expect(latinizeKnownAbbreviations("एसएससी भर्ती")).toBe("एसएससी भर्ती");
  });

  test("S-7c: a Latin query is untouched", () => {
    expect(latinizeKnownAbbreviations("ssc cgl")).toBe("ssc cgl");
  });

  test("S-7d: every Devanagari target is a known Latin abbreviation", () => {
    for (const latin of Object.values(DEVANAGARI_ABBREVIATIONS)) {
      expect(SEARCH_ALIASES[latin]).toBeDefined();
    }
  });
});

describe("SEARCH-001 job page title", () => {
  test("T-1a: the organization is appended when the title does not name it", () => {
    expect(composeJobMetaTitle("Clerk Recruitment 2026", ["Punjab Court"])).toBe(
      "Clerk Recruitment 2026 — Punjab Court"
    );
  });

  test("T-1b: it is not repeated when the title already ends with it", () => {
    const t = "UPSC JTO Recruitment 2026 — National Sugar Institute, Kanpur";
    expect(composeJobMetaTitle(t, ["National Sugar Institute, Kanpur"])).toBe(t);
  });

  test("T-1c: the match ignores case and spacing", () => {
    expect(composeJobMetaTitle("X for  national sugar institute", ["National Sugar Institute"])).toBe(
      "X for  national sugar institute"
    );
  });

  test("T-1d: the Hindi page appends the first (Hindi) name, and skips if either is present", () => {
    expect(composeJobMetaTitle("भर्ती 2026", ["राष्ट्रीय संस्थान", "National Institute"])).toBe(
      "भर्ती 2026 — राष्ट्रीय संस्थान"
    );
    expect(composeJobMetaTitle("भर्ती 2026 — National Institute", ["राष्ट्रीय संस्थान", "National Institute"])).toBe(
      "भर्ती 2026 — National Institute"
    );
  });

  test("T-1e: no organization name leaves the title as is", () => {
    expect(composeJobMetaTitle("Clerk 2026", [null, ""])).toBe("Clerk 2026");
  });
});
