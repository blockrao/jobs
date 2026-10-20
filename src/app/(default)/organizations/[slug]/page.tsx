import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import { join } from "path";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";
import { pageSeo } from "@/lib/seo";
import { getOrganizationBySlug } from "@/db/operations/get-organizations";
import {
  getOrganizationPostings,
  getOrganizationSalaryStats,
  getOrganizationGeographicDistribution,
  getOrganizationVacancyStats,
  getOrganizationRoles,
} from "@/db/operations/get-organization-postings";
import OrgPageFundamental from "@/components/organization/org-page-fundamental";

// ISR: Revalidate every 2 hours (live data updates)
// Pillar content changes rarely, but job counts + salary data changes frequently
export const revalidate = 7200; // 2 hours

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Map long/variant slugs to canonical database slugs
const SLUG_ALIASES: Record<string, string> = {
  // UPSC variants
  upsc: "union-public-service-commission",
  "union-public-service-commission-upsc": "union-public-service-commission",

  // SSC variants
  "staff-selection-commission": "ssc",

  // Railway variants
  railway: "railway-recruitment-board",
  railways: "railway-recruitment-board",
  rrb: "railway-recruitment-board",
  "railway-recruitment-boards": "railway-recruitment-board",
  "railway-recruitment-boards-rrb": "railway-recruitment-board",
  "railway-recruitment-boards-rrbs": "railway-recruitment-board",

  // SBI variants
  "state-bank-of-india": "state-bank-of-india-sbi",
  sbi: "state-bank-of-india-sbi",
};

// Resolve slug to canonical form
async function resolveSlug(requestedSlug: string): Promise<string | null> {
  // Try direct lookup first
  const direct = await getOrganizationBySlug(requestedSlug);
  if (direct) return requestedSlug;

  // Try alias mapping
  const canonical = SLUG_ALIASES[requestedSlug];
  if (canonical) {
    const found = await getOrganizationBySlug(canonical);
    if (found) return canonical;
  }

  return null;
}

async function readPillarContent(slug: string, originalSlug: string): Promise<string | null> {
  // Try multiple slug variants in order of preference
  const slugsToTry = [slug, originalSlug];

  // For compound slugs like "state-bank-of-india-sbi", also try shorter variants
  if (slug.includes("-") && slug !== originalSlug) {
    const parts = slug.split("-");
    if (parts.length > 2) {
      slugsToTry.push(parts[parts.length - 1]); // e.g., "sbi" from "state-bank-of-india-sbi"
    }
  }

  for (const trySlug of slugsToTry) {
    try {
      const pillarPath = join(
        process.cwd(),
        "public",
        "content",
        "pillars",
        `${trySlug}.md`
      );
      const content = await readFile(pillarPath, "utf-8");
      return content;
    } catch {
      // Continue to next variant
    }
  }

  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: originalSlug } = await params;
  const slug = await resolveSlug(originalSlug);

  if (!slug) {
    return {
      title: "Organization Not Found",
    };
  }

  const org = await getOrganizationBySlug(slug);
  if (!org) {
    return {
      title: "Organization Not Found",
    };
  }

  const description = `${org.name} recruitment guide 2026. Explore eligibility, salary, positions, interview preparation, and recruitment timeline for ${org.name} jobs.`;

  return {
    title: `${org.name} Recruitment Guide 2026 - JobOye`,
    description,
    ...pageSeo(`/organizations/${originalSlug}`),
    openGraph: {
      title: `${org.name} Recruitment Guide`,
      description,
      url: absoluteUrl(`/organizations/${originalSlug}`),
      type: "website",
      images: org.logoUrl
        ? [
            {
              url: org.logoUrl,
              width: 200,
              height: 200,
              alt: org.name,
            },
          ]
        : [],
    },
  };
}

export async function generateStaticParams() {
  // Get all organizations with pillar pages
  const { getRankedOrganizations } = await import(
    "@/db/operations/get-organizations"
  );
  const orgs = await getRankedOrganizations();

  const params = orgs.map((org) => ({
    slug: org.slug,
  }));

  // Also add common alias slugs to pre-render
  const aliases = [
    // UPSC aliases
    { slug: "upsc" },
    { slug: "union-public-service-commission-upsc" },

    // SSC aliases
    { slug: "staff-selection-commission" },

    // Railway aliases
    { slug: "railway" },
    { slug: "railways" },
    { slug: "rrb" },
    { slug: "railway-recruitment-boards" },
    { slug: "railway-recruitment-boards-rrb" },
    { slug: "railway-recruitment-boards-rrbs" },

    // SBI aliases
    { slug: "state-bank-of-india" },
    { slug: "sbi" },
  ];

  return [...params, ...aliases];
}

export default async function OrganizationPage({ params }: Props) {
  const { slug: originalSlug } = await params;

  // Resolve slug to canonical database slug
  const canonicalSlug = await resolveSlug(originalSlug);
  if (!canonicalSlug) {
    notFound();
  }

  // Fetch organization data
  const org = await getOrganizationBySlug(canonicalSlug);
  if (!org) {
    notFound();
  }

  // Read pillar markdown content (try both original and canonical)
  const pillarContent = await readPillarContent(canonicalSlug, originalSlug);
  if (!pillarContent) {
    notFound();
  }

  // Fetch live recruitment data for this organization
  const [
    postings,
    salaryStats,
    geographicDistribution,
    vacancyStats,
    roles,
  ] = await Promise.all([
    getOrganizationPostings(org.id),
    getOrganizationSalaryStats(org.id),
    getOrganizationGeographicDistribution(org.id),
    getOrganizationVacancyStats(org.id),
    getOrganizationRoles(org.id),
  ]);

  // Return fundamental redesigned component with org data + live data
  return (
    <OrgPageFundamental
      organization={org}
      canonicalUrl={absoluteUrl(`/organizations/${originalSlug}`)}
      postings={postings}
      salaryStats={salaryStats}
      geographicDistribution={geographicDistribution}
      vacancyStats={vacancyStats}
      roles={roles}
    />
  );
}
