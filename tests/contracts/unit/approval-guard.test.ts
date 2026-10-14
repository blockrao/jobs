import { describe, expect, test } from "vitest";
import {
  approveIfClean,
  hasValidOfficialNotificationUrl,
} from "@/lib/approval-guard";

describe("official notification URL publication gate", () => {
  test("accepts a parseable HTTP(S) issuer URL", () => {
    expect(hasValidOfficialNotificationUrl("https://ssc.gov.in/")).toBe(true);
    expect(hasValidOfficialNotificationUrl("http://example.ac.in/notification.pdf")).toBe(true);
  });

  test("rejects missing, malformed, and aggregator URLs", () => {
    expect(hasValidOfficialNotificationUrl(null)).toBe(false);
    expect(hasValidOfficialNotificationUrl("")).toBe(false);
    expect(hasValidOfficialNotificationUrl("not a URL")).toBe(false);
    expect(hasValidOfficialNotificationUrl("https://freejobalert.com/jobs/example")).toBe(false);
  });

  test("refuses approval without an official notification URL and writes nothing", async () => {
    let markedApproved = false;
    const result = await approveIfClean({
      load: async () => ({
        posting: { officialNotificationUrl: null },
        updates: [],
      }),
      markApproved: async () => {
        markedApproved = true;
      },
    }, 16);

    expect(result).toEqual({
      ok: false,
      error: "Approval refused: a valid official notification URL is required.",
    });
    expect(markedApproved).toBe(false);
  });

  test("allows approval when the official URL is valid and no other violation exists", async () => {
    let markedApproved = false;
    const result = await approveIfClean({
      load: async () => ({
        posting: { officialNotificationUrl: "https://ssc.gov.in/" },
        updates: [],
      }),
      markApproved: async () => {
        markedApproved = true;
      },
    }, 17);

    expect(result).toEqual({ ok: true });
    expect(markedApproved).toBe(true);
  });
});
