/**
 * A-068 search contract: the search code must actually run queries and filter
 * parameters must line up in every combination.
 *
 * A-084 (SEARCH-002, owner decision 2026-10-12): a text search matches title,
 * subject and body, matches partial words, falls back to the closest results
 * when nothing matches every word, and finds jobs past their last date,
 * listed after the open ones and flagged closed. Browsing without a text query
 * still shows open jobs only (listing guard, A-067).
 *
 * A-086 (SEARCH-003, owner decision 2026-10-13): the unit of search is the
 * recruitment with its live posts. A recruitment with live posts is found
 * whether or not it has an approved posting row; text of an unapproved posting
 * is never matched; a result lists the posts whose title matched.
 *
 * Opt-in and WRITES; local scratch database only:
 *   WP001_SCRATCH_DATABASE_URL=postgres://postgres:pw@localhost:54329/scratch npm run test:contracts
 * The scratch database needs migrations 20261008130000 (posts.title, isLive),
 * 20261012161000 and 20261013042000 applied on top of setup-scratch.sh.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import postgres from "postgres";

const url = process.env.WP001_SCRATCH_DATABASE_URL;
const host = url ? new URL(url).hostname : "";
const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);
if (url && !local) throw new Error(`search tests refuse non-local database host "${host}"`);
const sql = url ? postgres(url, { max: 2, connect_timeout: 10, idle_timeout: 5, onnotice: () => {} }) : null;

let searchPostings: typeof import("@/lib/search-queries").searchPostings;
// Any value of the position_category enum; read from the scratch database.
let positionCategory = "";

beforeAll(async () => {
  if (!url) return;
  process.env.DATABASE_URL = url;
  ({ searchPostings } = await import("@/lib/search-queries"));
  const labels = await sql!`select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'position_category' order by enumsortorder limit 1`;
  positionCategory = labels[0].enumlabel;
});
afterAll(async () => {
  await sql?.end();
});

const d = url ? describe : describe.skip;

type Listing = "approved" | "pending" | "none";

/**
 * One job: a recruitment, optionally its posting row (approved or pending) and
 * its posts. The recruitment slug is `slug`; the posting slug is `${slug}-p`.
 */
async function addJob(
  slug: string,
  title: string,
  orgId: number,
  lastDate: string | null,
  opts: { listing?: Listing; posts?: string[]; description?: string } = {},
): Promise<number> {
  const listing = opts.listing ?? "approved";
  const [rec] = await sql!`insert into public.recruitments (organization_id, year, name, slug, application_end_date)
    values (${orgId}, 2026, ${title}, ${slug}, ${lastDate}) returning id`;
  if (listing !== "none") {
    await sql!`insert into public.postings
      (slug, title, organization_id, review_status, publishing_status, is_expired, valid_through, description, kind, inferred_recruitment_id)
      values (${slug + "-p"}, ${title}, ${orgId}, ${listing === "approved" ? "APPROVED" : "PENDING"},
              ${listing === "approved" ? "PUBLISHED" : "DRAFT"}, false, ${lastDate},
              ${opts.description ?? title + " vacancy notice details"}, 'GOVERNMENT', ${rec.id})`;
  }
  for (const post of opts.posts ?? []) {
    await sql!`insert into public.posts (recruitment_id, position_id, name, title, slug, "isLive")
      values (${rec.id}, ${otherPositionId}, ${post}, ${post}, ${post.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + "-jobs"}, true)`;
  }
  return rec.id;
}

let otherPositionId = 0;

