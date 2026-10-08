/**
 * Job Posting Page Component
 *
 * Main component for rendering a complete enriched job posting.
 * Displays all sections with data from posts + post_enrichments.
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

interface JobPostingPageProps {
  post: JobPostingData;
}

export default function JobPostingPage({ post }: JobPostingPageProps) {
  return (
    <>
      {/* Structured Data */}
      <JobPostingStructuredData post={post} />

      <div className={styles.container}>
        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <a href="/jobs">Jobs</a>
          <span>›</span>
          <a href="/exams">Exams</a>
          <span>›</span>
          <a href={`/exams/${post.examTypeSlug}`}>{post.examType}</a>
          <span>›</span>
          <a href={`/exams/${post.examTypeSlug}/${post.recruitmentSlug}`}>
            {post.recruitmentName}
          </a>
          <span>›</span>
          <span>{post.title}</span>
        </div>

        {/* Header */}
        <JobPostingHeader post={post} />

        {/* Quick Facts */}
        <QuickFacts post={post} />

        {/* Action Buttons */}
        <div className={styles.actions}>
          <a
            href={post.applyPortalUrl || "#"}
            className={`${styles.btn} ${styles.btnPrimary}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            ↗ Apply on Official Portal
          </a>
          {post.officialSourceUrl && (
            <a
              href={post.officialSourceUrl}
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

        {/* Sections */}
        <VacancyDetails post={post} />
        <EligibilityCriteria post={post} />
        <SalaryCompensation post={post} />
        <ImportantDates post={post} />
        <SelectionProcess post={post} />
        <ApplicationFee post={post} />
        <HowToApply post={post} />
        <DocumentsRequired post={post} />
        <DutiesResponsibilities post={post} />
        <OfficialSourceVerification post={post} />

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
