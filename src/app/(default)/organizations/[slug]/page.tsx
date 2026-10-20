import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import { join } from "path";
import type { Metadata } from "next";
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

async function readPillarContent(slug: string): Promise<string | null> {
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
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
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
    ...pageSeo(`/organizations/${slug}`),
    openGraph: {
      title: `${org.name} Recruitment Guide`,
      description,
      url: absoluteUrl(`/organizations/${slug}`),
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

  return orgs.map((org) => ({
    slug: org.slug,
  }));
}

export default async function OrganizationPage({ params }: Props) {
  const { slug } = await params;

  // Fetch organization data
  const org = await getOrganizationBySlug(slug);
  if (!org) {
    notFound();
  }

  // Read pillar markdown content
  const pillarContent = await readPillarContent(slug);
  if (!pillarContent) {
    notFound();
  }

  // Return production component with both pillar content and org data
  return (
    <OrganizationPageProduction
      organization={org}
      pillarContent={pillarContent}
      canonicalUrl={absoluteUrl(`/organizations/${slug}`)}
    />
  );
}
