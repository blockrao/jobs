/**
 * Official Resources Links Component
 *
 * Displays table of official links from enrichment data and post fields.
 * Includes: notification PDF, application portal, organization website, etc.
 */

import { JobPostingData } from "@/types/job-posting";
import { ResolvedRecruitmentFacts } from "../job-posting-page";
import styles from "./official-resources-links.module.css";

interface OfficialResourcesLinksProps {
  post: JobPostingData;
  recruitmentResolvedFacts?: ResolvedRecruitmentFacts | null;
  embedded?: boolean;
}

interface ResourceLink {
  title: string;
  url: string;
  description: string;
  icon: string;
}

export default function OfficialResourcesLinks({
  post,
  recruitmentResolvedFacts,
  embedded = false,
}: OfficialResourcesLinksProps) {
  const resources: ResourceLink[] = [];

  // 1. Official Notification PDF
  if (post.officialSourceUrl) {
    resources.push({
      title: "Official Notification",
      url: post.officialSourceUrl,
      description: "PDF of the official recruitment notification",
      icon: "📄",
    });
  }

  // 2. Application Portal
  const appUrl = recruitmentResolvedFacts?.applicationUrl || post.applicationUrl;
  if (appUrl) {
    resources.push({
      title: "Application Portal",
      url: appUrl,
      description: "Submit your application here",
      icon: "🌐",
    });
  }

  // 3. Additional links from enrichment (if available)
  // Note: officialLinks property availability depends on enrichment schema
  if (post.enrichment && typeof post.enrichment === 'object') {
    const enrichment = post.enrichment as Record<string, any>;
    if (enrichment.officialLinks && Array.isArray(enrichment.officialLinks)) {
      enrichment.officialLinks.forEach((link: any) => {
        if (link?.url) {
          resources.push({
            title: link.title || "Official Link",
            url: link.url,
            description: link.description || "Related official resource",
            icon: "🔗",
          });
        }
      });
    }
  }

  if (resources.length === 0) {
    return null;
  }

  return (
    <section className={styles.officialResourcesSection}>
      <div className={styles.header}>
        <h2 className={styles.title}>Official Resources</h2>
        <p className={styles.subtitle}>Links to official documents and application platforms</p>
      </div>

      <div className={styles.resourcesTable}>
        {resources.map((resource, idx) => (
          <a
            key={idx}
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.resourceRow}
          >
            <div className={styles.resourceIcon}>{resource.icon}</div>
            <div className={styles.resourceContent}>
              <div className={styles.resourceTitle}>{resource.title}</div>
              <div className={styles.resourceDescription}>{resource.description}</div>
              <div className={styles.resourceUrl}>{new URL(resource.url).hostname}</div>
            </div>
            <div className={styles.resourceArrow}>→</div>
          </a>
        ))}
      </div>

      <div className={styles.note}>
        <strong>Note:</strong> All links open in a new window. Always verify official documents before submitting your application.
      </div>
    </section>
  );
}
