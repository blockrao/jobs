/**
 * STEP 6: Data Quality Gates
 *
 * These gates prevent corrupted or fabricated data from reaching the live site.
 * Applied before any data is committed to the production database.
 *
 * Gates enforce:
 * - No NULL required fields
 * - No organization misattribution
 * - No obviously fake data (50.00 marks, "Jaipur" for non-Jaipur orgs, etc.)
 * - Data consistency across records
 */

export interface DataQualityGate {
  name: string;
  check: (data: any) => { passed: boolean; reason?: string };
}

/**
 * Recruitment-level quality gates.
 */
export const recruitmentQualityGates: Record<string, DataQualityGate> = {
  // G1: Recruitment must have valid organization ID
  validOrganization: {
    name: "Valid Organization ID",
    check: (r) => ({
      passed: r.organizationId && r.organizationId > 0,
      reason: r.organizationId ? undefined : "Missing organization_id",
    }),
  },

  // G2: Recruitment must have a valid slug matching sequential format
  validSlug: {
    name: "Valid Recruitment Slug",
    check: (r) => ({
      passed: r.slug && /^[a-z0-9]+-\d{4}-\d{2}$/.test(r.slug),
      reason: !r.slug
        ? "Missing slug"
        : `Invalid slug format: ${r.slug}. Expected: org-slug-YYYY-NN`,
    }),
  },

  // G3: Recruitment name must not be empty
  nameNotEmpty: {
    name: "Non-empty Recruitment Name",
    check: (r) => ({
      passed: r.name && r.name.trim().length > 0,
      reason: "Empty recruitment name",
    }),
  },

  // G4: Year must be reasonable (2015-2030)
  validYear: {
    name: "Valid Year",
    check: (r) => ({
      passed: r.year && r.year >= 2015 && r.year <= 2030,
      reason: `Invalid year: ${r.year}`,
    }),
  },
};

/**
 * Post-level quality gates.
 */
export const postQualityGates: Record<string, DataQualityGate> = {
  // G1: Post must have valid recruitment ID
  validRecruitment: {
    name: "Valid Recruitment ID",
    check: (p) => ({
      passed: p.recruitmentId && p.recruitmentId > 0,
      reason: "Missing recruitment_id",
    }),
  },

  // G2: Post must have valid position ID
  validPosition: {
    name: "Valid Position ID",
    check: (p) => ({
      passed: p.positionId && p.positionId > 0,
      reason: "Missing position_id",
    }),
  },

  // G3: Post name must not be empty
  nameNotEmpty: {
    name: "Non-empty Post Name",
    check: (p) => ({
      passed: p.name && p.name.trim().length > 0,
      reason: "Empty post name",
    }),
  },

  // G4: Post slug must be valid
  validSlug: {
    name: "Valid Post Slug",
    check: (p) => ({
      passed: p.slug && /^[a-z0-9-]+$/.test(p.slug),
      reason: `Invalid slug format: ${p.slug}`,
    }),
  },

  // G5: Vacancy total must be non-negative if present
  validVacancies: {
    name: "Valid Vacancy Count",
    check: (p) => ({
      passed:
        p.vacancyTotal === null ||
        p.vacancyTotal === undefined ||
        p.vacancyTotal >= 0,
      reason: `Invalid vacancy count: ${p.vacancyTotal}`,
    }),
  },

  // G6: Employment type must be real, not defaulted
  realEmploymentType: {
    name: "Real Employment Type (Not Defaulted)",
    check: (p) => ({
      passed:
        p.employmentType !== "FULL_TIME" ||
        isPlausibleFullTimeRole(p.name),
      reason: `FULL_TIME employment type seems defaulted for: ${p.name}`,
    }),
  },
};

/**
 * Cutoff marks quality gates.
 */
export const cutoffQualityGates: Record<string, DataQualityGate> = {
  // G1: Cutoff marks must be within valid range or NULL
  validRange: {
    name: "Valid Cutoff Marks Range",
    check: (c) => ({
      passed:
        c.cutoffMarks === null ||
        (parseFloat(c.cutoffMarks) >= 0 &&
          parseFloat(c.cutoffMarks) <= 1000),
      reason: `Invalid cutoff marks: ${c.cutoffMarks}. Must be 0-1000 or NULL.`,
    }),
  },

  // G2: Reject obviously fake data (all 50.00)
  notObviousFake: {
    name: "Not Obviously Fabricated",
    check: (c) => ({
      passed: parseFloat(c.cutoffMarks) !== 50.0,
      reason: `Suspicious placeholder marks: 50.00. This looks fabricated.`,
    }),
  },

  // G3: Category must be valid
  validCategory: {
    name: "Valid Category",
    check: (c) => ({
      passed:
        c.category &&
        ["UR", "OBC", "SC", "ST", "EWS", "PwBD"].includes(c.category),
      reason: `Invalid category: ${c.category}`,
    }),
  },

  // G4: Year must be reasonable
  validYear: {
    name: "Valid Year",
    check: (c) => ({
      passed: c.year && c.year >= 2015 && c.year <= 2030,
      reason: `Invalid year: ${c.year}`,
    }),
  },
};

