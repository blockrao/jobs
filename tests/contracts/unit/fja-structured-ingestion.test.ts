import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const crawler = readFileSync("scripts/fja-inventory.ts", "utf8");
const workflow = readFileSync(".github/workflows/fja-jobs-inventory.yml", "utf8");
const migration = readFileSync("supabase/migrations/20261013170000_fja_002_structured_candidate_fields.sql", "utf8");

describe("FJA structured ingestion safety contracts", () => {
  test("crawler persists typed salary and age candidates separately from raw source text", () => {
    expect(crawler).toContain("normalizeSalary(candidate.salaryRaw)");
    expect(crawler).toContain("normalizeAge(candidate.ageLimitRaw, candidate.ageReferenceDateRaw)");
    expect(crawler).toContain("salary_min_candidate");
    expect(crawler).toContain("min_age_years_candidate");
    expect(crawler).toContain("salary_raw=excluded.salary_raw");
  });

  test("unchanged-source recrawls preserve manually reviewed normalized values", () => {
    expect(crawler).toContain("salary_normalization_status='MANUALLY_REVIEWED'");
    expect(crawler).toContain("age_normalization_status='MANUALLY_REVIEWED'");
    expect(crawler).toContain("verified_at=CASE WHEN public.fja_post_inventory.content_hash IS DISTINCT FROM excluded.content_hash THEN NULL");
  });

  test("migration adds nullable typed candidate fields and does not write canonical tables", () => {
    expect(migration).toContain("ALTER TABLE public.fja_post_inventory");
    expect(migration).toContain("salary_period_candidate");
    expect(migration).toContain("age_reference_date_candidate");
    expect(migration).not.toMatch(/\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+)?public\.(?:posts|recruitments)\b/i);
  });

  test("automated inventory workflow remains pilot-only pending pilot acceptance", () => {
    expect(workflow).toContain("Pilot only");
    expect(workflow).toContain("          - pilot");
    expect(workflow).not.toContain("          - full");
    expect(workflow).not.toContain("          - queue");
  });
});
