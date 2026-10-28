import { describe, expect, it } from "vitest";
import { hasRoleGradeConflict, organizationCompatible, roleSimilarity, safeEntityMatch } from "../../scripts/fja-match-policy";

describe("FJA conservative entity matching policy", () => {
  it("rejects similarly named but different employers/campuses", () => {
    expect(organizationCompatible("AIIMS Rajkot", "North Eastern Indira Gandhi Regional Institute of Health and Medical Sciences")).toBe(false);
    expect(organizationCompatible("IIIT Delhi", "Indian Institute of Information Technology Kota")).toBe(false);
    expect(organizationCompatible("Zila Panchayat Bemetara", "Zila Panchayat Mungeli")).toBe(false);
    expect(organizationCompatible("CMFRI", "Rajasthan Agricultural Research Institute")).toBe(false);
  });

  it("supports common long-name/acronym forms when campus identity agrees", () => {
    expect(organizationCompatible("IIIT Delhi", "Indian Institute of Information Technology Delhi")).toBe(true);
    expect(organizationCompatible("CMFRI", "Central Marine Fisheries Research Institute")).toBe(false);
  });

  it("rejects research grade mismatches", () => {
    expect(hasRoleGradeConflict("Project Research Scientist II", "Project Research Scientist III")).toBe(true);
    expect(safeEntityMatch({
      sourceOrganization: "SCTIMST",
      candidateOrganization: "Sree Chitra Tirunal Institute for Medical Sciences and Technology",
      sourceTitle: "Project Research Scientist II",
      candidateTitle: "Project Research Scientist III"
    }).safe).toBe(false);
  });

  it("does not let a generic role title establish identity without an employer match", () => {
    expect(roleSimilarity("Field Assistant", "Field Assistant")).toBe(1);
    expect(safeEntityMatch({
      sourceOrganization: "CMFRI",
      candidateOrganization: "Rajasthan Agricultural Research Institute",
      sourceTitle: "Field Assistant",
      candidateTitle: "Field Assistant"
    }).safe).toBe(false);
  });

  it("accepts strong employer and role agreement", () => {
    expect(safeEntityMatch({
      sourceOrganization: "National Aluminium Company Limited",
      candidateOrganization: "National Aluminium Company Limited",
      sourceTitle: "Assistant Editor",
      candidateTitle: "Assistant Editor"
    }).safe).toBe(true);
  });
});
