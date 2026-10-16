/**
 * Event Schema for Application Timeline
 *
 * Signals to search engines:
 * - Application window (start and end dates)
 * - Event status (upcoming, active, ended)
 * - Event location (online, offline, both)
 * - Attendance mode (online application)
 *
 * Impact: Enables "Application Deadline" in search results,
 * helps with calendar app integration, improves
 * freshness and relevance signals
 */

import { JobPostingData } from "@/types/job-posting";
import { SITE_URL } from "@/lib/site";

interface EventSchemaProps {
  post: JobPostingData;
}

export default function EventSchema({ post }: EventSchemaProps) {
  const postUrl = `${SITE_URL}/jobs/${post.recruitmentSlug}/${post.slug}`;
  const startDate = post.recruitmentApplicationStartDate
    ? new Date(post.recruitmentApplicationStartDate)
    : new Date();
  const endDate = post.recruitmentApplicationEndDate
    ? new Date(post.recruitmentApplicationEndDate)
    : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

  const eventStatus = getEventStatus(endDate);

  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${postUrl}#application-window`,

    // ===== EVENT BASICS =====
    name: `${post.title} - Application Window at ${post.organizationName}`,
    description: generateEventDescription(post, startDate, endDate),

    // ===== DATES & TIMES =====
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),

    // ===== EVENT STATUS =====
    // Critical for indicating if applications are open, closed, or upcoming
    eventStatus: eventStatus,

    // ===== LOCATION =====
    // Application is online
    location: {
      "@type": "VirtualLocation",
      url: post.organizationWebsite || `${SITE_URL}/jobs/${post.recruitmentSlug}/${post.slug}`,
      name: "Online Application Portal",
    },

    // If interviews are in-person, add physical location
    ...(post.locationCity && {
      eventAttendanceMode: "MixedEventAttendanceMode", // Both online and potentially in-person
    }),

    // ===== ORGANIZER =====
    organizer: {
      "@type": "Organization",
      name: post.organizationName,
      url: post.organizationWebsite || SITE_URL,
      email: post.organizationEmail || undefined,
      telephone: post.organizationPhone || undefined,
    },

    // ===== OFFERS / REGISTRATION =====
    // Job opening being offered
    offers: {
      "@type": "Offer",
      url: postUrl,
      price: "0",
      priceCurrency: "INR",
      availability: "InStock",
      availabilityStarts: startDate.toISOString(),
      availabilityEnds: endDate.toISOString(),
    },

    // ===== IMAGE (for rich snippets) =====
    image: `${SITE_URL}/images/og/job-posting-${post.id}.jpg`,

    // ===== URL REFERENCE =====
    url: postUrl,

    // ===== PERFORMER (Organization) =====
    performer: {
      "@type": "Organization",
      name: post.organizationName,
      url: post.organizationWebsite || SITE_URL,
    },

    // ===== KEYWORDS =====
    keywords: `${post.title}, ${post.organizationName}, government job, recruitment, application`,

    // ===== SUBEVENTS (If there are multiple stages) =====
    ...(post.enrichment?.selectionProcess && post.enrichment.selectionProcess.length > 0 && {
      subEvent: post.enrichment.selectionProcess.map((stage, index) => ({
        "@type": "Event",
        name: stage.name || `Selection Stage ${index + 1}`,
        description: stage.description || `${stage.name || "Stage"} of the selection process`,
        eventStatus: getStageEventStatus(stage, post),
        location: {
          "@type": stage.online ? "VirtualLocation" : "Place",
          ...(stage.online && { url: "Online" }),
          ...(post.locationCity && !stage.online && { addressLocality: post.locationCity }),
        },
      })),
    }),

    // ===== EXPECTED ATTENDANCE =====
    // Number of positions available
    expectedAttendeeCount: post.enrichment?.vacanciesByCategory
      ? Object.values(post.enrichment.vacanciesByCategory).reduce(
          (a: any, b: any) => (a as number) + (b as number),
          0
        )
      : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(eventSchema, null, 2),
      }}
    />
  );
}

/**
 * HELPER: Determine event status based on dates
 */
function getEventStatus(
  endDate: Date
): "EventScheduled" | "EventInProgress" | "EventPostponed" | "EventCancelled" {
  const now = new Date();

  if (endDate < now) {
    return "EventPostponed"; // Application period has ended
  }

  const daysTillEnd = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysTillEnd > 7) {
    return "EventScheduled"; // More than a week away
  } else {
    return "EventInProgress"; // Less than a week, applications active
  }
}

/**
 * HELPER: Determine stage event status
 */
function getStageEventStatus(
  stage: any,
  post: JobPostingData
): "EventScheduled" | "EventInProgress" | "EventPostponed" {
  if (!stage.estimatedDate) {
    return "EventScheduled";
  }

  const stageDate = new Date(stage.estimatedDate);
  const now = new Date();

  if (stageDate < now) {
    return "EventPostponed";
  }

  return "EventScheduled";
}

/**
 * HELPER: Generate compelling event description
 */
function generateEventDescription(
  post: JobPostingData,
  startDate: Date,
  endDate: Date
): string {
  const vacancies = post.enrichment?.vacanciesByCategory
    ? Object.values(post.enrichment.vacanciesByCategory).reduce(
        (a: any, b: any) => (a as number) + (b as number),
        0
      )
    : "Multiple";

  const startDateStr = startDate.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const endDateStr = endDate.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const qualification = post.enrichment?.education?.mandatory
    ? post.enrichment.education.mandatory[0]
    : "See notification";

  return (
    `Application window for ${post.title} position at ${post.organizationName}. ` +
    `${vacancies} vacancies available from ${startDateStr} to ${endDateStr}. ` +
    `Qualifications: ${qualification}. ` +
    `Apply online through the official portal. ` +
    `Selection through written examination, interview, and merit list. ` +
    `For ${post.locationCity}, ${post.locationState}.`
  );
}
