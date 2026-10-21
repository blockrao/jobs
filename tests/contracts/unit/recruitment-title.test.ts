/**
 * Recruitment hub title composition (src/lib/seo/recruitment-title.ts).
 *
 * Pattern: `{orgShort} Recruitment {year}: {N} {post names} — Apply by {date}`.
 * The title must never duplicate "Recruitment YYYY", must omit unknown facts
 * rather than defaulting them, and must fit MAX_META_TITLE by dropping the
 * post names first and the "Apply by" suffix second.
 */
import { describe, expect, test } from "vitest";
import { MAX_META_TITLE } from "@/lib/seo/meta-title";
import {
  composeRecruitmentDescription,
  composeRecruitmentTitle,
  formatTitleDate,
  stripRecruitmentSuffix,
} from "@/lib/seo/recruitment-title";

describe("composeRecruitmentTitle", () => {
  test("full pattern when every fact is known", () => {
    const { title, heading } = composeRecruitmentTitle({
      organizationName: "BPSC",
      recruitmentName: "BPSC Recruitment 2026",
      year: 2026,
      totalVacancies: 1200,
      postNames: ["Clerk", "Peon"],
      lastDate: "22 Oct 2026",
    });
    expect(title).toBe("BPSC Recruitment 2026: 1,200 Clerk, Peon — Apply by 22 Oct 2026");
    expect(heading).toBe("BPSC Recruitment 2026: 1,200 Clerk, Peon");
  });

  test("never produces a duplicated 'Recruitment 2026 — Recruitment 2026' when the org is unknown", () => {
    const { title } = composeRecruitmentTitle({
      organizationName: null,
      recruitmentName: "Odisha Staff Selection Commission Recruitment 2026",
      year: 2026,
      totalVacancies: null,
      postNames: [],
      lastDate: null,
    });
    expect(title).toBe("Odisha Staff Selection Commission Recruitment 2026");
    expect(title.match(/Recruitment/g)).toHaveLength(1);
    expect(title.match(/2026/g)).toHaveLength(1);
  });

  test("strips trailing 'Recruitment YYYY' variants from a recruitment name", () => {
    expect(stripRecruitmentSuffix("SSC CGL Recruitment 2026")).toBe("SSC CGL");
    expect(stripRecruitmentSuffix("SSC CGL Recruitment")).toBe("SSC CGL");
    expect(stripRecruitmentSuffix("SSC CGL 2026")).toBe("SSC CGL");
    expect(stripRecruitmentSuffix("SSC CGL — Recruitment 2026")).toBe("SSC CGL");
    expect(stripRecruitmentSuffix("Recruitment 2026")).toBe("Recruitment 2026");
  });

  test("omits the vacancy count when unknown and keeps the post names", () => {
    const { title } = composeRecruitmentTitle({
      organizationName: "UPSC",
      recruitmentName: "UPSC Recruitment 2026",
      year: 2026,
      totalVacancies: null,
      postNames: ["Clerk", null, "Clerk", "Peon", "Driver", "Fifth"],
      lastDate: "5 Nov 2026",
    });
    // Up to three unique names; blank/duplicate entries skipped.
    expect(title).toBe("UPSC Recruitment 2026: Clerk, Peon, Driver — Apply by 5 Nov 2026");
  });

  test("drops post names first when the composed title is too long", () => {
    const { title, heading } = composeRecruitmentTitle({
      organizationName: "Rajasthan High Court",
      recruitmentName: "RHC Recruitment 2026",
      year: 2026,
      totalVacancies: 350,
      postNames: ["Assistant Engineer (Civil) in Public Works Department", "Assistant Engineer (Mechanical)"],
      lastDate: "22 Oct 2026",
    });
    expect(title.length).toBeLessThanOrEqual(MAX_META_TITLE);
    expect(title).toBe("Rajasthan High Court Recruitment 2026: 350 — Apply by 22 Oct 2026");
    expect(heading).toBe("Rajasthan High Court Recruitment 2026: 350");
  });

  test("drops 'Apply by' second when the title is still too long", () => {
    const { title } = composeRecruitmentTitle({
      organizationName: "Rajasthan Public Service Commission",
      recruitmentName: "x",
      year: 2026,
      totalVacancies: 12,
      postNames: ["Multi Tasking Staff"],
      lastDate: "22 Oct 2026",
    });
    expect(title.length).toBeLessThanOrEqual(MAX_META_TITLE);
    expect(title).toBe("Rajasthan Public Service Commission Recruitment 2026: 12");
  });

  test("falls back to the shortest form when even the base exceeds the cap", () => {
    const { title } = composeRecruitmentTitle({
      organizationName: "Dadra and Nagar Haveli and Daman and Diu Administration",
      recruitmentName: "x",
      year: 2026,
      totalVacancies: 12,
      postNames: ["Multi Tasking Staff"],
      lastDate: "22 Oct 2026",
    });
    expect(title).toBe("Dadra and Nagar Haveli and Daman and Diu Administration Recruitment 2026: 12");
  });
});

describe("formatTitleDate", () => {
  test("renders an Indian date as '22 Oct 2026' and rejects placeholders", () => {
    expect(formatTitleDate("2026-10-22T18:29:59Z")).toBe("22 Oct 2026");
    expect(formatTitleDate("2099-12-31T00:00:00Z")).toBeNull();
    expect(formatTitleDate(null)).toBeNull();
  });
});

describe("composeRecruitmentDescription", () => {
  test("states only known facts and stays within 160 characters", () => {
    const d = composeRecruitmentDescription({
      orgName: "BPSC",
      totalVacancies: 1200,
      postNames: ["Assistant Professor"],
      lastDate: "22 Oct 2026",
      fee: "₹750 (General)",
    });
    expect(d).toBe("BPSC is recruiting 1,200 Assistant Professor. Last date 22 Oct 2026. Fee ₹750 (General).");
    expect(d.length).toBeLessThanOrEqual(160);
    expect(composeRecruitmentDescription({ orgName: "BPSC", totalVacancies: null, postNames: [], lastDate: null, fee: null }))
      .toBe("BPSC recruitment.");
  });
});
