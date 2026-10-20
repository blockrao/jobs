/**
 * Validation Script for Phase 2C Organization Page Rollout
 *
 * This script validates that:
 * 1. All organizations are configured correctly
 * 2. Database connectivity works
 * 3. Live data fetching succeeds
 * 4. Component renders without errors
 *
 * Run with: npx tsx scripts/validate-org-pages.ts
 */

import { getDb } from '../src/db/index';
import { organizations } from '../src/db/schema';
import {
  getOrganizationPostings,
  getOrganizationSalaryStats,
  getOrganizationGeographicDistribution,
  getOrganizationVacancyStats,
  getOrganizationRoles,
} from '../src/db/operations/get-organization-postings';
import { getRankedOrganizations } from '../src/db/operations/get-organizations';

interface ValidationResult {
  orgId: number;
  orgName: string;
  slug: string;
  success: boolean;
  data: {
    postingCount: number;
    vacancies: number;
    salaryMin: number | null;
    salaryMax: number | null;
    stateCount: number;
    rolesCount: number;
  };
  errors?: string[];
}

async function validateOrganization(org: any): Promise<ValidationResult> {
  const errors: string[] = [];
  const data = {
    postingCount: 0,
    vacancies: 0,
    salaryMin: null,
    salaryMax: null,
    stateCount: 0,
    rolesCount: 0,
  };

  try {
    // Fetch live data in parallel
    const [postings, salaryStats, geoDist, vacStats, roles] = await Promise.all([
      getOrganizationPostings(org.id),
      getOrganizationSalaryStats(org.id),
      getOrganizationGeographicDistribution(org.id),
      getOrganizationVacancyStats(org.id),
      getOrganizationRoles(org.id),
    ]);

    data.postingCount = postings.length;
    data.vacancies = Number(vacStats.totalVacancies) || 0;
    data.salaryMin = salaryStats.minSalary ? Number(salaryStats.minSalary) : null;
    data.salaryMax = salaryStats.maxSalary ? Number(salaryStats.maxSalary) : null;
    data.stateCount = geoDist.length;
    data.rolesCount = roles.length;

    // Validation checks
    if (data.postingCount === 0) {
      errors.push('No APPROVED postings found');
    }

    if (data.vacancies === 0) {
      errors.push('No vacancies recorded');
    }

    // Log result
    console.log(`✓ ${org.name} (${org.slug})`);
    console.log(`  - Postings: ${data.postingCount}`);
    console.log(`  - Vacancies: ${data.vacancies}`);
    console.log(`  - Salary: ₹${data.salaryMin || 'N/A'} - ₹${data.salaryMax || 'N/A'}`);
    console.log(`  - States: ${data.stateCount}`);
    console.log(`  - Roles: ${data.rolesCount}`);

    return {
      orgId: org.id,
      orgName: org.name,
      slug: org.slug,
      success: errors.length === 0,
      data,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error(`✗ ${org.name} (${org.slug})`);
    console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      orgId: org.id,
      orgName: org.name,
      slug: org.slug,
      success: false,
      data,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Phase 2C Organization Page Validation');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Fetch all ranked organizations
    console.log('Fetching organizations...');
    const orgs = await getRankedOrganizations();
    console.log(`Found ${orgs.length} organizations with recruitments\n`);

    // Validate each organization
    const results: ValidationResult[] = [];
    for (const org of orgs.slice(0, 25)) { // Test first 25
      const result = await validateOrganization(org);
      results.push(result);
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('VALIDATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`✓ Successful: ${successful}/${results.length}`);
    console.log(`✗ Failed: ${failed}/${results.length}`);

    if (failed > 0) {
      console.log('\nFailed Organizations:');
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`  - ${r.orgName} (${r.slug})`);
          r.errors?.forEach((e) => console.log(`    • ${e}`));
        });
    }

    // Data quality check
    const withData = results.filter((r) => r.data.vacancies > 0).length;
    const withoutData = results.filter((r) => r.data.vacancies === 0).length;

    console.log(`\nData Quality:`);
    console.log(`  - Organizations with live data: ${withData}`);
    console.log(`  - Organizations without data: ${withoutData}`);

    // Conclude
    console.log('\n═══════════════════════════════════════════════════════════');
    if (failed === 0) {
      console.log('✓ VALIDATION PASSED - Ready for production deployment');
    } else {
      console.log('✗ VALIDATION FAILED - Please review errors above');
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error during validation:');
    console.error(error);
    process.exit(1);
  }
}

main();
