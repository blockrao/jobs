import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const recruitmentQueries = readFileSync(
  resolve(process.cwd(), "src/db/operations/get-recruitments.ts"),
  "utf8",
);
const jobsPage = readFileSync(
  resolve(process.cwd(), "src/app/(default)/jobs/page.tsx"),
  "utf8",
);

describe("canonical /jobs listing database contract", () => {
  it("uses fields that exist on the canonical recruitments table for vacancy display", () => {
    const start = recruitmentQueries.indexOf("export async function listRecruitments(");
    const end = recruitmentQueries.indexOf("/**\n * Get posting locations", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const listingQuery = recruitmentQueries.slice(start, end);
    expect(listingQuery).toContain("r.verification_status IN ('VERIFIED', 'MANUALLY_VERIFIED')");
    expect(listingQuery).toContain("r.official_notification_url");
    expect(listingQuery).toContain("MAX_TRUSTED_RECRUITMENT_VACANCIES");
    expect(listingQuery).not.toContain("r.source_verification_status");
  });

  it("uses only source notification dates for recently notified discovery", () => {
    const start = recruitmentQueries.indexOf("export async function listRecruitments(");
    const end = recruitmentQueries.indexOf("/**\\n * Get posting locations", start);
    const listingQuery = recruitmentQueries.slice(start, end);
    expect(listingQuery).toContain("r.notification_date IS NOT NULL");
    expect(listingQuery).toContain("r.notification_date <= now()");
    expect(listingQuery).toContain("r.notification_date DESC");
    expect(listingQuery).not.toContain("COALESCE(r.notification_date, r.created_at)");
    expect(listingQuery).not.toContain('r.created_at AS "createdAt"');
    expect(jobsPage).toContain('notificationDate: isHi ? "अधिसूचना तिथि" : "Notification date"');
    expect(jobsPage).not.toContain("r.notificationDate ?? r.createdAt");
  });

  it("does not disguise a database failure as a genuine empty result", () => {
    expect(jobsPage).toContain("Do not turn a database/query failure into a false");
    expect(jobsPage).not.toMatch(/catch\s*\{\s*results\s*=\s*\[\]/);
  });
});
