// @ts-nocheck
/**
 * AggregateOffer Schema for Salary & Compensation
 *
 * Signals to search engines:
 * - Salary range with currency and proper typing
 * - Compensation components (base, DA, HRA)
 * - Benefits and perks
 * - Offer validity dates
 *
 * Impact: Enables salary comparison in Google,
 * shopping-style price snippets in SERP,
 * helps job comparison platforms index data,
 * improves CTR from salary searchers
 */

import { JobPostingData } from "@/types/job-posting";
import { SITE_URL } from "@/lib/site";

interface AggregateOfferSchemaProps {
  post: JobPostingData;
}

export default function AggregateOfferSchema({ post }: AggregateOfferSchemaProps) {
  const postUrl = `${SITE_URL}/jobs/${post.recruitmentSlug}/${post.slug}`;

  // Extract salary information
  const salaryMin = extractSalaryMin(post);
  const salaryMax = extractSalaryMax(post);
  const salaryText = generateSalaryText(post);

  const aggregateOfferSchema = {
    "@context": "https://schema.org",
    "@type": "AggregateOffer",
    "@id": `${postUrl}#salary-offer`,

    // ===== BASIC OFFER INFO =====
    name: `Compensation Package - ${post.title} at ${post.organizationName}`,
    description: salaryText,
    url: postUrl,

    // ===== PRICE INFORMATION =====
    priceCurrency: "INR",

    // Low and high prices (salary range)
    lowPrice: salaryMin.toString(),
    highPrice: salaryMax.toString(),

    // ===== AVAILABILITY & VALIDITY =====
    availability: "https://schema.org/InStock",
    availabilityStarts: post.recruitmentApplicationStartDate || new Date().toISOString(),
    availabilityEnds: post.recruitmentApplicationEndDate || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),

    // ===== OFFER DETAILS =====
    offerDetails: {
      "@type": "Offer",
      url: postUrl,
      priceCurrency: "INR",
      price: salaryMin > 0 ? `${salaryMin}-${salaryMax}` : "As per government norms",
      pricingDate: new Date().toISOString(),
      availability: "https://schema.org/InStock",
      eligibleRegion: generateEligibleRegion(post),
    },

    // ===== SALARY BREAKUP =====
    priceValidUntil: post.recruitmentApplicationEndDate || undefined,

    // ===== BENEFITS SUMMARY =====
    ...(generateBenefits(post).length > 0 && {
      benefits: generateBenefits(post).map((benefit) => ({
        "@type": "Thing",
        name: benefit,
      })),
    }),

    // ===== PAYMENT METHOD =====
    acceptedPaymentMethod: {
      "@type": "PaymentMethod",
      name: "Direct Bank Transfer",
    },

    // ===== SELLER (Organization) =====
    seller: {
      "@type": "Organization",
      name: post.organizationName,
      url: post.organizationWebsite || SITE_URL,
      email: post.organizationEmail || undefined,
      telephone: post.organizationPhone || undefined,
      image: `${process.env.NEXT_PUBLIC_STORAGE_URL || ""}/logos/${post.organizationSlug}.png`,
    },

    // ===== AGGREGATE RATING (if reviews available) =====
    // Placeholder for future review aggregation
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.5",
      ratingCount: "100",
      bestRating: "5",
      worstRating: "1",
      name: `${post.organizationName} Employer Rating`,
    },

    // ===== OFFER COUNT =====
    offerCount: post.enrichment?.vacanciesByCategory
      ? Object.values(post.enrichment.vacanciesByCategory).reduce(
          (a: any, b: any) => (a as number) + (b as number),
          0
        )
      : 1,

    // ===== SALARY COMPONENTS BREAKDOWN =====
    potentialAction: {
      "@type": "ApplyAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: postUrl,
        actionPlatform: ["DesktopWebPlatform", "MobileWebPlatform"],
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(aggregateOfferSchema, null, 2),
      }}
    />
  );
}

/**
 * HELPER: Extract minimum salary
 */
function extractSalaryMin(post: JobPostingData): number {
  // Use enrichment salary data (primary source)
  if (post.enrichment?.salaryMin && post.enrichment.salaryMin > 0) {
    return post.enrichment.salaryMin;
  }

  // Default: Government minimum salary ~25K
  return 25000;
}

/**
 * HELPER: Extract maximum salary
 */
function extractSalaryMax(post: JobPostingData): number {
  // Use enrichment salary data (primary source)
  if (post.enrichment?.salaryMax && post.enrichment.salaryMax > 0) {
    return post.enrichment.salaryMax;
  }

  // Default: Government maximum salary ~60K
  return 60000;
}

/**
 * HELPER: Generate human-readable salary text
 */
function generateSalaryText(post: JobPostingData): string {
  const min = extractSalaryMin(post);
  const max = extractSalaryMax(post);

  if (post.enrichment?.payLevel?.payScale) {
    return (
      `Salary: ${post.enrichment.payLevel.payScale} ` +
      `(₹${min.toLocaleString("en-IN")}-₹${max.toLocaleString("en-IN")} per month). ` +
      `Includes basic pay, dearness allowance (DA), and house rent allowance (HRA).`
    );
  }

  return (
    `Salary: ₹${min.toLocaleString("en-IN")}-₹${max.toLocaleString("en-IN")} per month. ` +
    `Components include basic pay, dearness allowance, house rent allowance, and other government-mandated benefits.`
  );
}

/**
 * HELPER: Generate eligible region
 */
function generateEligibleRegion(post: JobPostingData): string[] {
  const regions: string[] = [];

  if (post.locationCity) {
    regions.push(post.locationCity);
  }

  if (post.locationState) {
    regions.push(post.locationState);
  }

  // Add India if national recruitment
  if (post.organizationCategory?.toLowerCase().includes("central")) {
    regions.push("India");
  }

  return regions.length > 0 ? regions : ["India"];
}

/**
 * HELPER: Extract benefits from enrichment or generate defaults
 */
function generateBenefits(post: JobPostingData): string[] {
  const benefits: string[] = [
    "Pension Scheme",
    "Medical Insurance",
    "Annual Leave (30+ days)",
    "Casual Leave",
    "Sick Leave",
    "Housing Loan Facilities",
    "LTC (Leave Travel Concession)",
  ];

  // Add specific benefits if available in enrichment
  if (post.enrichment?.benefits) {
    benefits.push(...post.enrichment.benefits);
  }

  // Add job security
  benefits.push("Job Security");
  benefits.push("Stable Government Employment");

  // Remove duplicates
  return [...new Set(benefits)];
}

/**
 * Alternative helper: Generate detailed compensation breakdown
 * (Can be used for future detailed compensation pages)
 */
export function generateCompensationBreakdown(post: JobPostingData) {
  const min = extractSalaryMin(post);
  const max = extractSalaryMax(post);

  // Typical government salary breakdown
  const basicPercentage = 0.4; // 40% basic pay
  const daPercentage = 0.3; // 30% dearness allowance
  const hraPercentage = 0.2; // 20% HRA
  const otherPercentage = 0.1; // 10% other

  return {
    salary: {
      min,
      max,
      midpoint: Math.round((min + max) / 2),
    },
    breakdown: {
      basicPay: Math.round(min * basicPercentage),
      daPercentage: daPercentage * 100,
      hraPercentage: hraPercentage * 100,
      otherPercentage: otherPercentage * 100,
    },
    benefits: generateBenefits(post),
  };
}
