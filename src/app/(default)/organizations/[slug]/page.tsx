import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import { join } from "path";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";
import { pageSeo } from "@/lib/seo";
import { getOrganizationBySlug } from "@/db/operations/get-organizations";
import OrganizationPageProduction from "@/components/organization/org-page-production";

// ISR: Revalidate every 2 hours (live data updates)
// Pillar content changes rarely, but job counts + salary data changes frequently
export const revalidate = 7200; // 2 hours

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Map long/variant slugs to canonical database slugs
const SLUG_ALIASES: Record<string, string> = {
  "union-public-service-commission": "upsc",
  "staff-selection-commission": "ssc",
  "all-india-institute-of-medical-sciences": "aiims",
  "state-bank-of-india": "sbi",
  railway: "railway",
  railways: "railway",
  rrb: "railway",
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
  // Try primary slug first
  try {
    const pillarPath = join(
      process.cwd(),
      "public",
      "content",
      "pillars",
      `${slug}.md`
    );
    return await readFile(pillarPath, "utf-8");
  } catch {
    // Try original slug if different
    if (originalSlug !== slug) {
      try {
        const pillarPath = join(
          process.cwd(),
          "public",
          "content",
          "pillars",
          `${originalSlug}.md`
        );
        return await readFile(pillarPath, "utf-8");
      } catch {
        return null;
      }
    }
    return null;
  }
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

  // Also add alias slugs to pre-render
  const aliases = [
    { slug: "union-public-service-commission" },
    { slug: "staff-selection-commission" },
    { slug: "all-india-institute-of-medical-sciences" },
    { slug: "state-bank-of-india" },
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

  // Return production component with both pillar content and org data
  return (
    <OrganizationPageProduction
      organization={org}
      pillarContent={pillarContent}
      canonicalUrl={absoluteUrl(`/organizations/${originalSlug}`)}
    />
  );
}
