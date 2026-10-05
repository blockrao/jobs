import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  NON_JOB_TITLE_PATTERN,
  buildApprovalSql,
  estimateTier,
  toCsv,
  triage,
  type ApprovedRow,
  type PendingRow,
} from "@/lib/content-quality/triage";

const NOW = new Date("2026-10-05T12:00:00Z");

const row = (o: Partial<PendingRow> & { id: number; title: string }): PendingRow => ({
  org: "Airports Authority of India",
  review_status: "PENDING",
  vac: 3,
  has_elig: true,
  desc_len: 220,
  official: true,
  apply: false,
  stage: "APPLICATION_OPEN",
  valid_through: "2026-10-20T18:29:59+00:00",
  canonical: true,
  canonical_slug: null,
  post_names: ["Manager"],
  location_region: "Delhi",
  flagged: false,
  ...o,
});

const approved: ApprovedRow[] = [
  { id: 900, slug: "aai-manager-900", title: "AAI Manager Recruitment 2026 - Apply Online", org: "Airports Authority of India", vac: 3, valid_through: "2026-10-20T18:29:59+00:00" },
  { id: 901, slug: "ssc-cgl-901", title: "SSC CGL 2026 Notification", org: "Staff Selection Commission", vac: 4500, valid_through: null },
];

const decide = (r: PendingRow, extra: PendingRow[] = []) => {
  const all = triage([r, ...extra], approved, NOW);
  return all[0];
};

describe("pending triage", () => {
  test("non-job pattern stays in sync with gate.ts", () => {
    const gate = readFileSync(path.resolve(__dirname, "../../../src/lib/content-quality/gate.ts"), "utf8");
    const m = gate.match(/const NON_JOB_TITLE_PATTERN =\s*\n\s*(\/.+\/i);/);
    expect(m?.[1]).toBe(String(NON_JOB_TITLE_PATTERN));
  });

  test("a complete open recruitment is APPROVE_READY and Tier A", () => {
    const r = decide(row({ id: 1, title: "BEL Senior Engineer Recruitment 2026 - Apply Online" }));
    expect(r.decision).toBe("APPROVE_READY");
    expect(r.reason).toContain("Tier A");
  });

  test("missing location or post title is Tier B but still ready", () => {
    const r = decide(row({ id: 2, title: "BEL Engineer Recruitment 2026", location_region: null, post_names: [] }));
    expect(r.decision).toBe("APPROVE_READY");
    expect(r.reason).toContain("Tier B");
    expect(estimateTier(row({ id: 2, title: "x", location_region: null })).missing).toEqual(["location"]);
  });

  test("admit card / result / stage updates are TIMELINE_ONLY and name the parent", () => {
    const r = decide(row({ id: 3, title: "SSC CGL Tier 1 Admit Card 2026", org: "Staff Selection Commission", stage: "ADMIT_CARD_RELEASED" }));
    expect(r.decision).toBe("TIMELINE_ONLY");
    expect(r.refId).toBe(901);
    expect(decide(row({ id: 4, title: "Foo Recruitment 2026", stage: "RESULT_OUT" })).decision).toBe("TIMELINE_ONLY");
  });

  test("passed deadline and old-cycle titles are REJECT_STALE; today's deadline is still open", () => {
    expect(decide(row({ id: 5, title: "Foo Recruitment 2026", valid_through: "2026-10-04T18:29:59+00:00" })).decision).toBe("REJECT_STALE");
    expect(decide(row({ id: 6, title: "Foo Recruitment 2023 Apply Online", valid_through: null })).decision).toBe("REJECT_STALE");
    expect(decide(row({ id: 7, title: "Foo Recruitment 2026", valid_through: "2026-10-05T18:29:59+00:00" })).decision).toBe("APPROVE_READY");
  });

  test("no deadline in the current year is HOLD_DATA, not approved", () => {
    const r = decide(row({ id: 8, title: "Foo Recruitment 2026", valid_through: null }));
    expect(r.decision).toBe("HOLD_DATA");
    expect(r.reason).toContain("no deadline");
  });

  test("duplicates: non-canonical, approved twin, pending twin", () => {
    expect(decide(row({ id: 9, title: "Foo Recruitment 2026", canonical: false, canonical_slug: "aai-manager-900" }))).toMatchObject({ decision: "DUPLICATE", refId: 900 });
    expect(decide(row({ id: 10, title: "AAI Manager Recruitment 2026 - Apply Offline" }))).toMatchObject({ decision: "DUPLICATE", refId: 900 });
    const a = row({ id: 11, title: "NTPC Assistant Officer Recruitment 2026", org: "NTPC Limited", vac: 15 });
    const b = row({ id: 12, title: "NTPC Assistant Officer Recruitment 2026 Notification Out", org: "NTPC Limited", vac: 15 });
    const out = triage([a, b], approved, NOW);
    expect(out.map((o) => o.decision)).toEqual(["APPROVE_READY", "DUPLICATE"]);
    expect(out[1].refId).toBe(11);
  });

  test("bucket and title-derived organizations are HOLD_DATA", () => {
    expect(decide(row({ id: 13, title: "Foo Recruitment 2026", org: "Educational Institution" })).reason).toContain("organization problem");
    expect(decide(row({ id: 14, title: "Foo Recruitment 2026", org: "Uttar Pradesh State Recruitment" })).decision).toBe("HOLD_DATA");
    expect(decide(row({ id: 15, title: "Foo Recruitment 2026", org: "TMB Various Posts" })).decision).toBe("HOLD_DATA");
  });

  test("missing facts, garbage post names and previously rejected rows are HOLD_DATA", () => {
    expect(decide(row({ id: 16, title: "Foo Recruitment 2026", vac: null })).reason).toContain("vacancies missing");
    expect(decide(row({ id: 17, title: "Foo Recruitment 2026", has_elig: false })).decision).toBe("HOLD_DATA");
    expect(decide(row({ id: 18, title: "Foo Recruitment 2026", official: false, apply: false })).decision).toBe("HOLD_DATA");
    expect(decide(row({ id: 19, title: "Foo Recruitment 2026", post_names: ["No of Posts"] })).decision).toBe("HOLD_DATA");
    expect(decide(row({ id: 20, title: "Foo Recruitment 2026", vac: 2026 })).reason).toContain("looks like a year");
    expect(decide(row({ id: 21, title: "Foo Recruitment 2026", review_status: "REJECTED" })).decision).toBe("HOLD_DATA");
    expect(decide(row({ id: 22, title: "Foo Recruitment 2026", flagged: true })).decision).toBe("HOLD_DATA");
  });

  test("CSV has the required header and escapes commas and quotes", () => {
    const csv = toCsv([{ id: 1, title: 'A, "B"', org: "O", decision: "HOLD_DATA", reason: "r" }]);
    expect(csv.split("\n")[0]).toBe("id,title,org,decision,reason");
    expect(csv).toContain('1,"A, ""B""",O,HOLD_DATA,r');
  });
});

