import { describe, expect, it } from "vitest";
import { parseIndianDeadline } from "../../src/ingest/adapters/util";

describe("parseIndianDeadline", () => {
  it("uses the exclusive midnight after the stated IST date as its expiry boundary", () => {
    const parsed = parseIndianDeadline("07 September 2026", { defaultTimezone: "Asia/Kolkata", defaultTimezoneBasis: "INDIA_SOURCE_DEFAULT" });
    expect(parsed?.precision).toBe("DATE_ONLY");
    expect(parsed?.timezone).toBe("Asia/Kolkata");
    expect(parsed?.date?.toISOString()).toBe("2026-09-07T18:30:00.000Z");
    expect(parsed?.timezoneBasis).toBe("INDIA_SOURCE_DEFAULT");
  });

  it("preserves 12-hour time expressions", () => {
    const parsed = parseIndianDeadline("07 September 2026 | 10:11 PM", { defaultTimezone: "Asia/Kolkata", defaultTimezoneBasis: "INDIA_SOURCE_DEFAULT" });
    expect(parsed?.precision).toBe("DATE_TIME");
    expect(parsed?.timezone).toBe("Asia/Kolkata");
    expect(parsed?.date?.toISOString()).toBe("2026-09-07T16:41:00.000Z");
    expect(parsed?.timezoneBasis).toBe("INDIA_SOURCE_DEFAULT");
  });

  it("preserves 24-hour Hours/Hrs expressions", () => {
    expect(parseIndianDeadline("07 October 2026 (23:00 Hours)", { defaultTimezone: "Asia/Kolkata", defaultTimezoneBasis: "INDIA_SOURCE_DEFAULT" })?.date?.toISOString())
      .toBe("2026-10-07T17:30:00.000Z");
    expect(parseIndianDeadline("07 October 2026 23:00 Hrs", { defaultTimezone: "Asia/Kolkata", defaultTimezoneBasis: "INDIA_SOURCE_DEFAULT" })?.precision).toBe("DATE_TIME");
  });

  it("honours explicit UTC and numeric offsets", () => {
    expect(parseIndianDeadline("2026-09-07T10:00:00Z")?.date?.toISOString())
      .toBe("2026-09-07T10:00:00.000Z");
    expect(parseIndianDeadline("07 September 2026 10:00 +05:30")?.date?.toISOString())
      .toBe("2026-09-07T04:30:00.000Z");
  });

  it("rejects impossible calendar dates and invalid times", () => {
    expect(parseIndianDeadline("31 February 2026")).toBeUndefined();
    expect(parseIndianDeadline("28.10.2026 (23:59 PM)")).toBeUndefined();
    expect(parseIndianDeadline("07 September 2026 25:61")).toBeUndefined();
  });

  it("parses ISO and dotted numeric date-only values without treating separators as times", () => {
    expect(parseIndianDeadline("2026-10-31", { defaultTimezone: "Asia/Kolkata", defaultTimezoneBasis: "INDIA_SOURCE_DEFAULT" })?.date?.toISOString()).toBe("2026-10-31T18:30:00.000Z");
    expect(parseIndianDeadline("05.11.2026", { defaultTimezone: "Asia/Kolkata", defaultTimezoneBasis: "INDIA_SOURCE_DEFAULT" })?.date?.toISOString()).toBe("2026-11-05T18:30:00.000Z");
    expect(parseIndianDeadline("05.11.2026, 5.00 pm", { defaultTimezone: "Asia/Kolkata", defaultTimezoneBasis: "INDIA_SOURCE_DEFAULT" })?.date?.toISOString()).toBe("2026-11-05T11:30:00.000Z");
  });

  it("preserves ordinal dates and dotted meridiem time formats found in source captures", () => {
    expect(parseIndianDeadline("31st October, 2026", { defaultTimezone: "Asia/Kolkata", defaultTimezoneBasis: "INDIA_SOURCE_DEFAULT" })?.precision).toBe("DATE_ONLY");
    expect(parseIndianDeadline("November 6, 2026", { defaultTimezone: "Asia/Kolkata", defaultTimezoneBasis: "INDIA_SOURCE_DEFAULT" })?.date?.toISOString()).toBe("2026-11-06T18:30:00.000Z");
    expect(parseIndianDeadline("30/10/2026 by 5.00 p.m.", { defaultTimezone: "Asia/Kolkata", defaultTimezoneBasis: "INDIA_SOURCE_DEFAULT" })?.date?.toISOString()).toBe("2026-10-30T11:30:00.000Z");
    expect(parseIndianDeadline("30 October 2026 by 5 PM", { defaultTimezone: "Asia/Kolkata", defaultTimezoneBasis: "INDIA_SOURCE_DEFAULT" })?.date?.toISOString()).toBe("2026-10-30T11:30:00.000Z");
  });

  it("parses compact 24-hour and midnight deadlines", () => {
    expect(parseIndianDeadline("01-11-2026 up to 1700 Hrs", { defaultTimezone: "Asia/Kolkata", defaultTimezoneBasis: "INDIA_SOURCE_DEFAULT" })?.date?.toISOString()).toBe("2026-11-01T11:30:00.000Z");
    expect(parseIndianDeadline("01 November 2026 (12:00 midnight)", { defaultTimezone: "Asia/Kolkata", defaultTimezoneBasis: "INDIA_SOURCE_DEFAULT" })?.date?.toISOString()).toBe("2026-10-31T18:30:00.000Z");
  });

  it("rejects multiple stated times rather than choosing one", () => {
    expect(parseIndianDeadline("03:00 PM on 02.11.2026; 05:00 PM on 11.11.2026")).toBeUndefined();
  });

  it("retains the exact source text for observation provenance", () => {
    const raw = "07 September 2026 (23:00 Hours)";
    expect(parseIndianDeadline(raw)?.sourceText).toBe(raw);
  });
});


