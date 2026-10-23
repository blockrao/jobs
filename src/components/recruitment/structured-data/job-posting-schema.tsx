/**
 * JobPosting Schema (JSON-LD)
 * 
 * Generates schema.org JobPosting for Google Job Search, LinkedIn, Indeed crawlers.
 * Includes enrichment data (salary, dates, qualifications, location).
 */

import { HubData } from '../sections/types';

export function generateJobPostingSchema(
  data: HubData,
  enrichment?: Record<string, any> | null
) {
  const glance = enrichment?.at_a_glance || {};
  const dates = enrichment?.important_dates || {};

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: data.heading,
    description: data.description,
    hiringOrganization: {
      '@type': 'Organization',
      name: data.orgName || 'Government of India',
      url: data.officialWebsiteUrl || undefined,
    },
    jobLocation: data.state
      ? {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressRegion: data.state.name,
            addressCountry: 'IN',
          },
        }
      : undefined,
    baseSalary:
      glance['Salary'] || glance['PAY']
        ? {
            '@type': 'PriceSpecification',
            priceCurrency: 'INR',
            price: glance['Salary'] || glance['PAY'],
          }
        : undefined,
    validThrough: data.appEndRaw || dates['Application Deadline'] || dates['Application End Date'],
    datePosted: data.notificationDate || dates['Notification Date'],
    jobBenefits: [
      glance['Salary'] && `Salary: ${glance['Salary']}`,
      glance['Age Limit'] && `Age Limit: ${glance['Age Limit']}`,
      glance['Qualification'] && `Qualification: ${glance['Qualification']}`,
    ].filter(Boolean),
    applicantLocationRequirements: {
      '@type': 'Country',
      name: 'IN',
    },
  };

  // Remove undefined properties
  return JSON.parse(JSON.stringify(schema));
}

export default function JobPostingSchema({
  data,
  enrichment,
}: {
  data: HubData;
  enrichment?: Record<string, any> | null;
}) {
  const schema = generateJobPostingSchema(data, enrichment);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
