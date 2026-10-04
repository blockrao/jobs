/**
 * WP-001 readiness contract: ingestion is not publication; reviewed data is
 * protected; unresolved organizations are candidates, never canonical.
 *
 * Opt-in and WRITES, so it runs only against a local scratch database:
 *   WP001_SCRATCH_DATABASE_URL=postgres://postgres:pw@localhost:54329/scratch npm run test:contracts
 * It refuses any non-local host, never reads DATABASE_URL from the environment,
 * and truncates the tables it uses before each test.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import postgres from "postgres";
import { evaluatePromotion, isOfficialStyleUrl } from "@/ingest/promotion";
import { readSource, stripComments } from "../helpers/source";
import { listFiles } from "../helpers/source";

const url = process.env.WP001_SCRATCH_DATABASE_URL;
const host = url ? new URL(url).hostname : "";
const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);
if (url && !local) throw new Error(`WP001 tests refuse non-local database host "${host}"`);

const sql = url ? postgres(url, { max: 2, connect_timeout: 10, idle_timeout: 5, onnotice: () => {} }) : null;

let processRaw: typeof import("@/ingest/pipeline").processRaw;
let listPostings: typeof import("@/lib/queries").listPostings;
let promotePending: typeof import("@/ingest/promotion").promotePending;
let getDb: typeof import("@/db").getDb;
let sitemapPage: typeof import("@/lib/queries").getPostingSlugsPageForSitemap;

beforeAll(async () => {
  if (!url) return;
  process.env.DATABASE_URL = url; // scratch only; checked above
  ({ processRaw } = await import("@/ingest/pipeline"));
  ({ listPostings, getPostingSlugsPageForSitemap: sitemapPage } = await import("@/lib/queries"));
  ({ promotePending } = await import("@/ingest/promotion"));
  ({ getDb } = await import("@/db"));
});
afterAll(async () => {
  await sql?.end();
});

const TABLES =
  "public.source_observations, public.organization_candidates, public.organization_aliases, public.posting_updates, public.posting_categories, public.postings, public.posts, public.recruitments, public.source_documents, public.sources, public.organizations, public.positions";

async function seedOrgs() {
  await sql!`insert into public.organizations (slug, name, sector) values
    ('staff-selection-commission','Staff Selection Commission','GOVERNMENT_CENTRAL'),
    ('educational-institution','Educational Institution','GOVERNMENT_CENTRAL'),
    ('uppsc-assistant-town-planner-atp','UPPSC Assistant Town Planner ATP','GOVERNMENT_CENTRAL')`;
}

let n = 0;
function raw(over: Record<string, unknown> = {}) {
  n++;
  return {
    source: "freejobalert",
    externalId: `T${n}`,
    sourceUrl: `https://example.invalid/articles/t-${n}`,
    title: `Test Recruitment 2026 Apply Online ${n}`,
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

describe.skipIf(!sql)("WP-001 ingestion readiness (scratch database)", () => {
  beforeEach(async () => {
    await sql!.unsafe(`truncate ${TABLES} restart identity cascade`);
    await seedOrgs();
  });

  test("WP1-01 a known organization name resolves to the existing organization and creates no new one", async () => {
    const r = await processRaw([raw()]);
    expect(r.write.inserted).toBe(1);
    expect((await sql!`select count(*)::int n from public.organizations`)[0].n).toBe(3);
    const [p] = await sql!`select o.slug from public.postings p join public.organizations o on o.id = p.organization_id`;
    expect(p.slug).toBe("staff-selection-commission");
  });

  test("WP1-02 a headline-style name creates no organization, no posting, and one candidate", async () => {
    // "UPPSC Assistant Town Planner ATP" even exists as a legacy bucket row: it must not attract the posting.
    const r = await processRaw([raw({ organizationName: "UPPSC Assistant Town Planner ATP" })]);
    expect(r.write.heldCandidates).toBe(1);
    expect(r.write.inserted).toBe(0);
    expect((await sql!`select count(*)::int n from public.organizations`)[0].n).toBe(3);
    expect((await sql!`select count(*)::int n from public.postings`)[0].n).toBe(0);
    const c = await sql!`select reason from public.organization_candidates`;
    expect(c).toHaveLength(1);
    expect(c[0].reason).toBe("POST_TITLE_LIKE");
    const o = await sql!`select outcome, candidate_id from public.source_observations`;
    expect(o[0].outcome).toBe("HELD_CANDIDATE");
    expect(o[0].candidate_id).not.toBeNull();
  });

  test("WP1-03 a clean but unknown organization name becomes a candidate, never a canonical organization", async () => {
    await processRaw([raw({ organizationName: "Konkan Railway Corporation Limited" })]);
    expect((await sql!`select count(*)::int n from public.organizations`)[0].n).toBe(3);
    const c = await sql!`select reason, normalized_name from public.organization_candidates`;
    expect(c[0].reason).toBe("UNRECOGNIZED");
    expect(c[0].normalized_name).toBe("konkan railway corporation limited");
  });

  test("WP1-04 re-ingesting the same input is idempotent", async () => {
    const input = [raw({ externalId: "A1" }), raw({ externalId: "A2", organizationName: "Some Unknown Board" })];
    await processRaw(input);
    const counts = async () => ({
      postings: (await sql!`select count(*)::int n from public.postings`)[0].n,
      obs: (await sql!`select count(*)::int n from public.source_observations`)[0].n,
      cands: (await sql!`select count(*)::int n from public.organization_candidates`)[0].n,
      recs: (await sql!`select count(*)::int n from public.recruitments`)[0].n,
      posts: (await sql!`select count(*)::int n from public.posts`)[0].n,
    });
    const first = await counts();
    const again = await processRaw(input);
    expect(again.write.inserted).toBe(0);
    expect(again.write.updated).toBe(0);
    expect(again.write.unchanged).toBe(1);
    expect(await counts()).toEqual(first);
  });

  test("WP1-05 a newly ingested record cannot become publicly visible because ingestion confidence is high", async () => {
    await processRaw([raw({ confidence: 100 })]);
    const [p] = await sql!`select review_status, publishing_status from public.postings`;
    expect(p.review_status).toBe("PENDING");
    expect(p.publishing_status).toBe("DRAFT");
    expect(await listPostings({ limit: 50 })).toHaveLength(0); // the real public listing query
  });

  test("WP1-06 a reviewed record is unchanged after re-ingestion; a changed deadline is flagged, not applied", async () => {
    await processRaw([raw({ externalId: "R1" })]);
    await sql!`update public.postings set review_status = 'APPROVED', publishing_status = 'PUBLISHED' where external_id = 'R1'`;
    const [before] = await sql!`select * from public.postings where external_id = 'R1'`;
    await processRaw([raw({ externalId: "R1", validThrough: new Date("2030-02-28T00:00:00Z"), totalVacancies: 250, title: "Changed Title 2026 Apply Online" })]);
    const [after] = await sql!`select * from public.postings where external_id = 'R1'`;
    expect(after.review_status).toBe("APPROVED");
    expect(after.publishing_status).toBe("PUBLISHED");
    expect(after.valid_through).toEqual(before.valid_through);
    expect(after.total_vacancies).toBe(before.total_vacancies);
    expect(after.title).toBe(before.title);
    expect(after.flagged_for_review).toBe(true);
    expect(after.review_notes).toMatch(/validThrough/);
    expect(after.review_notes).toMatch(/source observation #\d+/);
    // the newer observation is retained
    expect((await sql!`select count(*)::int n from public.source_observations where external_id = 'R1'`)[0].n).toBe(2);
  });

  test("WP1-07 a rejected record is not resurrected by re-ingestion", async () => {
    await processRaw([raw({ externalId: "X1" })]);
    await sql!`update public.postings set review_status = 'REJECTED' where external_id = 'X1'`;
    await processRaw([raw({ externalId: "X1", confidence: 100 })]);
    expect((await sql!`select review_status from public.postings where external_id = 'X1'`)[0].review_status).toBe("REJECTED");
  });

  test("WP1-08 an unreviewed value is updated by a newer observation and the previous observation is kept", async () => {
    await processRaw([raw({ externalId: "U1" })]);
    const r = await processRaw([raw({ externalId: "U1", validThrough: new Date("2030-03-31T00:00:00Z") })]);
    expect(r.write.updated).toBe(1);
    const [p] = await sql!`select valid_through from public.postings where external_id = 'U1'`;
    expect(new Date(p.valid_through).toISOString().slice(0, 10)).toBe("2030-03-31");
    const obs = await sql!`select facts->>'lastDate' d from public.source_observations where external_id = 'U1' order by id`;
    expect(obs.map((o) => o.d?.slice(0, 10))).toEqual(["2030-01-15", "2030-03-31"]);
  });

  test("WP1-09 a reviewed record gets missing values filled but nothing existing overwritten", async () => {
    await processRaw([raw({ externalId: "F1", totalVacancies: undefined, officialNotificationUrl: undefined })]);
    await sql!`update public.postings set review_status = 'APPROVED' where external_id = 'F1'`;
    await processRaw([raw({ externalId: "F1", totalVacancies: 77, officialNotificationUrl: "https://ssc.gov.in/x.pdf" })]);
    const [p] = await sql!`select total_vacancies, official_notification_url, flagged_for_review from public.postings where external_id = 'F1'`;
    expect(p.total_vacancies).toBe(77);
    expect(p.official_notification_url).toBe("https://ssc.gov.in/x.pdf");
    expect(p.flagged_for_review).not.toBe(true);
  });

  test("WP1-10 the observation records what the source said at ingestion time, apart from the posting", async () => {
    await processRaw([raw({ externalId: "O1", validThrough: new Date("2030-10-14T00:00:00Z"), observationFacts: { lastDate: "14-10-2030" } })]);
    const [o] = await sql!`select facts, outcome, posting_id from public.source_observations where external_id = 'O1'`;
    expect(o.facts.lastDate).toBe("2030-10-14T00:00:00.000Z");
    expect(o.facts.stated.lastDate).toBe("14-10-2030");
    expect(o.outcome).toBe("LOADED");
    expect(o.posting_id).not.toBeNull();
  });

  test("WP1-11 promotion is the only step that publishes, and it requires an official issuer-domain link", async () => {
    await processRaw([
      raw({ externalId: "P1" }), // official link, open
      raw({ externalId: "P2", officialNotificationUrl: "https://example.com/n.pdf" }), // not an issuer-style domain
      raw({ externalId: "P3", officialNotificationUrl: undefined }),
    ]);
    const dry = await promotePending(getDb(), { apply: false });
    expect(dry.eligible).toBe(1);
    expect((await sql!`select count(*)::int n from public.postings where review_status = 'APPROVED'`)[0].n).toBe(0);
    const applied = await promotePending(getDb(), { apply: true });
    expect(applied.promoted).toBe(1);
    expect(await listPostings({ limit: 50 })).toHaveLength(1);
  });

  test("WP1-12 an expired posting is not offered in the public listing", async () => {
    await processRaw([raw({ externalId: "E1" })]);
    await promotePending(getDb(), { apply: true });
    expect(await listPostings({ limit: 50 })).toHaveLength(1);
    await sql!`update public.postings set is_expired = true`;
    expect(await listPostings({ limit: 50 })).toHaveLength(0);
  });
});

describe.skipIf(!sql)("A-067 date guard independent of the lifecycle flag (scratch database)", () => {
  beforeEach(async () => {
    await sql!.unsafe(`truncate ${TABLES} restart identity cascade`);
    await seedOrgs();
  });

  async function three() {
    await processRaw([raw({ externalId: "D1" }), raw({ externalId: "D2" }), raw({ externalId: "D3" })]);
    await promotePending(getDb(), { apply: true });
    await sql!`update public.postings set index_tier = 'A', is_expired = false`;
  }

  test("WP1-14 a past-date posting is excluded from the listing and the sitemap although is_expired is false", async () => {
    await three();
    await sql!`update public.postings set valid_through = now() - interval '3 days' where external_id = 'D1'`;
    const list = await listPostings({ limit: 50 });
    expect(list).toHaveLength(2);
    const [d1] = await sql!`select id from public.postings where external_id = 'D1'`;
    expect(list.map((p: { id: number }) => p.id)).not.toContain(d1.id);
    expect(await sitemapPage(0, 100)).toHaveLength(2);
  });

  test("WP1-15 future-date and unknown-date postings stay; the last date itself still counts", async () => {
    await three();
    await sql!`update public.postings set valid_through = null where external_id = 'D1'`;
    await sql!`update public.postings set valid_through = date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' where external_id = 'D2'`; // last date is today (UTC)
    await sql!`update public.postings set valid_through = now() + interval '30 days' where external_id = 'D3'`;
    expect(await listPostings({ limit: 50 })).toHaveLength(3);
    expect(await sitemapPage(0, 100)).toHaveLength(3);
    await sql!`update public.postings set valid_through = date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '1 second' where external_id = 'D2'`; // yesterday 23:59:59 UTC
    expect(await listPostings({ limit: 50 })).toHaveLength(2);
    expect(await sitemapPage(0, 100)).toHaveLength(2);
  });

  test("WP1-16 the guard does not rely on, or modify, the stored flag", async () => {
    await three();
    await sql!`update public.postings set valid_through = now() - interval '2 days' where external_id = 'D1'`;
    await listPostings({ limit: 50 });
    await sitemapPage(0, 100);
    const [r] = await sql!`select is_expired from public.postings where external_id = 'D1'`;
    expect(r.is_expired).toBe(false);
  });
});

describe.skipIf(!sql)("SEO-001 sitemap expiry (scratch database)", () => {
  test("WP1-13 an expired Tier A job is excluded from the sitemap; a live Tier A job is included", async () => {
    await sql!.unsafe(`truncate ${TABLES} restart identity cascade`);
    await seedOrgs();
    await processRaw([raw({ externalId: "S1" }), raw({ externalId: "S2" })]);
    await promotePending(getDb(), { apply: true });
    await sql!`update public.postings set index_tier = 'A'`;
    expect(await sitemapPage(0, 100)).toHaveLength(2);
    await sql!`update public.postings set is_expired = true where external_id = 'S1'`;
    const rows = await sitemapPage(0, 100);
    expect(rows).toHaveLength(1);
  });
});

describe("WP-001 static rules", () => {
  test("WP1-S6 the sitemap posting query excludes expired postings", () => {
    const src = stripComments(readSource("src/lib/queries.ts"));
    const fn = src.slice(src.indexOf("getPostingSlugsPageForSitemap"), src.indexOf("getAllArticleSlugsForSitemap"));
    expect(fn).toMatch(/isExpired/);
    expect(fn).toMatch(/notPastLastDate/); // A-067: date guard independent of the flag
  });

  test("WP1-S7 the public listing applies the date guard and the lifecycle cron route is unchanged by it", () => {
    const src = stripComments(readSource("src/lib/queries.ts"));
    const list = src.slice(src.indexOf("export async function listPostings"), src.indexOf("export async function getOrganizationBySlug"));
    expect(list).toMatch(/notPastLastDate/);
    expect(src).toMatch(/validThrough\} >= date_trunc/);
  });

  test("WP1-S1 the ingestion path never creates a canonical organization", () => {
    const offenders = listFiles("src/ingest")
      .concat(listFiles("src/db/operations").filter((f) => /\/write-/.test(f)))
      .filter((f) => /insert\(\s*organizations\s*\)/.test(stripComments(readSource(f))));
    expect(offenders).toEqual([]);
  });

  test("WP1-S2 only promotion sets a posting APPROVED; ingestion confidence never does", () => {
    const writer = stripComments(readSource("src/db/operations/write-postings-v2.ts"));
    expect(writer).not.toMatch(/reviewStatusForConfidence/);
    expect(writer).not.toMatch(/reviewStatus:\s*"APPROVED"/);
    expect(writer).toMatch(/reviewStatus:\s*"PENDING"/);
  });

  test("WP1-S3 a re-ingest never writes review or publishing status", () => {
    const writer = stripComments(readSource("src/db/operations/write-postings-v2.ts"));
    expect(writer).toMatch(/NEVER_FIELDS[\s\S]*reviewStatus[\s\S]*publishingStatus/);
  });

  test("WP1-S4 the new tables are closed by default (row-level security)", () => {
    const sqlText = readSource("supabase/migrations/20261004060000_wp_001_observation_candidate_boundary.sql");
    for (const t of ["organization_aliases", "organization_candidates", "source_observations"]) {
      expect(sqlText).toMatch(new RegExp(`alter table public\\.${t}\\s+enable row level security`));
    }
  });

  test("WP1-S5 promotion rule unit checks", () => {
    const base = {
      reviewStatus: "PENDING",
      publishingStatus: "DRAFT",
      totalVacancies: 10,
      validThrough: new Date("2030-01-01"),
      officialNotificationUrl: "https://upsc.gov.in/a.pdf",
      currentStage: "NOTIFICATION_OUT",
      postCountMismatch: false,
    };
    const now = new Date("2029-12-01");
    expect(evaluatePromotion(base, now).eligible).toBe(true);
    expect(evaluatePromotion({ ...base, reviewStatus: "REJECTED" }, now).failed).toContain("NOT_PENDING");
    expect(evaluatePromotion({ ...base, officialNotificationUrl: "https://www.freejobalert.com/x" }, now).failed).toContain("LINK_NOT_ISSUER_DOMAIN");
    expect(evaluatePromotion({ ...base, postCountMismatch: true }, now).failed).toContain("POST_COUNT_MISMATCH");
    expect(evaluatePromotion({ ...base, validThrough: new Date("2029-11-01") }, now).failed).toContain("LAST_DATE_PASSED");
    expect(isOfficialStyleUrl("https://docs.google.com/x")).toBe(false);
  });
});
