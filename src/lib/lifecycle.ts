/**
 * Recruitment lifecycle — the single definition of "live", "open" and "closed".
 *
 * Audit 2026-10-20 found `posts.isLive` hard-coded TRUE in the detail loader,
 * 1,334 "live" posts under CLOSED recruitments and 1,410 past their deadline.
 * The flag cannot be trusted, so every surface (listing, hub, leaf, sitemap,
 * JobPosting structured data) derives status from the canonical recruitment
 * record with this function and nothing else.
 *
 * Inputs are the recruitment's `status` enum and `application_end_date`.
 * Placeholder deadlines (year >= 2090) are treated as unknown, not as open.
 */

import { toPlausibleRecruitmentDate } from "@/lib/recruitment-dates";

export type LifecycleState = "upcoming" | "open" | "closed" | "results" | "archived";

export interface Lifecycle {
  state: LifecycleState;
  /** Applications can be submitted now (status ACTIVE and deadline not passed). */
  isOpen: boolean;
  /** The page describes a current recruitment (upcoming or open), not a historical one. */
  isLive: boolean;
  /** Deadline as a plausible Date, or null when unknown/placeholder. */
  deadline: Date | null;
  /** Whole days until the deadline (negative when passed); null when unknown. */
  daysLeft: number | null;
}

export function deriveLifecycle(
  status: string | null | undefined,
  applicationEndDate: Date | string | null | undefined,
  now: Date = new Date(),
): Lifecycle {
  const deadline = toPlausibleRecruitmentDate(applicationEndDate);
  const deadlinePassed = deadline ? deadline.getTime() < now.getTime() : false;
  const daysLeft = deadline
    ? Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000)
    : null;

  const s = (status ?? "").toUpperCase();
  let state: LifecycleState;
  if (s === "ARCHIVED") state = "archived";
  else if (s === "RESULTS") state = "results";
  else if (s === "CLOSED" || deadlinePassed) state = "closed";
  else if (s === "ACTIVE") state = "open";
  else if (s === "UPCOMING") state = "upcoming";
  else state = deadline ? "open" : "closed"; // unknown status: trust the deadline only

  return {
    state,
    isOpen: state === "open",
    isLive: state === "open" || state === "upcoming",
    deadline,
    daysLeft,
  };
}

/** Human label for a lifecycle state. */
export function lifecycleLabel(state: LifecycleState, hi = false): string {
  switch (state) {
    case "open": return hi ? "आवेदन खुले" : "Applications open";
    case "upcoming": return hi ? "अधिसूचना जारी" : "Notification out";
    case "closed": return hi ? "बंद" : "Closed";
    case "results": return hi ? "परिणाम" : "Results";
    case "archived": return hi ? "संग्रहित" : "Archived";
  }
}
