import { describe, expect, test } from "vitest";
import { pickSitemapLastmod } from "@/lib/freshness/lastmod";
import { classifyStalePage, evaluateSupersession } from "@/lib/freshness/supersession";

const d = (s: string) => new Date(s);

describe("PQ-004 sitemap lastmod", () => {
  test("FR-01 content_changed_at wins when present", () => {
    expect(pickSitemapLastmod(d("2026-09-01"), d("2026-10-01"))).toEqual(d("2026-09-01"));
  });
  test("FR-02 falls back to updated_at when null or undefined", () => {
    expect(pickSitemapLastmod(null, d("2026-10-01"))).toEqual(d("2026-10-01"));
    expect(pickSitemapLastmod(undefined, "2026-10-01T00:00:00Z")).toEqual(d("2026-10-01"));
  });
  test("FR-03 invalid or missing values give undefined, never Invalid Date", () => {
    expect(pickSitemapLastmod(null, null)).toBeUndefined();
    expect(pickSitemapLastmod("garbage", null)).toBeUndefined();
  });
});

describe("PQ-004 supersession", () => {
  const old = { id: 1, advertisementNumber: "BPSC/2025/12", publishedAt: d("2026-01-01"), text: "TRE 3 notice" };
  test("FR-04 newer notice that cancels flags the older one, order-independent", () => {
    const nw = { id: 2, advertisementNumber: "BPSC/2026/03", publishedAt: d("2026-03-01"), text: "This notice replaces the earlier advertisement" };
    for (const r of [evaluateSupersession(old, nw), evaluateSupersession(nw, old)]) {
      expect(r.flagOlder).toBe(true);
      expect(r.olderId).toBe(1);
      expect(r.newerId).toBe(2);
      expect(r.strength).toBe("STRONG");
    }
  });
  test("FR-05 newer text quoting the older advertisement number is a strong signal", () => {
    const nw = { id: 2, advertisementNumber: "X-9", publishedAt: d("2026-03-01"), text: "Corrigendum to Advt No. BPSC/2025/12" };
    expect(evaluateSupersession(old, nw).signals).toContain("NEWER_REFERENCES_OLDER_AD_NUMBER");
  });
  test("FR-06 older notice that says cancelled is flagged", () => {
    const o = { ...old, text: "Advertisement stands cancelled" };
    const nw = { id: 2, advertisementNumber: "Z-2", publishedAt: d("2026-03-01"), text: "Fresh vacancies" };
    expect(evaluateSupersession(o, nw).signals).toContain("OLDER_SAYS_CANCELLED");
  });
  test("FR-07 only a newer date with a different number is WEAK", () => {
    const nw = { id: 2, advertisementNumber: "BPSC/2026/03", publishedAt: d("2026-03-01"), text: "Fresh vacancies" };
    const r = evaluateSupersession(old, nw);
    expect(r.strength).toBe("WEAK");
    expect(r.flagOlder).toBe(true);
  });
  test("FR-08 no signals or unorderable dates flag nothing", () => {
    const same = { id: 2, advertisementNumber: "BPSC/2025/12", publishedAt: d("2026-03-01"), text: "Extension of last date" };
    expect(evaluateSupersession(old, same).flagOlder).toBe(false);
    expect(evaluateSupersession(old, { ...same, publishedAt: null }).flagOlder).toBe(false);
    expect(evaluateSupersession(old, { ...same, publishedAt: old.publishedAt }).flagOlder).toBe(false);
  });
});

describe("PQ-004 stale-page classifier", () => {
  const now = d("2026-10-05T00:00:00Z");
  const base = { currentStage: "APPLICATION_OPEN", now };
  test("FR-09 deadline within 7 days and not verified in 14 days", () => {
    expect(classifyStalePage({ ...base, validThrough: d("2026-10-10"), lastVerifiedAt: d("2026-09-01") })).toBe("DEADLINE_SOON_UNVERIFIED");
    expect(classifyStalePage({ ...base, validThrough: d("2026-10-10"), lastVerifiedAt: null })).toBe("DEADLINE_SOON_UNVERIFIED");
  });
  test("FR-10 recently verified, or deadline far away, is OK", () => {
    expect(classifyStalePage({ ...base, validThrough: d("2026-10-10"), lastVerifiedAt: d("2026-10-01") })).toBe("OK");
    expect(classifyStalePage({ ...base, validThrough: d("2026-11-10"), lastVerifiedAt: null })).toBe("OK");
  });
  test("FR-11 deadline passed while stage still open", () => {
    expect(classifyStalePage({ ...base, validThrough: d("2026-10-01"), lastVerifiedAt: d("2026-10-04") })).toBe("DEADLINE_PASSED_STAGE_OPEN");
  });
  test("FR-12 closed stage or no deadline is OK", () => {
    expect(classifyStalePage({ ...base, currentStage: "APPLICATION_CLOSED", validThrough: d("2026-10-01") })).toBe("OK");
    expect(classifyStalePage({ ...base, validThrough: null })).toBe("OK");
  });
});