d("search (A-068, A-084, A-086)", () => {
  let orgA = 0;
  let orgB = 0;
  beforeEach(async () => {
    await sql!`truncate public.postings, public.posts, public.recruitments, public.positions, public.organizations restart identity cascade`;
    const a = await sql!`insert into public.organizations (slug, name, sector) values ('org-a','Org A','GOVERNMENT_CENTRAL') returning id`;
    const b = await sql!`insert into public.organizations (slug, name, sector) values ('org-b','Org B','GOVERNMENT_CENTRAL') returning id`;
    orgA = a[0].id;
    orgB = b[0].id;
    const pos = await sql!`insert into public.positions (name, slug, category) values ('Other', 'category-other', ${positionCategory}) returning id`;
    otherPositionId = pos[0].id;
    await addJob("clerk-a", "Junior Clerk Recruitment", orgA, "2099-01-01");
    await addJob("engineer-b", "Assistant Engineer Recruitment", orgB, "2099-01-01");
    await addJob("old-clerk", "Senior Clerk Recruitment", orgA, "2020-01-01");
    await addJob("undated", "Typist Recruitment", orgA, null);
    // search_text and the urgency states are derived columns; a load must be followed by this refresh.
    await sql!`select * from public.refresh_posting_urgency_states()`;
  });

  test("S-1 no filter returns the open jobs (the query runs at all)", async () => {
    const r = await searchPostings({ sortBy: "newest" });
    expect(r.map((x) => x.slug).sort()).toEqual(["clerk-a", "engineer-b", "undated"]);
  });

  test("S-2 text query matches by full-text", async () => {
    const r = await searchPostings({ query: "engineer" });
    expect(r.map((x) => x.slug)).toEqual(["engineer-b"]);
  });

  test("S-3 organization filter alone and with a query line up their parameters", async () => {
    const only = await searchPostings({ organizationId: orgA });
    expect(only.map((x) => x.slug).sort()).toEqual(["clerk-a", "undated"]);
    const both = await searchPostings({ query: "clerk", organizationId: orgA });
    expect(both.map((x) => x.slug)).toEqual(["clerk-a", "old-clerk"]);
    const none = await searchPostings({ query: "engineer", organizationId: orgA });
    expect(none).toEqual([]);
  });

  test("S-4 a job past its last date is found by a text query, flagged closed and listed after open matches", async () => {
    const only = await searchPostings({ query: "senior" });
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
    await sql!`update public.postings set location_region='Bihar' where slug='clerk-a-p'`;
    const r = await searchPostings({ query: "clerk", locationRegion: "Bihar" });
    expect(r.map((x) => x.slug)).toEqual(["clerk-a"]);
  });

  test("S-6 browsing without a text query never returns a closed job; the Expired filter returns only closed ones", async () => {
    for (const sortBy of ["relevance", "newest", "closing_soonest", "most_urgent"] as const) {
      const r = await searchPostings({ sortBy });
      expect(r.map((x) => x.slug).sort()).toEqual(["clerk-a", "engineer-b", "undated"]);
      expect(r.every((x) => !x.isClosed)).toBe(true);
    }
    const closed = await searchPostings({ closingState: "EXPIRED" });
    expect(closed.map((x) => x.slug)).toEqual(["old-clerk"]);
    const noDeadline = await searchPostings({ closingState: "NO_DEADLINE" });
    expect(noDeadline.map((x) => x.slug)).toEqual(["undated"]);
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
    await sql!`update public.postings set description = 'Work covers hydraulics and typist duties' where slug = 'engineer-b-p'`;
    await sql!`update public.postings set post_names = '["Stenographer Grade II"]'::jsonb where slug = 'clerk-a-p'`;
    await sql!`select * from public.refresh_posting_urgency_states()`;
    expect((await searchPostings({ query: "hydraulics" })).map((x) => x.slug)).toEqual(["engineer-b"]);
    expect((await searchPostings({ query: "stenographer" })).map((x) => x.slug)).toEqual(["clerk-a"]);
    expect((await searchPostings({ query: "typist", sortBy: "relevance" })).map((x) => x.slug)).toEqual([
      "undated",
      "engineer-b",
    ]);
  });

  test("S-9 every word must match; when nothing matches every word the closest jobs are returned as partial", async () => {
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

  test("S-11 rows are returned in the camelCase shape the page reads", async () => {
    const [row] = await searchPostings({ query: "junior clerk" });
    expect(row).toMatchObject({
      slug: "clerk-a",
      href: "/jobs/clerk-a",
      organizationName: "Org A",
      isClosed: false,
      matchQuality: "full",
      postCount: 0,
      matchingPosts: [],
      matchingPostCount: 0,
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
    await sql!`alter table public.recruitments rename column name to name_tmp`;
    try {
      await expect(searchPostings({ query: "clerk" })).rejects.toThrow("Search query failed");
    } finally {
      await sql!`alter table public.recruitments rename column name_tmp to name`;
    }
  });

  test("S-13 a recruitment with live posts and no posting row is found by its name and by a post title", async () => {
    await addJob("hal-2026-01", "HAL Junior Executive Short Term Recruitment 2026", orgB, "2099-01-01", {
      listing: "none",
      posts: [
        "Junior Executive on Short Term Basis (Production)",
        "Junior Executive on Short Term Basis (Mechanical)",
        "Junior Executive on Short Term Basis (Civil)",
        "Junior Executive on Short Term Basis (Chemical)",
      ],
    });
    // Found before any refresh: the vector of a new row is computed on the fly.
    const byPost = await searchPostings({ query: "Junior Executive on Short Term Basis" });
    expect(byPost.map((x) => [x.slug, x.matchQuality])).toEqual([["hal-2026-01", "full"]]);
    expect(byPost[0]).toMatchObject({ href: "/jobs/hal-2026-01", postCount: 4, matchingPostCount: 4, organizationName: "Org B" });
    expect(byPost[0].matchingPosts).toHaveLength(3);
    expect(byPost[0].matchingPosts[0].href).toMatch(/^\/jobs\/hal-2026-01\/junior-executive-on-short-term-basis-[a-z]+-jobs$/);
    // The post that matches the most words is listed first.
    const specific = await searchPostings({ query: "junior executive mechanical" });
    expect(specific[0].matchingPosts[0]).toEqual({
      title: "Junior Executive on Short Term Basis (Mechanical)",
      href: "/jobs/hal-2026-01/junior-executive-on-short-term-basis-mechanical-jobs",
    });
    // Same result once the stored vector is filled, and it is listed when browsing.
    await sql!`select * from public.refresh_posting_urgency_states()`;
    expect((await searchPostings({ query: "short term mechanical" })).map((x) => x.slug)).toEqual(["hal-2026-01"]);
    expect((await searchPostings({ sortBy: "newest" })).map((x) => x.slug)).toContain("hal-2026-01");
  });

  test("S-14 a recruitment with one live post links straight to its Post page", async () => {
    await addJob("djb-2026-01", "Delhi Jal Board Law Officer Recruitment 2026", orgA, "2099-01-01", { posts: ["Law Officer"] });
    const [row] = await searchPostings({ query: "law officer" });
    expect(row).toMatchObject({ slug: "djb-2026-01", href: "/jobs/djb-2026-01/law-officer-jobs", postCount: 1 });
  });

  test("S-15 an unapproved posting makes nothing searchable: its text is not matched, and without live posts the recruitment is out of scope", async () => {
    await addJob("held-no-posts", "Welder Recruitment", orgA, "2099-01-01", { listing: "pending" });
    await addJob("held-with-posts", "Fitter Recruitment", orgA, "2099-01-01", {
      listing: "pending",
      description: "Mentions metallurgy only in the unapproved text",
      posts: ["Fitter Grade I"],
    });
    await sql!`select * from public.refresh_posting_urgency_states()`;
    expect(await searchPostings({ query: "welder" })).toEqual([]);
    expect(await searchPostings({ query: "metallurgy" })).toEqual([]);
    expect((await searchPostings({ query: "fitter" })).map((x) => x.slug)).toEqual(["held-with-posts"]);
  });

  test("S-16 a post that is not live is not searchable, and the catch-all position name is not indexed", async () => {
    const id = await addJob("mixed-2026-01", "Board Recruitment", orgA, "2099-01-01", { listing: "none", posts: ["Plumber", "Carpenter"] });
    await sql!`update public.posts set "isLive" = false where recruitment_id = ${id} and name = 'Carpenter'`;
    expect((await searchPostings({ query: "plumber" })).map((x) => [x.slug, x.postCount])).toEqual([["mixed-2026-01", 1]]);
    expect(await searchPostings({ query: "carpenter" })).toEqual([]);
    await sql!`update public.posts set "isLive" = false where recruitment_id = ${id}`;
    expect(await searchPostings({ query: "plumber" })).toEqual([]);
    // "Other" is the name of the catch-all position every post sits in; it must not match.
    expect(await searchPostings({ query: "other" })).toEqual([]);
  });
});
