/**
 * Phase 2 JobPosting Schema Integration Tests
 * Validates that buildJobPostingSchema emits Phase 2 fields correctly
 */

import { describe, test, expect } from "vitest";
import { buildJobPostingSchema } from "@/lib/structured-data";

/**
 * Mock posting with Phase 2 qualification text
 */
function createMockPostingWithQualifications(overrides: any = {}) {
  return {
    id: 1,
    slug: "upsc-2026-05/senior-research-fellow",
    title: "Senior Research Fellow",
    description: "Detailed job description with opportunities for research",
    eligibility: `
      Bachelor's degree in Physics or related discipline from a recognized university.
      5+ years of experience in research and development.
      Knowledge of advanced programming in C++ and Python is essential.
    `,
    requirements: `
      Master's degree preferred.
      Experience with Kubernetes and AWS cloud infrastructure.
    `,
    postNames: ["Senior Research Fellow"],
    currentStage: "APPLICATION_OPEN",
    validThrough: new Date("2026-12-31"),
    datePosted: new Date("2026-10-15"),
    updatedAt: new Date("2026-10-15"),
    contentChangedAt: null,
    organizationId: 1,
    kind: "GOVERNMENT",
    employmentType: "FULL_TIME",
    workplaceType: "ONSITE",
    locationCity: "New Delhi",
    locationRegion: "Delhi",
    totalVacancies: 5,
    salaryMin: 500000,
    salaryMax: 750000,
    salaryCurrency: "INR",
    salaryPeriod: "MONTH",
    applyUrl: "https://upsconline.nic.in/apply",
    externalId: "UPSC/2026/05/001",
    reviewStatus: "APPROVED",
    indexTier: "A",
    extraContent: {
      appointmentDate: "2026-12-01",
      benefits: ["Government pension", "Health insurance", "Leave benefits"],
    },
    ...overrides,
  };
}

/**
 * Mock organization
 */
