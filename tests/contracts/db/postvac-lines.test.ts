/**
 * Post/Vacancy increment (A1) contract, against the local scratch database only.
 *   WP001_SCRATCH_DATABASE_URL=postgres://postgres:pw@localhost:54329/scratch npm run test:contracts
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import postgres from "postgres";

const url = process.env.WP001_SCRATCH_DATABASE_URL;
const host = url ? new URL(url).hostname : "";
if (url && !["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) throw new Error(`refuses non-local database host "${host}"`);
const sql = url ? postgres(url, { max: 2, connect_timeout: 10, idle_timeout: 5, onnotice: () => {} }) : null;

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
    externalId: `PV${n}`,
    sourceUrl: `https://example.invalid/articles/pv-${n}`,
    title: `PV Recruitment 2026 Apply Online ${n}`,
    kind: "GOVERNMENT" as const,
    organizationName: "Staff Selection Commission (SSC)",
    organizationFromLabel: true,
    description: "Test notice.",
    totalVacancies: 10,
    validThrough: new Date("2030-01-15T00:00:00Z"),
    datePosted: new Date("2026-10-01T00:00:00Z"),
    officialNotificationUrl: "https://ssc.gov.in/n.pdf",
    confidence: 100,
    ...over,
  } as import("@/ingest/types").RawPosting;
}
const names = async () => (await sql!`select name, vacancy_total from public.posts order by name`).map((r) => [r.name, r.vacancy_total]);

describe.skipIf(!sql)("Post/Vacancy per-line Posts (scratch database)", () => {
  beforeEach(async () => {
    await sql!.unsafe(`truncate ${TABLES} restart identity cascade`);
    await sql!`insert into public.organizations (slug, name, sector) values ('staff-selection-commission','Staff Selection Commission','GOVERNMENT_CENTRAL')`;
  });

  test("PV-01 one accepted Post per qualifying line, vacancy_total from that line", async () => {
    await processRaw([raw({ postTable: [{ name: "Junior Assistant", vacancies: 6 }, { name: "Senior Clerk", vacancies: 4 }], postNames: ["Junior Assistant", "Senior Clerk"] })]);
    expect(await names()).toEqual([["Junior Assistant", 6], ["Senior Clerk", 4]]);
  });

  test("PV-02 rejected lines create no Post and add nothing to any vacancy_total", async () => {
    await processRaw([raw({ postTable: [{ name: "Junior Assistant", vacancies: 6 }, { name: "Athletics", vacancies: 5 }, { name: "28", vacancies: 4 }, { name: "Department of Dictionary", vacancies: 1 }, { name: "Civil Engineering", vacancies: 2 }, { name: "Clerk/Typist", vacancies: 3 }], postNames: ["Junior Assistant"] })]);
    expect(await names()).toEqual([["Junior Assistant", 6]]);
    const [{ s }] = await sql!`select coalesce(sum(vacancy_total),0)::int s from public.posts`;
    expect(s).toBe(6);
  });

  test("PV-03 a multi-line notice links no single Post to the posting (unit rule); a one-line notice does", async () => {
    await processRaw([raw({ postTable: [{ name: "Junior Assistant", vacancies: 6 }, { name: "Senior Clerk", vacancies: 4 }] }), raw({ postTable: [{ name: "Librarian", vacancies: 1 }] })]);
    const rows = await sql!`select title, inferred_post_id from public.postings order by id`;
    expect(rows[0].inferred_post_id).toBeNull();
    expect(rows[1].inferred_post_id).not.toBeNull();
  });

  test("PV-04 re-ingest is idempotent: no duplicate Posts", async () => {
    const r = raw({ postTable: [{ name: "Junior Assistant", vacancies: 6 }, { name: "Senior Clerk", vacancies: 4 }] });
    await processRaw([r]);
    await processRaw([r]);
    await processRaw([r]);
    expect((await names()).length).toBe(2);
  });

  test("PV-05 renamed source line (same count) resolves to the existing Post, no duplicate", async () => {
    const a = raw({ externalId: "REN1", postTable: [{ name: "Junior Research Fellow", vacancies: 1 }, { name: "Project Associate-I", vacancies: 3 }] });
    await processRaw([a]);
    await processRaw([{ ...a, postTable: [{ name: "Junior Research Fellow (JRF)", vacancies: 1 }, { name: "Project Associate - I", vacancies: 3 }] }]);
    expect(await names()).toEqual([["Junior Research Fellow", 1], ["Project Associate-I", 3]]);
  });

  test("PV-06 renamed line with a different count is unresolved: no duplicate Post is created", async () => {
    const a = raw({ externalId: "REN2", postTable: [{ name: "Junior Research Fellow", vacancies: 1 }, { name: "Senior Clerk", vacancies: 3 }] });
    await processRaw([a]);
    await processRaw([{ ...a, postTable: [{ name: "Junior Research Fellow (JRF)", vacancies: 5 }, { name: "Senior Clerk", vacancies: 3 }] }]);
    expect((await names()).length).toBe(2);
  });

  test("PV-07 existing Posts are never modified, even when a line with new data matches them", async () => {
    await processRaw([raw({ externalId: "IMM", postTable: [{ name: "Librarian", vacancies: 1 }] })]);
    const before = await sql!`select * from public.posts`;
    await processRaw([raw({ externalId: "IMM", postTable: [{ name: "Librarian", vacancies: 9 }, { name: "Senior Clerk", vacancies: 2 }] })]);
    const after = await sql!`select * from public.posts where id = ${before[0].id}`;
    expect(JSON.stringify(after[0])).toBe(JSON.stringify(before[0]));
  });

  test("PV-08 a count mismatch between accepted lines and the stated total does not change vacancy_total", async () => {
    await processRaw([raw({ totalVacancies: 99, postTable: [{ name: "Junior Assistant", vacancies: 6 }, { name: "Senior Clerk", vacancies: 4 }] })]);
    expect(await names()).toEqual([["Junior Assistant", 6], ["Senior Clerk", 4]]);
  });

  test("PV-09 ingestion publishes nothing: postings stay PENDING/DRAFT", async () => {
    await processRaw([raw({ postTable: [{ name: "Junior Assistant", vacancies: 6 }] })]);
    const r = await sql!`select review_status, publishing_status from public.postings`;
    expect(r.every((x) => x.review_status === "PENDING" && x.publishing_status === "DRAFT")).toBe(true);
  });

  test("PV-10 an adapter with a name but no per-line count creates a Post with a null vacancy_total", async () => {
    await processRaw([raw({ postNames: ["Junior Assistant"], totalVacancies: 100 })]);
    expect(await names()).toEqual([["Junior Assistant", null]]);
  });
});
