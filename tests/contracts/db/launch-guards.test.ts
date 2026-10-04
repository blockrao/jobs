/**
 * Launch-load contract (owner approval 2026-10-04): entity pages list current
 * postings only, and /jobs paginates without gaps or repeats.
 *
 * Opt-in and WRITES; local scratch database only:
 *   WP001_SCRATCH_DATABASE_URL=postgres://postgres:pw@localhost:54329/scratch npm run test:contracts
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import postgres from "postgres";
import { isPastLastDate } from "@/lib/queries";
import { JOBS_PAGE_SIZE, pageHref, parsePage } from "@/lib/pagination";

describe("pagination helpers (pure)", () => {
  test("LG-U1 parsePage accepts positive integers and falls back to 1", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
    expect(parsePage("3")).toBe(3);
    expect(parsePage("999999")).toBe(200);
    expect(JOBS_PAGE_SIZE).toBe(50);
  });
  test("LG-U2 pageHref keeps filters and drops page 1", () => {
    expect(pageHref("/jobs", {}, 1)).toBe("/jobs");
    expect(pageHref("/jobs", { kind: "GOVERNMENT" }, 2)).toBe("/jobs?kind=GOVERNMENT&page=2");
    expect(pageHref("/jobs", { kind: undefined, q: "clerk" }, 3)).toBe("/jobs?q=clerk&page=3");
  });
  test("LG-U3 isPastLastDate: the last date itself counts, unknown does not exclude", () => {
    const now = new Date("2026-10-04T10:00:00Z");
    expect(isPastLastDate(null, now)).toBe(false);
    expect(isPastLastDate("2026-10-04T00:00:00Z", now)).toBe(false);
    expect(isPastLastDate("2026-10-03T23:59:59Z", now)).toBe(true);
    expect(isPastLastDate("2026-10-16T12:30:00Z", now)).toBe(false);
  });
});

const url = process.env.WP001_SCRATCH_DATABASE_URL;
const host = url ? new URL(url).hostname : "";
const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);
if (url && !local) throw new Error(`launch-guard tests refuse non-local database host "${host}"`);
const sql = url ? postgres(url, { max: 2, connect_timeout: 10, idle_timeout: 5, onnotice: () => {} }) : null;
const d = url ? describe : describe.skip;

let q: typeof import("@/lib/queries");

beforeAll(async () => {
  if (!url) return;
  process.env.DATABASE_URL = url;
  q = await import("@/lib/queries");
});
afterAll(async () => {
  await sql?.end();
});

async function addPosting(slug: string, orgId: number, examId: number | null, validThrough: string | null, expired = false, datePosted = "2026-10-01") {
  const r = await sql!`insert into public.postings
    (slug, title, organization_id, exam_id, review_status, publishing_status, is_expired, valid_through, date_posted, description, kind)
    values (${slug}, ${slug}, ${orgId}, ${examId}, 'APPROVED', 'PUBLISHED', ${expired}, ${validThrough}, ${datePosted}, 'd', 'GOVERNMENT') returning id`;
  return r[0].id as number;
}

d("entity pages and pagination", () => {
  let org = 0;
  let exam = 0;
  beforeEach(async () => {
    await sql!`truncate public.postings, public.exams, public.commissions, public.categories, public.organizations restart identity cascade`;
    org = (await sql!`insert into public.organizations (slug, name, sector) values ('o','O','GOVERNMENT_CENTRAL') returning id`)[0].id;
    const c = (await sql!`insert into public.commissions (slug, name) values ('c','C') returning id`)[0].id;
    exam = (await sql!`insert into public.exams (commission_id, slug, label) values (${c}, 'e', 'E') returning id`)[0].id;
  });

  test("LG-1 organization, exam, commission and category pages exclude past-date and expired postings", async () => {
    const live = await addPosting("live", org, exam, "2099-01-01");
    const undated = await addPosting("undated", org, exam, null);
    const past = await addPosting("past", org, exam, "2020-01-01");
    await addPosting("flagged", org, exam, "2099-01-01", true);
    const cat = (await sql!`insert into public.categories (slug, name) values ('k','K') returning id`)[0].id;
    for (const id of [live, undated, past]) await sql!`insert into public.posting_categories (posting_id, category_id) values (${id}, ${cat})`;

    const bySlug = (rows: any[]) => rows.map((r) => r.slug).sort();
    const o = await q.getOrganizationBySlug("o");
    expect(bySlug(o!.postings)).toEqual(["live", "undated"]);
    expect(bySlug(await q.getPostingsByExam("e"))).toEqual(["live", "undated"]);
    expect(bySlug(await q.getPostingsByCommission("c"))).toEqual(["live", "undated"]);
    const k = await q.getCategoryBySlug("k");
    expect(bySlug(k!.postings)).toEqual(["live", "undated"]);
  });

  test("LG-2 /jobs pages are disjoint, ordered, and complete", async () => {
    for (let i = 0; i < 7; i++) await addPosting(`p${i}`, org, exam, "2099-01-01", false, `2026-10-0${(i % 3) + 1}`);
    const p1 = await q.listPostings({ limit: 3, offset: 0 });
    const p2 = await q.listPostings({ limit: 3, offset: 3 });
    const p3 = await q.listPostings({ limit: 3, offset: 6 });
    const ids = [...p1, ...p2, ...p3].map((r) => r.id);
    expect(ids.length).toBe(7);
    expect(new Set(ids).size).toBe(7);
    expect(p3.length).toBe(1);
    const all = await q.listPostings({ limit: 50 });
    expect(all.map((r) => r.id)).toEqual(ids);
  });
});
