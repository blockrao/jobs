import { describe, expect, test } from "vitest";
import { readSource, stripComments } from "../helpers/source";

/**
 * LIFE-002 (ledger A-089): the public lifecycle can say CLOSED, and nothing
 * maps a closed recruitment back to ACTIVE.
 */
describe("LIFE-002 recruitment lifecycle CLOSED state", () => {
  test("the Drizzle enum carries CLOSED between ACTIVE and RESULTS", () => {
    const schema = stripComments(readSource("src/db/schema.ts"));
    expect(schema).toMatch(/recruitmentStatusEnum = pgEnum\("recruitment_status", \[\s*"UPCOMING",\s*"ACTIVE",\s*"CLOSED",\s*"RESULTS",\s*"ARCHIVED",?\s*\]\)/);
  });

  test("the lifecycle function stores CLOSED for closed, admit-card and exam stages, never ACTIVE", () => {
    const fn = stripComments(readSource("supabase/migrations/20261014050100_life_002b_lifecycle_maps_closed.sql"));
    expect(fn).toContain("WHEN c2.cs = 'ACTIVE' THEN 'ACTIVE'");
    expect(fn).toContain("WHEN c2.cs IN ('CLOSED', 'ADMIT_CARD', 'EXAM') THEN 'CLOSED'");
    expect(fn).not.toMatch(/IN \('ACTIVE', 'CLOSED'/);
  });

  test("live-recruitment predicates never include CLOSED", () => {
    const queries = stripComments(readSource("src/lib/queries.ts"));
    for (const m of queries.matchAll(/status\}?\s+IN\s*\(([^)]*)\)/g)) {
      expect(m[1], m[0]).not.toContain("CLOSED");
    }
    expect(queries).toContain("IN ('ACTIVE','UPCOMING')");
  });

  test("the hub treats a CLOSED status as closed", () => {
    // The hub derives open/closed from the shared lifecycle rule (which maps a
    // CLOSED status, or a passed deadline, to "closed") and nothing else.
    const hub = stripComments(readSource("src/components/recruitment/recruitment-hub.tsx"));
    expect(hub).toContain("deriveLifecycle(recruitment.status, recruitment.applicationEndDate, now)");
    expect(hub).toContain("lifecycle.state === 'closed'");
    expect(hub).not.toMatch(/isRecruitmentClosed|status\.toLowerCase\(\) === 'closed'/);
  });
});
