/**
 * A-068 search contract: the search code must actually run queries, filter
 * parameters must line up in every combination, and a posting past its last
 * date must not be returned (same rule as the listing guard, A-067).
 *
 * Opt-in and WRITES; local scratch database only:
 *   WP001_SCRATCH_DATABASE_URL=postgres://postgres:pw@localhost:54329/scratch npm run test:contracts
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import postgres from "postgres";

const url = process.env.WP001_SCRATCH_DATABASE_URL;
const host = url ? new URL(url).hostname : "";
const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);
if (url && !local) throw new Error(`search tests refuse non-local database host "${host}"`);
const sql = url ? postgres(url, { max: 2, connect_timeout: 10, idle_timeout: 5, onnotice: () => {} }) : null;

let searchPostings: typeof import("@/lib/search-queries").searchPostings;

beforeAll(async () => {
  if (!url) return;
  process.env.DATABASE_URL = url;
  ({ searchPostings } = await import("@/lib/search-queries"));
});
afterAll(async () => {
  await sql?.end();
});

const d = url ? describe : describe.skip;

async function addPosting(slug: string, title: string, orgId: number, validThrough: string | null) {
  await sql!`insert into public.postings
    (slug, title, organization_id, review_status, publishing_status, is_expired, valid_through, description, kind)
    values (${slug}, ${title}, ${orgId}, 'APPROVED', 'PUBLISHED', false, ${validThrough}, ${title + " vacancy notice details"}, 'GOVERNMENT')`;
}

d("search (A-068)", () => {
  let orgA = 0;
  let orgB = 0;
  beforeEach(async () => {
    await sql!`truncate public.postings, public.organizations restart identity cascade`;
    const a = await sql!`insert into public.organizations (slug, name, sector) values ('org-a','Org A','GOVERNMENT_CENTRAL') returning id`;
    const b = await sql!`insert into public.organizations (slug, name, sector) values ('org-b','Org B','GOVERNMENT_CENTRAL') returning id`;
    orgA = a[0].id;
    orgB = b[0].id;
    await addPosting("clerk-a", "Junior Clerk Recruitment", orgA, "2099-01-01");
    await addPosting("engineer-b", "Assistant Engineer Recruitment", orgB, "2099-01-01");
    await addPosting("old-clerk", "Senior Clerk Recruitment", orgA, "2020-01-01");
    await addPosting("undated", "Typist Recruitment", orgA, null);
    // search_text and the urgency states are derived columns; promotion must be followed by this refresh.
    await sql!`select * from public.refresh_posting_urgency_states()`;
  });

  test("S-1 no filter returns the live postings (the query runs at all)", async () => {
    const r = await searchPostings({ sortBy: "newest" } as any);
    const slugs = r.map((x: any) => x.slug).sort();
    expect(slugs).toEqual(["clerk-a", "engineer-b", "undated"]);
  });

  test("S-2 text query matches by full-text", async () => {
    const r = await searchPostings({ query: "engineer" } as any);
    expect(r.map((x: any) => x.slug)).toEqual(["engineer-b"]);
  });

  test("S-3 organization filter alone and with a query line up their parameters", async () => {
    const only = await searchPostings({ organizationId: orgA } as any);
    expect(only.map((x: any) => x.slug).sort()).toEqual(["clerk-a", "undated"]);
    const both = await searchPostings({ query: "clerk", organizationId: orgA } as any);
    expect(both.map((x: any) => x.slug)).toEqual(["clerk-a"]);
    const none = await searchPostings({ query: "engineer", organizationId: orgA } as any);
    expect(none).toEqual([]);
  });

  test("S-4 a posting past its last date is not returned even if not flagged expired", async () => {
    const r = await searchPostings({ query: "senior" } as any);
    expect(r).toEqual([]);
  });

  test("S-5 location filter lines up with a query", async () => {
    await sql!`update public.postings set location_region='Bihar' where slug='clerk-a'`;
    const r = await searchPostings({ query: "clerk", locationRegion: "Bihar" } as any);
    expect(r.map((x: any) => x.slug)).toEqual(["clerk-a"]);
  });
});
