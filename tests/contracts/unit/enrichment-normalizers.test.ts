/**
 * Regression tests for enrichment-normalizers.ts
 *
 * Each known DB shape (A–M from the audit, 2026-10-12) must produce
 * meaningful output. Tests also assert that:
 *  - Unknown / null / empty inputs are safe (no crash, empty/null return).
 *  - The `source` provenance field is NEVER present in normalizer output.
 *  - No fabricated values: if a field cannot be interpreted, it is omitted.
 */
import { describe, expect, test } from "vitest";
import {
  normalizeSelectionProcess,
  normalizeEligibilityPathways,
  normalizeEducation,
  normalizeExperience,
} from "@/lib/enrichment-normalizers";

// ── normalizeSelectionProcess ─────────────────────────────────────────────────

describe("normalizeSelectionProcess", () => {
  test("null / undefined input returns empty array", () => {
    expect(normalizeSelectionProcess(null)).toEqual([]);
    expect(normalizeSelectionProcess(undefined)).toEqual([]);
    expect(normalizeSelectionProcess({})).toEqual([]);
  });

  test("empty array returns empty array", () => {
    expect(normalizeSelectionProcess([])).toEqual([]);
  });

  // Shape A — string[] (41 rows in DB)
  test("Shape A: string array produces named stages with step=null", () => {
    const result = normalizeSelectionProcess(["Shortlisting", "Written Test", "Interview"]);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ name: "Shortlisting", step: null });
    expect(result[1]).toEqual({ name: "Written Test", step: null });
    expect(result[2]).toEqual({ name: "Interview", step: null });
  });

  test("Shape A: empty strings in array are dropped", () => {
    const result = normalizeSelectionProcess(["Shortlisting", "  ", "", "Interview"]);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.name)).toEqual(["Shortlisting", "Interview"]);
  });

  // Shape B — {step, name, description, totalMarks, minQualifyingMarks}
  test("Shape B: full structured object retains all fields", () => {
    const raw = [
      {
        step: 1,
        name: "Preliminary Exam",
        totalMarks: 100,
        duration: "2 hours",
        description: "Objective type questions",
        minQualifyingMarks: { UR: 45, OBC: 40, SC: 35 },
      },
      {
        step: 2,
        name: "Mains",
        totalMarks: 300,
      },
    ];
    const result = normalizeSelectionProcess(raw);
    expect(result).toHaveLength(2);
    expect(result[0].step).toBe(1);
    expect(result[0].name).toBe("Preliminary Exam");
    expect(result[0].totalMarks).toBe(100);
    expect(result[0].duration).toBe("2 hours");
    expect(result[0].description).toBe("Objective type questions");
    expect(result[0].minQualifyingMarks).toEqual({ UR: 45, OBC: 40, SC: 35 });
    expect(result[1].step).toBe(2);
    expect(result[1].name).toBe("Mains");
    expect(result[1].totalMarks).toBe(300);
    expect(result[1].duration).toBeUndefined();
  });

  // Shape C — {step, label, description} (9 rows in DB)
  test("Shape C: label used as name when name absent", () => {
    const raw = [
      { step: 1, label: "Written Exam", description: "MCQ based" },
      { step: 2, label: "Document Verification" },
    ];
    const result = normalizeSelectionProcess(raw);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Written Exam");
    expect(result[0].step).toBe(1);
    expect(result[0].description).toBe("MCQ based");
    expect(result[1].name).toBe("Document Verification");
  });

  // Shape D — {stage} (1 row in DB)
  test("Shape D: {stage} objects produce named stages with step=null", () => {
    const raw = [
      { stage: "Online Application" },
      { stage: "CBT Phase I" },
      { stage: "Document Verification" },
    ];
    const result = normalizeSelectionProcess(raw);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ name: "Online Application", step: null });
    expect(result[2]).toEqual({ name: "Document Verification", step: null });
  });

  test("Shape D: empty stage string is dropped", () => {
    expect(normalizeSelectionProcess([{ stage: "  " }])).toHaveLength(0);
  });

  test("items without any recognizable name are dropped, not blank", () => {
    // An object with neither name, label, nor stage should be dropped.
    const result = normalizeSelectionProcess([
      { foo: "bar" },
      "Valid Stage",
      null,
      42,
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Valid Stage");
  });
});

// ── normalizeEligibilityPathways ──────────────────────────────────────────────

