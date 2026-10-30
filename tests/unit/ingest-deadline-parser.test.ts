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
    expect(parseIndianDeadline("07 September 2026 25:61")).toBeUndefined();
  });

  it("retains the exact source text for observation provenance", () => {
    const raw = "07 September 2026 (23:00 Hours)";
    expect(parseIndianDeadline(raw)?.sourceText).toBe(raw);
  });
});
