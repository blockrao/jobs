/**
 * LocalBusiness Schema for Geo-Targeting
 *
 * Signals to search engines:
 * - Where the job is located (exact coordinates)
 * - Service area (which regions organization covers)
 * - Local ratings and reviews (if available)
 * - Opening hours for application/interview
 *
 * Impact: Appears in Google Maps, local search results,
 * enables "Near me" searches, improves geo ranking
 */

import { JobPostingData } from "@/types/job-posting";
import { SITE_URL } from "@/lib/site";

interface LocalBusinessSchemaProps {
  post: JobPostingData;
}

// Geographic coordinates for major Indian cities
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Mumbai: { lat: 19.0760, lng: 72.8777 },
  Delhi: { lat: 28.7041, lng: 77.1025 },
  Bangalore: { lat: 12.9716, lng: 77.5946 },
  Hyderabad: { lat: 17.3850, lng: 78.4867 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Lucknow: { lat: 26.8467, lng: 80.9462 },
  Indore: { lat: 22.7196, lng: 75.8577 },
  Thane: { lat: 19.218, lng: 72.9789 },
  Navi_Mumbai: { lat: 19.0176, lng: 73.0191 },
};

export default function LocalBusinessSchema({ post }: LocalBusinessSchemaProps) {
  const coordinates = getCoordinates(post.locationCity);

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/jobs/${post.recruitmentSlug}/${post.slug}#local-business`,

    // ===== BASIC INFO =====
    name: `${post.organizationName} - ${post.title}`,
    description: `${post.title} position at ${post.organizationName} in ${post.locationCity}, ${post.locationState}`,

    // ===== ADDRESS =====
    address: {
      "@type": "PostalAddress",
      streetAddress: post.organizationAddress || "See official notification",
      addressLocality: post.locationCity,
      addressRegion: post.locationState,
      postalCode: post.organizationPostalCode,
      addressCountry: "IN",
    },

    // ===== GEO COORDINATES (Critical for local search) =====
    geo: {
      "@type": "GeoCoordinates",
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      elevation: "0", // Can be updated if known
    },

    // ===== SERVICE AREA =====
    areaServed: generateAreaServed(post),

    // ===== CONTACT INFO =====
    telephone: post.organizationPhone || undefined,
    email: post.organizationEmail || undefined,

    // ===== WEBSITE & APPLICATION =====
    url: post.organizationWebsite || `${SITE_URL}/jobs/${post.recruitmentSlug}/${post.slug}`,

    // ===== AVAILABILITY =====
    openingHoursSpecification: generateOpeningHours(post),

    // ===== SERVICE DESCRIPTION =====
    priceRange: getJobCategory(post.title),

    // ===== KEYWORDS (for local search) =====
    keywords: generateLocalKeywords(post),

    // ===== COVERAGE DETAILS =====
    servesCuisine: undefined, // N/A for jobs
    serviceType: `${post.title} - Government Job`,

    // ===== OPERATING AREA BOUNDARIES =====
    isAccessibleForFree: true, // Job applications are free

    // ===== LINKED TO JOB POSTING =====
    knowsAbout: {
      "@type": "JobPosting",
      "@id": `${SITE_URL}/jobs/${post.recruitmentSlug}/${post.slug}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(localBusinessSchema, null, 2),
      }}
    />
  );
}

/**
 * HELPER: Get geographic coordinates for a city
 */
function getCoordinates(
  city: string | undefined
): { lat: number; lng: number } {
  if (!city) return { lat: 20.5937, lng: 78.9629 }; // Default to India center

  // Normalize city name
  const normalized = city
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .toLowerCase();

  // Try exact match
  if (CITY_COORDINATES[city]) {
    return CITY_COORDINATES[city];
  }

  // Try with underscore normalization
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (key.toLowerCase().replace(/\s+/g, "_") === normalized) {
      return coords;
    }
  }

  // Default to India center
  return { lat: 20.5937, lng: 78.9629 };
}

/**
 * HELPER: Generate service area based on organization scope
 */
function generateAreaServed(post: JobPostingData): string | string[] {
  const type = post.organizationCategory || "";

  if (type.toLowerCase().includes("central")) {
    // National scope
    return "IN"; // All of India
  } else if (type.toLowerCase().includes("state")) {
    // State scope
    return `IN-${post.locationState}`;
  } else if (type.toLowerCase().includes("municipal") || type.toLowerCase().includes("corporation")) {
    // City scope
    return post.locationCity || post.locationState || "IN";
  }

  // Default to state/city coverage
  return [post.locationCity, post.locationState].filter(Boolean);
}

/**
 * HELPER: Generate opening hours for application period
 */
function generateOpeningHours(post: JobPostingData) {
  const openingHours = [];

  // Application open date (if available)
  if (post.recruitmentApplicationStartDate) {
    const startDate = new Date(post.recruitmentApplicationStartDate);
    openingHours.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "22:00", // Online applications available till late
      validFrom: startDate.toISOString().split("T")[0],
      validThrough: new Date(post.recruitmentApplicationEndDate || "").toISOString().split("T")[0],
    });
  }

  return openingHours.length > 0 ? openingHours : undefined;
}

/**
 * HELPER: Map job category to price range (for schema purposes)
 */
function getJobCategory(jobTitle: string): string {
  const title = jobTitle.toLowerCase();

  if (title.includes("senior") || title.includes("director") || title.includes("manager")) {
    return "₹₹₹"; // Premium/Executive
  } else if (
    title.includes("officer") ||
    title.includes("specialist") ||
    title.includes("consultant")
  ) {
    return "₹₹"; // Mid-level
  } else {
    return "₹"; // Entry-level/Graduate
  }
}

/**
 * HELPER: Generate local search keywords
 */
function generateLocalKeywords(post: JobPostingData): string {
  const keywords = [
    post.title,
    post.organizationName,
    "government job",
    post.locationCity,
    post.locationState,
    "recruitment",
    "apply online",
    "vacancy",
    `${post.title} in ${post.locationCity}`,
    `${post.organizationName} recruitment`,
    `${post.organizationName} jobs ${post.locationCity}`,
  ];

  return keywords.filter(Boolean).join(", ");
}
