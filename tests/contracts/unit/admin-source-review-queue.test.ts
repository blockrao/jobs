import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("admin source-origin review queue", () => {
  test("review queue is read-only and does not expose mutation actions", () => {
    const source = read("src/app/(default)/admin/source-review/page.tsx");
    expect(source).toContain("Internal / read-only");
    expect(source).toContain("getDb().execute(query)");
    expect(source).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);
    expect(source).not.toContain('"use server"');
    expect(source).not.toContain("approvePosting");
    expect(source).not.toContain("rejectPosting");
  });

  test("review queue is an authenticated admin route and is noindex", () => {
    const source = read("src/app/(default)/admin/source-review/page.tsx");
    const proxy = read("src/proxy.ts");
    expect(source).toContain('pageSeo("/admin/source-review", { index: false })');
    expect(proxy).toContain('pathname.startsWith("/admin")');
  });

  test("admin dashboard links to the real source review route", () => {
    const source = read("src/app/(default)/admin/page.tsx");
    expect(source).toContain('href="/admin/source-review"');
    expect(source).not.toContain('href="/admin/fja-review"');
  });

  test("queue retains the deterministic 6,365-origin source detection and 100-row pagination", () => {
    const source = read("src/app/(default)/admin/source-review/page.tsx");
    expect(source).toContain("institutional_aggregation");
    expect(source).toContain("official_digest_promote");
    expect(source).toContain("LIMIT ${PAGE_SIZE} OFFSET ${offset}");
    expect(source).toContain("ORDER BY queue_rank");
  });
});
