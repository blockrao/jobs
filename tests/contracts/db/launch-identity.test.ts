/**
 * Launch-load contract: the advertisement number is the strong recruitment
 * identity key, and recruitment dates are filled or extended (never shortened).
 *
 * Opt-in and WRITES; local scratch database only:
 *   WP001_SCRATCH_DATABASE_URL=postgres://postgres:pw@localhost:54329/scratch npm run test:contracts
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import postgres from "postgres";
import { normalizeAdvertisementNumber } from "@/ingest/resolve";

describe("normalizeAdvertisementNumber (pure)", () => {
  test("LI-U1 strips a label, collapses whitespace, keeps the reference", () => {
    expect(normalizeAdvertisementNumber("Advt. No.  CRPD/SCO/2026-27/23")).toBe("CRPD/SCO/2026-27/23");
    expect(normalizeAdvertisementNumber("Notification No: 05/2026")).toBe("05/2026");
    expect(normalizeAdvertisementNumber("  CEN 05/2026 ")).toBe("CEN 05/2026");
  });
  test("LI-U2 rejects values that cannot identify a notice", () => {
    for (const v of [null, undefined, "", "  ", "NA", "N/A", "-", "TBD", "12", "Advt. No."]) {
      expect(normalizeAdvertisementNumber(v as string)).toBeNull();
    }
  });
});

const url = process.env.WP001_SCRATCH_DATABASE_URL;
const host = url ? new URL(url).hostname : "";
const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);
if (url && !local) throw new Error(`launch-identity tests refuse non-local database host "${host}"`);
const sql = url ? postgres(url, { max: 2, connect_timeout: 10, idle_timeout: 5, onnotice: () => {} }) : null;
const d = url ? describe : describe.skip;

let processRaw: typeof import("@/ingest/pipeline").processRaw;
beforeAll(async () => {
  if (!url) return;
  process.env.DATABASE_URL = url;
  ({ processRaw } = await import("@/ingest/pipeline"));
});
afterAll(async () => {
  await sql?.end();
});

const TABLES =
  "public.source_observations, public.organization_candidates, public.organization_aliases, public.posting_updates, public.posting_categories, public.postings, public.posts, public.recruitments, public.source_documents, public.sources, public.organizations, public.positions";

let n = 0;
function raw(over: Record<string, unknown> = {}) {
  n++;
  return {
    source: "freejobalert",
    externalId: `LI${n}`,
    sourceUrl: `https://example.invalid/articles/li-${n}`,
    title: `Combined Test Examination 2026 Apply Online ${n}`,
    kind: "GOVERNMENT" as const,
    organizationName: "Staff Selection Commission (SSC)",
    organizationFromLabel: true,
    description: "Test notice.",
    postNames: ["Junior Assistant"],
    totalVacancies: 100,
    validThrough: new Date("2030-01-15T00:00:00Z"),
    datePosted: new Date("2026-10-01T00:00:00Z"),
    officialNotificationUrl: "https://ssc.gov.in/n.pdf",
    confidence: 100,
    ...over,
  } as import("@/ingest/types").RawPosting;
}

d("advertisement number identity and recruitment dates", () => {
  beforeEach(async () => {
    await sql!.unsafe(`truncate ${TABLES} restart identity cascade`);
    await sql!`insert into public.organizations (slug, name, sector) values ('staff-selection-commission','Staff Selection Commission','GOVERNMENT_CENTRAL')`;
  });

  const recs = () => sql!`select id, official_notification_number n, application_start_date s, application_end_date e from public.recruitments order by id`;

  test("LI-1 two notices with the same organization and advertisement number share one recruitment", async () => {
    await processRaw([raw({ title: "SSC CHSL 2026 Online Form", advertisementNumber: "Advt. No. CHSL/2026" })]);
    await processRaw([raw({ title: "Combined Higher Secondary 10+2 Examination 2026 Apply Online for Posts", advertisementNumber: "CHSL/2026" })]);
    const r = await recs();
    expect(r).toHaveLength(1);
    expect(r[0].n).toBe("CHSL/2026");
    const p = await sql!`select count(distinct inferred_recruitment_id)::int c from public.postings`;
    expect(p[0].c).toBe(1);
  });

  test("LI-2 different advertisement numbers under one organization stay separate recruitments", async () => {
    await processRaw([raw({ title: "Wealth Management Specialist Cadre Officers", advertisementNumber: "CRPD/SCO/2026-27/23" })]);
    await processRaw([raw({ title: "Wealth Management Specialist Cadre Officers", advertisementNumber: "CRPD/SCO/2026-27/24" })]);
    expect(await recs()).toHaveLength(2);
  });

  test("LI-3 an unusable number does not become a key (falls back, no false merge)", async () => {
    await processRaw([raw({ advertisementNumber: "NA" })]);
    const r = await recs();
    expect(r).toHaveLength(1);
    expect(r[0].n).toBeNull();
  });

  test("LI-4 recruitment dates: start is filled once, end is extended and never shortened", async () => {
    const start = new Date("2026-09-04T00:00:00Z");
    await processRaw([raw({ advertisementNumber: "X/1/2026", applicationStartDate: start, validThrough: new Date("2026-09-25T00:00:00Z") })]);
    let r = await recs();
    expect(new Date(r[0].s).toISOString()).toBe(start.toISOString());
    expect(new Date(r[0].e).toISOString()).toBe("2026-09-25T00:00:00.000Z");

    // a later sighting extends the end date and does not move the start
    await processRaw([raw({ advertisementNumber: "X/1/2026", applicationStartDate: new Date("2026-09-10T00:00:00Z"), validThrough: new Date("2026-10-05T00:00:00Z") })]);
    r = await recs();
    expect(r).toHaveLength(1);
    expect(new Date(r[0].s).toISOString()).toBe(start.toISOString());
    expect(new Date(r[0].e).toISOString()).toBe("2026-10-05T00:00:00.000Z");

    // an earlier date never shortens it
    await processRaw([raw({ advertisementNumber: "X/1/2026", validThrough: new Date("2026-09-20T00:00:00Z") })]);
    r = await recs();
    expect(new Date(r[0].e).toISOString()).toBe("2026-10-05T00:00:00.000Z");
  });
});
