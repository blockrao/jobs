import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const reportsApi = readFileSync(
  resolve(process.cwd(), "src/app/api/reports/posts/route.ts"),
  "utf8",
);
const proxy = readFileSync(resolve(process.cwd(), "src/proxy.ts"), "utf8");

describe("internal reports dashboard access contract", () => {
  it("requires the admin session at the API boundary", () => {
    expect(reportsApi).toContain('import { cookies } from "next/headers"');
    expect(reportsApi).toContain('import { adminSessionToken } from "@/lib/admin-token"');
    expect(reportsApi).toContain('store.get(COOKIE_NAME)?.value === token');
    expect(reportsApi).toContain('return NextResponse.json({ error: "Unauthorized" }, { status: 401 })');
  });

  it("protects the reports page with the existing admin login flow", () => {
    expect(proxy).toContain('pathname === "/reports" || pathname.startsWith("/reports/")');
    expect(proxy).toContain('loginUrl.searchParams.set("next", pathname)');
  });

  it("does not expose internal database error details in API responses", () => {
    expect(reportsApi).toContain('{ error: "Unable to load report data" }');
    expect(reportsApi).not.toContain('details: dbErr');
    expect(reportsApi).not.toContain('details: error instanceof Error');
  });
});
