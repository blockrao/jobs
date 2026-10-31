import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/db/operations/get-posts.ts"),
  "utf8",
);

describe("Post Leaf official link evidence query", () => {
  test("requires a source registry entry with OFFICIAL authority", () => {
    expect(source).toContain("s.authority = 'OFFICIAL'");
    expect(source).toContain("s.is_official IS TRUE");
  });

  test("requires an ACCEPTED observation linked to the canonical Post or Recruitment", () => {
    expect(source).toContain("so.outcome = 'ACCEPTED'");
    expect(source).toContain("legacy_posting.inferred_post_id = p.id");
    expect(source).toContain("legacy_posting.inferred_recruitment_id = r.id");
  });

  test("requires the exact notification/application URL in the observation", () => {
    expect(source).toContain("so.source_url = r.official_notification_url");
    expect(source).toContain("observed_link.value ->> 'url' = r.official_notification_url");
    expect(source).toContain("so.source_url = r.official_application_url");
    expect(source).toContain("observed_link.value ->> 'url' = r.official_application_url");
  });
});
