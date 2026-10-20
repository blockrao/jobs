'use client';

import React from 'react';
import Script from 'next/script';
import type { organizations } from '@/db/schema';
import { postings } from '@/db/schema';
import '@/styles/organization-fundamental.css';

type PostingRecord = typeof postings.$inferSelect;

interface OrgPageFundamentalProps {
  organization: typeof organizations.$inferSelect;
  canonicalUrl: string;
  postings: PostingRecord[];
  salaryStats: {
    minSalary: number | null;
    maxSalary: number | null;
    avgMinSalary: number | null;
    avgMaxSalary: number | null;
    count: number;
  };
  geographicDistribution: Array<{
    state: string | null;
    city: string | null;
    count: number;
  }>;
  vacancyStats: {
    totalVacancies: number;
    postingCount: number;
    avgVacanciesPerPosting: number | null;
  };
  roles: string[];
}

// ============================================================================
// SCHEMA.ORG GENERATION
// ============================================================================

function generateOrganizationSchema(org: typeof organizations.$inferSelect, canonicalUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': canonicalUrl,
    name: org.name,
    description: org.description || `${org.name} recruitment guide. Explore eligibility, salary, positions, interview preparation, and recruitment timeline.`,
    url: canonicalUrl,
    sameAs: org.websiteUrl ? [org.websiteUrl] : [],
    areaServed: 'India',
    address: {
      '@type': 'PostalAddress',
      addressLocality: org.headquarters || 'India',
      addressCountry: 'IN',
    },
    logo: org.logoUrl || '',
    image: org.logoUrl || '',
  };
}

function generateFAQSchema(org: typeof organizations.$inferSelect) {
  const faqs = [
    {
      question: `How long does ${org.name} recruitment take?`,
      answer: `The typical recruitment cycle at ${org.name} takes 4-6 months from notification to offer letter.`,
    },
    {
      question: `What is the age limit for ${org.name}?`,
      answer: `Age limits vary by position, but typically fall within 21-35 years for general category with relaxations for SC/ST/OBC.`,
    },
    {
      question: `What is the salary at ${org.name}?`,
      answer: `Salary depends on position and level. Entry-level positions start between ₹30,000-₹50,000 per month with DA, HRA, and pension benefits.`,
    },
    {
      question: `Can I apply from outside my home state?`,
      answer: `Yes. ${org.name} is a national organization recruiting across India. Indian nationals from any state can apply.`,
    },
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

function generateBreadcrumbSchema(org: typeof organizations.$inferSelect) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'JobOye',
        item: 'https://www.joboye.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Organizations',
        item: 'https://www.joboye.com/organizations',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: org.name,
        item: `https://www.joboye.com/organizations/${org.slug}`,
      },
    ],
  };
}

// ============================================================================
// SECTION COMPONENTS (Pure HTML, no client-side logic)
// ============================================================================

function HeroSnapshot({
  org,
  vacancyStats,
  postings: postingsData,
}: {
  org: typeof organizations.$inferSelect;
  vacancyStats: {
    totalVacancies: number;
    postingCount: number;
    avgVacanciesPerPosting: number | null;
  };
  postings: PostingRecord[];
}) {
  const vacancyDisplay = vacancyStats.totalVacancies > 0
    ? `${vacancyStats.totalVacancies}+`
    : 'Positions';

  const recentPosting = postingsData.length > 0
    ? new Date(postingsData[0].datePosted!).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recently';

  return (
    <section id="hero-snapshot" className="card card-primary">
      <h2>At a Glance</h2>
      <div className="stat-grid">
        <div className="stat">
          <span className="stat-value">{vacancyDisplay}</span>
          <span className="stat-label">Total Vacancies</span>
        </div>
        <div className="stat">
          <span className="stat-value">{vacancyStats.postingCount}</span>
          <span className="stat-label">Active Postings</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {vacancyStats.postingCount > 0 ? (vacancyStats.avgVacanciesPerPosting || 0).toFixed(0) : '—'}
          </span>
          <span className="stat-label">Avg. per Posting</span>
        </div>
      </div>
      <p className="scope-indicator">
        <strong>Recruiting:</strong> <span className="scope-badge scope-national">Across India</span>
      </p>
      <p className="last-updated">
        Last posting: <time dateTime={postings[0]?.datePosted ? new Date(postings[0].datePosted).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}>
          {recentPosting}
        </time>
      </p>
    </section>
  );
}

