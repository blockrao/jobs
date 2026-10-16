/**
 * How to Apply Section
 *
 * REFACTORED (Phase 2): Changed from info-group layout → numbered steps timeline
 *
 * Displays step-by-step application instructions in a visual numbered timeline.
 * Uses posts table fields (applicationMethod, applicationChecklist, applicationEmail,
 * contactDepartment, contactPerson) plus recruitmentResolvedFacts for the apply URL.
 * Enrichment data (howToApply.steps) takes priority for detailed step information.
 */

import { JobPostingData } from "@/types/job-posting";
import { ResolvedRecruitmentFacts } from "../job-posting-page";
import styles from "../job-posting-page.module.css";
import stepsStyles from "./how-to-apply.module.css";

interface HowToApplyProps {
  post: JobPostingData;
  recruitmentResolvedFacts?: ResolvedRecruitmentFacts | null;
  embedded?: boolean;
}

export default function HowToApply({ post, recruitmentResolvedFacts, embedded }: HowToApplyProps) {
  const applyPortalUrl = recruitmentResolvedFacts?.applicationUrl ?? null;

  // Check if application facts are unverified from source extraction
  const sourceFactsUnverified = Boolean(
    post.fjaExtract && post.fjaExtract.verificationStatus !== "VERIFIED"
  );

  // Posts table application fields
  const applicationMethod = post.applicationMethod ?? null;
  const applicationEmail = post.applicationEmail ?? null;
  const applicationUrl = post.applicationUrl ?? null;
  const contactDepartment = post.contactDepartment ?? null;
  const contactPerson = post.contactPerson ?? null;
  const applicationChecklist = post.applicationChecklist ?? null;

  // FJA Enrichment: detailed how-to-apply with steps
  const enrichmentHowToApply = post.enrichment?.howToApply ?
    (post.enrichment.howToApply as {
      method?: string;
      steps?: string[];
      address?: string;
    })
    : null;

  // Extracted modes from fjaExtract as last resort
  const extractedApplicationModes = Array.isArray(post.fjaExtract?.applicationSelectionRaw)
    ? post.fjaExtract!.applicationSelectionRaw
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        .map((item) => typeof item.application_mode === "string" ? item.application_mode : null)
        .filter((item): item is string => Boolean(item))
    : [];

  const hasApplyUrl = Boolean(applyPortalUrl || applicationUrl);
  const effectiveApplyUrl = applyPortalUrl ?? applicationUrl;

  // Build application steps array
  const steps: Array<{
    title: string;
    description: string;
    icon: string;
    action?: { label: string; url: string };
  }> = [];

  if (enrichmentHowToApply?.steps && enrichmentHowToApply.steps.length > 0) {
    // Use enrichment steps directly
    enrichmentHowToApply.steps.forEach((step, idx) => {
      const title = typeof step === "string" ? step.split("\n")[0] : step;
      steps.push({
        title,
        description: typeof step === "string" ? step : "",
        icon: getStepIcon(idx),
        // Add action buttons for key steps
        action: getStepAction(title, effectiveApplyUrl),
      });
    });
  } else if (applicationChecklist && applicationChecklist.length > 0) {
    // Fallback to application checklist
    applicationChecklist.forEach((step, idx) => {
      steps.push({
        title: step,
        description: "",
        icon: getStepIcon(idx),
        // Add action buttons for key steps
        action: getStepAction(step, effectiveApplyUrl),
      });
    });
  } else {
    // Default generic steps
    steps.push(
      { title: "Register on Portal", description: "Create an account on the official application website", icon: "📝" },
      { title: "Fill Basic Details", description: "Enter your personal information, email, phone, and education details", icon: "📋" },
      { title: "Upload Documents", description: "Upload scanned copies of certificates and required documents", icon: "📎" },
      { title: "Review & Confirm", description: "Check all details carefully before final submission", icon: "✓" },
      { title: "Submit Application", description: "Submit your application before the deadline", icon: "🎯" },
      { title: "Save Confirmation", description: "Download and save your confirmation number for reference", icon: "💾" }
    );
  }

  return (
    <div className={embedded ? undefined : styles.section}>
      {!embedded && <h2 className={styles.sectionTitle}>How to Apply</h2>}

      {/* Numbered Steps Timeline */}
      <div className={stepsStyles.stepsContainer}>
        {steps.map((step, idx) => (
          <div key={idx} className={stepsStyles.step}>
            {/* Step Connector */}
            {idx < steps.length - 1 && <div className={stepsStyles.connector} />}

            {/* Step Badge */}
            <div className={stepsStyles.stepBadge}>
              <div className={stepsStyles.stepNumber}>{idx + 1}</div>
            </div>

            {/* Step Content */}
            <div className={stepsStyles.stepContent}>
              <div className={stepsStyles.stepTitle}>{step.title}</div>
              {step.description && (
                <div className={stepsStyles.stepDescription}>{step.description}</div>
              )}
              {/* Phase 2: Action Button for interactive steps */}
              {step.action && (
                <a
                  href={step.action.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.applyStepAction}
                >
                  {step.action.label} →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Application Portal Link - Prominent CTA */}
      <div className={stepsStyles.ctaSection}>
        <div className={stepsStyles.ctaLabel}>Ready to Apply?</div>
        {effectiveApplyUrl ? (
          <a
            href={effectiveApplyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={stepsStyles.ctaButton}
          >
            Open Application Portal →
          </a>
        ) : (
          <div className={stepsStyles.ctaFallback}>
            Application link is not available. Check the official notification for instructions.
          </div>
        )}
      </div>

      {/* Additional Contact Info */}
      {(applicationEmail || contactPerson || contactDepartment || enrichmentHowToApply?.address) && (
        <div className={stepsStyles.contactInfo}>
          <div className={stepsStyles.contactLabel}>Need Help?</div>
          {applicationEmail && (
            <div className={stepsStyles.contactItem}>
              <strong>Email:</strong>{" "}
              <a href={`mailto:${applicationEmail}`}>{applicationEmail}</a>
            </div>
          )}
          {contactPerson && (
            <div className={stepsStyles.contactItem}>
              <strong>Contact:</strong> {contactPerson}
            </div>
          )}
          {contactDepartment && (
            <div className={stepsStyles.contactItem}>
              <strong>Department:</strong> {contactDepartment}
            </div>
          )}
          {enrichmentHowToApply?.address && (
            <div className={stepsStyles.contactItem}>
              <strong>Address:</strong> {enrichmentHowToApply.address}
            </div>
          )}
        </div>
      )}

      {/* Important Notice */}
      <div className={stepsStyles.importantNotice}>
        <strong>⚠️ Important:</strong> JobOye does not process applications. Confirm all requirements,
        account setup, documents, and deadlines with the official notice and portal before applying.
      </div>
    </div>
  );
}

/**
 * HELPER: Get icon for step based on index
 */
function getStepIcon(index: number): string {
  const icons = ["📝", "📋", "📎", "✓", "🎯", "💾", "🔔"];
  return icons[index % icons.length];
}

function getStepAction(
  stepTitle: string,
  applyUrl: string | null
): { label: string; url: string } | undefined {
  const title = stepTitle.toLowerCase();

  // Match step titles and provide action buttons
  if (
    title.includes("register") ||
    title.includes("sign up") ||
    title.includes("create account")
  ) {
    return applyUrl ? { label: "Register Now", url: applyUrl } : undefined;
  }

  if (title.includes("fill") || title.includes("form") || title.includes("details")) {
    return applyUrl ? { label: "Start Application", url: applyUrl } : undefined;
  }

  if (title.includes("upload") || title.includes("document") || title.includes("submit")) {
    return applyUrl ? { label: "Submit Application", url: applyUrl } : undefined;
  }

  if (
    title.includes("apply") ||
    title.includes("application") ||
    title.includes("portal")
  ) {
    return applyUrl ? { label: "Open Portal", url: applyUrl } : undefined;
  }

  return undefined;
}
