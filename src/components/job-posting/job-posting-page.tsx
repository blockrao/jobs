/**
 * Job Posting Page Component
 *
 * Main component for rendering a complete enriched job posting.
 * Displays all sections with data from posts + post_enrichments.
 * Includes recruitment context for single-job recruitments.
 */

import Link from "next/link";
import { JobPostingData } from "@/types/job-posting";
import JobPostingHeader from "./sections/job-posting-header";
import QuickFacts from "./sections/quick-facts";
import VacancyDetails from "./sections/vacancy-details";
import EligibilityCriteria from "./sections/eligibility-criteria";
import SalaryCompensation from "./sections/salary-compensation";
import ImportantDates from "./sections/important-dates";
import SelectionProcess from "./sections/selection-process";
import ApplicationFee from "./sections/application-fee";
import HowToApply from "./sections/how-to-apply";
import DocumentsRequired from "./sections/documents-required";
import DutiesResponsibilities from "./sections/duties-responsibilities";
import OfficialSourceVerification from "./sections/official-source-verification";
import styles from "./job-posting-page.module.css";

interface RecruitmentData {
  recruitment: any;
  posts: any[];
  totalPosts: number;
  isSingleJobRecruitment: boolean;
}

export interface ResolvedLeafFacts {
  vacancyCount: number | null;
  salary: { min: number; max: number; currency: string; period: string } | null;
  deadline: { date: Date | null; state: "OPEN" | "CLOSED" | "UNKNOWN" };
}

/** Recruitment-owned facts resolved from the canonical Recruitment entity.
 *  Passed to the Leaf so it can display Recruitment-context CTAs without
 *  reading Recruitment columns directly. Entity authority remains with Recruitment.
 */
export interface ResolvedRecruitmentFacts {
  officialSource: string | null;
  applicationUrl: string | null;
  employer: string | null;
  selectionProcess: string | null;
}

interface JobPostingPageProps {
  post: JobPostingData;
  recruitment?: RecruitmentData | null;
  isSingleJobRecruitment?: boolean;
  locale?: string;
  resolvedFacts?: ResolvedLeafFacts;
  recruitmentResolvedFacts?: ResolvedRecruitmentFacts | null;
}

