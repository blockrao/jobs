/**
 * Unit tests for Phase 2 qualification parser
 */

import { describe, test, expect } from "vitest";
import {
  parseQualification,
  educationToSchema,
  experienceToSchema,
} from "@/lib/parsers/qualification-parser";

describe("Qualification Parser", () => {
  describe("parseQualification", () => {
    test("extracts bachelor's degree with field", () => {
      const text =
        "Bachelor's degree in Computer Science with 5+ years of experience";
      const result = parseQualification(text);

      expect(result.educations).toHaveLength(1);
      expect(result.educations[0].level).toBe("Bachelor's");
      expect(result.educations[0].field).toBe("Computer Science");
      expect(result.educations[0].credentialCategory).toBe("Bachelors");
    });

    test("extracts multiple education levels", () => {
      const text =
        "Master's degree in Computer Science preferred; Bachelor's in related field";
      const result = parseQualification(text);

      expect(result.educations).toHaveLength(2);
      expect(result.educations[0].level).toBe("Master's");
      expect(result.educations[1].level).toBe("Bachelor's");
    });

    test("extracts doctorate", () => {
      const text = "PhD in Physics or related discipline";
      const result = parseQualification(text);

      expect(result.educations).toHaveLength(1);
      expect(result.educations[0].level).toBe("Doctorate");
      expect(result.educations[0].field).toBe("Physics");
    });

    test("extracts high school", () => {
      const text = "12th pass or HSC with merit";
      const result = parseQualification(text);

      expect(result.educations.length).toBeGreaterThan(0);
      expect(result.educations[0].level).toBe("High School");
    });

    test("extracts years of experience", () => {
      const text = "5+ years of software development experience required";
      const result = parseQualification(text);

      expect(result.experience).toBeDefined();
      expect(result.experience?.years).toBe(5);
      expect(result.experience?.field).toContain("software");
    });

    test("extracts experience range", () => {
      const text = "3-5 years of experience in data analysis";
      const result = parseQualification(text);

      expect(result.experience).toBeDefined();
      expect(result.experience?.years).toBe(4); // Average of 3 and 5
      expect(result.experience?.field).toContain("data");
    });

    test("extracts programming skills", () => {
      const text = "Knowledge of Python, Java, and JavaScript required";
      const result = parseQualification(text);

      expect(result.skills).toContain("Python");
      expect(result.skills).toContain("Java");
      expect(result.skills).toContain("JavaScript");
    });

    test("extracts database skills", () => {
      const text = "SQL and MongoDB experience preferred";
      const result = parseQualification(text);

      expect(result.skills).toContain("SQL");
      expect(result.skills).toContain("MONGODB");
    });

    test("handles empty text", () => {
      const result = parseQualification("");

      expect(result.educations).toHaveLength(0);
      expect(result.experience).toBeUndefined();
      expect(result.skills).toHaveLength(0);
    });

    test("handles null input", () => {
      const result = parseQualification(null as any);

      expect(result.educations).toHaveLength(0);
      expect(result.skills).toHaveLength(0);
    });

    test("Indian government exam qualification format", () => {
      const text =
        "Bachelor's degree from a recognized university with 3+ years of civil service experience";
      const result = parseQualification(text);

      expect(result.educations).toHaveLength(1);
      expect(result.educations[0].level).toBe("Bachelor's");
      expect(result.experience?.years).toBe(3);
    });

    test("complex qualification with multiple fields", () => {
      const text = `
        Qualifications:
        - Master's in Engineering or Physics
        - 7-10 years of research experience
        - Knowledge of C++, Python, and CUDA programming
        - Experience with AWS and Kubernetes
      `;
      const result = parseQualification(text);

      expect(result.educations.length).toBeGreaterThan(0);
      expect(result.experience?.years).toBeGreaterThan(0);
      expect(result.skills.length).toBeGreaterThan(0);
    });
  });

  describe("educationToSchema", () => {
    test("converts education to schema.org EducationalOccupationalCredential", () => {
      const edu = {
        level: "Bachelor's" as const,
        field: "Computer Science",
        credentialCategory: "Bachelors",
      };

      const schema = educationToSchema(edu);

      expect(schema["@type"]).toBe("EducationalOccupationalCredential");
      expect(schema.credentialCategory).toBe("Bachelors");
      expect(schema.name).toBe("Bachelor's in Computer Science");
    });

    test("handles education without field", () => {
      const edu = {
        level: "High School" as const,
        credentialCategory: "HighSchool",
      };

      const schema = educationToSchema(edu);

      expect(schema.name).toBe("High School");
    });
  });

  describe("experienceToSchema", () => {
    test("converts experience to schema.org OccupationalExperienceRequirements", () => {
      const exp = {
        years: 5,
        field: "software development",
        details: "5+ years of software development experience",
      };

      const schema = experienceToSchema(exp);

      expect(schema["@type"]).toBe("OccupationalExperienceRequirements");
      expect(schema.monthsOfExperience).toBe(60); // 5 years = 60 months
      expect(schema.description).toBe("5+ years of software development experience");
    });

    test("converts experience without field", () => {
      const exp = {
        years: 3,
        field: undefined,
      };

      const schema = experienceToSchema(exp);

      expect(schema["@type"]).toBe("OccupationalExperienceRequirements");
      expect(schema.monthsOfExperience).toBe(36);
    });
  });
});
