// @ts-nocheck
/**
 * Post Leaf FAQ Schema
 *
 * Auto-generates schema.org/FAQPage from post data.
 * Covers: How to apply, selection process, eligibility, salary, age limit, deadline
 *
 * Used for featured snippets and answer engine optimization (AEO).
 */

interface PostFAQSchemaProps {
  post: {
    title: string;
    organizationName?: string | null;
    applicationDeadline?: Date | string | null;
    selectionProcess?: string | null;
    qualificationText?: string | null;
    ageLimit?: string | null;
    salary?: { min: number | null; max: number | null } | null;
    applyUrl?: string | null;
    applicationMethod?: string | null;
    fjaExtract?: {
      ageLimitRaw?: string | null;
      salaryRaw?: string | null;
    } | null;
    enrichment?: {
      ageRules?: Array<{ category: string; max?: number; relaxationYears?: number }>;
      selectionProcessStages?: Array<{ step?: number; name: string }>;
    } | null;
  };
}

function formatCurrency(num: number | null | undefined): string {
  if (!num) return "0";
  return (num / 1000).toFixed(0) + "K";
}

export default function PostFAQSchema({ post }: PostFAQSchemaProps) {
  const faqs: Array<{ question: string; answer: string }> = [];

  // Q1: How to apply
  if (post.applicationMethod || post.applyUrl) {
    let answer = "To apply, ";
    if (post.applicationMethod) {
      answer += post.applicationMethod;
    } else {
      answer += "follow the application instructions";
    }
    if (post.applyUrl) {
      answer += `. Visit the official application portal to submit your application.`;
    } else {
      answer += `. Check the official notification for submission details.`;
    }

    faqs.push({
      question: `How to apply for ${post.title}?`,
      answer,
    });
  }

  // Q2: What is the selection process?
  if (post.selectionProcess) {
    faqs.push({
      question: `What is the selection process for ${post.title}?`,
      answer: post.selectionProcess,
    });
  } else if (post.enrichment?.selectionProcessStages?.length) {
    const stages = post.enrichment.selectionProcessStages
      .map(s => s.name)
      .filter(Boolean)
      .join(" → ");
    if (stages) {
      faqs.push({
        question: `What is the selection process for ${post.title}?`,
        answer: `The selection process includes the following stages: ${stages}. For detailed information, refer to the official notification.`,
      });
    }
  }

  // Q3: What qualifications are required?
  if (post.qualificationText) {
    const shortQual = post.qualificationText.split("\n")[0].substring(0, 150).trim();
    faqs.push({
      question: `What qualifications are required for ${post.title}?`,
      answer: `${shortQual}${shortQual.endsWith(".") ? "" : "..."}. For complete details, refer to the qualifications section on this page or the official notification.`,
    });
  }

  // Q4: What is the age limit?
  if (post.ageLimit || post.fjaExtract?.ageLimitRaw) {
    const ageText = post.ageLimit || post.fjaExtract?.ageLimitRaw || "See official notification";
    faqs.push({
      question: `What is the age limit for ${post.title}?`,
      answer: ageText,
    });
  } else if (post.enrichment?.ageRules?.length) {
    const defaultRule = post.enrichment.ageRules.find(r => r.category === "General");
    if (defaultRule?.max) {
      faqs.push({
        question: `What is the age limit for ${post.title}?`,
        answer: `The general age limit is ${defaultRule.max} years. Age relaxation is available for certain categories. Refer to the official notification for complete details.`,
      });
    }
  }

  // Q5: What is the salary?
  if (post.salary?.min || post.fjaExtract?.salaryRaw) {
    let salaryText = "";
    if (post.salary?.min) {
      salaryText = `₹${formatCurrency(post.salary.min)}${post.salary.max ? `–₹${formatCurrency(post.salary.max)}` : ""} per month`;
    } else if (post.fjaExtract?.salaryRaw) {
      salaryText = post.fjaExtract.salaryRaw;
    }

    faqs.push({
      question: `What is the salary for ${post.title}?`,
      answer: `${salaryText}. This typically includes basic pay, dearness allowance, and other government benefits. Refer to the official notification for the complete salary structure.`,
    });
  }

  // Q6: When is the deadline?
  if (post.applicationDeadline) {
    const deadline = new Date(post.applicationDeadline);
    const formattedDate = deadline.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    faqs.push({
      question: `What is the application deadline for ${post.title}?`,
      answer: `Applications must be submitted by ${formattedDate}. Ensure you submit your application before the deadline to be considered for this position.`,
    });
  }

  // Q7: Are there any age relaxations?
  if (post.enrichment?.ageRules?.length > 1) {
    const relaxations = post.enrichment.ageRules
      .filter(r => r.relaxationYears && r.relaxationYears > 0)
      .map(r => `${r.category}: +${r.relaxationYears} years`)
      .join(", ");

    if (relaxations) {
      faqs.push({
        question: `Is there any age relaxation for ${post.title}?`,
        answer: `Yes. Age relaxation is available for: ${relaxations}. Refer to the official notification for complete details on eligibility criteria and relaxation rules.`,
      });
    }
  }

  if (faqs.length === 0) {
    return null;
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
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