/**
 * Location quality gates.
 */
export const locationQualityGates: Record<string, DataQualityGate> = {
  // G1: City must not be empty
  cityNotEmpty: {
    name: "Non-empty City",
    check: (l) => ({
      passed: l.city && l.city.trim().length > 0,
      reason: "Empty city/location",
    }),
  },

  // G2: City must not be fabricated
  notFabricatedCity: {
    name: "Real City Name",
    check: (l) => ({
      passed: !isFabricatedLocation(l.city),
      reason: `Fabricated/placeholder location: ${l.city}`,
    }),
  },

  // G3: Reject organization mismatch patterns
  organizationMatch: {
    name: "Organization Location Match",
    check: (l) => ({
      passed: !isOrganizationLocationMismatch(l.city, l.organizationName),
      reason: `Location ${l.city} doesn't match organization ${l.organizationName}`,
    }),
  },
};

/**
 * Run all applicable quality gates for a recruitment.
 */
export function validateRecruitmentQuality(recruitment: any): {
  passed: boolean;
  failures: string[];
} {
  const failures: string[] = [];

  for (const [key, gate] of Object.entries(recruitmentQualityGates)) {
    const result = gate.check(recruitment);
    if (!result.passed) {
      failures.push(`[${gate.name}] ${result.reason || key}`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Run all applicable quality gates for a post.
 */
export function validatePostQuality(post: any): {
  passed: boolean;
  failures: string[];
} {
  const failures: string[] = [];

  for (const [key, gate] of Object.entries(postQualityGates)) {
    const result = gate.check(post);
    if (!result.passed) {
      failures.push(`[${gate.name}] ${result.reason || key}`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Run all applicable quality gates for cutoff marks.
 */
export function validateCutoffQuality(cutoff: any): {
  passed: boolean;
  failures: string[];
} {
  const failures: string[] = [];

  for (const [key, gate] of Object.entries(cutoffQualityGates)) {
    const result = gate.check(cutoff);
    if (!result.passed) {
      failures.push(`[${gate.name}] ${result.reason || key}`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Run all applicable quality gates for location.
 */
export function validateLocationQuality(location: any): {
  passed: boolean;
  failures: string[];
} {
  const failures: string[] = [];

  for (const [key, gate] of Object.entries(locationQualityGates)) {
    const result = gate.check(location);
    if (!result.passed) {
      failures.push(`[${gate.name}] ${result.reason || key}`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Helper: Check if a role is plausibly full-time.
 */
function isPlausibleFullTimeRole(roleName: string): boolean {
  const normalized = roleName.toLowerCase();
  const partTimeIndicators = [
    "guest",
    "temporary",
    "contract",
    "consultant",
    "part-time",
    "visiting",
    "honorary",
    "deputation",
    "apprentice",
    "volunteer",
  ];

  return !partTimeIndicators.some((indicator) =>
    normalized.includes(indicator),
  );
}

/**
 * Helper: Check if location looks fabricated.
 */
function isFabricatedLocation(city: string): boolean {
  const normalized = city.toLowerCase();
  const placeholders = [
    "test",
    "placeholder",
    "fake",
    "dummy",
    "sample",
    "temp",
    "not applicable",
    "na",
    "tbd",
  ];

  return placeholders.some((p) => normalized.includes(p));
}

/**
 * Helper: Check if location mismatches organization.
 * E.g., "Jaipur" for IIIT Kota (non-Jaipur org).
 */
function isOrganizationLocationMismatch(
  city: string,
  organizationName: string,
): boolean {
  const normalizedCity = city.toLowerCase().trim();
  const normalizedOrg = organizationName.toLowerCase();

  // Known problematic patterns from the audit
  // Org says IIIT Kota but city is Jaipur = mismatch
  const orgLocations: Record<string, string[]> = {
    "iiit kota": ["kota", "rajasthan"],
    "iiit indore": ["indore", "madhya pradesh"],
    "iit delhi": ["delhi"],
    "iit roorkee": ["roorkee", "uttarakhand"],
  };

  for (const [org, validCities] of Object.entries(orgLocations)) {
    if (normalizedOrg.includes(org)) {
      // Found matching org - check if city is in valid list
      if (
        !validCities.some(
          (validCity) => normalizedCity.includes(validCity),
        )
      ) {
        return true; // Mismatch detected
      }
    }
  }

  return false;
}

/**
 * Format validation failures for logging.
 */
export function formatValidationFailures(failures: string[]): string {
  if (failures.length === 0) {
    return "✓ Passed all quality gates";
  }

  return (
    "❌ Failed quality gates:\n" +
    failures.map((f) => `  - ${f}`).join("\n")
  );
}
