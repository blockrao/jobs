/** Wiring contracts: extractor facts -> normalized/persisted fields, aggregator hygiene, approval refusal. */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { parseFreeJobAlertArticle, type ArticleFacts } from "@/enrich/freejobalert-article";
import { factsToFields, mergeArticleFacts, sanitizeExtraContent, sanitizeForStorage } from "@/ingest/enrich-facts";
import { approveIfClean, findAggregatorViolations } from "@/lib/approval-guard";
import type { RawPosting } from "@/ingest/types";

const html = readFileSync("tests/fixtures/freejobalert-gsrtc.html", "utf8");
const facts = (o: Partial<ArticleFacts> = {}): ArticleFacts => ({ unparsed: [], review: [], ...o });

describe("factsToFields", () => {
  test("real article: age, fee, salary, links, tables all flow", () => {
    const { fields, held } = factsToFields(parseFreeJobAlertArticle(html));
    expect(fields).toMatchObject({ ageLimitMin: 18, ageLimitMax: 45, applicationFeeGeneral: 300, applicationFeeReserved: 200, salaryMin: 21100 });
    expect(fields.applyUrl).toContain("ojas.gujarat.gov.in");
    expect(fields.websiteUrl).toBe("https://gsrtc.in/");
    expect(fields.extraContent?.tables?.length).toBe(3);
    expect(held).toEqual([]);
  });
  test("nothing invented from an empty result", () => {
    expect(factsToFields(facts())).toEqual({ fields: {}, held: [] });
  });
  test("age-over-60 holds the upper bound only", () => {
    const { fields, held } = factsToFields(facts({ ageLimitMin: 18, ageLimitMax: 65, review: ["age-over-60"], applicationFeeGeneral: 100 }));
    expect(fields.ageLimitMax).toBeUndefined();
    expect(fields.ageLimitMin).toBe(18);
    expect(fields.applicationFeeGeneral).toBe(100);
    expect(held).toContain("ageLimitMax");
  });
  test("fee-over-20000 holds both fee fields", () => {
    const { fields, held } = factsToFields(facts({ applicationFeeGeneral: 25000, applicationFeeReserved: 100, review: ["fee-over-20000"] }));
    expect(fields.applicationFeeGeneral).toBeUndefined();
    expect(fields.applicationFeeReserved).toBeUndefined();
    expect(held).toContain("applicationFee");
  });
  test("an explicit zero fee is kept", () => {
    expect(factsToFields(facts({ applicationFeeGeneral: 0 })).fields.applicationFeeGeneral).toBe(0);
  });
  test("incoherent salary range is held", () => {
    const { fields, held } = factsToFields(facts({ salaryMin: 50000, salaryMax: 20000 }));
    expect(fields.salaryMin).toBeUndefined();
    expect(held).toContain("salary-inconsistent");
  });
  test("aggregator links are never carried", () => {
    const { fields, held } = factsToFields(facts({ applyUrl: "https://www.freejobalert.com/x", officialNotificationUrl: "https://t.me/abc", officialWebsiteUrl: "https://x.com/y" }));
    expect(fields.applyUrl).toBeUndefined();
    expect(fields.officialNotificationUrl).toBeUndefined();
    expect(fields.websiteUrl).toBeUndefined();
    expect(held).toEqual(expect.arrayContaining(["applyUrl", "officialNotificationUrl"]));
  });
  test("relaxation note: tag stripped, aggregator mention held", () => {
    expect(factsToFields(facts({ ageRelaxationNotes: "5 years for SC (via FreeJobAlert)" })).fields.ageRelaxationNotes).toBe("5 years for SC");
    expect(factsToFields(facts({ ageRelaxationNotes: "See FreeJobAlert for relaxation" })).fields.ageRelaxationNotes).toBeUndefined();
  });
});

