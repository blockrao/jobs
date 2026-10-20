// @ts-nocheck
/**
 * Pillar FAQ Schema (Organization-level)
 *
 * Auto-generates schema.org/FAQPage from aggregated post data
 * Used for featured snippets and answer engine optimization (AEO)
 */

interface PillarFAQSchemaProps {
  organization: {
    id: number;
    name: string;
    slug: string;
    sector?: string;
  };
  faqData: {
    minSalary?: number;
    maxSalary?: number;
    ageLimit?: string;
    nextDeadline?: Date;
    recruitmentCount: number;
    postCount: number;
  };
}

function formatCurrency(num: number | null | undefined): string {
  if (!num) return "0";
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(0) + "K";
  }
  return num.toString();
}

export default function PillarFAQSchema({ organization, faqData }: PillarFAQSchemaProps) {
  const faqs: Array<{ question: string; answer: string }> = [];

  // Q1: What is the typical salary?
  if (faqData.minSalary || faqData.maxSalary) {
    let salaryText = "";
    if (faqData.minSalary && faqData.maxSalary) {
      salaryText = `₹${formatCurrency(faqData.minSalary)}–₹${formatCurrency(faqData.maxSalary)} per month`;
    } else if (faqData.minSalary) {
      salaryText = `₹${formatCurrency(faqData.minSalary)} per month`;
    } else {
      salaryText = `₹${formatCurrency(faqData.maxSalary)} per month`;
    }

    faqs.push({
      question: `What is the typical salary for ${organization.name} positions?`,
      answer: `Based on ${faqData.postCount} positions, the typical salary ranges from ${salaryText}. This includes basic pay, dearness allowance (DA), HRA, and other government benefits. Refer to specific position notifications for exact salary details.`,
    });
  }

  // Q2: How many positions are open?
  if (faqData.postCount > 0) {
    faqs.push({
      question: `How many positions does ${organization.name} recruit for?`,
      answer: `${organization.name} currently has ${faqData.postCount} positions across ${faqData.recruitmentCount} recruitment cycles. The number varies by year and department. For the latest openings, check the official recruitment notifications.`,
    });
  }

  // Q3: What is the age limit?
  if (faqData.ageLimit) {
    faqs.push({
      question: `What is the age limit for ${organization.name} positions?`,
      answer: `The age limit varies by position and category. General age limit is typically ${faqData.ageLimit}. Age relaxation is available for SC/ST/OBC/PwD candidates as per government norms. Refer to the specific position notification for exact eligibility.`,
    });
  }

  // Q4: When is the next deadline?
  if (faqData.nextDeadline) {
    const deadline = new Date(faqData.nextDeadline);
    const formattedDate = deadline.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    faqs.push({
      question: `What is the application deadline for ${organization.name} positions?`,
      answer: `The next application deadline is ${formattedDate}. Ensure you submit your application before the deadline. For other open positions, check the official recruitment portal for the latest notifications and deadlines.`,
    });
  }

  // Q5: How to apply?
  faqs.push({
    question: `How can I apply for ${organization.name} positions?`,
    answer: `Most ${organization.name} positions require online application through the official recruitment portal. You will need to upload educational certificates, experience certificates, and other required documents. Application fee (if applicable) can be paid online via debit card, credit card, or net banking.`,
  });

  // Q6: What qualifications are required?
  faqs.push({
    question: `What qualifications does ${organization.name} require?`,
    answer: `Qualification requirements vary by position. Most positions require a Bachelor's degree or Master's degree, depending on the role. Research or technical positions may require a PhD. For specific qualification details, refer to the individual position notification.`,
  });

  if (faqs.length === 0) {
    return null;
  }

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
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
    />
  );
}
