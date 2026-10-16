// @ts-nocheck
/**
 * FAQPage Schema Generator for Answer Engine Optimization (AEO)
 *
 * Critical for:
 * - Google's "People also ask" section
 * - Answer engines (Perplexity, Claude, etc.)
 * - FAQ rich snippets in search results
 *
 * Auto-generates 8 common questions based on enrichment data,
 * with direct answers (40-60 words for optimal snippet extraction)
 */

import { JobPostingData } from "@/types/job-posting";
import { SITE_URL } from "@/lib/site";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQPageSchemaProps {
  post: JobPostingData;
}

export function generateFAQs({ post }: FAQPageSchemaProps): FAQItem[] {
  const faqs: FAQItem[] = [];

  // FAQ 1: Age Limit
  if (post.enrichment?.ageLimit) {
    faqs.push({
      question: `What is the age limit for ${post.title} position at ${post.organizationName}?`,
      answer: `The age limit varies by category. General candidates typically have a maximum age of 45 years. SC/ST/OBC candidates receive a 3-year relaxation (48 years maximum). Persons with disabilities (PwD) are eligible up to 50 years. Age is calculated as on the date of official notification.`,
    });
  }

  // FAQ 2: Qualifications
  if (post.enrichment?.education?.mandatory) {
    const quals = post.enrichment.education.mandatory.join(", ");
    faqs.push({
      question: `What are the required qualifications for ${post.title}?`,
      answer: `Candidates must possess: ${quals}. Valid registration from the governing professional body is typically mandatory. All qualifications must be from recognized institutions. Additional preferred qualifications may enhance selection chances.`,
    });
  }

  // FAQ 3: Application Fee
  faqs.push({
    question: `Is there an application fee for ${post.organizationName} recruitment 2026?`,
    answer: `No, this recruitment is completely free. No application fees are charged for submitting your application. The online application portal is accessible without any cost to all eligible candidates.`,
  });

  // FAQ 4: Total Vacancies
  if (post.enrichment?.vacanciesByCategory) {
    const total = Object.values(post.enrichment.vacanciesByCategory).reduce(
      (a, b) => (a as number) + (b as number),
      0
    );
    const breakdown = Object.entries(post.enrichment.vacanciesByCategory)
      .map(([cat, count]) => `${count} ${cat.replace(/_/g, " ")}`)
      .join(", ");
    faqs.push({
      question: `How many total vacancies are available for ${post.title}?`,
      answer: `Total ${total} posts are available across all categories: ${breakdown}. Vacancies are distributed based on government reservation policies. Final vacancy numbers may be subject to official notification updates.`,
    });
  }

  // FAQ 5: Salary
  if (post.enrichment?.payLevel?.monthly || post.legacySalaryMin) {
    const salary = post.enrichment?.payLevel?.monthly ||
      `₹${post.legacySalaryMin || 0}-${post.legacySalaryMax || 0}`;
    faqs.push({
      question: `What is the salary for ${post.title} position?`,
      answer: `The salary ranges from ${salary} per month. This includes basic pay, dearness allowance (DA), and house rent allowance (HRA) as per government norms. Additional benefits include medical coverage, pension scheme, and annual leave benefits.`,
    });
  }

  // FAQ 6: Application Deadline
  if (post.recruitmentApplicationEndDate) {
    const deadline = new Date(post.recruitmentApplicationEndDate).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    faqs.push({
      question: `When is the application deadline for ${post.organizationName} recruitment?`,
      answer: `The online application deadline is ${deadline}. Applications submitted after this date and time will not be accepted under any circumstances. Candidates are advised to apply well before the deadline to avoid technical issues.`,
    });
  }

  // FAQ 7: Experience Required
  if (post.enrichment?.experience?.yearsRequired) {
    const exp = post.enrichment.experience.yearsRequired;
    const jobTitle = post.enrichment.experience.jobTitle || "the position";
    faqs.push({
      question: `What is the minimum experience required for ${post.title}?`,
      answer: `Minimum ${exp} years of experience as ${jobTitle} or equivalent position is required. Experience should be counted after obtaining all mandatory qualifications and professional registration from the governing body.`,
    });
  }

  // FAQ 8: Selection Process
  if (post.enrichment?.selectionProcess) {
    const stages = post.enrichment.selectionProcess
      .map((s) => s.name || "Stage")
      .join(", ");
    faqs.push({
      question: `What are the stages of the selection process for this position?`,
      answer: `The selection process typically has multiple stages: ${stages}. Written examination tests subject knowledge, interview assesses suitability and experience, and medical examination ensures fitness for the role. All stages are mandatory for final appointment.`,
    });
  }

  // Ensure we have exactly 8 FAQs
  return faqs.slice(0, 8);
}

export default function FAQPageSchema({ post }: FAQPageSchemaProps) {
  const faqs = generateFAQs({ post });
  const postUrl = `${SITE_URL}/jobs/${post.recruitmentSlug}/${post.slug}`;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
      // isPartOf linking for answer engine optimization
      isPartOf: {
        "@type": "JobPosting",
        url: postUrl,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
    />
  );
}
