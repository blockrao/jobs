// @ts-nocheck
/**
 * Organization Schema for Structured Data Markup
 *
 * Signals to search engines:
 * - Full employer details (legal name, branches, contact)
 * - Trust signals (founded date, employee count, certifications)
 * - Brand presence (sameAs links, official website)
 * - Service area (where they operate, what they offer)
 *
 * Impact: Enables "Organization" knowledge panel in Google,
 * improves employer brand visibility, supports entity linking
 */

import { JobPostingData } from "@/types/job-posting";
import { SITE_URL } from "@/lib/site";

interface OrganizationSchemaProps {
  post: JobPostingData;
}

export default function OrganizationSchema({ post }: OrganizationSchemaProps) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}#organization-${post.organizationId || post.organizationSlug}`,

    // ===== BASIC IDENTITY =====
    name: post.organizationName,
    alternateName: post.organizationName,

    // ===== DESCRIPTION & MISSION =====
    description: `${post.organizationName} is a ${post.organizationCategory || "Government"} organization. ${getOrganizationDescription(post)}`,

    // ===== CONTACT DETAILS =====
    contactPoint: generateContactPoints(post),

    // ===== LOCATIONS =====
    address: generateAddress(post),
    areaServed: generateAreaServed(post),

    // ===== SOCIAL PRESENCE =====
    sameAs: generateSameAs(post),

    // ===== FOUNDATION & SIZE =====
    foundingDate: post.organizationFoundedYear || undefined,
    numberOfEmployees: post.organizationEmployeeCount
      ? {
          "@type": "QuantitativeValue",
          minValue: parseFloat(post.organizationEmployeeCount),
        }
      : undefined,

    // ===== BRAND & LOGO =====
    logo: generateLogo(post),

    // ===== OFFICIAL CHANNELS =====
    url: post.organizationWebsite || undefined,
    email: post.organizationEmail || undefined,
    telephone: post.organizationPhone || undefined,

    // ===== LEGAL DETAILS =====
    legalName: post.organizationLegalName || post.organizationName,

    // ===== CERTIFICATIONS & ACCREDITATIONS =====
    ...(post.organizationCertifications && {
      certifications: post.organizationCertifications.map((cert) => ({
        "@type": "Text",
        value: cert,
      })),
    }),

    // ===== LINKED TO JOB POSTING =====
    jobsPosted: {
      "@type": "JobPosting",
      "@id": `${SITE_URL}/jobs/${post.recruitmentSlug}/${post.slug}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(organizationSchema, null, 2),
      }}
    />
  );
}

/**
 * HELPER: Generate description based on organization type
 */
function getOrganizationDescription(post: JobPostingData): string {
  const type = post.organizationCategory || "Government";

  switch (type.toLowerCase()) {
    case "central government":
      return "Central Government organization serving the nation with administrative, regulatory, or service delivery functions.";
    case "state government":
      return `${post.locationState || "State"} Government organization providing public services and administration.`;
    case "municipal":
      return `Municipal Corporation responsible for urban services, infrastructure, and civic administration in ${post.locationCity || "the city"}.`;
    case "statutory":
      return "Statutory authority established by law to carry out specific public functions.";
    case "bank":
      return "Public sector bank providing banking and financial services.";
    case "university":
      return "Higher education institution offering teaching, research, and academic services.";
    case "hospital":
      return "Government healthcare facility providing medical services to the public.";
    case "police":
      return "Law enforcement and public safety organization.";
    default:
      return "Organization recruiting talented professionals for various positions.";
  }
}

/**
 * HELPER: Generate contact points array
 * (General inquiries, HR, notifications, etc.)
 */
function generateContactPoints(post: JobPostingData) {
  const contactPoints = [];

  // General contact
  if (post.organizationPhone) {
    contactPoints.push({
      "@type": "ContactPoint",
      contactType: "General Information",
      telephone: post.organizationPhone,
      areaServed: post.locationState || "IN",
      availableLanguage: ["en", "hi"],
    });
  }

  // HR/Recruitment contact
  if (post.organizationEmail) {
    contactPoints.push({
      "@type": "ContactPoint",
      contactType: "Recruitment",
      email: post.organizationEmail,
      areaServed: post.locationState || "IN",
      availableLanguage: ["en", "hi"],
    });
  }

  // Official notification contact
  contactPoints.push({
    "@type": "ContactPoint",
    contactType: "Official Notifications",
    url: post.organizationWebsite || undefined,
    areaServed: post.locationState || "IN",
    availableLanguage: ["en", "hi"],
  });

  return contactPoints.filter((cp) => cp.url || cp.telephone || cp.email);
}

/**
 * HELPER: Generate PostalAddress for main office
 */
function generateAddress(post: JobPostingData) {
  return {
    "@type": "PostalAddress",
    addressCountry: "IN",
    addressLocality: post.locationCity || "India",
    addressRegion: post.locationState || "IN",
    postalCode: post.organizationPostalCode,
    streetAddress: post.organizationAddress,
  };
}

/**
 * HELPER: Generate areaServed (geo coverage)
 */
function generateAreaServed(post: JobPostingData) {
  const areas = [];

  // City level
  if (post.locationCity) {
    areas.push({
      "@type": "City",
      name: post.locationCity,
      sameAs: getWikipediaLink(post.locationCity),
    });
  }

  // State level
  if (post.locationState) {
    areas.push({
      "@type": "State",
      name: post.locationState,
      sameAs: getWikipediaLink(post.locationState),
    });
  }

  // National level (default for government)
  if (post.organizationCategory?.toLowerCase().includes("central")) {
    areas.push({
      "@type": "Country",
      name: "India",
      sameAs: "https://en.wikipedia.org/wiki/India",
    });
  }

  return areas.length > 0 ? areas : "IN";
}

/**
 * HELPER: Generate sameAs links (social presence, official pages)
 */
function generateSameAs(post: JobPostingData): string[] {
  const links: string[] = [];

  // Official website
  if (post.organizationWebsite) {
    links.push(post.organizationWebsite);
  }

  // Wikipedia (if exists)
  const wikipediaLink = getWikipediaLink(post.organizationName);
  if (wikipediaLink) {
    links.push(wikipediaLink);
  }

  // Social media (common government social accounts)
  // Note: Add actual social links if available in your data
  if (post.organizationTwitter) {
    links.push(post.organizationTwitter);
  }
  if (post.organizationFacebook) {
    links.push(post.organizationFacebook);
  }
  if (post.organizationLinkedin) {
    links.push(post.organizationLinkedin);
  }

  return links;
}

/**
 * HELPER: Generate logo markup
 */
function generateLogo(post: JobPostingData) {
  return {
    "@type": "ImageObject",
    url: `${process.env.NEXT_PUBLIC_STORAGE_URL || ""}/logos/${post.organizationSlug}.png`,
    width: 250,
    height: 250,
  };
}

/**
 * HELPER: Map organization name to Wikipedia link
 * (For common government organizations)
 */
function getWikipediaLink(name: string): string | null {
  const wikipediaMap: Record<string, string> = {
    RBI: "https://en.wikipedia.org/wiki/Reserve_Bank_of_India",
    "Reserve Bank of India":
      "https://en.wikipedia.org/wiki/Reserve_Bank_of_India",
    BMC: "https://en.wikipedia.org/wiki/Brihanmumbai_Municipal_Corporation",
    "Brihanmumbai Municipal Corporation":
      "https://en.wikipedia.org/wiki/Brihanmumbai_Municipal_Corporation",
    UPSC: "https://en.wikipedia.org/wiki/Union_Public_Service_Commission",
    SSCE: "https://en.wikipedia.org/wiki/Maharashtra_Public_Service_Commission",
    MPSC: "https://en.wikipedia.org/wiki/Maharashtra_Public_Service_Commission",
    "State Bank of India":
      "https://en.wikipedia.org/wiki/State_Bank_of_India",
    SBI: "https://en.wikipedia.org/wiki/State_Bank_of_India",
    "Indian Railways":
      "https://en.wikipedia.org/wiki/Indian_Railways",
    "Indian Civil Service":
      "https://en.wikipedia.org/wiki/Indian_Administrative_Service",
  };

  return wikipediaMap[name] || null;
}
