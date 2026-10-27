import { describe, expect, it } from "vitest";
import { deduplicate } from "../../src/ingest/deduplicate";
import type { RawPosting } from "../../src/ingest/types";

function posting(overrides: Partial<RawPosting> = {}): RawPosting {
  return {
    source: "ext-1",
    externalId: "12345",
    sourceUrl: "https://www.freejobalert.com/articles/example-12345",
    title: "Assistant Teacher Recruitment 2026",
    kind: "GOVERNMENT",
    organizationName: "Example Department",
    description: "Recruitment notice",
    confidence: 80,
    ...overrides,
  };
}

describe("deduplicate", () => {
  it("collapses repeated sightings of the same stable source identity", () => {
    const result = deduplicate([
      posting(),
      posting({ sourceUrl: "https://www.freejobalert.com/articles/example-12345/" }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].sources).toHaveLength(2);
  });

  it("does not merge different source IDs just because title, organization and location match", () => {
    const result = deduplicate([
      posting({ externalId: "12345" }),
      posting({ externalId: "67890" }),
    ]);
    expect(result).toHaveLength(2);
  });

  it("does not merge the same external ID from different sources", () => {
    const result = deduplicate([
      posting({ source: "ext-1" }),
      posting({ source: "other-source" }),
    ]);
    expect(result).toHaveLength(2);
  });
});
