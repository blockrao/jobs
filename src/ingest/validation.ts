/**
 * STEP 6: Data Quality Validation Pipeline
 *
 * Validates all data before ingestion to prevent corrupted records
 * from entering the database.
 *
 * This module enforces:
 * - Required fields are present and valid
 * - Organization assignments are consistent
 * - Cutoff marks are within valid ranges
 * - No fabricated/placeholder data is accepted
 * - Recruitment data integrity is maintained
 */

import type { DedupedPosting, NormalizedPosting } from "./types";

export interface ValidationError {
  recordId: string;
  field: string;
  message: string;
  severity: "critical" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  recordsProcessed: number;
  recordsValid: number;
}

/**
 * Validate a deduplicated posting before normalization.
 * Returns array of validation errors (empty = valid).
 */
export function validateDedupedPosting(
  posting: DedupedPosting,
  recruitmentId: number,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const recordId = `recruitment_${recruitmentId}`;

  // 1. Recruitment ID must be present and valid
  if (!recruitmentId || recruitmentId <= 0) {
    errors.push({
      recordId,
      field: "recruitmentId",
      message: `Invalid recruitment ID: ${recruitmentId}`,
      severity: "critical",
    });
  }

  // 2. Post name must be present and not be fabricated
  if (!posting.title || posting.title.trim().length === 0) {
    errors.push({
      recordId,
      field: "title",
      message: "Post title is missing",
      severity: "critical",
    });
  }

  // 3. Reject obvious placeholder data
  if (posting.title && isFabricatedTitle(posting.title)) {
    errors.push({
      recordId,
      field: "title",
      message: `Fabricated/placeholder title detected: ${posting.title}`,
      severity: "critical",
    });
  }

  // 4. Organization assignment must match recruitment org
  // (This is checked at write time, but warn here if suspicious)
  if (posting.organization_id && posting.organization_id <= 0) {
    errors.push({
      recordId,
      field: "organization_id",
      message: `Invalid organization ID: ${posting.organization_id}`,
      severity: "critical",
    });
  }

  return errors;
}

/**
 * Validate a normalized posting before database write.
 * Returns array of validation errors.
 */
export function validateNormalizedPosting(
  posting: NormalizedPosting,
  recruitmentId: number,
  organizationId: number,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const recordId = `recruitment_${recruitmentId}`;

  // 1. Recruitment ID is required
  if (!recruitmentId || recruitmentId <= 0) {
    errors.push({
      recordId,
      field: "recruitmentId",
      message: "Recruitment ID must be a positive integer",
      severity: "critical",
    });
  }

  // 2. Organization ID is required
  if (!organizationId || organizationId <= 0) {
    errors.push({
      recordId,
      field: "organizationId",
      message: "Organization ID must be a positive integer",
      severity: "critical",
    });
  }

  // 3. Post name is required and must be valid
  if (!posting.name || posting.name.trim().length === 0) {
    errors.push({
      recordId,
      field: "name",
      message: "Post name is required",
      severity: "critical",
    });
  }

  // 4. Reject fabricated employment type
  if (posting.employmentType === "FULL_TIME" && !isPlausibleFullTime(posting.name)) {
    errors.push({
      recordId,
      field: "employmentType",
      message: `Suspicious FULL_TIME employment type for: ${posting.name}`,
      severity: "warning",
    });
  }

  // 5. Validate vacancy data if present
  if (posting.vacancy_total !== undefined && posting.vacancy_total !== null) {
    if (posting.vacancy_total < 0) {
      errors.push({
        recordId,
        field: "vacancy_total",
        message: `Invalid vacancy total: ${posting.vacancy_total}`,
        severity: "critical",
      });
    }
  }

  // 6. Validate salary if present
  if (posting.salary_min && posting.salary_max) {
    if (posting.salary_min < 0 || posting.salary_max < 0) {
      errors.push({
        recordId,
        field: "salary",
        message: `Invalid salary range: ${posting.salary_min}-${posting.salary_max}`,
        severity: "critical",
      });
    }
    if (posting.salary_min > posting.salary_max) {
      errors.push({
        recordId,
        field: "salary",
        message: `Salary min (${posting.salary_min}) exceeds max (${posting.salary_max})`,
        severity: "critical",
      });
    }
  }

  return errors;
}

/**
 * Validate cutoff marks before insertion.
 * Returns validation error if invalid.
 */