describe("normalizeEligibilityPathways", () => {
  test("null / undefined / empty returns empty array", () => {
    expect(normalizeEligibilityPathways(null)).toEqual([]);
    expect(normalizeEligibilityPathways(undefined)).toEqual([]);
    expect(normalizeEligibilityPathways([])).toEqual([]);
  });

  // Shape E — {source, pathway} stub (199 rows in DB)
  test("Shape E: stub strips source field and uses pathway as label", () => {
    const raw = [
      { source: "xlsx_freejobsalert", pathway: "10th Pass" },
      { source: "xlsx_freejobsalert", pathway: "Graduate" },
      { source: "aggregator_v2", pathway: "Diploma" },
    ];
    const result = normalizeEligibilityPathways(raw);
    expect(result).toHaveLength(3);
    // source must NEVER appear in output
    result.forEach((p) => {
      expect(p).not.toHaveProperty("source");
      expect(JSON.stringify(p)).not.toContain("xlsx_freejobsalert");
      expect(JSON.stringify(p)).not.toContain("aggregator_v2");
    });
    expect(result[0].kind).toBe("stub");
    expect(result[0].label).toBe("10th Pass");
    expect(result[1].label).toBe("Graduate");
    expect(result[2].label).toBe("Diploma");
  });

  test("Shape E: stub with numeric pathway gets fallback label", () => {
    const result = normalizeEligibilityPathways([{ source: "xlsx_fja", pathway: 1 }]);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("stub");
    expect(result[0].label).toBe("Pathway 1");
  });

  // Shape F — {label, text} (9 rows in DB)
  test("Shape F: label-text objects produce label-text kind", () => {
    const raw = [
      { label: "Graduate", text: "Must hold a degree from a recognized university" },
      { label: "Diploma Holder", text: "3-year diploma in relevant engineering" },
    ];
    const result = normalizeEligibilityPathways(raw);
    expect(result).toHaveLength(2);
    expect(result[0].kind).toBe("label-text");
    expect(result[0].label).toBe("Graduate");
    expect(result[0].description).toBe("Must hold a degree from a recognized university");
    expect(result[1].label).toBe("Diploma Holder");
  });

  test("Shape F: label-text with empty label uses text as label", () => {
    const result = normalizeEligibilityPathways([{ label: "", text: "Matriculate" }]);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Matriculate");
    expect(result[0].description).toBeUndefined();
  });

  test("Shape F: both empty drops the entry", () => {
    expect(normalizeEligibilityPathways([{ label: "", text: "" }])).toHaveLength(0);
    expect(normalizeEligibilityPathways([{ label: "  ", text: "  " }])).toHaveLength(0);
  });

  // Shape G — full structured {description, pathway, qualifications, experienceYears} (1 row)
  test("Shape G: full pathway retains all fields", () => {
    const raw = [
      {
        pathway: "Engineering Graduate",
        description: "B.Tech/B.E. from any recognized institution",
        qualifications: ["B.Tech in Computer Science", "B.E. in Electronics", "B.Tech in IT"],
        experienceYears: 2,
      },
    ];
    const result = normalizeEligibilityPathways(raw);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("full");
    expect(result[0].label).toBe("Engineering Graduate");
    expect(result[0].description).toBe("B.Tech/B.E. from any recognized institution");
    expect(result[0].qualifications).toEqual([
      "B.Tech in Computer Science",
      "B.E. in Electronics",
      "B.Tech in IT",
    ]);
    expect(result[0].experienceYears).toBe(2);
  });

  test("Shape G: numeric pathway gets Pathway N label", () => {
    const raw = [{ pathway: 1, description: "Any graduate degree" }];
    const result = normalizeEligibilityPathways(raw);
    expect(result[0].kind).toBe("full");
    expect(result[0].label).toBe("Pathway 1");
  });

  // Shape H — {qualification} (2 rows in DB per reviewer correction)
  test("Shape H: qualification string becomes label", () => {
    const raw = [
      { qualification: "Bachelor of Science" },
      { qualification: "Diploma in Engineering" },
    ];
    const result = normalizeEligibilityPathways(raw);
    expect(result).toHaveLength(2);
    expect(result[0].kind).toBe("qualification");
    expect(result[0].label).toBe("Bachelor of Science");
    expect(result[1].label).toBe("Diploma in Engineering");
  });

  test("Shape H: empty qualification is dropped", () => {
    expect(normalizeEligibilityPathways([{ qualification: "  " }])).toHaveLength(0);
  });

  test("unrecognized shapes are dropped (no fabrication)", () => {
    const result = normalizeEligibilityPathways([
      { foo: "bar" },
      null,
      42,
      { label: "OK", text: "real entry" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("OK");
  });

  test("provenance field 'source' is never in any output kind", () => {
    const shapes = [
      { source: "s", pathway: "10th" },
      { source: "s", label: "Grad", text: "Any degree" },
    ];
    normalizeEligibilityPathways(shapes).forEach((p) => {
      expect(JSON.stringify(p)).not.toContain('"source"');
    });
  });
});

// ── normalizeEducation ────────────────────────────────────────────────────────

describe("normalizeEducation", () => {
  test("null / non-object returns null", () => {
    expect(normalizeEducation(null)).toBeNull();
    expect(normalizeEducation("B.Tech")).toBeNull();
    expect(normalizeEducation([])).toBeNull();
    expect(normalizeEducation(42)).toBeNull();
  });

  // Shape I — {degree, university, registration?}
  test("Shape I: degree and university preserved", () => {
    const result = normalizeEducation({
      degree: "MBBS",
      university: "Any recognized medical university",
    });
    expect(result).not.toBeNull();
    expect(result!.degree).toBe("MBBS");
    expect(result!.university).toBe("Any recognized medical university");
    expect(result!.notes).toBeUndefined();
    expect(result!.preferred).toBeUndefined();
    expect(result!.options).toBeUndefined();
  });

  // Shape J — {degree, notes?, preferred?}
  test("Shape J: degree with notes and preferred flag", () => {
    const result = normalizeEducation({
      degree: "B.Tech / B.E.",
      notes: "In relevant engineering discipline",
      preferred: false,
    });
    expect(result!.degree).toBe("B.Tech / B.E.");
    expect(result!.notes).toBe("In relevant engineering discipline");
    expect(result!.preferred).toBe(false);
    expect(result!.university).toBeUndefined();
  });

  test("Shape J: degree only (no notes or preferred) works", () => {
    const result = normalizeEducation({ degree: "Graduate" });
    expect(result!.degree).toBe("Graduate");
    expect(result!.notes).toBeUndefined();
    expect(result!.preferred).toBeUndefined();
  });

  // Shape K — {qualification_options: string[]}
  test("Shape K: qualification_options list is preserved", () => {
    const result = normalizeEducation({
      qualification_options: ["10th Pass", "ITI Certificate", "Diploma in Engineering"],
    });
    expect(result).not.toBeNull();
    expect(result!.options).toEqual(["10th Pass", "ITI Certificate", "Diploma in Engineering"]);
    expect(result!.degree).toBeUndefined();
  });

  test("Shape K: empty qualification_options returns null", () => {
    expect(normalizeEducation({ qualification_options: [] })).toBeNull();
    expect(normalizeEducation({ qualification_options: ["  ", ""] })).toBeNull();
  });

  test("object with no recognizable fields returns null (no fabrication)", () => {
    expect(normalizeEducation({ foo: "bar" })).toBeNull();
    expect(normalizeEducation({ university: "IIT" })).toBeNull(); // no degree
  });
});

// ── normalizeExperience ───────────────────────────────────────────────────────

describe("normalizeExperience", () => {
  test("null / non-object returns null", () => {
    expect(normalizeExperience(null)).toBeNull();
    expect(normalizeExperience("2 years")).toBeNull();
    expect(normalizeExperience([])).toBeNull();
  });

  // Shape L — canonical {minYears, domains, countedFrom?, notes?} (2 rows in DB)
  test("Shape L: canonical structured form preserved", () => {
    const result = normalizeExperience({
      minYears: 3,
      domains: ["Software Development", "System Administration"],
      countedFrom: "After graduation",
      notes: "Government service experience preferred",
    });
    expect(result).not.toBeNull();
    expect(result!.minYears).toBe(3);
    expect(result!.domains).toEqual(["Software Development", "System Administration"]);
    expect(result!.countedFrom).toBe("After graduation");
    expect(result!.notes).toBe("Government service experience preferred");
    expect(result!.keyedEntries).toBeUndefined();
  });

  test("Shape L: zero minYears is valid (fresh graduate)", () => {
    const result = normalizeExperience({ minYears: 0, domains: [] });
    expect(result!.minYears).toBe(0);
  });

  test("Shape L: domains array with empty strings are filtered out", () => {
    const result = normalizeExperience({ minYears: 2, domains: ["IT", "  ", ""] });
    expect(result!.domains).toEqual(["IT"]);
  });

  test("Shape L: minYears without optional fields", () => {
    const result = normalizeExperience({ minYears: 1 });
    expect(result!.minYears).toBe(1);
    expect(result!.domains).toBeUndefined();
    expect(result!.countedFrom).toBeUndefined();
    expect(result!.notes).toBeUndefined();
  });

  // Shape M — keyed object {"<role>": "<description>"} (1 row in DB)
  test("Shape M: keyed object produces keyedEntries", () => {
    const result = normalizeExperience({
      "Junior Engineer": "Minimum 2 years in public works department",
      "Senior Technician": "Minimum 5 years hands-on experience",
    });
    expect(result).not.toBeNull();
    expect(result!.keyedEntries).toHaveLength(2);
    expect(result!.keyedEntries![0]).toEqual({
      role: "Junior Engineer",
      description: "Minimum 2 years in public works department",
    });
    expect(result!.keyedEntries![1]).toEqual({
      role: "Senior Technician",
      description: "Minimum 5 years hands-on experience",
    });
    expect(result!.minYears).toBeUndefined();
  });

  test("Shape M: empty keyed object returns null", () => {
    expect(normalizeExperience({})).toBeNull();
  });

  test("Shape M: keyed entries with empty values are filtered out (no fabrication)", () => {
    const result = normalizeExperience({
      "Valid Role": "2 years experience",
      "Empty Role": "  ",
    });
    // "Empty Role" has whitespace-only description — should be filtered
    expect(result!.keyedEntries).toHaveLength(1);
    expect(result!.keyedEntries![0].role).toBe("Valid Role");
  });
});
