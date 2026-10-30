import { describe, expect, it } from "vitest";
import { parseIndianDeadline } from "../../src/ingest/adapters/util";

describe("parseIndianDeadline", () => {
  it("treats a date-only deadline as inclusive through the end of that IST day", () => {
    const parsed = parseIndianDeadline("07 September 2026");
    expect(parsed?.precision).toBe("DATE");
    expect(parsed?.timezone).toBe("Asia/Kolkata");
    expect(parsed?.date.toISOString()).toBe("2026-09-07T18:29:59.999Z");
  });

  it("preserves 12-hour time expressions", () => {
    const parsed = parseIndianDeadline("07 September 2026 | 10:11 PM");
    expect(parsed?.precision).toBe("DATETIME");
    expect(parsed?.timezone).toBe("IST");
    expect(parsed?.date.toISOString()).toBe("2026-09-07T16:41:00.000Z");
  });

  it("preserves 24-hour Hours/Hrs expressions", () => {
    expect(parseIndianDeadline("07 October 2026 (23:00 Hours)")?.date.toISOString())
      .toBe("2026-10-07T17:30:00.000Z");
    expect(parseIndianDeadline("07 October 2026 23:00 Hrs")?.precision).toBe("DATETIME");
  });

  it("honours explicit UTC and numeric offsets", () => {
    expect(parseIndianDeadline("2026-09-07T10:00:00Z")?.date.toISOString())
      .toBe("2026-09-07T10:00:00.000Z");
    expect(parseIndianDeadline("07 September 2026 10:00 +05:30")?.date.toISOString())
      .toBe("2026-09-07T04:30:00.000Z");
  });

  it("rejects impossible calendar dates and invalid times", () => {
    expect(parseIndianDeadline("31 February 2026")).toBeUndefined();
    expect(parseIndianDeadline("28.10.2026 (23:59 PM)")).toBeUndefined();
    expect(parseIndianDeadline("07 September 2026 25:61")).toBeUndefined();
  });

  it("parses ISO and dotted numeric date-only values without treating separators as times", () => {
    expect(parseIndianDeadline("2026-10-31")?.date.toISOString()).toBe("2026-10-31T18:29:59.999Z");
    expect(parseIndianDeadline("05.11.2026")?.date.toISOString()).toBe("2026-11-05T18:29:59.999Z");
    expect(parseIndianDeadline("05.11.2026, 5.00 pm")?.date.toISOString()).toBe("2026-11-05T11:30:00.000Z");
  });

  it("preserves ordinal dates and dotted meridiem time formats found in source captures", () => {
    expect(parseIndianDeadline("31st October, 2026")?.precision).toBe("DATE");
    expect(parseIndianDeadline("November 6, 2026")?.date.toISOString()).toBe("2026-11-06T18:29:59.999Z");
    expect(parseIndianDeadline("30/10/2026 by 5.00 p.m.")?.date.toISOString()).toBe("2026-10-30T11:30:00.000Z");
    expect(parseIndianDeadline("30 October 2026 by 5 PM")?.date.toISOString()).toBe("2026-10-30T11:30:00.000Z");
  });

  it("parses compact 24-hour and midnight deadlines", () => {
    expect(parseIndianDeadline("01-11-2026 up to 1700 Hrs")?.date.toISOString()).toBe("2026-11-01T11:30:00.000Z");
    expect(parseIndianDeadline("01 November 2026 (12:00 midnight)")?.date.toISOString()).toBe("2026-10-31T18:30:00.000Z");
  });

  it("rejects multiple stated times rather than choosing one", () => {
    expect(parseIndianDeadline("03:00 PM on 02.11.2026; 05:00 PM on 11.11.2026")).toBeUndefined();
  });

  it("retains the exact source text for observation provenance", () => {
    const raw = "07 September 2026 (23:00 Hours)";
    expect(parseIndianDeadline(raw)?.sourceText).toBe(raw);
  });
});
