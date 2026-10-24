/**
 * Phase 1B Enrichment Renderer
 *
 * Renders raw Phase 1B enrichment data with proper formatting:
 * - Salary as currency ranges
 * - Vacancies as breakdown table/grid
 * - Selection process as numbered steps
 * - Eligibility with education and experience
 * - Application details
 *
 * Used as fallback when Phase 1B format is detected but not yet transformed
 */

import styles from '../recruitment-hub.module.css';

export interface Phase1BEnrichmentData {
  meta?: {
    extraction_timestamp?: string;
    source?: string;
    confidence_score?: number;
    verified?: boolean;
  };
  core?: {
    job_title?: string;
    organization?: string;
    total_vacancies?: number;
    posting_location?: string;
    job_type?: string;
  };
  salary?: {
    monthly_min?: number;
    monthly_max?: number;
    currency?: string;
    raw?: string;
  };
  vacancies_breakdown?: Array<{
    category?: string;
    count?: number;
    location?: string;
  }>;
  eligibility?: {
    age_limit?: {
      min?: number;
      max?: number;
      text?: string;
    };
    education?: Array<{
      id?: string;
      degree?: string;
      specialization?: string;
      minimumMarks?: number;
    }>;
    experience?: {
      years_required?: number;
      job_title?: string;
      description?: string;
      [key: string]: any;
    };
  };
  application?: {
    deadline?: string;
    application_fee?: number;
    application_method?: string;
    [key: string]: any;
  };
  selection_process?: Array<{
    name?: string;
    step?: number;
    total_marks?: number;
    stage?: number;
    stageName?: string;
    description?: string;
  }>;
  job_terms?: {
    tenure?: string;
    posting_location?: string;
    transferable?: boolean;
  };
  reference?: {
    fja_url?: string;
    official_url?: string;
    notification_link?: string;
  };
  [key: string]: any;
}

interface Phase1BEnrichmentRendererProps {
  data: Phase1BEnrichmentData;
}

function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return '';
  return `₹${value.toLocaleString('en-IN')}`;
}

function SalarySection({ salary }: { salary?: Phase1BEnrichmentData['salary'] }) {
  if (!salary) return null;

  const hasRange =
    salary.monthly_min != null && salary.monthly_max != null;
  const hasMin = salary.monthly_min != null;
  const hasMax = salary.monthly_max != null;

  let salaryText = salary.raw;

  if (!salaryText) {
    if (hasRange) {
      salaryText = `${formatCurrency(salary.monthly_min)} – ${formatCurrency(salary.monthly_max)}/month`;
    } else if (hasMin) {
      salaryText = `From ${formatCurrency(salary.monthly_min)}/month`;
    } else if (hasMax) {
      salaryText = `Up to ${formatCurrency(salary.monthly_max)}/month`;
    }
  }

  if (!salaryText) return null;

  return (
    <div className={styles.glanceRow}>
      <dt>Salary</dt>
      <dd>{salaryText}</dd>
    </div>
  );
}

