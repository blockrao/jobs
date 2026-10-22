import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("public posting visibility contract", () => {
  test("public listing excludes postings marked expired by the lifecycle system", () => {
    const source = readFileSync("src/lib/publishing-queries.ts", "utf8");
    expect(source).toMatch(/eq\(postings\.isExpired,\s*false\)/);
  });
});
