/**
 * Post/Vacancy increment (A1): the post-line classifier and Post identity rules.
 * Evidence files are the measured sample the owner reviewed.
 */
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { classifyPostLine, decidePostIdentity, normalizePostName, postNameSimilarity } from "@/ingest/post-lines";

const ev = (f: string) =>
  readFileSync(join(process.cwd(), "docs/architecture/evidence", f), "utf8")
    .split("\n")
    .slice(1)
    .filter(Boolean)
    .map((l) => l.split("\t"));

describe("PV-U post-line classifier", () => {
  test("PV-U1 every line in the measured rejected set is still rejected", () => {
    const rows = ev("postvac_a1_rejected_lines.tsv");
    expect(rows.length).toBe(488);
    const accepted = rows.filter(([, line, count]) => classifyPostLine(line, Number.isFinite(parseInt(count, 10)) ? parseInt(count, 10) : null) === "OK");
    expect(accepted.map((r) => r[1])).toEqual([]);
  });

  test("PV-U2 every line in the fresh final-rule sample is accepted", () => {
    const rows = ev("postvac_a1_fresh50_final_rules.tsv");
    expect(rows.length).toBe(50);
    const rejected = rows.filter(([, , line, count]) => classifyPostLine(line, parseInt(count, 10)) !== "OK");
    expect(rejected.map((r) => r[2])).toEqual([]);
  });

  test("PV-U3 the known wrong lines are rejected for their own reason", () => {
    expect(classifyPostLine("Athletics", 5)).toBe("SPORT_DISCIPLINE");
    expect(classifyPostLine("Sports Shooting", 8)).toBe("SPORT_DISCIPLINE");
    expect(classifyPostLine("Equestrian", 1)).toBe("NO_ROLE_NOUN");
    expect(classifyPostLine("28", 4)).toBe("LEN");
    expect(classifyPostLine("2024", 4)).toBe("NUMERIC_NAME");
    expect(classifyPostLine("Plastic Surgery", 1)).toBe("ACADEMIC_DISCIPLINE");
    expect(classifyPostLine("Civil Engineering", 2)).toBe("NO_ROLE_NOUN");
    expect(classifyPostLine("Centre for Teacher Education", 1)).toBe("DEPARTMENT_LINE");
    expect(classifyPostLine("No of Posts", 27)).toBe("GENERIC");
    expect(classifyPostLine("General", 3065)).toBe("CATEGORY_LABEL");
    expect(classifyPostLine("Project Associate I/ Project Associate II", 2)).toBe("COMBINED");
  });

  test("PV-U4 a zero or missing count never passes; a bare single-word title is not rejected on length of title alone", () => {
    expect(classifyPostLine("Junior Assistant", 0)).toBe("BAD_COUNT");
    expect(classifyPostLine("Junior Assistant", null)).toBe("BAD_COUNT");
    expect(classifyPostLine("Executive", 1)).toBe("OK"); // owner decision: ambiguous cases go to review, no blanket single-word rule
  });
});

describe("PV-U post identity against existing Posts", () => {
  const existing = [
    { id: 1, name: "Junior Research Fellow", vacancyTotal: 1 },
    { id: 2, name: "Project Associate-I", vacancyTotal: 3 },
  ];

  test("PV-U5 exact normalized name is the same Post (case, spacing, dash form)", () => {
    expect(normalizePostName("  PROJECT  Associate – I ")).toBe(normalizePostName("Project Associate-I"));
    expect(decidePostIdentity({ name: "project associate - i", count: 9 }, existing)).toEqual({ kind: "EXISTING", postId: 2, basis: "EXACT_NAME" });
  });

  test("PV-U6 renamed line: strong similarity with the same count resolves to the existing Post, never a duplicate", () => {
    const d = decidePostIdentity({ name: "Junior Research Fellow (JRF)", count: 1 }, existing);
    expect(d).toEqual({ kind: "EXISTING", postId: 1, basis: "SIMILAR_WITH_SUPPORT" });
  });

  test("PV-U7 renamed line with a different count is unresolved, not a new Post", () => {
    const d = decidePostIdentity({ name: "Junior Research Fellow (JRF)", count: 4 }, existing);
    expect(d).toEqual({ kind: "UNRESOLVED", reason: "SIMILAR_WITHOUT_SUPPORT" });
  });

  test("PV-U8 a different grade is a different post even with the same count", () => {
    expect(postNameSimilarity("Project Associate-I", "Project Associate-II")).toBeGreaterThan(0.85);
    expect(decidePostIdentity({ name: "Project Associate-II", count: 3 }, existing)).toEqual({ kind: "CREATE" });
  });

  test("PV-U9 line position is not an input: the decision depends only on name, count and existing Posts", () => {
    expect(decidePostIdentity.length).toBe(2);
    expect(decidePostIdentity({ name: "Librarian", count: 1 }, existing)).toEqual({ kind: "CREATE" });
  });

  test("PV-U10 two equally similar candidates are ambiguous and unresolved", () => {
    const two = [
      { id: 7, name: "Assistant Engineer Civil", vacancyTotal: 2 },
      { id: 8, name: "Assistant Engineer Civils", vacancyTotal: 2 },
    ];
    expect(decidePostIdentity({ name: "Assistant Engineer Civil Eng", count: 2 }, two).kind).toBe("UNRESOLVED");
  });
});
