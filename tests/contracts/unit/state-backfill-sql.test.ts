import { describe, expect, test } from "vitest";
import { buildBackfill, sqlString, type BackfillRow } from "@/lib/states/backfill-sql";

const row = (o: Partial<BackfillRow> & { id: number; title: string }): BackfillRow => ({
  organizationName: null,
  locationRegion: null,
  locationCity: null,
  organizationState: null,
  reviewStatus: "approved",
  currentLocationRegion: null,
  ...o,
});

const fixture: BackfillRow[] = [
  row({ id: 1, title: "UPESSC UP PRT Assistant Teacher", organizationName: "UPESSC" }),
  row({ id: 2, title: "SSC CGL 2026", organizationName: "SSC" }),
  row({ id: 3, title: "Clerk, Grade 'A'", organizationName: "RPSC", locationRegion: "Jaipur, Rajasthan" }),
  row({ id: 4, title: "GSRTC Helper", organizationName: "GSRTC", locationCity: "Surat" }),
  row({ id: 5, title: "Patwari", organizationName: "RSMSSB", currentLocationRegion: "Rajasthan" }),
  row({ id: 6, title: 'Board "Special", Officer', organizationName: "Some Board", organizationState: "Odisha" }),
  row({ id: 1, title: "duplicate id ignored" }),
];

describe("state backfill SQL generator", () => {
  const out = buildBackfill(fixture);

  test("counts and unresolved list", () => {
    expect(out.resolvedCount).toBe(5);
    expect(out.unresolvedIds).toEqual([2]);
  });

  test("backup table is created before any update", () => {
    const iBackup = out.sql.indexOf("CREATE TABLE backup_20261005.postings_state_backfill");
    const iUpdate = out.sql.indexOf("UPDATE public.postings");
    expect(iBackup).toBeGreaterThan(-1);
    expect(iUpdate).toBeGreaterThan(iBackup);
    expect(out.sql).toContain("SELECT id, location_region, state_slug FROM public.postings WHERE id IN (1, 3, 4, 5, 6);");
  });

  test("slug update is fill-only", () => {
    expect(out.sql).toContain("SET state_slug = v.slug");
    expect(out.sql).toContain("WHERE p.id = v.id AND p.state_slug IS NULL;");
    expect(out.sql).toContain("(1, 'uttar-pradesh')");
    expect(out.sql).toContain("(3, 'rajasthan')");
    expect(out.sql).toContain("(4, 'gujarat')");
    expect(out.sql).not.toContain("(2,");
  });

  test("region fill: only no-location rows whose basis is not location_region", () => {
    const regionStmt = out.sql.slice(out.sql.indexOf("SET location_region"));
    expect(regionStmt).toContain("(1, 'uttar-pradesh', 'Uttar Pradesh')");
    expect(regionStmt).toContain("(6, 'odisha', 'Odisha')");
    expect(regionStmt).not.toContain("(3,"); // has location data
    expect(regionStmt).not.toContain("(4,"); // has a city
    expect(regionStmt).not.toContain("(5,"); // has a current region
    expect(regionStmt).toContain("p.location_region IS NULL AND p.location_city IS NULL");
    expect(out.regionFillCount).toBe(2);
  });

  test("verification query present, titles never enter SQL", () => {
    expect(out.sql).toContain("SELECT state_slug, count(*)");
    expect(out.sql).not.toContain("Grade");
    expect(out.sql).not.toContain("Special");
  });

  test("CSV escaping and unresolved rows", () => {
    const lines = out.csv.trim().split("\n");
    expect(lines[0]).toBe("id,title,slug,basis");
    expect(out.csv).toContain('3,"Clerk, Grade \'A\'",rajasthan,location_region');
    expect(out.csv).toContain('6,"Board ""Special"", Officer",odisha,organization_state');
    expect(out.csv).toContain("2,SSC CGL 2026,,unresolved");
  });

  test("sqlString doubles single quotes", () => {
    expect(sqlString("O'Neil; DROP TABLE x;--")).toBe("'O''Neil; DROP TABLE x;--'");
  });

  test("rejects non-integer ids and handles all-unresolved input", () => {
    expect(() => buildBackfill([row({ id: 1.5, title: "x" })])).toThrow();
    const none = buildBackfill([row({ id: 9, title: "Junior Engineer" })]);
    expect(none.sql).not.toContain("CREATE TABLE");
    expect(none.sql).not.toContain("UPDATE");
    expect(none.unresolvedIds).toEqual([9]);
  });
});
