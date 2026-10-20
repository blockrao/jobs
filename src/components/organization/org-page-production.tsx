"use client";

import React from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { organizations } from "@/db/schema";
import { generateCompleteOrganizationSchema } from "@/lib/organization-schema";
import LiveJobsWidget from "@/components/organization/widgets/LiveJobsWidget";
import EligibilityChecker from "@/components/organization/widgets/EligibilityChecker";
import SalaryCalculator from "@/components/organization/widgets/SalaryCalculator";
import RoleComparisonMatrix from "@/components/organization/widgets/RoleComparisonMatrix";
import SelectionTrends from "@/components/organization/widgets/SelectionTrends";
import RecruitmentCalendar from "@/components/organization/widgets/RecruitmentCalendar";
import CompetitivenessIndicator from "@/components/organization/widgets/CompetitivenessIndicator";
import BookmarkNotifications from "@/components/organization/widgets/BookmarkNotifications";

interface OrganizationPageProductionProps {
  organization: typeof organizations.$inferSelect;
  pillarContent: string;
  canonicalUrl: string;
}

/**
 * Organization Page Production Component
 *
 * Renders:
 * - Organization header with logo + name
 * - Pillar markdown content (enhanced with FAQ, interview guide, etc.)
 * - Live data widgets (job counts, salary, locations, exams)
 * - Related organizations
 * - Schema.org structured data
 *
 * Phase 2C Integration:
 * - Live job count badges
 * - Real salary aggregations
 * - Location breakdown with vacancy counts
 * - Recruitment timeline
 * - Exam results (when available)
 */

export default function OrganizationPageProduction({
  organization,
  pillarContent,
  canonicalUrl,
}: OrganizationPageProductionProps) {
  // Advanced organization schema with FAQ, salary offers, credentials
  const advancedSchema = generateCompleteOrganizationSchema({
    organizationName: organization.name,
    organizationUrl: canonicalUrl,
    organizationLogo: organization.logoUrl || undefined,
    description:
      organization.description ||
      `Government recruitment organization: ${organization.name}`,
    // These would be populated from real data in production:
    // salaryRanges: getSalaryRanges(organization.id),
    // eligibilityRequirements: getEligibilityRequirements(organization.id),
    // selectionStats: getSelectionStats(organization.id),
  });

  // Breadcrumb schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://joboye.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Organizations",
        item: "https://joboye.com/organizations",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: organization.name,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <>
      {/* Advanced Structured Data (FAQ, Salary, Credentials, Events) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(advancedSchema) }}
      />

      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      {/* Main Content */}
      <div className="min-h-screen bg-white dark:bg-gray-950">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12 sm:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start gap-6">
              {organization.logoUrl && (
                <img
                  src={organization.logoUrl}
                  alt={organization.name}
                  className="h-16 w-16 object-contain rounded"
                />
              )}
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                  {organization.name}
                </h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                  Recruitment Information & Career Guide
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Content Container */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Phase 2C MVP Widgets - High Impact Interactive Features */}

          {/* 1. Live Job Count Widget - Urgency & Social Proof */}
          <LiveJobsWidget
            organizationId={organization.id}
            organizationSlug={organization.slug}
          />

          {/* 2. Quick Eligibility Checker - Conversion Filter */}
          <EligibilityChecker organizationId={organization.id} />

          {/* 3. Salary Calculator - Top Question Answered */}
          <SalaryCalculator organizationId={organization.id} />

          {/* 4. Role Comparison Matrix - Choice Architecture */}
          <RoleComparisonMatrix organizationId={organization.id} />

          {/* Phase 2C-B Week 2: Advanced Intelligence Widgets */}

          {/* 5. Selection Trends + Social Proof - Credibility & Realism */}
          <SelectionTrends organizationId={organization.id} />

          {/* 6. Recruitment Calendar + Prediction - When to Expect Next */}
          <RecruitmentCalendar organizationId={organization.id} />

          {/* 7. Competitiveness Indicator - Realistic Expectations */}
          <CompetitivenessIndicator organizationId={organization.id} />

          {/* 8. Bookmark + Notifications - Retention & Repeat Traffic */}
          <BookmarkNotifications
            organizationId={organization.id}
            organizationName={organization.name}
            organizationSlug={organization.slug}
          />

          {/* Separator */}
          <hr className="my-12 border-gray-300 dark:border-gray-700" />

          {/* Pillar Markdown Content */}
          <article className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ ...props }) => (
                  <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />
                ),
                h2: ({ ...props }) => (
                  <h2 className="text-2xl font-bold mt-8 mb-4" {...props} />
                ),
                h3: ({ ...props }) => (
                  <h3 className="text-xl font-semibold mt-6 mb-3" {...props} />
                ),
                p: ({ ...props }) => (
                  <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed" {...props} />
                ),
                strong: ({ ...props }) => (
                  <strong className="font-semibold text-gray-900 dark:text-white" {...props} />
                ),
                ul: ({ ...props }) => (
                  <ul className="list-disc list-inside space-y-2 mb-4" {...props} />
                ),
                ol: ({ ...props }) => (
                  <ol className="list-decimal list-inside space-y-2 mb-4" {...props} />
                ),
                li: ({ ...props }) => (
                  <li className="text-gray-700 dark:text-gray-300" {...props} />
                ),
                table: ({ ...props }) => (
                  <div className="overflow-x-auto mb-4">
                    <table
                      className="min-w-full border-collapse border border-gray-300 dark:border-gray-700"
                      {...props}
                    />
                  </div>
                ),
                th: ({ ...props }) => (
                  <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 bg-gray-100 dark:bg-gray-800 font-semibold" {...props} />
                ),
                td: ({ ...props }) => (
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2" {...props} />
                ),
                a: ({ href, ...props }) => (
                  <Link
                    href={href || "#"}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                    {...props}
                  />
                ),
                code: ({ ...props }) => (
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono" {...props} />
                ),
                blockquote: ({ ...props }) => (
                  <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400 my-4" {...props} />
                ),
                hr: () => (
                  <hr className="my-8 border-gray-300 dark:border-gray-700" />
                ),
              }}
            >
              {pillarContent}
            </ReactMarkdown>
          </article>

          {/* Footer: Back to Organizations */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Looking for other organizations?
            </p>
            <Link
              href="/organizations"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              ← Back to All Organizations
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