describe("approval SQL", () => {
  const sql = buildApprovalSql([5, 3, 3, 9], { generatedOn: "2026-10-05" });

  test("backup table comes first, with the exact columns, for the sorted unique ids", () => {
    const iBackup = sql.indexOf("CREATE TABLE IF NOT EXISTS backup_20261005.pending_approval_backup AS");
    expect(iBackup).toBeGreaterThan(-1);
    expect(sql).toContain("SELECT id, review_status, publishing_status, index_tier, quality_missing");
    expect(sql).toContain("FROM public.postings WHERE id IN (3, 5, 9);");
    expect(sql.search(/^UPDATE public\.postings p SET/m)).toBeGreaterThan(iBackup);
  });

  test("update changes the approval columns and is guarded by PENDING", () => {
    expect(sql).toContain("review_status = 'APPROVED'");
    expect(sql).toContain("publishing_status = 'AUTOMATED_VALIDATION_PASS'");
    expect(sql).toContain("index_tier = s.tier");
    expect(sql).toContain("quality_missing = s.missing");
    expect(sql.match(/review_status = 'PENDING'/g)!.length).toBeGreaterThanOrEqual(2);
    expect(sql).toContain("s.tier <> 'C'");
  });

  test("the SQL tier mirrors the six gate facts and three disqualifiers", () => {
    for (const k of ["extracted_job_title", "vacancies", "eligibility", "location", "application_mechanism", "description"]) expect(sql).toContain(`THEN '${k}'`);
    expect(sql).toContain("\\y(admit card|hall ticket|answer key|city intimation|intimation slip|result|scholarship|admissions?|syllabus)\\y");
    expect(sql).toContain("p.is_canonical IS FALSE");
    expect(sql).toContain("p.valid_through < now()");
    expect(sql).toContain("< 150");
    expect(sql).toContain("< 30");
  });

  test("no aggregator names appear in the script", () => {
    expect(sql).not.toMatch(/sarkari|freejob|arattai/i);
  });
});