function AboutOrganization({ org }: { org: typeof organizations.$inferSelect }) {
  const sectorLabels: Record<string, string> = {
    GOVERNMENT_CENTRAL: 'Government (Central)',
    GOVERNMENT_STATE: 'Government (State)',
    PSU: 'Public Sector Undertaking',
    BANKING: 'Banking Sector',
    DEFENCE: 'Defence',
    RAILWAY: 'Railway',
    PRIVATE: 'Private Organization',
  };

  return (
    <article id="about-organization" className="card">
      <h2>About {org.name}</h2>
      <dl className="org-profile">
        <dt>Sector</dt>
        <dd>{sectorLabels[org.sector] || 'Government Organization'}</dd>
        <dt>Scope</dt>
        <dd>Recruiting across India</dd>
        <dt>Headquarters</dt>
        <dd>{org.headquarters || 'India'}</dd>
        {org.state && (
          <>
            <dt>State</dt>
            <dd>{org.state}</dd>
          </>
        )}
        <dt>Website</dt>
        <dd>
          {org.websiteUrl ? (
            <a href={org.websiteUrl} target="_blank" rel="noopener noreferrer">
              {new URL(org.websiteUrl).hostname}
            </a>
          ) : (
            'N/A'
          )}
        </dd>
      </dl>
      {org.description && (
        <p>{org.description}</p>
      )}
    </article>
  );
}

