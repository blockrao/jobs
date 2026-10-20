import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import { join } from "path";
import type { Metadata } from "next";
import { eq, sql } from "drizzle-orm";
import { absoluteUrl } from "@/lib/site";
import { pageSeo } from "@/lib/seo";
import { getDb } from "@/db/index";
import { organizations } from "@/db/schema";
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

// Smart slug resolution: Supports exact match + prefix match
// Examples:
//   /organizations/upsc → resolves to union-public-service-commission
//   /organizations/sbi → resolves to state-bank-of-india-sbi
//   /organizations/railway → resolves to railway-recruitment-board
// This eliminates the need for hardcoded SLUG_ALIASES (which are unmaintainable)
async function resolveSlug(requestedSlug: string): Promise<string | null> {
  // Import at function call to keep it self-contained
  const { smartResolveSlug } = await import("@/lib/slug-resolver");
  const db = getDb();

  // Define data access functions for smartResolveSlug
  const findExact = async (slug: string) => {
    const result = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);
    return result.length > 0 ? result[0].slug : null;
  };

  const findByPrefix = async (prefix: string) => {
    const results = await db
      .select()
      .from(organizations)
      .where(
        sql`${organizations.slug} LIKE ${prefix + "%"} AND ${organizations.slug} != ${prefix}`
      )
      .orderBy(
        sql`CASE WHEN ${organizations.slug} = ${prefix + "-sbi"} THEN 0 ELSE 1 END`, // Prefer -sbi suffix
        sql`${organizations.id} DESC`
      )
      .limit(1);
    return results.map((r) => r.slug);
  };

  // Use smartResolveSlug for consistent, multi-strategy resolution
  const result = await smartResolveSlug(requestedSlug, {
    findExact: async (s) => {
      const org = await getOrganizationBySlug(s);
      return org ? org.slug : null;
    },
    findByPrefix,
    getId: (slug) => 0, // Organizations don't have year, use insertion order
  });

  return result;
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

// Note: Using on-demand ISR instead of static pre-rendering to avoid build timeout
// with 1442+ organization pages. Pages are generated on first access and cached for 2 hours.
// This is faster for users (instant on subsequent requests) and doesn't timeout during build.

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
