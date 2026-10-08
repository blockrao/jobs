/**
 * Job Posting Page Component
 *
 * Main component for rendering a complete enriched job posting.
 * Displays all sections with data from posts + post_enrichments.
 * Includes recruitment context for single-job recruitments.
 */

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
import JobPostingStructuredData from "./structured-data/job-posting-schema";
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
  // For single-job recruitments, enrich post data from recruitment context
  const enrichedPost = isSingleJobRecruitment && recruitment?.recruitment
    ? {
        ...post,
        // Recruitment-level context can enhance single-job posting
        recruitmentContext: recruitment.recruitment,
      }
    : post;

  // Get sibling posts for multi-post recruitments
  const siblingPosts = recruitment?.posts?.filter(p => p.id !== post.id) || [];

  return (
    <>
      {/* Structured Data */}
      <JobPostingStructuredData post={post} />

      <div className={styles.container}>
        {/* Breadcrumb - Updated to link to recruitment hub */}
        <div className={styles.breadcrumb}>
          <a href="/jobs">Jobs</a>
          <span>›</span>
          {post.examTypeSlug && (
            <>
              <a href="/exams">Exams</a>
              <span>›</span>
              <a href={`/exams/${post.examTypeSlug}`}>{post.examType}</a>
              <span>›</span>
            </>
          )}
          {/* Direct link to recruitment hub instead of exams path */}
          <a href={`/jobs/${post.recruitmentSlug}`}>{post.recruitmentName}</a>
          <span>›</span>
          <span>{post.title}</span>
        </div>

        {/* Header */}
        <JobPostingHeader post={post} resolvedFacts={resolvedFacts} />

        {/* Quick Facts */}
        <QuickFacts post={post} resolvedFacts={resolvedFacts} />

        {/* Action Buttons
          CTA priority: use Recruitment-owned resolved URLs when available
          (canonical entity authority), fall through to raw post columns only
          as a last resort. Never show a "#" dead link for Apply.
        */}
        {(() => {
          const applyUrl = recruitmentResolvedFacts?.applicationUrl ?? post.applyPortalUrl ?? null;
          const sourceUrl = recruitmentResolvedFacts?.officialSource ?? post.officialSourceUrl ?? null;
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
                  📄 View Official Notification
                </a>
              )}
              <a href="#" className={`${styles.btn} ${styles.btnSecondary}`}>
                📤 Share
              </a>
            </div>
          );
        })()}

        {/* Sections */}
        <VacancyDetails post={post} resolvedFacts={resolvedFacts} />
        <EligibilityCriteria post={post} />
        <SalaryCompensation post={post} resolvedFacts={resolvedFacts} />
        <ImportantDates post={post} />
        <SelectionProcess post={post} />
        <ApplicationFee post={post} />
        <HowToApply post={post} />
        <DocumentsRequired post={post} />
        <DutiesResponsibilities post={post} />
        <OfficialSourceVerification post={post} />

        {/* Related Roles Section - For multi-post recruitments */}
        {siblingPosts.length > 0 && (
          <section className={styles.relatedRoles}>
            <h2>Other Roles in This Recruitment</h2>
            <p className={styles.relatedRolesIntro}>
              This recruitment has {recruitment?.totalPosts} open positions:
            </p>
            <ul className={styles.relatedRolesList}>
              {recruitment?.posts?.map((p) => (
                <li key={p.id}>
                  <a href={`/jobs/${post.recruitmentSlug}/${p.slug}`}>
                    <span className={styles.roleTitle}>{p.title}</span>
                    {p.vacancies?.[0]?.count && (
                      <span className={styles.roleVacancies}>
                        {p.vacancies[0].count} position{p.vacancies[0].count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </a>
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
              This is the sole position in{" "}
              <strong>{post.recruitmentName}</strong>. For additional details about
              the recruitment process, timeline, and FAQs, visit the{" "}
              <a href={`/jobs/${post.recruitmentSlug}`}>recruitment hub</a>.
            </p>
          </section>
        )}

        {/* Footer Note */}
        <div className={styles.footerNote}>
          <strong>About This Posting:</strong> This job posting is sourced from
          the official{" "}
          <strong>{post.organizationName}</strong> notification
          {post.enrichment?.notificationDate && (
            <>
              {" "}
              dated{" "}
              {new Date(post.enrichment.notificationDate).toLocaleDateString(
                "en-IN",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )}
            </>
          )}
          . Information has been verified and structured by JobOye for accuracy
          and completeness. For the most authoritative information, always refer
          to the official notification PDF and website. JobOye is not affiliated
          with {post.organizationName} and does not handle applications directly
          — all applications must be submitted through the official portal.
        </div>
      </div>
    </>
  );
}
