import { describe, expect, test } from "vitest";
import { transformEnrichment } from "@/db/operations/enrichment-transformer";

describe("enrichment extraction confidence provenance", () => {
  test("missing confidence remains zero and cannot be promoted to a threshold-passing score", () => {
    const result = transformEnrichment({});
    expect(result.sourceVerificationStatus).toBe("PENDING");
    expect(result.extractionConfidence).toBe(0);
  });

  test("an explicit zero confidence remains zero", () => {
    const result = transformEnrichment({ extractionConfidence: 0 });
    expect(result.extractionConfidence).toBe(0);
  });

  test.each([null, "85", Number.NaN, Number.POSITIVE_INFINITY, -1, 101])(
    "invalid confidence %s is treated as unavailable, not inferred",
    (extractionConfidence) => {
      const result = transformEnrichment({ extractionConfidence });
      expect(result.extractionConfidence).toBe(0);
    },
  );

  test("a valid stored numeric confidence is preserved", () => {
    const result = transformEnrichment({ extractionConfidence: 85 });
    expect(result.extractionConfidence).toBe(85);
  });
});
