import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261031090500_p0_complete_source_origin_rls_gate.sql"),
  "utf8",
);

describe("P0 source-origin RLS migration contract", () => {
  it("covers all five source-sensitive public job-data tables", () => {
    for (const table of ["recruitments", "posts", "eligibilities", "post_age_rules", "vacancies"]) {
      expect(migration).toMatch(new RegExp(`CREATE POLICY "public read" ON public\\.${table}`, "i"));
      expect(migration).toMatch(new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, "i"));
    }
  });

  it("recognizes canonical and legacy aggregator-origin signals", () => {
    for (const signal of [
      'r.official_link_source',
      "r.enrichment_data -> 'meta' ->> 'source'",
      'p."sourceName"',
      'p."sourceReference"',
      "p.original_recruitment_url",
      'p."originalRecruitmentUrl"',
      "sp.source",
      "sp.source_type",
      "sp.enrichment_source",
      "sp.source_portals",
      "sp.source_url",
      "r.source_url",
      "sp.inferred_recruitment_id",
      "sp.inferred_post_id",
      "'pilot_preliminary'",
    ]) {
      expect(migration).toContain(signal);
    }
  });

  it("preserves legacy source origin through both inferred relationship paths", () => {
    expect(migration).toContain("private.propagate_legacy_posting_discovery_origin");
    expect(migration).toContain("OLD.inferred_recruitment_id");
    expect(migration).toContain("OLD.inferred_post_id");
    expect(migration).toContain("NEW.inferred_recruitment_id");
    expect(migration).toContain("NEW.inferred_post_id");
  });

  it("does not mass-backfill or mutate existing Recruitment records", () => {
    expect(migration).not.toMatch(/UPDATE public\\.recruitments\\s+SET source_discovery_origin/i);
  });

  it("requires at least one canonical non-duplicate Post Leaf before a Recruitment is public", () => {
    expect(migration).toContain("p.posting_status IS DISTINCT FROM 'DUPLICATE'");
    expect(migration).toContain("private.is_recruitment_publicly_trusted");
  });

  it("does not alter shared reference table policies or grant access to legacy tables", () => {
    expect(migration).not.toMatch(/CREATE POLICY .* ON public\\.(organizations|positions|exams|locations|qualifications|postings)/i);
    expect(migration).not.toMatch(/GRANT .* ON public\\.(postings|exams|locations|qualifications|evidence|recruitment_fees)/i);
  });
});