function VacanciesBreakdownSection({
  breakdown,
}: {
  breakdown?: Phase1BEnrichmentData['vacancies_breakdown'];
}) {
  if (!breakdown || breakdown.length === 0) return null;

  // Group by location if present
  const byLocation: Record<string, typeof breakdown> = {};
  breakdown.forEach((item) => {
    const loc = item.location || 'General';
    if (!byLocation[loc]) byLocation[loc] = [];
    byLocation[loc].push(item);
  });

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
        Vacancy Breakdown
      </h3>
      {Object.entries(byLocation).map(([location, items]) => (
        <div key={location} style={{ marginBottom: 16 }}>
          {Object.keys(byLocation).length > 1 && (
            <p
              style={{
                fontSize: 12,
                color: 'var(--hub-ink3)',
                marginBottom: 8,
              }}
            >
              <strong>{location}</strong>
            </p>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 8,
            }}
          >
            {items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: 8,
                  border: '1px solid var(--hub-border)',
                  borderRadius: 4,
                  textAlign: 'center',
                  fontSize: 13,
                }}
              >
                <div style={{ color: 'var(--hub-ink3)', fontSize: 11 }}>
                  {item.category}
                </div>
                <div style={{ fontWeight: 600, fontSize: 16, marginTop: 4 }}>
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EligibilitySection({
  eligibility,
}: {
  eligibility?: Phase1BEnrichmentData['eligibility'];
}) {
  if (!eligibility) return null;

  const { age_limit, education, experience } = eligibility;
  const hasAge = age_limit?.min != null || age_limit?.max != null || age_limit?.text;
  const hasEducation = education && education.length > 0;
  const hasExperience =
    experience?.years_required != null || experience?.description;

  if (!hasAge && !hasEducation && !hasExperience) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
        Eligibility
      </h3>

      {hasAge && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 13 }}>
            <strong>Age Limit:</strong>{' '}
            {age_limit?.text ||
              (age_limit?.min != null && age_limit?.max != null
                ? `${age_limit.min}–${age_limit.max} years`
                : age_limit?.min != null
                  ? `Minimum ${age_limit.min} years`
                  : `Maximum ${age_limit.max} years`)}
          </p>
        </div>
      )}

      {hasEducation && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: '0 0 8px 0', fontSize: 13 }}>
            <strong>Education:</strong>
          </p>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
            {education.map((edu, idx) => (
              <li key={idx}>
                {edu.degree}
                {edu.specialization && ` (${edu.specialization})`}
                {edu.minimumMarks && ` - ${edu.minimumMarks}% marks`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasExperience && (
        <div>
          <p style={{ margin: '0 0 8px 0', fontSize: 13 }}>
            <strong>Experience:</strong>
          </p>
          {experience?.years_required != null && (
            <p style={{ margin: '0 0 4px 0', fontSize: 13 }}>
              {experience.years_required} years required
              {experience.job_title && ` in ${experience.job_title}`}
            </p>
          )}
          {experience?.description && (
            <p style={{ margin: 0, fontSize: 13 }}>{experience.description}</p>
          )}
        </div>
      )}
    </div>
  );
}

function SelectionProcessSection({
  steps,
}: {
  steps?: Phase1BEnrichmentData['selection_process'];
}) {
  if (!steps || steps.length === 0) return null;

  // Sort by step/stage number
  const sorted = [...steps].sort(
    (a, b) => ((a.step ?? a.stage) || 0) - ((b.step ?? b.stage) || 0)
  );

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
        Selection Process
      </h3>
      <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
        {sorted.map((step, idx) => (
          <li key={idx} style={{ marginBottom: 8 }}>
            <strong>{step.name || step.stageName}</strong>
            {step.total_marks && ` (${step.total_marks} marks)`}
            {step.description && <p style={{ margin: '4px 0 0 0' }}>{step.description}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ApplicationSection({
  application,
}: {
  application?: Phase1BEnrichmentData['application'];
}) {
  if (!application) return null;

  const { deadline, application_fee, application_method } = application;

  if (!deadline && !application_fee && !application_method) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
        Application Details
      </h3>

      {application_method && (
        <div style={{ marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 13 }}>
            <strong>Method:</strong> {application_method}
          </p>
        </div>
      )}

      {deadline && (
        <div style={{ marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 13 }}>
            <strong>Deadline:</strong> {deadline}
          </p>
        </div>
      )}

      {application_fee != null && (
        <div>
          <p style={{ margin: 0, fontSize: 13 }}>
            <strong>Fee:</strong> {application_fee === 0 ? 'No fee' : formatCurrency(application_fee)}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Phase1BEnrichmentRenderer({
  data,
}: Phase1BEnrichmentRendererProps) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const hasRelevantData =
    data.salary ||
    (data.vacancies_breakdown && data.vacancies_breakdown.length > 0) ||
    data.eligibility ||
    (data.selection_process && data.selection_process.length > 0) ||
    data.application;

  if (!hasRelevantData) {
    return null;
  }

  return (
    <section aria-labelledby="enrichment-heading" className={styles.card}>
      <h2 id="enrichment-heading" className={styles.sectionTitle}>
        Enriched Details
      </h2>

      {/* Salary in main glance */}
      {data.salary && (
        <dl className={styles.glance}>
          <SalarySection salary={data.salary} />
        </dl>
      )}

      {/* Detailed sections */}
      <VacanciesBreakdownSection breakdown={data.vacancies_breakdown} />
      <EligibilitySection eligibility={data.eligibility} />
      <SelectionProcessSection steps={data.selection_process} />
      <ApplicationSection application={data.application} />
    </section>
  );
}
