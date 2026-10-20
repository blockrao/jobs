/**
 * Pillar Page (Phase 2 Tier 1)
 *
 * Route: /exams/[pillar-slug]/
 * Purpose: Organization-level recruitment guide + linked posts
 *
 * Features:
 * - Dynamic metadata (title, description, canonical)
 * - FAQPage schema (org-level aggregation)
 * - Pillar posts grid (top 12 posts, sorted by deadline)
 * - ISR: 7 days (evergreen content, infrequent updates)
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPillarBySlug, getPillarPostSamples, getPillarFAQData } from "@/db/operations/get-pillar";
import PillarPageProduction from "@/components/exam/pillar-page-production";
import PillarFAQSchema from "@/components/exam/structured-data/pillar-faq-schema";
import { formatCurrency } from "@/lib/formatting";

export const revalidate = 604800; // 7 days ISR

interface Props {
  params: Promise<{
    "pillar-slug": string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "pillar-slug": pillarSlug } = await params;

  const pillar = await getPillarBySlug(pillarSlug);

  if (!pillar) {
    return {
      title: "Exam Guide Not Found",
      robots: { index: false, follow: true },
    };
  }

  // SEO-optimized title
  const title = `${pillar.organization.name} Recruitment Guide 2026: Salary, Eligibility & Process`;

  // SEO-optimized description
  const description = `Complete guide to ${pillar.organization.name} jobs. ${pillar.postCount} positions available. Learn about salary, eligibility, application process, and selection criteria.`;

  // Canonical URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://joboye.com";
  const canonicalUrl = `${baseUrl}/exams/${pillarSlug}/`;

  return {
    title,
    description,
    keywords: [
      `${pillar.organization.name} recruitment`,
      `${pillar.organization.name} jobs`,
      `${pillar.organization.name} salary`,
      `${pillar.organization.name} eligibility`,
      "government jobs",
      "recruitment",
    ].filter(Boolean),
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: "JobOye",
    },
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
  };
}

export default async function PillarPage({ params }: Props) {
  const { "pillar-slug": pillarSlug } = await params;

  const pillar = await getPillarBySlug(pillarSlug);

  if (!pillar) {
    notFound();
  }

  // Fetch sample posts
  const posts = await getPillarPostSamples(pillar.organization.id, 12);

  // Fetch FAQ data for schema generation
  const faqData = await getPillarFAQData(pillar.organization.id);

  // Build canonical URL for schema
  const canonicalUrl = `/exams/${pillarSlug}/`;

  return (
    <>
      {/* FAQ Schema */}
      {faqData && <PillarFAQSchema organization={pillar.organization} faqData={faqData} />}

      {/* Page Content */}
      <PillarPageProduction
        pillar={{
          slug: pillarSlug,
          organization: {
            id: pillar.organization.id,
            name: pillar.organization.name,
            slug: pillar.organization.slug,
            sector: pillar.organization.sector,
            description: pillar.organization.description,
            logoUrl: pillar.organization.logoUrl,
            websiteUrl: pillar.organization.websiteUrl,
          },
          recruitmentCount: pillar.recruitmentCount,
          postCount: pillar.postCount,
          stats: {
            avgSalaryMin: pillar.stats.avgSalaryMin,
            avgSalaryMax: pillar.stats.avgSalaryMax,
            hasEnrichedData: pillar.stats.hasEnrichedData,
          },
        }}
        posts={posts}
        canonicalUrl={canonicalUrl}
      />
    </>
  );
}

// Generate static paths for top 25 pillars
export async function generateStaticParams() {
  // Hardcode top 25 pillar slugs for now
  // In production, fetch from database with getAllPillarSlugs()
  const pillars = [
    "iit-delhi",
    "echs",
    "appsc-group-1",
    "iit-indore",
    "iari-recruitment",
    "bpsc-recruitment",
    "iiit-kota",
    "iit-kharagpur",
    "angrau-recruitment",
    "tiss-recruitment",
    "rites-recruitment",
    "aiims-jodhpur",
    "manipal-university",
    "iit-roorkee",
    "esic-recruitment",
    "east-central-railway",
    "jipmer-recruitment",
    "iit-ropar",
    "gmc-chandigarh",
    "iiser-bhopal",
    "district-health-society",
    "mumbai-port-authority",
    "delhi-electricity-commission",
    "csjmu-teaching",
    "iiit-delhi",
  ];

  return pillars.map((slug) => ({
    "pillar-slug": slug,
  }));
}
