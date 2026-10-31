import { describe, expect, test } from "vitest";
import { hasHighConfidenceIssuerOrganizationMismatch } from "@/lib/organization-identity";

const source = "institutional_aggregation";

describe("high-confidence issuer / organisation mismatch guard", () => {
  test("flags IIT Delhi mapped to IIIT Kota", () => {
    expect(hasHighConfidenceIssuerOrganizationMismatch({
      source,
      institutionName: "Indian Institute of Technology Delhi",
      recruitmentName: "IIT Delhi Junior and Senior Project Assistant Recruitment",
      organizationName: "Indian Institute of Information Technology Kota",
    })).toBe(true);
  });

  test("flags IIT Indore mapped to IIIT Kota", () => {
    expect(hasHighConfidenceIssuerOrganizationMismatch({
      source,
      institutionName: "Indian Institute of Technology Indore",
      recruitmentName: "IIT Indore Junior Research Fellow Recruitment",
      organizationName: "Indian Institute of Information Technology Kota",
    })).toBe(true);
  });

  test("flags AIIMS Jodhpur mapped to a generic AIIMS entity", () => {
    expect(hasHighConfidenceIssuerOrganizationMismatch({
      source,
      institutionName: "All India Institute of Medical Sciences Jodhpur",
      recruitmentName: "AIIMS Jodhpur Project Technical Support Recruitment",
      organizationName: "AIIMS / Medical Institute",
    })).toBe(true);
  });

  test("flags an unresolved generic organisation when issuer and Recruitment agree", () => {
    expect(hasHighConfidenceIssuerOrganizationMismatch({
      source,
      institutionName: "One Stop Centre Sivasagar",
      recruitmentName: "One Stop Centre Sivasagar Recruitment",
      organizationName: "Unclassified Government Jobs",
    })).toBe(true);
  });

  test("does not flag an exact organisation match", () => {
    expect(hasHighConfidenceIssuerOrganizationMismatch({
      source,
      institutionName: "Indian Institute of Technology Delhi",
      recruitmentName: "IIT Delhi Project Scientist Recruitment",
      organizationName: "Indian Institute of Technology Delhi",
    })).toBe(false);
  });

  test("does not flag the EIL / Engineers India alias control", () => {
    expect(hasHighConfidenceIssuerOrganizationMismatch({
      source,
      institutionName: "Engineers India Limited",
      recruitmentName: "EIL Associate Engineer Recruitment",
      organizationName: "EIL Associate Engineer",
    })).toBe(false);
  });

  test("does not run for other provenance sources", () => {
    expect(hasHighConfidenceIssuerOrganizationMismatch({
      source: "official",
      institutionName: "Indian Institute of Technology Delhi",
      recruitmentName: "IIT Delhi Project Scientist Recruitment",
      organizationName: "Indian Institute of Information Technology Kota",
    })).toBe(false);
  });

  test("does not flag when the issuer name does not match the Recruitment title", () => {
    expect(hasHighConfidenceIssuerOrganizationMismatch({
      source,
      institutionName: "UPPSC",
      recruitmentName: "IIT Delhi Project Scientist Recruitment",
      organizationName: "Indian Institute of Information Technology Kota",
    })).toBe(false);
  });
});
