import { describe, expect, it } from "vitest";
import { isPreliminaryUnverifiedSourceMetadata } from "../../src/lib/source-verification";

describe("source verification metadata", () => {
  it("flags explicitly preliminary unverified records", () => {
    expect(isPreliminaryUnverifiedSourceMetadata({ verification_state: "preliminary_unverified" })).toBe(true);
  });

  it("does not mark verified or unrelated metadata as preliminary", () => {
    expect(isPreliminaryUnverifiedSourceMetadata({ verification_state: "VERIFIED" })).toBe(false);
    expect(isPreliminaryUnverifiedSourceMetadata({ source_article: "https://example.com/article" })).toBe(false);
    expect(isPreliminaryUnverifiedSourceMetadata(null)).toBe(false);
    expect(isPreliminaryUnverifiedSourceMetadata("preliminary_unverified")).toBe(false);
  });
});