export default function JobPostingPage({
  post,
  recruitment,
  isSingleJobRecruitment = false,
  locale = "en",
  resolvedFacts,
  recruitmentResolvedFacts,
}: JobPostingPageProps) {
  // Preserve the locale prefix for all internal links. Hindi pages are currently
  // untranslated/noindex, but navigation must remain within the requested route family.
  const localePrefix = locale === "hi" ? "/hi" : "";

  // Get sibling posts for multi-post recruitments
  const siblingPosts = recruitment?.posts?.filter(p => p.id !== post.id) || [];

  return (
    <div className={styles.container}>
        {/* Breadcrumb: Jobs › Org › Recruitment › Post */}
        <div className={styles.breadcrumb}>
          <Link href={`${localePrefix}/jobs`}>Jobs</Link>
          <span>›</span>
          {recruitment?.recruitment?.organizationSlug && post.organizationName && (
            <>
              <Link href={`${localePrefix}/organizations/${recruitment.recruitment.organizationSlug}`}>{post.organizationName}</Link>
              <span>›</span>
            </>
          )}
          {post.recruitmentSlug && (
            <>
              <Link href={`${localePrefix}/jobs/${post.recruitmentSlug}`}>
                {post.recruitmentName ?? recruitment?.recruitment?.name ?? "Recruitment"}
              </Link>
              <span>›</span>
            </>
          )}
          <span>{post.title}</span>
        </div>

        {/* Header */}
        <JobPostingHeader post={post} resolvedFacts={resolvedFacts} />

        {/* Quick Facts */}
        <QuickFacts post={post} resolvedFacts={resolvedFacts} />

        {/* Extracted facts are useful to candidates, but must never be confused
            with official verification. This provenance notice is shared by all
            pages backed by the source-inventory projection. */}
        {post.fjaExtract && post.fjaExtract.verificationStatus !== "VERIFIED" && (
          <aside
            role="note"
            aria-label="Verification notice"
            style={{
              margin: "0 0 24px",
              padding: "16px 18px",
              border: "1px solid #f3d28b",
              borderRadius: "10px",
              background: "#fffbeb",
              color: "#78350f",
            }}
          >
            <strong>Official verification pending</strong>
            <p style={{ margin: "6px 0 0", lineHeight: 1.55 }}>
              Some details on this page were transcribed from a secondary listing and have
              not yet been confirmed against the institution&apos;s official notice. Treat
              reported dates, eligibility, pay, tenure and application instructions as
              provisional. Confirm them with the official recruitment source before acting.
            </p>
          </aside>
        )}

        {/* Action Buttons
          Recruitment owns application and official-notification URLs. Only
          resolver-approved URLs may be exposed publicly; raw Post columns are
          not a safe fallback because they may contain unverified discovery links.
          If no approved URL resolves, omit that action rather than mislabel it.
        */}
        {(() => {
          const applyUrl = recruitmentResolvedFacts?.applicationUrl ?? null;
          const sourceUrl = recruitmentResolvedFacts?.officialSource ?? null;
          return (
            <div className={styles.actions}>
              {applyUrl && (
                <a
                  href={applyUrl}
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ↗ Apply on Official Portal
                </a>
              )}
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📄 View Official Recruitment Source
                </a>
              )}
            </div>
          );
        })()}

        {/* Sections */}
        <VacancyDetails post={post} resolvedFacts={resolvedFacts} />
        <EligibilityCriteria post={post} />
        <SalaryCompensation post={post} resolvedFacts={resolvedFacts} />
        <ImportantDates post={post} />
        <SelectionProcess post={post} recruitmentResolvedFacts={recruitmentResolvedFacts} />
        <ApplicationFee post={post} />
        <HowToApply post={post} recruitmentResolvedFacts={recruitmentResolvedFacts} />
        <DocumentsRequired post={post} />
        <DutiesResponsibilities post={post} />
        <OfficialSourceVerification post={post} recruitmentResolvedFacts={recruitmentResolvedFacts} />

        {/* Related Roles Section - For multi-post recruitments */}
        {siblingPosts.length > 0 && (
          <section className={styles.relatedRoles}>
            <h2>Other Roles in This Recruitment</h2>
            <p className={styles.relatedRolesIntro}>
              Explore the other roles available under this recruitment.
            </p>
            <ul className={styles.relatedRolesList}>
              {siblingPosts.map((p) => (
                <li key={p.id}>
                  <Link href={`${localePrefix}/jobs/${post.recruitmentSlug}/${p.slug}`}>
                    <span className={styles.roleTitle}>{p.title}</span>
                    {p.vacancies?.[0]?.count && (
                      <span className={styles.roleVacancies}>
                        {p.vacancies[0].count} position{p.vacancies[0].count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Recruitment Hub Link - For single-job recruitments */}
        {isSingleJobRecruitment && (
          <section className={styles.recruitmentContext}>
            <h2>About This Recruitment</h2>
            <p>
              For recruitment-wide details, timeline, and related information,
              visit the{" "}
              <Link href={`${localePrefix}/jobs/${post.recruitmentSlug}`}>recruitment hub</Link>.
            </p>
          </section>
        )}

        {/* Footer Note */}
        <div className={styles.footerNote}>
          <strong>About This Posting:</strong> JobOye organizes available
          information about this role to help candidates review it more easily.
          Details can be incomplete or change over time. For application-critical
          information, consult the official notification and the responsible
          organization&apos;s website. JobOye is not affiliated with {post.organizationName} and does not handle applications directly
          — follow the application method specified in the official recruitment instructions.
        </div>
      </div>
  );
}