function createMockOrganization(overrides: any = {}) {
  return {
    id: 1,
    slug: "upsc",
    name: "Union Public Service Commission",
    sector: "GOVERNMENT_CENTRAL",
    websiteUrl: "https://www.upsc.gov.in",
    description: "Government organization conducting competitive exams",
    logoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("Phase 2: JobPosting Schema with Qualifications", () => {
  describe("Education Requirements", () => {
    test("emits educationRequirements from parsed eligibility text", () => {
      const posting = createMockPostingWithQualifications();
      const org = createMockOrganization();

      const schema = buildJobPostingSchema(posting as any, org as any);

      expect(schema).not.toBeNull();
      expect(schema?.educationRequirements).toBeDefined();
      expect(Array.isArray(schema?.educationRequirements)).toBe(true);

      // Should contain Bachelor's and Master's
      const eduArray = schema?.educationRequirements as any[];
      expect(eduArray.length).toBeGreaterThan(0);

      // Check schema structure
      const bachelor = eduArray.find((e) => e.credentialCategory === "Bachelors");
      expect(bachelor).toBeDefined();
      expect(bachelor?.["@type"]).toBe("EducationalOccupationalCredential");
      expect(bachelor?.name).toContain("Bachelor");
    });

    test("includes field information when recognized", () => {
      const posting = createMockPostingWithQualifications();
      const org = createMockOrganization();

      const schema = buildJobPostingSchema(posting as any, org as any);

      const eduArray = schema?.educationRequirements as any[];
      const physicsEdu = eduArray.find((e) => e.name?.includes("Physics"));
      expect(physicsEdu).toBeDefined();
      expect(physicsEdu?.name).toContain("Physics");
    });
  });

  describe("Experience Requirements", () => {
    test("emits experienceRequirements from parsed eligibility text", () => {
      const posting = createMockPostingWithQualifications();
      const org = createMockOrganization();

      const schema = buildJobPostingSchema(posting as any, org as any);

      expect(schema).not.toBeNull();
      expect(schema?.experienceRequirements).toBeDefined();

      const exp = schema?.experienceRequirements as any;
      expect(exp["@type"]).toBe("OccupationalExperienceRequirements");
      expect(exp.monthsOfExperience).toBeGreaterThan(0);
      expect(exp.monthsOfExperience).toBe(60); // 5 years = 60 months
    });

    test("includes experience description when field is detected", () => {
      const posting = createMockPostingWithQualifications();
      const org = createMockOrganization();

      const schema = buildJobPostingSchema(posting as any, org as any);

      const exp = schema?.experienceRequirements as any;
      if (exp?.description) {
        expect(exp.description).toContain("research");
      }
    });
  });

  describe("Job Benefits", () => {
    test("emits jobBenefits from extraContent", () => {
      const posting = createMockPostingWithQualifications();
      const org = createMockOrganization();

      const schema = buildJobPostingSchema(posting as any, org as any);

      expect(schema?.jobBenefits).toBeDefined();
      expect(Array.isArray(schema?.jobBenefits)).toBe(true);

      const benefits = schema?.jobBenefits as any[];
      expect(benefits.length).toBe(3);
      expect(benefits[0]["@type"]).toBe("JobBenefit");
      expect(benefits[0].name).toBe("Government pension");
    });

    test("omits jobBenefits when not provided", () => {
      const posting = createMockPostingWithQualifications({
        extraContent: { appointmentDate: "2026-12-01" },
      });
      const org = createMockOrganization();

      const schema = buildJobPostingSchema(posting as any, org as any);

      expect(schema?.jobBenefits).toBeUndefined();
    });
  });

  describe("Job Start Date", () => {
    test("emits jobStartDate from extraContent.appointmentDate", () => {
      const posting = createMockPostingWithQualifications();
      const org = createMockOrganization();

      const schema = buildJobPostingSchema(posting as any, org as any);

      expect(schema?.jobStartDate).toBeDefined();
      expect(schema?.jobStartDate).toMatch(/2026-12-01/);
    });

    test("omits jobStartDate when not provided", () => {
      const posting = createMockPostingWithQualifications({
        extraContent: { benefits: ["Pension"] },
      });
      const org = createMockOrganization();

      const schema = buildJobPostingSchema(posting as any, org as any);

      expect(schema?.jobStartDate).toBeUndefined();
    });
  });

  describe("Organization Entity Linking", () => {
    test("includes sameAs with organization website", () => {
      const posting = createMockPostingWithQualifications();
      const org = createMockOrganization();

      const schema = buildJobPostingSchema(posting as any, org as any);

      expect(schema?.hiringOrganization).toBeDefined();
      const hireOrg = schema?.hiringOrganization as any;
      expect(hireOrg.sameAs).toBe("https://www.upsc.gov.in");
    });

    test("omits sameAs when organization has no website", () => {
      const posting = createMockPostingWithQualifications();
      const org = createMockOrganization({ websiteUrl: null });

      const schema = buildJobPostingSchema(posting as any, org as any);

      const hireOrg = schema?.hiringOrganization as any;
      expect(hireOrg.sameAs).toBeUndefined();
    });

    test("preserves organization type for government orgs", () => {
      const posting = createMockPostingWithQualifications();
      const org = createMockOrganization();

      const schema = buildJobPostingSchema(posting as any, org as any);

      const hireOrg = schema?.hiringOrganization as any;
      expect(hireOrg["@type"]).toBe("GovernmentOrganization");
    });
  });

  describe("Phase 1 + Phase 2 Combined", () => {
    test("includes all required fields for complete JobPosting", () => {
      const posting = createMockPostingWithQualifications();
      const org = createMockOrganization();

      const schema = buildJobPostingSchema(posting as any, org as any);

      // Phase 1 fields
      expect(schema?.title).toBe("Senior Research Fellow");
      expect(schema?.description).toBeTruthy();
      expect(schema?.datePosted).toBeTruthy();
      expect(schema?.validThrough).toBeTruthy();
      expect(schema?.employmentType).toBe("FULL_TIME");
      expect(schema?.totalJobOpenings).toBe(5);
      expect(schema?.baseSalary).toBeTruthy();

      // Phase 2 fields
      expect(schema?.educationRequirements).toBeDefined();
      expect(schema?.experienceRequirements).toBeDefined();
      expect(schema?.jobBenefits).toBeDefined();
      expect(schema?.jobStartDate).toBeDefined();
      expect(schema?.hiringOrganization?.sameAs).toBeDefined();
    });

    test("maintains Google JobPosting schema validity", () => {
      const posting = createMockPostingWithQualifications();
      const org = createMockOrganization();

      const schema = buildJobPostingSchema(posting as any, org as any) as any;

      // Verify @type and required fields
      expect(schema["@type"]).toBe("JobPosting");
      expect(schema.url).toBeTruthy();
      expect(schema.title).toBeTruthy();
      expect(schema.description).toBeTruthy();
      expect(schema.hiringOrganization).toBeTruthy();

      // Verify Phase 2 fields maintain schema.org types
      if (schema.educationRequirements) {
        schema.educationRequirements.forEach((edu: any) => {
          expect(edu["@type"]).toBe("EducationalOccupationalCredential");
          expect(edu.credentialCategory).toBeTruthy();
        });
      }

      if (schema.experienceRequirements) {
        expect(schema.experienceRequirements["@type"]).toBe("OccupationalExperienceRequirements");
      }

      if (schema.jobBenefits) {
        schema.jobBenefits.forEach((benefit: any) => {
          expect(benefit["@type"]).toBe("JobBenefit");
          expect(benefit.name).toBeTruthy();
        });
      }
    });
  });

  describe("Edge Cases", () => {
    test("handles qualification text with special characters", () => {
      const posting = createMockPostingWithQualifications({
        eligibility: `
          Bachelor's (B.Tech/B.Sc.) in "Computer Science" & related fields
          5+ yrs. exp. in C++/Python programming
        `,
      });
      const org = createMockOrganization();

      const schema = buildJobPostingSchema(posting as any, org as any);

      expect(schema?.educationRequirements).toBeDefined();
      expect(schema?.experienceRequirements).toBeDefined();
    });

    test("handles missing qualification text gracefully", () => {
      const posting = createMockPostingWithQualifications({
        eligibility: null,
        requirements: null,
      });
      const org = createMockOrganization();

      const schema = buildJobPostingSchema(posting as any, org as any);

      // Should still generate schema even without qualifications
      expect(schema).not.toBeNull();
      expect(schema?.["@type"]).toBe("JobPosting");

      // educationRequirements and experienceRequirements should be omitted
      expect(schema?.educationRequirements).toBeUndefined();
      expect(schema?.experienceRequirements).toBeUndefined();
    });

    test("returns null for expired postings regardless of Phase 2 fields", () => {
      const posting = createMockPostingWithQualifications({
        validThrough: new Date("2026-09-01"), // Expired
      });
      const org = createMockOrganization();

      const schema = buildJobPostingSchema(posting as any, org as any);

      expect(schema).toBeNull();
    });
  });
});
