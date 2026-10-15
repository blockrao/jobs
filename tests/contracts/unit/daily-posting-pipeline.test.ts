/**
 * Daily Posting Pipeline Contract Tests (Track 2B)
 *
 * Validates the 7-step daily posting ingestion workflow and JobPosting schema generation
 * according to Google specifications and SEO/GEO/AEO compliance requirements.
 *
 * Contract requirements:
 * - SD-03: Only buildJobPostingSchema from src/lib/structured-data.ts
 * - GEO-01: ISO 3166-2:IN location codes
 * - SEO-01: Proper canonical URLs and metadata
 * - AEO-01: Entity linking and temporal signals
 */

import { describe, test, expect } from 'vitest';
import { buildJobPostingSchema } from '@/lib/structured-data';

/**
 * Helper function to create valid mock postings that pass all eligibility requirements
 */
function createValidMockPosting(overrides: any = {}) {
  return {
    id: 1,
    slug: 'tcs/senior-software-engineer',
    title: 'Senior Software Engineer',
    description: 'TCS is looking for a Senior Software Engineer with 5+ years of experience in Java and Spring Boot. This is an excellent opportunity to work on cutting-edge technologies and lead a team of talented developers in our Bangalore office. Responsibilities include designing scalable architectures, mentoring junior developers, and contributing to product strategy. The role offers competitive compensation, health benefits, and professional development opportunities.',
    currentStage: 'APPLICATION_OPEN',
    postNames: ['Senior Software Engineer'],
    organizationId: 1,
    kind: 'GOVERNMENT',
    workplaceType: 'ONSITE',
    locationCity: 'Bangalore',
    locationStateCode: 'IN-KA',
    locationCountry: 'IN',
    totalVacancies: 5,
    employmentType: 'FULL_TIME',
    datePosted: new Date('2026-10-15'),
    updatedAt: new Date('2026-10-15'),
    validThrough: new Date('2026-11-30'),
    applyUrl: 'https://tcs.com/careers/apply/12345',
    salaryMin: 500000,
    salaryMax: 1000000,
    salaryCurrency: 'INR',
    salaryPeriod: 'MONTH',
    // Additional required fields for eligibility
    reviewStatus: 'APPROVED',
    isExpired: false,
    eligibility: 'Bachelor\'s degree in Computer Science or related field with 5+ years of software development experience. Strong knowledge of Java, Spring Boot, and Microservices architecture. Experience with cloud platforms (AWS/Azure) is a plus.',
    ...overrides,
  };
}

function createValidMockOrg(overrides: any = {}) {
  return {
    id: 1,
    slug: 'tcs',
    name: 'Tata Consultancy Services',
    description: 'Tata Consultancy Services',
    websiteUrl: 'https://www.tcs.com',
    logoUrl: null,
    ...overrides,
  };
}

/**
 * SD-03 Contract: Centralized Schema Builder
 */
describe('SD-03 Contract: Centralized Schema Builder', () => {
  test('buildJobPostingSchema exports from src/lib/structured-data', () => {
    // Verify the function is exported correctly
    expect(typeof buildJobPostingSchema).toBe('function');
    expect(buildJobPostingSchema.name).toBe('buildJobPostingSchema');
  });
});

/**
 * Track 2B: Daily Pipeline Validation
 */
