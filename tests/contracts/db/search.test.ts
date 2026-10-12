/**
 * A-068 search contract: the search code must actually run queries and filter
 * parameters must line up in every combination.
 *
 * A-084 (SEARCH-002, owner decision 2026-10-12): a text search matches title,
 * subject and body, matches partial words, falls back to the closest postings
 * when nothing matches every word, and finds postings past their last date,
 * listed after the open ones and flagged closed. Browsing without a text query
 * still shows open postings only (listing guard, A-067).
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
    expect(both.map((x: any) => x.slug)).toEqual(["clerk-a", "old-clerk"]);
    const none = await searchPostings({ query: "engineer", organizationId: orgA } as any);
    expect(none).toEqual([]);
  });

  test("S-4 a posting past its last date is found by a text query, flagged closed and listed after open matches", async () => {
    const only = await searchPostings({ query: "senior" } as any);
    expect(only.map((x) => [x.slug, x.isClosed, x.urgencyBadge])).toEqual([["old-clerk", true, "Closed"]]);
    for (const sortBy of ["relevance", "newest", "closing_soonest", "most_urgent"] as const) {
      const mixed = await searchPostings({ query: "clerk", sortBy });
      expect(mixed.map((x) => [x.slug, x.isClosed])).toEqual([
        ["clerk-a", false],
        ["old-clerk", true],
      ]);
    }
  });

  test("S-5 location filter lines up with a query", async () => {
    await sql!`update public.postings set location_region='Bihar' where slug='clerk-a'`;
    const r = await searchPostings({ query: "clerk", locationRegion: "Bihar" } as any);
    expect(r.map((x: any) => x.slug)).toEqual(["clerk-a"]);
  });

  test("S-6 browsing without a text query never returns a closed posting; the Expired filter returns only closed ones", async () => {
    for (const sortBy of ["relevance", "newest", "closing_soonest", "most_urgent"] as const) {
      const r = await searchPostings({ sortBy });
      expect(r.map((x) => x.slug).sort()).toEqual(["clerk-a", "engineer-b", "undated"]);
      expect(r.every((x) => !x.isClosed)).toBe(true);
    }
    const closed = await searchPostings({ closingState: "EXPIRED" });
    expect(closed.map((x) => x.slug)).toEqual(["old-clerk"]);
  });

  test("S-7 a partial word matches", async () => {
    expect((await searchPostings({ query: "engin" })).map((x) => x.slug)).toEqual(["engineer-b"]);
    expect((await searchPostings({ query: "typi" })).map((x) => x.slug)).toEqual(["undated"]);
    expect((await searchPostings({ query: "ecruitm" })).map((x) => x.slug).sort()).toEqual([
      "clerk-a",
      "engineer-b",
      "old-clerk",
      "undated",
    ]);
  });

  test("S-8 the body and the post names are searched, and a title match ranks above a body match", async () => {
    await sql!`update public.postings set description = 'Work covers hydraulics and typist duties' where slug = 'engineer-b'`;
    await sql!`update public.postings set post_names = '["Stenographer Grade II"]'::jsonb where slug = 'clerk-a'`;
    await sql!`select * from public.refresh_posting_urgency_states()`;
    expect((await searchPostings({ query: "hydraulics" })).map((x) => x.slug)).toEqual(["engineer-b"]);
    expect((await searchPostings({ query: "stenographer" })).map((x) => x.slug)).toEqual(["clerk-a"]);
    expect((await searchPostings({ query: "typist", sortBy: "relevance" })).map((x) => x.slug)).toEqual([
      "undated",
      "engineer-b",
    ]);
  });

  test("S-9 every word must match; when nothing matches every word the closest postings are returned as partial", async () => {
    const full = await searchPostings({ query: "assistant engineer recruitment" });
    expect(full.map((x) => [x.slug, x.matchQuality])).toEqual([["engineer-b", "full"]]);
    const closest = await searchPostings({ query: "assistant engineer zzqqxx" });
    expect(closest.map((x) => [x.slug, x.matchQuality])).toEqual([["engineer-b", "partial"]]);
    expect(await searchPostings({ query: "zzqqxx" })).toEqual([]);
  });

  test("S-10 words the text index ignores, punctuation and wildcard characters do not break or widen a query", async () => {
    expect((await searchPostings({ query: "the junior clerk - for recruitment" })).map((x) => x.slug)).toEqual(["clerk-a"]);
    expect(await searchPostings({ query: "100%_" })).toEqual([]);
    expect(await searchPostings({ query: "%%%%" })).toEqual([]);
    // Query-syntax characters are data, not operators.
    expect(await searchPostings({ query: "xq:yq & wq | !zq ( ' \\ :*" })).toEqual([]);
    const operators = await searchPostings({ query: "clerk:* | engineer & !typist" });
    expect(operators.map((x) => x.slug).sort()).toEqual(["clerk-a", "engineer-b", "old-clerk", "undated"]);
    expect(operators.every((x) => x.matchQuality === "partial")).toBe(true);
  });

  test("S-11 rows are returned in the camelCase shape the page reads, with the canonical link", async () => {
    const [row] = await searchPostings({ query: "junior clerk" });
    expect(row).toMatchObject({
      slug: "clerk-a",
      href: "/jobs/clerk-a",
      organizationName: "Org A",
      isClosed: false,
      matchQuality: "full",
    });
    expect(typeof row.daysToClosing).toBe("number");
    expect(row.daysToClosing).toBeGreaterThan(0);
    expect(Object.keys(row).some((k) => k.includes("_"))).toBe(false);
    expect(row.validThrough).toBe("2099-01-01T00:00:00.000Z");
    expect(row.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    const [undated] = await searchPostings({ query: "typist" });
    expect(undated.daysToClosing).toBeNull();
    expect(undated.validThrough).toBeNull();
  });

  test("S-12 a failing query is an error, not an empty result", async () => {
    await sql!`alter table public.postings rename column search_text to search_text_tmp`;
    try {
      await expect(searchPostings({ query: "clerk" })).rejects.toThrow("Search query failed");
    } finally {
      await sql!`alter table public.postings rename column search_text_tmp to search_text`;
    }
  });
});
