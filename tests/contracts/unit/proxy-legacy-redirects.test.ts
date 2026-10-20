import { describe, expect, test } from "vitest";
import { NextRequest } from "next/server";

// adminSessionToken reads env at call time; nothing here hits /admin.
import { proxy } from "../../../src/proxy";

const req = (path: string) => new NextRequest(new URL(path, "https://www.joboye.com"));

describe("proxy — URL contract redirects (2026-10-20)", () => {
  test("legacy /en/jobs/... URLs 301 to the unprefixed path, query preserved", async () => {
    const res = await proxy(req("/en/jobs/bpsc-2026-01/clerk-jobs?utm=x"));
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://www.joboye.com/jobs/bpsc-2026-01/clerk-jobs?utm=x");
  });

  test("legacy /hi/... URLs 301 to the unprefixed path", async () => {
    const res = await proxy(req("/hi/organizations/upsc"));
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://www.joboye.com/organizations/upsc");
  });

  test("bare /en and /hi go to the homepage", async () => {
    for (const p of ["/en", "/hi", "/en/"]) {
      const res = await proxy(req(p));
      expect(res.status).toBe(301);
      expect(res.headers.get("location")).toBe("https://www.joboye.com/");
    }
  });

  test("a path that merely starts with 'en' is not a locale prefix", async () => {
    const res = await proxy(req("/english-teacher-2026"));
    // falls through (not a legacy exam slug either) — no redirect
    expect(res.status).toBe(200);
  });

  test("canonical job URLs pass through untouched and without any database work", async () => {
    for (const p of ["/jobs", "/jobs/bpsc-2026-01", "/jobs/bpsc-2026-01/clerk-jobs", "/jobs/some-legacy-slug"]) {
      const res = await proxy(req(p));
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    }
  });

  test("/jobs?sector=… 301s to the sector hub or plain /jobs", async () => {
    const res = await proxy(req("/jobs?sector=does-not-exist"));
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://www.joboye.com/jobs");
  });
});
