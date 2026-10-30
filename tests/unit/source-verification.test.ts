import { describe, expect, it } from "vitest";
import { isManuallyVerifiedOfficialLink } from "../../src/lib/source-verification";

describe("isManuallyVerifiedOfficialLink", () => {
  it("accepts only explicit MANUAL_VERIFIED provenance", () => {
    expect(isManuallyVerifiedOfficialLink("MANUAL_VERIFIED")).toBe(true);
    expect(isManuallyVerifiedOfficialLink(" manual_verified ")).toBe(true);
  });

  it("does not treat aggregator discovery or unknown legacy values as verification", () => {
    expect(isManuallyVerifiedOfficialLink("AGGREGATOR_DISCOVERED")).toBe(false);
    expect(isManuallyVerifiedOfficialLink("fja_official_link_extracted")).toBe(false);
    expect(isManuallyVerifiedOfficialLink("Official WAPCOS portal")).toBe(false);
    expect(isManuallyVerifiedOfficialLink(null)).toBe(false);
    expect(isManuallyVerifiedOfficialLink(undefined)).toBe(false);
  });
});
