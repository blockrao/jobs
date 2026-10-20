"use client";

/**
 * Pillar Content Renderer
 *
 * Dynamically imports and renders markdown pillar content based on slug
 * Maps slug to markdown file and renders with prose styling
 */

import React, { Suspense } from "react";

// Pillar slug to markdown file mapping
const pillarContentMap: Record<string, () => Promise<any>> = {
  "iit-delhi": () => import("@/content/pillars/iit-delhi.md"),
  "echs": () => import("@/content/pillars/echs.md"),
  "appsc-group-1": () => import("@/content/pillars/appsc-group-1.md"),
  "iit-indore": () => import("@/content/pillars/iit-indore.md"),
  "iari-recruitment": () => import("@/content/pillars/iari-recruitment.md"),
  "bpsc-recruitment": () => import("@/content/pillars/bpsc-recruitment.md"),
  "iiit-kota": () => import("@/content/pillars/iiit-kota.md"),
  "iit-kharagpur": () => import("@/content/pillars/iit-kharagpur.md"),
  "angrau-recruitment": () => import("@/content/pillars/angrau-recruitment.md"),
  "tiss-recruitment": () => import("@/content/pillars/tiss-recruitment.md"),
  "rites-recruitment": () => import("@/content/pillars/rites-recruitment.md"),
  "aiims-jodhpur": () => import("@/content/pillars/aiims-jodhpur.md"),
  "manipal-university": () => import("@/content/pillars/manipal-university.md"),
  "iit-roorkee": () => import("@/content/pillars/iit-roorkee.md"),
  "esic-recruitment": () => import("@/content/pillars/esic-recruitment.md"),
  "east-central-railway": () => import("@/content/pillars/east-central-railway.md"),
  "jipmer-recruitment": () => import("@/content/pillars/jipmer-recruitment.md"),
  "iit-ropar": () => import("@/content/pillars/iit-ropar.md"),
  "gmc-chandigarh": () => import("@/content/pillars/gmc-chandigarh.md"),
  "iiser-bhopal": () => import("@/content/pillars/iiser-bhopal.md"),
  "district-health-society": () => import("@/content/pillars/district-health-society.md"),
  "mumbai-port-authority": () => import("@/content/pillars/mumbai-port-authority.md"),
  "delhi-electricity-commission": () => import("@/content/pillars/delhi-electricity-commission.md"),
  "csjmu-teaching": () => import("@/content/pillars/csjmu-teaching.md"),
  "iiit-delhi": () => import("@/content/pillars/iiit-delhi.md"),
};

interface PillarContentRendererProps {
  slug: string;
}

async function PillarContentRendererAsync({ slug }: PillarContentRendererProps) {
  try {
    const loader = pillarContentMap[slug];
    if (!loader) {
      return <div className="text-gray-500">Content not found for this pillar.</div>;
    }

    const module = await loader();
    const Content = module.default;

    // If it's an MDX/markdown module with a default export component
    if (typeof Content === "function") {
      return <Content />;
    }

    // If it's raw markdown text
    if (typeof Content === "string") {
      return (
        <div
          dangerouslySetInnerHTML={{ __html: Content }}
          className="prose prose-sm dark:prose-invert max-w-none"
        />
      );
    }

    return <div className="text-gray-500">Unable to render content.</div>;
  } catch (error) {
    console.error(`Failed to load pillar content for slug: ${slug}`, error);
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-sm text-red-800 dark:text-red-200">
          Unable to load content. Please try again later.
        </p>
      </div>
    );
  }
}

export default function PillarContentRenderer({ slug }: PillarContentRendererProps) {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      }
    >
      <PillarContentRendererAsync slug={slug} />
    </Suspense>
  );
}
