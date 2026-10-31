import { describe, expect, test } from "vitest";
import { isVerifiedOfficialUrl } from "@/lib/official-source";

describe("official source URL verification", () => {
  const registry = "https://ssc.gov.in";

  test("accepts the exact registered HTTPS host", () => {
    expect(isVerifiedOfficialUrl("https://ssc.gov.in/notice.pdf", registry)).toBe(true);
  });

  test("accepts a subdomain of the registered issuer host", () => {
    expect(isVerifiedOfficialUrl("https://recruitment.ssc.gov.in/notice.pdf", registry)).toBe(true);
  });

  test.each([
    "https://ssc.gov.in.evil.example/notice.pdf",
    "https://notssc.gov.in/notice.pdf",
    "https://ssc.gov.in@evil.example/notice.pdf",
    "http://ssc.gov.in/notice.pdf",
    "https://evil.example/notice.pdf",
    "not-a-url",
  ])("rejects an untrusted or malformed URL: %s", (url) => {
    expect(isVerifiedOfficialUrl(url, registry)).toBe(false);
  });

  test("rejects a link when no official registry URL exists", () => {
    expect(isVerifiedOfficialUrl("https://ssc.gov.in/notice.pdf", null)).toBe(false);
  });

  test("rejects a non-HTTPS registry URL", () => {
    expect(isVerifiedOfficialUrl("https://ssc.gov.in/notice.pdf", "http://ssc.gov.in")).toBe(false);
  });
});