describe("parseIndianDeadline timezone safety", () => {
  it("returns UNKNOWN rather than assuming IST for an unzoned date-time without issuer context", () => {
    const parsed = parseIndianDeadline("07 September 2026 | 10:11 PM");
    expect(parsed?.precision).toBe("UNKNOWN");
    expect(parsed?.date).toBeNull();
    expect(parsed?.timezone).toBeNull();
    expect(parsed?.timezoneBasis).toBe("UNKNOWN");
  });

  it("returns UNKNOWN rather than assigning a timezone to a date-only value without India context", () => {
    const parsed = parseIndianDeadline("07 September 2026");
    expect(parsed?.precision).toBe("UNKNOWN");
    expect(parsed?.date).toBeNull();
  });

  it("records explicit source timezones separately from an India default", () => {
    const explicitUtc = parseIndianDeadline("07 September 2026 10:00 UTC");
    expect(explicitUtc?.precision).toBe("DATE_TIME");
    expect(explicitUtc?.timezone).toBe("UTC");
    expect(explicitUtc?.timezoneBasis).toBe("EXPLICIT_SOURCE");

    const explicitIst = parseIndianDeadline("07 September 2026 10:00 IST");
    expect(explicitIst?.timezone).toBe("Asia/Kolkata");
    expect(explicitIst?.timezoneBasis).toBe("EXPLICIT_SOURCE");
  });

  it("uses the India source default only when the caller explicitly supplies that context", () => {
    const assumed = parseIndianDeadline("07 September 2026 10:00", {
      defaultTimezone: "Asia/Kolkata",
      defaultTimezoneBasis: "INDIA_SOURCE_DEFAULT",
    });
    expect(assumed?.timezone).toBe("Asia/Kolkata");
    expect(assumed?.timezoneBasis).toBe("INDIA_SOURCE_DEFAULT");
    expect(assumed?.date?.toISOString()).toBe("2026-09-07T04:30:00.000Z");
  });
});
