/**
 * Organization Schema Component
 *
 * Renders Organization structured data for JobOye
 * Used on homepage and organization pages
 *
 * Schema fields:
 * - name: Organization name
 * - logo: Logo URL
 * - url: Homepage
 * - description: What JobOye is
 * - sameAs: Social links for entity consolidation
 * - contactPoint: Support contact
 */

import { SITE_NAME, SITE_URL } from '@/lib/site';

interface OrganizationSchemaProps {
  name?: string;
  description?: string;
}

export default function OrganizationSchema({
  name = SITE_NAME,
  description = "Government jobs discovery platform providing job notifications, results, and guides for government and private sector recruitment in India.",
}: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": name,
    "url": SITE_URL,
    "logo": `${SITE_URL}/logo.png`,
    "description": description,
    "sameAs": [
      "https://twitter.com/joboye",
      "https://linkedin.com/company/joboye",
      // Add more as you grow
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Support",
      "email": "support@joboye.com",
      "availableLanguage": ["en", "hi"],
    },
    "areaServed": "IN",  // India
    "foundingDate": "2024",  // Adjust as needed
    "founders": [
      {
        "@type": "Person",
        "name": "Prav"  // Adjust as needed
      }
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}