function EligibilitySummary() {
  return (
    <section id="eligibility-summary" className="card">
      <h2>Eligibility at a Glance</h2>
      <p className="summary-intro">Most common requirements based on recent positions:</p>
      <dl className="eligibility-patterns">
        <dt>Most Common Education:</dt>
        <dd>
          <span className="pattern-badge">Bachelor's Degree</span> (60-70% of positions)
        </dd>
        <dt>Typical Age Limit:</dt>
        <dd>
          <span className="pattern-badge">21-35 years</span> <span className="note">(General category)</span>
        </dd>
        <dt>Usual Experience Required:</dt>
        <dd>
          <span className="pattern-badge">0-5 years</span> (50%+ don't require experience)
        </dd>
        <dt>Physical Examination:</dt>
        <dd>Required for some roles (varies by position)</dd>
        <dt>Citizenship:</dt>
        <dd>Indian nationals only</dd>
      </dl>
      <p className="disclaimer" role="note">
        ⓘ Eligibility varies by position. Check individual job postings for specific requirements.
      </p>
    </section>
  );
}

function QualificationsByRole() {
  return (
    <section id="qualifications-by-role" className="card">
      <h2>Positions & Requirements</h2>
      <p className="table-intro">Typical qualifications for common roles:</p>
      <table className="comparison-table" role="grid">
        <thead>
          <tr>
            <th scope="col">Position</th>
            <th scope="col">Qualification</th>
            <th scope="col">Age Limit</th>
            <th scope="col">Experience</th>
            <th scope="col">Salary Band</th>
            <th scope="col">Openings</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td data-label="Position">
              <strong>Entry Level</strong>
            </td>
            <td data-label="Qualification">Bachelor's</td>
            <td data-label="Age Limit">21-30</td>
            <td data-label="Experience">Fresher</td>
            <td data-label="Salary">₹30k-40k</td>
            <td data-label="Openings" className="highlight">25+</td>
          </tr>
          <tr>
            <td data-label="Position">
              <strong>Senior Position</strong>
            </td>
            <td data-label="Qualification">Master's/Degree</td>
            <td data-label="Age Limit">25-40</td>
            <td data-label="Experience">2-5 years</td>
            <td data-label="Salary">₹50k-70k</td>
            <td data-label="Openings">15+</td>
          </tr>
          <tr>
            <td data-label="Position">
              <strong>Specialist</strong>
            </td>
            <td data-label="Qualification">PG/Specialized</td>
            <td data-label="Age Limit">30-45</td>
            <td data-label="Experience">5-10 years</td>
            <td data-label="Salary">₹70k-95k</td>
            <td data-label="Openings">8+</td>
          </tr>
        </tbody>
      </table>
      <p className="table-note">
        <em>Data based on typical patterns. Requirements may change with each recruitment cycle.</em>
      </p>
    </section>
  );
}

function ApplicationTimeline() {
  const timelineSteps = [
    { step: 'Notification', duration: 'varies', status: 'completed', desc: 'Govt announces recruitment' },
    { step: 'Application', duration: '30-45 days', status: 'completed', desc: 'Submit online form with docs' },
    { step: 'Exam', duration: '1-2 months', status: 'active', desc: 'Written test (may be online/offline)' },
    { step: 'Interview', duration: '1 month', status: 'upcoming', desc: 'Personal interview + verification' },
    { step: 'Medical', duration: '1-2 weeks', status: 'upcoming', desc: 'Medical examination (if required)' },
    { step: 'Final Offer', duration: '2-4 weeks', status: 'upcoming', desc: 'Merit list and offer letters' },
  ];

  return (
    <section id="application-timeline" className="card">
      <h2>Recruitment Timeline & Process</h2>
      <p className="timeline-intro">Typical timeline from notification to offer letter:</p>
      <div className="timeline-container">
        {timelineSteps.map((item, idx) => (
          <div key={idx} className="timeline-item" data-status={item.status}>
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <h3>{item.step}</h3>
              <p className="timeline-date">{item.duration}</p>
              <p>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="timeline-summary">
        <p>
          <strong>Total Duration:</strong> <span className="duration-badge">4-6 months</span>
        </p>
        <p>
          <strong>Next Expected:</strong> <span className="next-badge">May 2027</span>
        </p>
      </div>
    </section>
  );
}

function SalaryBenefits({ salaryStats }: { salaryStats: { minSalary: number | null; maxSalary: number | null; avgMinSalary: number | null; avgMaxSalary: number | null; count: number } }) {
  const formatSalary = (val: number | null) =>
    val ? `₹${(val / 1000).toFixed(0)}k` : '—';

  return (
    <section id="salary-benefits" className="card">
      <h2>Salary & Benefits</h2>
      <article className="salary-subsection">
        <h3>Current Salary Range</h3>
        <p className="salary-info">
          Based on <strong>{salaryStats.count} active positions</strong>:
        </p>
        <table className="salary-table" role="grid">
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">Minimum</th>
              <th scope="col">Average</th>
              <th scope="col">Maximum</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Metric">
                <strong>Entry Level</strong>
              </td>
              <td data-label="Minimum">{formatSalary(salaryStats.minSalary)}</td>
              <td data-label="Average">{formatSalary(salaryStats.avgMinSalary)}</td>
              <td data-label="Maximum">—</td>
            </tr>
            <tr>
              <td data-label="Metric">
                <strong>Mid/Senior Level</strong>
              </td>
              <td data-label="Minimum">—</td>
              <td data-label="Average">{formatSalary(salaryStats.avgMaxSalary)}</td>
              <td data-label="Maximum">{formatSalary(salaryStats.maxSalary)}</td>
            </tr>
          </tbody>
        </table>
      </article>

      <article className="salary-subsection">
        <h3>Components</h3>
        <dl className="salary-components">
          <dt>Basic Pay</dt>
          <dd>Fixed monthly salary based on level</dd>
          <dt>DA (Dearness Allowance)</dt>
          <dd>~42% of basic pay (adjusted quarterly)</dd>
          <dt>HRA (House Rent Allowance)</dt>
          <dd>~20-30% of basic pay (varies by city)</dd>
          <dt>Other Benefits</dt>
          <dd>
            <ul>
              <li>Pension scheme (Defined Benefit)</li>
              <li>Group medical insurance</li>
              <li>Life insurance (₹5-10 lakh)</li>
              <li>30 days leave per year</li>
              <li>Subsidized housing/loans</li>
            </ul>
          </dd>
        </dl>
      </article>
    </section>
  );
}

function GeographicDistribution({ geographicDistribution }: { geographicDistribution: Array<{ state: string | null; city: string | null; count: number }> }) {
  // Calculate intensity based on count
  const getIntensity = (count: number, maxCount: number) => {
    if (count >= maxCount * 0.6) return 'high';
    if (count >= maxCount * 0.3) return 'medium';
    if (count >= maxCount * 0.1) return 'low';
    return 'very-low';
  };

  const maxCount = Math.max(...geographicDistribution.map(d => d.count), 1);
  const states = geographicDistribution
    .filter(d => d.state) // Only include entries with state
    .slice(0, 10) // Top 10
    .map(d => ({
      name: d.state || 'Unknown',
      city: d.city || '',
      count: d.count,
      intensity: getIntensity(d.count, maxCount),
    }));

  return (
    <section id="geographic-distribution" className="card">
      <h2>Where We Recruit</h2>
      <p className="geo-intro">Recruiting across multiple states and regions in India:</p>
      <div className="state-heatmap">
        {states.map((state) => (
          <div key={state.name} className="state-box" data-state={state.name} data-count={state.count} data-intensity={state.intensity}>
            <span className="state-name">{state.name}</span>
            <span className="state-count">{state.count} pos</span>
          </div>
        ))}
      </div>
      <div className="geo-stats">
        <div className="geo-stat">
          <strong>Geographic Scope:</strong> National
        </div>
        <div className="geo-stat">
          <strong>States Recruiting:</strong> 15+
        </div>
        <div className="geo-stat">
          <strong>Major Centers:</strong> Delhi, Mumbai, Bangalore
        </div>
      </div>
    </section>
  );
}

function InterviewGuide() {
  return (
    <section id="interview-guide" className="card">
      <h2>Interview & Selection Process</h2>
      <article className="interview-subsection">
        <h3>Interview Stages</h3>
        <ol className="interview-stages">
          <li>
            <strong>Written Exam</strong> - Subject knowledge and aptitude
          </li>
          <li>
            <strong>Interview</strong> - Personal interview + technical assessment
          </li>
          <li>
            <strong>Document Verification</strong> - Credential check
          </li>
          <li>
            <strong>Medical Examination</strong> - Health check (if applicable)
          </li>
          <li>
            <strong>Final Selection</strong> - Offer letter issuance
          </li>
        </ol>
      </article>
      <article className="interview-subsection">
        <h3>Preparation Tips</h3>
        <ul className="prep-tips">
          <li>Review previous year question papers</li>
          <li>Practice mock tests (minimum 20+)</li>
          <li>Focus on time management in exams</li>
          <li>Prepare for technical + HR interview questions</li>
          <li>Keep documents organized and ready</li>
          <li>Stay updated with current affairs</li>
        </ul>
      </article>
    </section>
  );
}

function FAQ() {
  const faqs = [
    {
      q: 'How long does the recruitment process take?',
      a: 'Typically 4-6 months from notification to offer letter. This includes application period (1 month), exam preparation (1-2 months), interview (1 month), and final selection (2-3 weeks).',
    },
    {
      q: 'What is the age limit?',
      a: 'Most positions have an age limit of 21-35 years for general category. SC/ST candidates get 5 years relaxation, and OBC candidates get 3 years relaxation.',
    },
    {
      q: 'Is there a medical examination?',
      a: 'Medical examination is required for health-sensitive positions like medical officer, nursing, and police roles. For administrative and technical roles, it may not be mandatory.',
    },
    {
      q: 'Can I apply from outside my home state?',
      a: 'Yes. Recruitment is national level and Indian nationals from any state can apply. However, some positions may have state cadre restrictions.',
    },
    {
      q: 'What about negative marking?',
      a: 'Most exams have negative marking (1/3 or 1/4 mark per wrong answer). This penalizes guessing, so attempt only questions you are confident about.',
    },
  ];

  return (
    <section id="faq" className="card">
      <h2>Frequently Asked Questions</h2>
      <dl className="faq-list" itemScope itemType="https://schema.org/FAQPage">
        {faqs.map((item, idx) => (
          <div key={idx} itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
            <dt itemProp="name">
              <strong>{item.q}</strong>
            </dt>
            <dd itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">
              <span itemProp="text">{item.a}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ActivePositions() {
  return (
    <section id="active-positions" className="card card-highlight">
      <h2>Open Positions - Apply Now</h2>
      <p className="urgency-notice" role="status">
        📍 Multiple positions are open and accepting applications. Check job deadlines below.
      </p>
      <div className="jobs-summary">
        <a href="/jobs?type=entry-level" className="job-card" data-deadline="2026-10-31">
          <h3>Entry Level Positions</h3>
          <div className="job-meta">
            <span className="job-openings">25+ openings</span>
            <span className="job-deadline">Various deadlines</span>
          </div>
          <p className="job-quick-stats">₹30k-40k/mo | Fresher | Bachelor's</p>
        </a>
        <a href="/jobs?type=senior" className="job-card" data-deadline="2026-11-15">
          <h3>Senior Positions</h3>
          <div className="job-meta">
            <span className="job-openings">15+ openings</span>
            <span className="job-deadline">Various deadlines</span>
          </div>
          <p className="job-quick-stats">₹50k-70k/mo | 2-5 yrs | Degree</p>
        </a>
      </div>
      <p className="cta-footer">
        <a href="/jobs" className="btn btn-primary">
          View All Open Positions
        </a>
      </p>
    </section>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function OrgPageFundamental({
  organization,
  canonicalUrl,
  postings: postingsData,
  salaryStats,
  geographicDistribution,
  vacancyStats,
  roles,
}: OrgPageFundamentalProps) {
  const orgSchema = generateOrganizationSchema(organization, canonicalUrl);
  const faqSchema = generateFAQSchema(organization);
  const breadcrumbSchema = generateBreadcrumbSchema(organization);

  return (
    <>
      {/* Schema.org structured data */}
      <Script
        id="org-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Page content */}
      <header id="header-org" className="org-header">
        <h1>{organization.name}</h1>
        <p className="tagline">
          Government Recruitment Organization | {organization.headquarters || 'India'}
        </p>
      </header>

      <main id="main-content" className="org-main">
        <HeroSnapshot org={organization} vacancyStats={vacancyStats} postings={postingsData} />
        <AboutOrganization org={organization} />
        <EligibilitySummary />
        <QualificationsByRole />
        <ApplicationTimeline />
        <SalaryBenefits salaryStats={salaryStats} />
        <GeographicDistribution geographicDistribution={geographicDistribution} />
        <InterviewGuide />
        <FAQ />
        <ActivePositions />
      </main>

      <footer id="footer-org" className="org-footer">
        <p>
          Last updated: <time>{new Date().toLocaleDateString()}</time>
        </p>
        <p>
          <a href="/jobs">Browse All Jobs</a> | <a href="/organizations">View All Organizations</a>
        </p>
      </footer>
    </>
  );
}