export function validateCutoffMarks(
  marks: number | null | undefined,
  category: string,
  year: number,
  recruitmentId: number,
): ValidationError | null {
  // NULL marks are allowed (means data not yet available)
  if (marks === null || marks === undefined) {
    return null;
  }

  // Marks must be within typical exam range
  if (marks < 0 || marks > 1000) {
    return {
      recordId: `recruitment_${recruitmentId}`,
      field: "cutoff_marks",
      message: `Invalid cutoff marks (${marks}) for ${category}/${year}. Must be 0-1000 or NULL.`,
      severity: "critical",
    };
  }

  // Warn about obviously fake data (all identical scores)
  if (marks === 50.0) {
    return {
      recordId: `recruitment_${recruitmentId}`,
      field: "cutoff_marks",
      message: `Suspicious placeholder cutoff marks (50.00) for ${category}/${year}. Verify before inserting.`,
      severity: "warning",
    };
  }

  return null;
}

/**
 * Validate location data before insertion.
 */
export function validateLocation(
  city: string,
  state: string | null | undefined,
  postId: number,
): ValidationError | null {
  const recordId = `post_${postId}`;

  // City must be present and not empty
  if (!city || city.trim().length === 0) {
    return {
      recordId,
      field: "city",
      message: "City/location must not be empty",
      severity: "critical",
    };
  }

  // Reject obvious placeholders
  if (isFabricatedLocation(city)) {
    return {
      recordId,
      field: "city",
      message: `Placeholder location detected: "${city}". Use actual posting location.`,
      severity: "critical",
    };
  }

  return null;
}

/**
 * Check if a title looks like fabricated/placeholder data.
 */
function isFabricatedTitle(title: string): boolean {
  const normalized = title.toLowerCase().trim();

  // Reject common placeholder patterns
  const placeholders = [
    "test post",
    "placeholder",
    "fake position",
    "dummy",
    "sample job",
    "temp position",
    "zzz",
    "tbd",
    "to be decided",
    "not applicable",
    "na",
  ];

  for (const placeholder of placeholders) {
    if (normalized.includes(placeholder)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a location looks like fabricated/placeholder data.
 */
function isFabricatedLocation(city: string): boolean {
  const normalized = city.toLowerCase().trim();

  // Reject obvious placeholder patterns
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

  for (const placeholder of placeholders) {
    if (normalized.includes(placeholder)) {
      return true;
    }
  }

  // Reject generic/wrong placeholders
  // (e.g., "Jaipur" for non-Jaipur organizations is caught elsewhere)

  return false;
}

/**
 * Check if FULL_TIME employment type is plausible for this post title.
 * Used to detect when FULL_TIME is defaulted instead of real data.
 */
function isPlausibleFullTime(postTitle: string): boolean {
  const normalized = postTitle.toLowerCase();

  // Posts that are typically NOT full-time government positions
  const partTimeIndicators = [
    "guest lecturer",
    "guest faculty",
    "temporary",
    "contract",
    "consultant",
    "part-time",
    "visiting",
    "honorary",
    "deputation",
    "apprentice",
  ];

  for (const indicator of partTimeIndicators) {
    if (normalized.includes(indicator)) {
      return false; // These shouldn't be marked FULL_TIME
    }
  }

  return true; // FULL_TIME is plausible for standard government posts
}

/**
 * Aggregate validation results and generate summary.
 */
export function summarizeValidation(results: ValidationError[]): ValidationResult {
  const critical = results.filter((r) => r.severity === "critical");
  const warnings = results.filter((r) => r.severity === "warning");

  return {
    valid: critical.length === 0,
    errors: critical,
    warnings,
    recordsProcessed: 0, // Set by caller
    recordsValid: 0,     // Set by caller
  };
}

/**
 * Format validation errors for logging/reporting.
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return "✓ No validation errors";
  }

  const grouped = errors.reduce(
    (acc, err) => {
      if (!acc[err.severity]) {
        acc[err.severity] = [];
      }
      acc[err.severity].push(err);
      return acc;
    },
    {} as Record<string, ValidationError[]>,
  );

  let report = "";
  if (grouped.critical) {
    report += `\n❌ Critical (${grouped.critical.length}):\n`;
    grouped.critical.forEach((err) => {
      report += `   ${err.recordId} [${err.field}]: ${err.message}\n`;
    });
  }

  if (grouped.warning) {
    report += `\n⚠️  Warnings (${grouped.warning.length}):\n`;
    grouped.warning.forEach((err) => {
      report += `   ${err.recordId} [${err.field}]: ${err.message}\n`;
    });
  }

  return report;
}
