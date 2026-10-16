// @ts-nocheck
/**
 * Quick Facts Grid Component
 *
 * Displays 4 critical facts at a glance in card format:
 * 1. Salary (₹X - ₹Y / month)
 * 2. Vacancies (total count + categories)
 * 3. Application Deadline (with countdown)
 * 4. Exam Date (if available)
 *
 * Positioned: Right after hero section, before table of contents
 * Purpose: Immediate answer to key questions
 */

import { JobPostingData } from "@/types/job-posting";
import { ResolvedLeafFacts } from "../job-posting-page";
import styles from "./quick-facts-grid.module.css";

interface QuickFactsGridProps {
  post: JobPostingData;
  resolvedFacts?: ResolvedLeafFacts;
  embedded?: boolean;
}

export default function QuickFactsGrid({
  post,
  resolvedFacts,
  embedded = false,
}: QuickFactsGridProps) {
  // Extract salary
  const salary = extractSalary(post, resolvedFacts);

  // Extract vacancy count
  const vacancies = getVacancyCount(post, resolvedFacts);

  // Extract deadline
  const deadline = resolvedFacts?.deadline?.date
    ? new Date(resolvedFacts.deadline.date)
    : post.recruitmentApplicationEndDate
      ? new Date(post.recruitmentApplicationEndDate)
      : null;

  // Extract exam date (if available in enrichment)
  const examDate = post.enrichment?.selectionProcess?.[0]?.estimatedDate
    ? new Date(post.enrichment.selectionProcess[0].estimatedDate)
    : null;

  return (
    <div className={`${styles.grid} ${embedded ? styles.embedded : ""}`}>
      {/* Card 1: Salary */}
      <div className={styles.card}>
        <div className={styles.icon}>💰</div>
        <div className={styles.content}>
          <div className={styles.label}>Salary</div>
          <div className={styles.value}>{salary}</div>
          <div className={styles.subtext}>per month</div>
        </div>
      </div>

      {/* Card 2: Vacancies */}
      <div className={styles.card}>
        <div className={styles.icon}>👥</div>
        <div className={styles.content}>
          <div className={styles.label}>Vacancies</div>
          <div className={styles.value}>
            {vacancies.total}
          </div>
          <div className={styles.subtext}>
            {vacancies.hasCategories
              ? `SC ${vacancies.sc} · OBC ${vacancies.obc} · ST ${vacancies.st}`
              : "posts available"}
          </div>
        </div>
      </div>

      {/* Card 3: Deadline */}
      <div className={styles.card}>
        <div className={styles.icon}>📅</div>
        <div className={styles.content}>
          <div className={styles.label}>Last Date</div>
          <div className={styles.value}>
            {deadline ? formatDate(deadline) : "See notification"}
          </div>
          <div className={styles.subtext}>
            {deadline && getCountdownText(deadline)}
          </div>
        </div>
      </div>

      {/* Card 4: Exam Date (if available) */}
      {examDate && (
        <div className={styles.card}>
          <div className={styles.icon}>🎯</div>
          <div className={styles.content}>
            <div className={styles.label}>Exam Date</div>
            <div className={styles.value}>{formatDate(examDate)}</div>
            <div className={styles.subtext}>Written examination</div>
          </div>
        </div>
      )}

      {/* If no exam date, show application status */}
      {!examDate && (
        <div className={styles.card}>
          <div className={styles.icon}>
            {resolvedFacts?.deadline?.state === "CLOSED"
              ? "❌"
              : resolvedFacts?.deadline?.state === "OPEN"
                ? "✅"
                : "🔔"}
          </div>
          <div className={styles.content}>
            <div className={styles.label}>Status</div>
            <div className={styles.value}>
              {resolvedFacts?.deadline?.state === "CLOSED"
                ? "Closed"
                : resolvedFacts?.deadline?.state === "OPEN"
                  ? "Open"
                  : "Upcoming"}
            </div>
            <div className={styles.subtext}>
              {resolvedFacts?.deadline?.verificationStatus === "PENDING"
                ? "pending verification"
                : "verified"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * HELPER: Extract salary from various sources
 */
function extractSalary(
  post: JobPostingData,
  resolvedFacts?: ResolvedLeafFacts
): string {
  // 1. Try resolved salary
  if (resolvedFacts?.salary) {
    return `₹${resolvedFacts.salary.min.toLocaleString("en-IN")}-${resolvedFacts.salary.max.toLocaleString("en-IN")}`;
  }

  // 2. Try enrichment payLevel
  if (post.enrichment?.payLevel?.monthly) {
    return post.enrichment.payLevel.monthly;
  }

  // 3. Try legacy fields
  if (post.legacySalaryMin && post.legacySalaryMax) {
    return `₹${post.legacySalaryMin.toLocaleString("en-IN")}-${post.legacySalaryMax.toLocaleString("en-IN")}`;
  }

  // 4. Default
  return "As per norms";
}

/**
 * HELPER: Get vacancy count with category breakdown
 */
function getVacancyCount(
  post: JobPostingData,
  resolvedFacts?: ResolvedLeafFacts
): {
  total: number;
  hasCategories: boolean;
  sc: number;
  obc: number;
  st: number;
  general: number;
} {
  let total = 0;
  let sc = 0;
  let obc = 0;
  let st = 0;
  let general = 0;

  // Try resolved vacancies first
  if (resolvedFacts?.vacancyCount) {
    total = resolvedFacts.vacancyCount;
  }

  // Try enrichment categories
  if (post.enrichment?.vacanciesByCategory) {
    const cats = post.enrichment.vacanciesByCategory as Record<string, number>;
    sc = cats.SC || cats.sc || 0;
    obc = cats.OBC || cats.obc || 0;
    st = cats.ST || cats.st || 0;
    general = cats.General || cats.general || cats.GEN || cats.gen || 0;
    total = sc + obc + st + general;
  }

  // Try enrichment total
  if (!total && post.enrichment?.vacanciesTotal) {
    total = post.enrichment.vacanciesTotal;
  }

  return {
    total: total || 0,
    hasCategories: sc > 0 || obc > 0 || st > 0,
    sc,
    obc,
    st,
    general,
  };
}

/**
 * HELPER: Format date in Indian style
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * HELPER: Get countdown text for deadline
 */
function getCountdownText(deadline: Date): string {
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return "Application closed";
  } else if (diffDays === 1) {
    return "Last day today";
  } else if (diffDays <= 3) {
    return `${diffDays} days left`;
  } else if (diffDays <= 7) {
    return `${diffDays} days left`;
  } else {
    return `${Math.floor(diffDays / 7)} weeks left`;
  }
}
