/**
 * Unit tests for enrichment structure normalization
 * Verifies that JSONB enrichment data is properly normalized for page consumption
 */

describe('Enrichment Structure Normalization', () => {
  // Mock the normalization function with the same logic
  const normalizeEnrichment = (enrichment: any): any => {
    if (!enrichment || typeof enrichment !== 'object') return enrichment;

    const normalized = { ...enrichment };

    if (normalized.education && !Array.isArray(normalized.education)) {
      normalized.education = [];
    }

    if (normalized.experience && !Array.isArray(normalized.experience)) {
      normalized.experience = [];
    }

    if (normalized.selection_process && !Array.isArray(normalized.selection_process)) {
      normalized.selection_process = [];
    }

    if (normalized.documents && !Array.isArray(normalized.documents)) {
      normalized.documents = [];
    }

    if (normalized.important_dates && !Array.isArray(normalized.important_dates)) {
      normalized.important_dates = [];
    }

    if (normalized.official_links && !Array.isArray(normalized.official_links)) {
      normalized.official_links = [];
    }

    if (normalized.age_rules && Array.isArray(normalized.age_rules)) {
      normalized.age_rules = {};
    }

    if (normalized.application_fees && Array.isArray(normalized.application_fees)) {
      normalized.application_fees = {};
    }

    return normalized;
  };

  it('should handle null/undefined enrichment', () => {
    expect(normalizeEnrichment(null)).toBeNull();
    expect(normalizeEnrichment(undefined)).toBeUndefined();
  });

  it('should keep vacancies as object (database structure)', () => {
    const enrichment = {
      vacancies: {
        total: 10,
        categories: { General: 5, OBC: 3 },
        by_location: { Delhi: 6, Mumbai: 4 },
      },
    };

    const normalized = normalizeEnrichment(enrichment);

    expect(normalized.vacancies).toBeDefined();
    expect(typeof normalized.vacancies).toBe('object');
    expect(Array.isArray(normalized.vacancies)).toBe(false);
    expect(normalized.vacancies.total).toBe(10);
  });

  it('should ensure education is an array', () => {
    const enrichment = {
      education: [
        { degree: 'B.Tech', subject: 'CS' },
        { degree: 'M.Tech', subject: 'CS' },
      ],
    };

    const normalized = normalizeEnrichment(enrichment);

    expect(Array.isArray(normalized.education)).toBe(true);
    expect(normalized.education.length).toBe(2);
  });

  it('should convert malformed education to empty array', () => {
    const enrichment = {
      education: { degree: 'B.Tech' }, // Wrong: object instead of array
    };

    const normalized = normalizeEnrichment(enrichment);

    expect(Array.isArray(normalized.education)).toBe(true);
    expect(normalized.education.length).toBe(0);
  });

  it('should ensure experience is an array', () => {
    const enrichment = {
      experience: [
        { type: 'General Service', years: 5 },
        { type: 'Specialized', years: 2 },
      ],
    };

    const normalized = normalizeEnrichment(enrichment);

    expect(Array.isArray(normalized.experience)).toBe(true);
    expect(normalized.experience.length).toBe(2);
  });

  it('should ensure selection_process is an array', () => {
    const enrichment = {
      selection_process: [
        { step: 1, name: 'Written' },
        { step: 2, name: 'Interview' },
      ],
    };

    const normalized = normalizeEnrichment(enrichment);

    expect(Array.isArray(normalized.selection_process)).toBe(true);
    expect(normalized.selection_process.length).toBe(2);
  });

  it('should handle complex enrichment with all fields', () => {
    const enrichment = {
      vacancies: {
        total: 25,
        categories: { General: 15, SC: 5, ST: 5 },
        by_location: { Delhi: 15, Mumbai: 10 },
      },
      education: [
        { degree: 'B.Tech', subject: 'CS', specialization: 'AI' },
        { degree: 'M.Tech', subject: 'CS' },
      ],
      experience: [{ type: 'General', years: 5 }],
      selection_process: [
        { step: 1, name: 'Written', marks: 100 },
        { step: 2, name: 'Interview', marks: 50 },
      ],
      documents: [
        { name: 'Aadhar', required: true },
        { name: 'Degree Certificate', required: true },
      ],
      important_dates: [
        { label: 'Application Start', date: '2026-10-20' },
        { label: 'Application End', date: '2026-10-30' },
      ],
      age_rules: {
        General: { max: 30, relaxation: 0 },
        SC: { max: 35, relaxation: 5 },
      },
      application_fees: {
        General: { amount: 100, currency: 'INR' },
        SC: { amount: 0, currency: 'INR' },
      },
      official_links: [
        { type: 'Official Notification', url: 'https://example.com' },
        { type: 'Apply Here', url: 'https://apply.example.com' },
      ],
    };

    const normalized = normalizeEnrichment(enrichment);

    // All arrays should remain arrays
    expect(Array.isArray(normalized.education)).toBe(true);
    expect(Array.isArray(normalized.experience)).toBe(true);
    expect(Array.isArray(normalized.selection_process)).toBe(true);
    expect(Array.isArray(normalized.documents)).toBe(true);
    expect(Array.isArray(normalized.important_dates)).toBe(true);
    expect(Array.isArray(normalized.official_links)).toBe(true);

    // Objects should remain objects
    expect(typeof normalized.vacancies).toBe('object');
    expect(!Array.isArray(normalized.vacancies)).toBe(true);
    expect(typeof normalized.age_rules).toBe('object');
    expect(!Array.isArray(normalized.age_rules)).toBe(true);
    expect(typeof normalized.application_fees).toBe('object');
    expect(!Array.isArray(normalized.application_fees)).toBe(true);

    // Data integrity
    expect(normalized.education.length).toBe(2);
    expect(normalized.selection_process.length).toBe(2);
    expect(normalized.vacancies.total).toBe(25);
  };

  it('should handle missing optional fields gracefully', () => {
    const enrichment = {
      vacancies: { total: 10 },
      // Missing all other optional fields
    };

    const normalized = normalizeEnrichment(enrichment);

    // Should not throw, should have the field
    expect(normalized.vacancies.total).toBe(10);
    expect(normalized.education).toBeUndefined(); // Not added if missing
  });

  it('should be safe to JSON.stringify after normalization', () => {
    const enrichment = {
      vacancies: {
        total: 10,
        categories: { General: 5 },
      },
      education: [{ degree: 'B.Tech' }],
      selection_process: [{ step: 1, name: 'Written' }],
    };

    const normalized = normalizeEnrichment(enrichment);

    // Should not throw
    expect(() => JSON.stringify(normalized)).not.toThrow();

    const stringified = JSON.stringify(normalized);
    const parsed = JSON.parse(stringified);

    // Data should survive round-trip
    expect(parsed.vacancies.total).toBe(10);
    expect(parsed.education[0].degree).toBe('B.Tech');
    expect(parsed.selection_process[0].step).toBe(1);
  });
});
