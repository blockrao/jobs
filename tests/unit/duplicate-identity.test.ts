import { describe, expect, it } from "vitest";
import { normalizeIdentityTitle, normalizeIdentityUrl } from "../../src/ingest/duplicate-identity";

describe("normalizeIdentityUrl", () => {
  it("ignores fragments and known tracking parameters", () => {
    expect(normalizeIdentityUrl("https://EXAMPLE.gov.in/notices/123/?utm_source=fja&fbclid=abc#page"))
      .toBe("https://example.gov.in/notices/123");
  });

  it("preserves meaningful query parameters", () => {
    expect(normalizeIdentityUrl("https://example.gov.in/notice?id=123"))
      .toBe("https://example.gov.in/notice?id=123");
    expect(normalizeIdentityUrl("https://example.gov.in/notice?id=456"))
      .not.toBe(normalizeIdentityUrl("https://example.gov.in/notice?id=123"));
  });

  it("rejects malformed and non-http URLs", () => {
    expect(normalizeIdentityUrl("not a url")).toBeNull();
    expect(normalizeIdentityUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("normalizeIdentityTitle", () => {
  it("normalizes casing, punctuation, whitespace and Unicode compatibility forms", () => {
    expect(normalizeIdentityTitle("  Assistant   Teacher (TGT) — 2026 "))
      .toBe(normalizeIdentityTitle("assistant-teacher TGT 2026"));
  });

  it("does not make different role names identical", () => {
    expect(normalizeIdentityTitle("Assistant Teacher")).not.toBe(normalizeIdentityTitle("Primary Teacher"));
  });
});
