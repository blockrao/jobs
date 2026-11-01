import { describe, expect, it, vi } from "vitest";
import { checkOfficialNotificationUrl } from "@/ingest/fja/notification-url-check";

function headResponse(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers });
}

describe("checkOfficialNotificationUrl", () => {
  it("accepts a reachable authority URL using HEAD only", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe("HEAD");
      return headResponse(200, { "content-type": "application/pdf" });
    });

    const result = await checkOfficialNotificationUrl(
      "https://www.upsc.gov.in/notices/notice.pdf",
      { fetchImpl, now: () => new Date("2026-11-01T00:00:00.000Z") },
    );

    expect(result.ok).toBe(true);
    expect(result.finalHost).toBe("www.upsc.gov.in");
    expect(result.contentType).toBe("application/pdf");
    expect(result.checkedAt).toBe("2026-11-01T00:00:00.000Z");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("follows bounded redirects only when every destination remains an authority host", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(headResponse(302, { location: "https://recruitment.nic.in/notice.pdf" }))
      .mockResolvedValueOnce(headResponse(200, { "content-type": "application/pdf" }));

    const result = await checkOfficialNotificationUrl(
      "https://upsc.gov.in/notice.pdf",
      { fetchImpl },
    );

    expect(result.ok).toBe(true);
    expect(result.redirectChain).toEqual([
      "https://upsc.gov.in/notice.pdf",
      "https://recruitment.nic.in/notice.pdf",
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("rejects aggregator, unrelated, IP and non-HTTP(S) destinations before requesting", async () => {
    const fetchImpl = vi.fn();

    for (const url of [
      "https://www.freejobalert.com/articles/job-1234",
      "https://gov-in.example.com/notice.pdf",
      "http://127.0.0.1/notice.pdf",
      "file:///tmp/notice.pdf",
    ]) {
      const result = await checkOfficialNotificationUrl(url, { fetchImpl });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("INVALID_OR_UNTRUSTED_NOTIFICATION_HOST");
    }

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects redirects to aggregators or unrelated hosts", async () => {
    const fetchImpl = vi.fn(async () =>
      headResponse(302, { location: "https://www.freejobalert.com/notice.pdf" }),
    );

    const result = await checkOfficialNotificationUrl(
      "https://upsc.gov.in/notice.pdf",
      { fetchImpl },
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("REDIRECT_TO_UNTRUSTED_HOST");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("keeps unsupported HEAD responses in review instead of falling back to GET", async () => {
    const fetchImpl = vi.fn(async () => headResponse(405));

    const result = await checkOfficialNotificationUrl(
      "https://upsc.gov.in/notice.pdf",
      { fetchImpl },
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("HEAD_UNSUPPORTED_REQUIRES_REVIEW");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][1]?.method).toBe("HEAD");
  });

  it("fails closed when the authority host does not respond", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network timeout");
    });

    const result = await checkOfficialNotificationUrl(
      "https://upsc.gov.in/notice.pdf",
      { fetchImpl },
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("HEAD_REQUEST_FAILED");
  });
});
