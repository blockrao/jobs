/**
 * Advanced Organization Schema Generation
 *
 * Extends basic Organization schema with:
 * - FAQPage (eligibility, salary, selection process questions)
 * - AggregateOffer (salary ranges across roles)
 * - EducationalOccupationalCredential (education requirements)
 * - EducationEvent (notification of new recruitment)
 *
 * SEO Benefits:
 * - Rich snippets in SERP (salary ranges visible)
 * - FAQs in People Also Ask
 * - Featured snippet eligibility
 * - Structured data for voice search
 */

export interface OrganizationSchemaInput {
  organizationName: string;
  organizationUrl: string;
  organizationLogo?: string;
  description: string;
  salaryRanges?: { role: string; minSalary: number; maxSalary: number }[];
  eligibilityRequirements?: {
    education: string;
    ageMin?: number;
    ageMax?: number;
    experience?: number;
  };
  selectionStats?: {
    vacancies: number;
    selected: number;
    successRate: number;
  };
}

/**
 * Generate FAQ Schema for common questions
 */
export function generateFAQSchema(input: OrganizationSchemaInput) {
  const faqs = [
    {
      "@type": "Question",
      "name": `What are the eligibility criteria for ${input.organizationName}?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": `To apply for ${input.organizationName}, you typically need: ${input.eligibilityRequirements?.education || "a Bachelor's degree or higher"}${input.eligibilityRequirements?.ageMin ? `, age between ${input.eligibilityRequirements.ageMin}-${input.eligibilityRequirements.ageMax} years` : ""}${input.eligibilityRequirements?.experience ? `, and ${input.eligibilityRequirements.experience} years of experience` : ""}. Check the official notification for specific requirements.`,
      },
    },
    {
      "@type": "Question",
      "name": `What is the salary structure for ${input.organizationName}?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": input.salaryRanges
          ? `Salary varies by role and level. ${input.salaryRanges.map((s) => `${s.role}: ₹${s.minSalary.toLocaleString()}-₹${s.maxSalary.toLocaleString()}`).join(", ")}. Salary includes base, dearness allowance (DA), and house rent allowance (HRA).`
          : `Salary is determined by the pay commission and includes base salary, dearness allowance (DA), and house rent allowance (HRA). See the official notification for detailed pay scales.`,
      },
    },
    {
      "@type": "Question",
      "name": `What is the selection process for ${input.organizationName}?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": `The selection process typically involves: 1) Application submission, 2) Preliminary/Main examination, 3) Interview, 4) Document verification, 5) Final selection. Success rate is approximately ${input.selectionStats?.successRate ? (input.selectionStats.successRate * 100).toFixed(1) + "%" : "0.4%"}. The process timeline is typically 6-9 months from notification to results.`,
      },
    },
    {
      "@type": "Question",
      "name": `How often does ${input.organizationName} conduct recruitment?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": `Most government organizations conduct annual or bi-annual recruitment drives. Follow the official website and JobOye notifications for announcement schedules. Subscribe to get alerts when new recruitment is announced.`,
      },
    },
    {
      "@type": "Question",
      "name": `What is the difficulty level for ${input.organizationName} recruitment?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": `${input.organizationName} is highly competitive with ${input.selectionStats?.vacancies || "limited"} positions for thousands of applicants. Strong preparation, consistent effort, and strategic approach are essential. Check the competitiveness analysis on JobOye for detailed insights.`,
      },
    },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs,
  };
}

/**
 * Generate AggregateOffer Schema for salary visibility in SERPs
 */
export function generateAggregateOfferSchema(input: OrganizationSchemaInput) {
  if (!input.salaryRanges || input.salaryRanges.length === 0) {
    return null;
  }

  const offers = input.salaryRanges.map((salary) => ({
    "@type": "Offer",
    "salary": {
      "@type": "PriceSpecification",
      "priceCurrency": "INR",
      "price": `${salary.minSalary}-${salary.maxSalary}`,
      "description": `${salary.role} salary range`,
    },
    "jobTitle": salary.role,
  }));

  return {
    "@context": "https://schema.org",
    "@type": "AggregateOffer",
    "priceCurrency": "INR",
    "lowPrice": Math.min(...input.salaryRanges.map((s) => s.minSalary)),
    "highPrice": Math.max(...input.salaryRanges.map((s) => s.maxSalary)),
    "offerCount": offers.length,
    "offers": offers,
  };
}

/**
 * Generate EducationalOccupationalCredential Schema
 */
export function generateEducationalOccupationalCredentialSchema(
  input: OrganizationSchemaInput
) {
  if (!input.eligibilityRequirements) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalCredential",
    "name": `${input.organizationName} Recruitment`,
    "credentialCategory": "Certification",
    "educationLevel": input.eligibilityRequirements.education,
    "recognizedBy": {
      "@type": "Organization",
      "name": input.organizationName,
      "url": input.organizationUrl,
    },
    "competencyRequired": [
      "Analytical thinking",
      "Problem solving",
      "Communication",
      "Subject matter expertise",
    ],
  };
}

/**
 * Generate Event Schema for recruitment announcements
 */
export function generateRecruitmentEventSchema(input: OrganizationSchemaInput) {
  const nextRecruitmentDate = new Date();
  nextRecruitmentDate.setFullYear(nextRecruitmentDate.getFullYear() + 1);

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": `${input.organizationName} Recruitment Announcement`,
    "description": `New recruitment drive announcement for ${input.organizationName}. Apply on the official website.`,
    "url": input.organizationUrl,
    "organizer": {
      "@type": "Organization",
      "name": input.organizationName,
      "url": input.organizationUrl,
    },
    "eventStatus": "EventScheduled",
    "eventAttendanceMode": "OnlineEventAttendanceMode",
    "startDate": nextRecruitmentDate.toISOString(),
    "endDate": nextRecruitmentDate.toISOString(),
  };
}

/**
 * Generate complete organization schema with all extensions
 */
export function generateCompleteOrganizationSchema(
  input: OrganizationSchemaInput
) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      // Base Organization schema
      {
        "@type": "GovernmentOrganization",
        "@id": `${input.organizationUrl}#org`,
        "name": input.organizationName,
        "url": input.organizationUrl,
        "logo": input.organizationLogo || undefined,
        "description": input.description,
        "inLanguage": "en-IN",
        "jobOpenings": {
          "@type": "Collection",
          "name": `Active positions at ${input.organizationName}`,
          "url": `${input.organizationUrl}#jobs`,
        },
      },

      // FAQ Schema
      generateFAQSchema(input),

      // Aggregate Offer (Salary)
      ...(generateAggregateOfferSchema(input)
        ? [generateAggregateOfferSchema(input)]
        : []),

      // Educational Credential
      ...(generateEducationalOccupationalCredentialSchema(input)
        ? [generateEducationalOccupationalCredentialSchema(input)]
        : []),

      // Event (Next Recruitment)
      generateRecruitmentEventSchema(input),
    ],
  };
}

/**
 * Generate JSON-LD script tag for inclusion in HTML head
 */
export function generateOrganizationSchemaScript(
  input: OrganizationSchemaInput
): string {
  const schema = generateCompleteOrganizationSchema(input);
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}