describe("mergeArticleFacts is fill-only", () => {
  const base = (): Partial<RawPosting> => ({ ageLimitMax: 40, validThrough: new Date("2026-12-01T06:30:00Z") });
  test("adapter value wins, gaps are filled", () => {
    const { posting, filled } = mergeArticleFacts(base(), facts({ ageLimitMax: 45, ageLimitMin: 18, validThrough: new Date("2026-11-01T06:30:00Z") }));
    expect(posting.ageLimitMax).toBe(40);
    expect(posting.ageLimitMin).toBe(18);
    expect(posting.validThrough?.toISOString()).toBe("2026-12-01T06:30:00.000Z");
    expect(filled).toEqual(["ageLimitMin"]);
  });
  test("adapter aggregator link is removed, clean extractor link fills in", () => {
    const { posting } = mergeArticleFacts({ applyUrl: "https://www.freejobalert.com/go" } as Partial<RawPosting>, facts({ applyUrl: "https://ojas.gujarat.gov.in/a" }));
    expect(posting.applyUrl).toBe("https://ojas.gujarat.gov.in/a");
    const none = mergeArticleFacts({ applyUrl: "https://www.freejobalert.com/go" } as Partial<RawPosting>, facts());
    expect(none.posting.applyUrl).toBeUndefined();
  });
  test("no aggregator reference is introduced", () => {
    const { posting } = mergeArticleFacts({} as Partial<RawPosting>, parseFreeJobAlertArticle(html));
    expect(JSON.stringify(posting)).not.toMatch(/freejobalert/i);
  });
});

describe("storage hygiene", () => {
  test("table rows and tables that name an aggregator are dropped", () => {
    const ec = sanitizeExtraContent({
      tables: [
        { title: "Application fee", headers: ["Category", "Fee"], rows: [["General", "300"], ["Join Telegram Channel", "x"], ["See t.me/abc", "1"]] },
        { title: "From FreeJobAlert", headers: ["a"], rows: [["b"]] },
      ],
    });
    expect(ec?.tables).toHaveLength(1);
    expect(ec?.tables?.[0].rows).toEqual([["General", "300"]]);
  });
  test("aggregator in title rejects, in description drops the text, links cleaned", () => {
    expect(sanitizeForStorage({ title: "FreeJobAlert GSRTC", description: "d" }).rejectReason).toBe("AGGREGATOR_IN_TITLE");
    const h = sanitizeForStorage({ title: "GSRTC Helper (via x)", description: "Posted on freejobalert.com", applyUrl: "https://sarkariresult.com/a", officialNotificationUrl: "https://gsrtc.in/a.pdf" });
    expect(h.clean.title).toBe("GSRTC Helper");
    expect(h.clean.description).toBe("");
    expect(h.clean.applyUrl).toBeNull();
    expect(h.clean.officialNotificationUrl).toBe("https://gsrtc.in/a.pdf");
    expect(h.dropped).toEqual(expect.arrayContaining(["description", "applyUrl"]));
  });
});

describe("approval refusal", () => {
  const clean = { title: "GSRTC Helper", description: "ok", applyUrl: "https://ojas.gujarat.gov.in/a", officialNotificationUrl: "https://gsrtc.in/a.pdf" };
  const make = (posting: object, updates: object[] = []) => {
    const approved: number[] = [];
    return { approved, deps: { load: async () => ({ posting, updates }), markApproved: async (id: number) => { approved.push(id); } } };
  };
  test("clean posting is approved", async () => {
    const t = make(clean);
    expect(await approveIfClean(t.deps, 7)).toEqual({ ok: true });
    expect(t.approved).toEqual([7]);
  });
  test.each([
    ["description", { ...clean, description: "Source: FreeJobAlert" }],
    ["applyUrl", { ...clean, applyUrl: "https://www.freejobalert.com/x" }],
    ["officialNotificationUrl", { ...clean, officialNotificationUrl: "https://t.me/x" }],
    ["extraContent", { ...clean, extraContent: { tables: [{ title: "t", headers: ["h"], rows: [["https://sarkariresult.com/z"]] }] } }],
  ])("refuses on %s and approves nothing", async (field, posting) => {
    const t = make(posting);
    const r = await approveIfClean(t.deps, 7);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toContain(field);
    expect(t.approved).toEqual([]);
  });
  test("refuses on a timeline update titled '(via ...)'", async () => {
    const t = make(clean, [{ title: "Notification released (via Source)" }]);
    expect((await approveIfClean(t.deps, 7)).ok).toBe(false);
    expect(t.approved).toEqual([]);
  });
  test("missing posting is refused", async () => {
    expect((await approveIfClean({ load: async () => null, markApproved: async () => {} }, 1)).ok).toBe(false);
  });
  test("clean posting has no violations", () => {
    expect(findAggregatorViolations(clean)).toEqual([]);
  });
});