describe('Track 2B: Daily Posting Pipeline', () => {
  describe('Step 6: JobPosting Schema Generation', () => {
    test('generates valid JobPosting schema for approved postings', () => {
      const posting = createValidMockPosting();
      const org = createValidMockOrg();

      const schema = buildJobPostingSchema(posting as any, org as any);

      // Verify required fields per Google JobPosting spec
      expect(schema).not.toBeNull();
      expect(schema['@type']).toBe('JobPosting');
      expect(schema.title).toBe('Senior Software Engineer');
      expect(schema.description).toBeTruthy();
      expect(schema.url).toBeTruthy();
      expect(schema.datePosted).toBeTruthy();
      expect(schema.validThrough).toBeTruthy();
      expect(schema.hiringOrganization).toBeTruthy();
      expect(schema.baseSalary).toBeTruthy();
      expect(schema.totalJobOpenings).toBe(5);
    });

    test('returns null for postings without extracted job titles', () => {
      const posting = createValidMockPosting({
        postNames: undefined,
      });
      const org = createValidMockOrg();

      const schema = buildJobPostingSchema(posting as any, org as any);

      // Should return null since no extracted title
      expect(schema).toBeNull();
    });

    test('returns null for expired postings', () => {
      const posting = createValidMockPosting({
        validThrough: new Date('2026-09-30'), // Expired
      });
      const org = createValidMockOrg();

      const schema = buildJobPostingSchema(posting as any, org as any);

      // Should return null since posting is expired
      expect(schema).toBeNull();
    });

    test('returns null for closed application stages', () => {
      const posting = createValidMockPosting({
        currentStage: 'APPLICATION_CLOSED',
      });
      const org = createValidMockOrg();

      const schema = buildJobPostingSchema(posting as any, org as any);

      // Should return null since applications are closed
      expect(schema).toBeNull();
    });

    test('returns null when organization is unresolved', () => {
      const posting = createValidMockPosting();
      const org = createValidMockOrg({
        name: 'Government of India', // Bucket name - not allowed
      });

      const schema = buildJobPostingSchema(posting as any, org as any);

      // Should return null since org name is a bucket
      expect(schema).toBeNull();
    });

    test('returns null for multi-post recruitments without resolution', () => {
      const posting = createValidMockPosting({
        postNames: ['Role 1', 'Role 2'], // Multiple posts
      });
      const org = createValidMockOrg();

      const schema = buildJobPostingSchema(posting as any, org as any);

      // Should return null since multiple unresolved posts
      expect(schema).toBeNull();
    });

    test('returns null for unapproved postings', () => {
      const posting = createValidMockPosting({
        reviewStatus: 'DRAFT',
      });
      const org = createValidMockOrg();

      const schema = buildJobPostingSchema(posting as any, org as any);

      // Should return null since not approved
      expect(schema).toBeNull();
    });
  });

  describe('GEO-01 Compliance: Location Codes', () => {
    test('includes ISO 3166-2:IN state codes in JobLocation', () => {
      const posting = createValidMockPosting({
        locationCity: 'New Delhi',
        locationStateCode: 'IN-DL',
      });
      const org = createValidMockOrg();

      const schema = buildJobPostingSchema(posting as any, org as any);

      expect(schema).not.toBeNull();
      expect(schema.jobLocation).toBeTruthy();
      expect(schema.jobLocation.address.addressRegion).toBe('IN-DL');
      expect(schema.jobLocation.address.addressCountry).toBe('IN');
    });

    test('handles REMOTE positions with applicantLocationRequirements', () => {
      const posting = createValidMockPosting({
        workplaceType: 'REMOTE',
        locationRegion: 'India', // REMOTE roles still need a region for Tier A eligibility
        locationStateCode: null,
      });
      const org = createValidMockOrg();

      const schema = buildJobPostingSchema(posting as any, org as any);

      expect(schema).not.toBeNull();
      expect(schema.jobLocation).toBeUndefined();
      expect(schema.jobLocationType).toBe('TELECOMMUTE');
      expect(schema.applicantLocationRequirements).toBeTruthy();
      expect(schema.applicantLocationRequirements.name).toBe('IN');
    });
  });

  describe('SEO-01 Compliance: Canonical URLs and Metadata', () => {
    test('generates correct canonical URL structure', () => {
      const posting = createValidMockPosting();
      const org = createValidMockOrg();

      const schema = buildJobPostingSchema(posting as any, org as any);

      expect(schema).not.toBeNull();
      expect(schema.url).toMatch(/\/jobs\//);
      expect(schema['@id']).toMatch(/#jobposting$/);
    });

    test('includes temporal signals (datePosted and dateModified)', () => {
      const postedDate = new Date('2026-10-15');
      const modifiedDate = new Date('2026-10-16');

      const posting = createValidMockPosting({
        datePosted: postedDate,
        updatedAt: modifiedDate,
      });
      const org = createValidMockOrg();

      const schema = buildJobPostingSchema(posting as any, org as any);

      expect(schema).not.toBeNull();
      expect(schema.datePosted).toBeTruthy();
      expect(schema.dateModified).toBeTruthy();
    });
  });

  describe('AEO-01 Compliance: Entity Linking', () => {
    test('properly types organization as GovernmentOrganization', () => {
      const posting = createValidMockPosting({
        kind: 'GOVERNMENT',
      });
      const org = createValidMockOrg();

      const schema = buildJobPostingSchema(posting as any, org as any);

      expect(schema).not.toBeNull();
      expect(schema.hiringOrganization['@type']).toBe('GovernmentOrganization');
      expect(schema.hiringOrganization.name).toBe('Tata Consultancy Services');
    });

    test('includes proper salary structure for answer engines', () => {
      const posting = createValidMockPosting();
      const org = createValidMockOrg();

      const schema = buildJobPostingSchema(posting as any, org as any);

      expect(schema).not.toBeNull();
      expect(schema.baseSalary['@type']).toBe('MonetaryAmount');
      expect(schema.baseSalary.currency).toBe('INR');
      expect(schema.baseSalary.value.minValue).toBe(500000);
      expect(schema.baseSalary.value.maxValue).toBe(1000000);
    });

    test('includes employment type mapping', () => {
      const posting = createValidMockPosting({
        employmentType: 'FULL_TIME',
      });
      const org = createValidMockOrg();

      const schema = buildJobPostingSchema(posting as any, org as any);

      expect(schema).not.toBeNull();
      expect(schema.employmentType).toBe('FULL_TIME');
    });
  });

  describe('Data Quality Checks', () => {
    test('schema includes identifier for deduplication', () => {
      const posting = createValidMockPosting({
        externalId: 'EXT-123-456',
      });
      const org = createValidMockOrg();

      const schema = buildJobPostingSchema(posting as any, org as any);

      expect(schema).not.toBeNull();
      expect(schema.identifier).toBeTruthy();
      expect(schema.identifier.value).toBeTruthy();
    });

    test('directApply reflects on-site vs external application', () => {
      const posting = createValidMockPosting({
        applyUrl: 'https://example.com/apply',
      });
      const org = createValidMockOrg();

      const schema = buildJobPostingSchema(posting as any, org as any);

      expect(schema).not.toBeNull();
      // External URL should have directApply: false
      expect(schema.directApply).toBe(false);
    });
  });
});

/**
 * Track 2B: First Batch Testing
 */
describe('Track 2B: First Batch Validation', () => {
  test('validates schema generation for official notifications', () => {
    const upscPosting = createValidMockPosting({
      slug: 'upsc/senior-research-fellow',
      title: 'Senior Research Fellow',
      postNames: ['Senior Research Fellow'],
      organizationId: 1,
      kind: 'GOVERNMENT',
      locationCity: 'New Delhi',
      locationStateCode: 'IN-DL',
      applyUrl: 'https://upsconline.nic.in/upsc/apply',
    });

    const upscOrg = createValidMockOrg({
      slug: 'upsc',
      name: 'Union Public Service Commission',
      kind: 'GOVERNMENT',
      websiteUrl: 'https://www.upsc.gov.in',
    });

    const schema = buildJobPostingSchema(upscPosting as any, upscOrg as any);

    expect(schema).not.toBeNull();
    expect(schema.hiringOrganization.name).toBe('Union Public Service Commission');
    expect(schema.title).toBe('Senior Research Fellow');
    expect(schema.hiringOrganization['@type']).toBe('GovernmentOrganization');
  });

  test('validates multiple concurrent postings maintain independent schemas', () => {
    const postings = [
      createValidMockPosting({ id: 1, slug: 'tcs/senior-engineer' }),
      createValidMockPosting({ id: 2, slug: 'tcs/junior-engineer', totalVacancies: 10 }),
      createValidMockPosting({ id: 3, slug: 'tcs/intern', salaryMin: 100000, salaryMax: 200000 }),
    ];

    const org = createValidMockOrg();

    const schemas = postings.map(p => buildJobPostingSchema(p as any, org as any));

    // All should generate valid schemas
    expect(schemas).toHaveLength(3);
    schemas.forEach((schema, i) => {
      expect(schema).not.toBeNull();
      expect(schema.totalJobOpenings).toBe(postings[i].totalVacancies);
    });
  });

  test('validates index tier success metrics', () => {
    // Track 2B expects >70% A-tier assignment for first 5 batches
    const tieredPostings = [
      // A-tier: verified org + complete data
      createValidMockPosting({ id: 1, totalVacancies: 5 }),
      createValidMockPosting({ id: 2, totalVacancies: 3 }),
      createValidMockPosting({ id: 3, totalVacancies: 8 }),
      createValidMockPosting({ id: 4, totalVacancies: 4 }),
      createValidMockPosting({ id: 5, totalVacancies: 6 }),
      createValidMockPosting({ id: 6, totalVacancies: 2 }),
      createValidMockPosting({ id: 7, totalVacancies: 9 }),
    ];

    const org = createValidMockOrg();

    const schemas = tieredPostings.map(p => buildJobPostingSchema(p as any, org as any));
    const successCount = schemas.filter(s => s !== null).length;
    const successRate = successCount / schemas.length;

    // Should have > 70% success rate (A-tier eligible)
    expect(successRate).toBeGreaterThan(0.70);
  });
});
