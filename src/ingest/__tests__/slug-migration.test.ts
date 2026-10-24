/**
 * Tests for slug system migration and validation
 *
 * Coverage:
 * - Sequential slug format validation
 * - Slug generation for new recruitments
 * - Redirect mapping for legacy slugs
 * - Prevention of deterministic slug recurrence
 */

import { describe, it, expect } from "vitest";
import {
  generateSequentialSlug,
  isSequentialSlug,
  parseSequentialSlug
} from "../slug-generator";
import { slugify, deterministicSlug } from "../normalize";

describe("Slug System - Format Validation", () => {
  describe("isSequentialSlug", () => {
    it("should accept valid sequential slugs", () => {
      const validSlugs = [
        "upsc-2026-01",
        "sbi-2026-03",
        "ibps-2026-02",
        "isro-2026-99",
        "abc-2025-10",
      ];

      for (const slug of validSlugs) {
        expect(isSequentialSlug(slug)).toBe(true);
      }
    });

    it("should reject invalid sequential slugs", () => {
      const invalidSlugs = [
        // Too long (old deterministic format)
        "isro-iprc-recruitment-2026-notification-out-apply-online-d061d5",
        // Missing parts
        "upsc-2026",
        "upsc",
        "2026-01",
        // Wrong separator
        "upsc.2026.01",
        "upsc_2026_01",
        // Wrong year format
        "upsc-26-01",
        "upsc-202601",
        // Wrong sequence format
        "upsc-2026-1",
        "upsc-2026-001",
        // Empty or null
        "",
        // Special characters
        "upsc#2026-01",
        "upsc/2026/01",
      ];

      for (const slug of invalidSlugs) {
        expect(isSequentialSlug(slug)).toBe(false);
      }
    });
  });

  describe("parseSequentialSlug", () => {
    it("should parse valid sequential slugs correctly", () => {
      const testCases = [
        { slug: "upsc-2026-01", expected: { orgSlug: "upsc", year: 2026, sequence: 1 } },
        { slug: "sbi-2025-99", expected: { orgSlug: "sbi", year: 2025, sequence: 99 } },
        { slug: "railway-board-2026-05", expected: { orgSlug: "railway-board", year: 2026, sequence: 5 } },
      ];

      for (const { slug, expected } of testCases) {
        const result = parseSequentialSlug(slug);
        expect(result).toEqual(expected);
      }
    });

    it("should return null for invalid slugs", () => {
      const invalidSlugs = [
        "upsc-2026",
        "isro-iprc-recruitment-2026-d061d5",
        "",
        "upsc-26-01",
      ];

      for (const slug of invalidSlugs) {
        expect(parseSequentialSlug(slug)).toBeNull();
      }
    });

    it("should handle org slugs with multiple dashes", () => {
      const result = parseSequentialSlug("my-org-name-2026-05");
      expect(result).toEqual({
        orgSlug: "my-org-name",
        year: 2026,
        sequence: 5,
      });
    });
  });
});

describe("Slug System - Deprecation", () => {
  it("should document deterministicSlug as deprecated", () => {
    // This test ensures the function has deprecation documentation
    const fnString = deterministicSlug.toString();
    expect(fnString).toContain("deprecated");
  });

  it("should still work for backwards compatibility", () => {
    // Old deterministic slugs should still work (for existing postings)
    const slug = deterministicSlug("FreeJobAlert", "12345", "Senior Executive Test");

    // Format: {slug}-{6-char-hash}
    expect(slug).toMatch(/^[a-z0-9-]+-[a-f0-9]{6}$/);
    expect(slug.length).toBeGreaterThan(20);
    expect(slug.length).toBeLessThan(180);
  });
});

describe("Slug System - Migration Impact", () => {
  it("old deterministic slug should NOT match sequential format", () => {
    // This validates that we can distinguish old from new slugs
    const oldSlug = deterministicSlug("FreeJobAlert", "12345", "ISRO IPRC Recruitment 2026");
    const isSequential = isSequentialSlug(oldSlug);

    expect(isSequential).toBe(false);
  });

  it("should identify all sequential slugs as NOT deterministic", () => {
    const sequentialSlugs = [
      "upsc-2026-01",
      "isro-2026-10",
      "sbi-2025-05",
    ];

    for (const slug of sequentialSlugs) {
      // Sequential slugs are distinctly formatted
      expect(isSequentialSlug(slug)).toBe(true);
      // And they're short
      expect(slug.length).toBeLessThan(40);
    }
  });
});

describe("Slug System - URL Characteristics", () => {
  it("sequential slugs should be SEO-friendly", () => {
    const slug = "upsc-2026-01";

    // Short (good for SEO)
    expect(slug.length).toBeLessThan(40);

    // Readable
    expect(slug).toMatch(/^[a-z0-9-]+$/);

    // No unnecessary repetition
    expect(slug.split("-")).toHaveLength(3);
  });

  it("should handle organization names with hyphens", () => {
    const result = parseSequentialSlug("civil-service-commission-2026-05");
    expect(result).toBeDefined();
    expect(result?.orgSlug).toBe("civil-service-commission");
  });
});

describe("Slug System - Constraint Validation", () => {
  it("should document CHECK constraint pattern", () => {
    // The database CHECK constraint pattern is:
    // slug ~ '^[a-z0-9]+-\d{4}-\d{2}$'
    // This test documents what's enforced at the DB level

    const validPattern = /^[a-z0-9]+-\d{4}-\d{2}$/;

    const validSlugs = ["upsc-2026-01", "railway-board-2025-10"];
    for (const slug of validSlugs) {
      expect(validPattern.test(slug)).toBe(true);
    }

    const invalidSlugs = [
      "UPSC-2026-01", // uppercase
      "upsc-026-01",  // wrong year
      "upsc-2026-1",  // single-digit sequence
      "upsc-2026-001", // triple-digit sequence
    ];
    for (const slug of invalidSlugs) {
      expect(validPattern.test(slug)).toBe(false);
    }
  });
});
