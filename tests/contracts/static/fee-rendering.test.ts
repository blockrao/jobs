import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("application fee rendering", () => {
  it("never renders an unknown fee amount as Nil", () => {
    const source = readFileSync(
      "src/components/job-posting/job-detail-page-production.tsx",
      "utf8",
    );

    expect(source).toContain(
      "amount: f.amount != null ? inr(f.amount) : 'Not stated',",
    );
    expect(source).not.toContain(
      "amount: f.amount != null ? inr(f.amount) : 'Nil',",
    );
    const route = readFileSync(
      "src/app/(default)/jobs/[recruitment-slug]/[post-slug]/page.tsx",
      "utf8",
    );
    expect(route).toContain("amount: f.amount ?? null");
    expect(route).not.toContain("amount: f.amount || null");
  });
});
