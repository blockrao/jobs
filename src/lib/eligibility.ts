/**
 * Structured eligibility evaluation engine.
 *
 * Takes an EligibilityRules tree (from extraContent.eligibilityRules) and a
 * user profile, and returns a verdict with a human-readable reason for each
 * leaf node.
 *
 * This is a pure function — no DB access, no side effects.
 * Used by both the server action (API route) and the client UI component.
 */

import type {
  EligibilityNode,
  EligibilityLeaf,
  EligibilityRules,
} from "@/db/schema";

// ── User profile ─────────────────────────────────────────────────────────────

export type UserProfile = {
  /** Date of birth as ISO date string, e.g. "1990-04-15". */
  dob: string;
  /** Category code: "UR" | "EWS" | "OBC" | "SC" | "ST" */
  category: "UR" | "EWS" | "OBC" | "SC" | "ST";
  /** Whether the candidate has a PwBD certificate. */
  isPwbd?: boolean;
  /** Whether the candidate is a woman. */
  isWoman?: boolean;
  /** Whether the candidate is an ex-serviceman. */
  isExServiceman?: boolean;
  /** Whether the candidate is a Central Government employee (3+ yrs continuous service). */
  isCentralGovtEmployee?: boolean;
  /** Qualifications held — e.g. ["LLB", "LLM"] */
  qualifications: string[];
  /**
   * Experience entries. Each entry names a type (matching the values used in
   * the rule tree) and duration in months.
   */
  experience: {
    type: string;   // e.g. "state_judicial", "law_teaching_or_research"
    months: number;
  }[];
  /** Whether the candidate is a practising advocate / pleader. */
  isPractitioner?: boolean;
  /** Whether the candidate is an attorney of the High Court of Bombay or Calcutta. */
  isHighCourtAttorney?: boolean;
  /** Practitioner experience in months (advocate / pleader). */
  practitionerMonths?: number;
  /** Attorney experience in months (High Court of Bombay or Calcutta). */
  attorneyMonths?: number;
  /**
   * Combined attorney + advocate experience in months.
   * Counted when the candidate has both and the rule allows combining them.
   */
  combinedPractitionerMonths?: number;
};

// ── Evaluation result ─────────────────────────────────────────────────────────

export type LeafResult = {
  /** The rule that was evaluated. */
  node: EligibilityLeaf;
  /** Whether this leaf is satisfied. */
  satisfied: boolean;
  /** Human-readable reason. */
  reason: string;
};

export type EvalResult = {
  /** Top-level verdict. */
  eligible: boolean;
  /**
   * Age verdict (computed separately from the rule tree because age caps
   * depend on category + PwBD + ex-serviceman and are stored in ageCap /
   * ageCapOverall, not in the rule tree itself).
   */
  ageOk: boolean;
  /** Age cap that applied, in years. */
  ageCap?: number;
  /** The candidate's age on the as_on date. */
  ageOnDate?: number;
  /** Leaf-level breakdown for display in the UI. */
  leaves: LeafResult[];
  /** Top-level human-readable summary. */
  summary: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function ageOnDate(dob: string, asOn: Date): number {
  const birth = new Date(dob);
  let age = asOn.getFullYear() - birth.getFullYear();
  const m = asOn.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && asOn.getDate() < birth.getDate())) age--;
  return age;
}

function experienceMonths(profile: UserProfile, type: string): number {
  return profile.experience
    .filter((e) => e.type === type)
    .reduce((sum, e) => sum + e.months, 0);
}

function hasQualification(profile: UserProfile, qual: string): boolean {
  const q = qual.toUpperCase();
  return profile.qualifications.some((pq) => pq.toUpperCase() === q);
}

// ── Leaf evaluation ───────────────────────────────────────────────────────────

function evalLeaf(leaf: EligibilityLeaf, profile: UserProfile): LeafResult {
  if ("qualification" in leaf) {
    const ok = hasQualification(profile, leaf.qualification);
    return {
      node: leaf,
      satisfied: ok,
      reason: ok
        ? `Holds ${leaf.qualification}`
        : `${leaf.qualification} degree required`,
    };
  }

  if ("service" in leaf) {
    const months = experienceMonths(profile, leaf.service);
    const needed = leaf.min_years * 12;
    const ok = months >= needed;
    const label = leaf.service.replace(/_/g, " ");
    return {
      node: leaf,
      satisfied: ok,
      reason: ok
        ? `${Math.floor(months / 12)} yr${Math.floor(months / 12) !== 1 ? "s" : ""} in ${label} (need ${leaf.min_years})`
        : `Need ${leaf.min_years} yrs in ${label}; have ${Math.floor(months / 12)} yr${Math.floor(months / 12) !== 1 ? "s" : ""}`,
    };
  }

  if ("experience" in leaf) {
    const months = experienceMonths(profile, leaf.experience);
    const needed = leaf.min_years * 12;
    const ok = months >= needed;
    const label = leaf.experience.replace(/_/g, " ");
    return {
      node: leaf,
      satisfied: ok,
      reason: ok
        ? `${Math.floor(months / 12)} yr${Math.floor(months / 12) !== 1 ? "s" : ""} in ${label} (need ${leaf.min_years})`
        : `Need ${leaf.min_years} yrs in ${label}; have ${Math.floor(months / 12)} yr${Math.floor(months / 12) !== 1 ? "s" : ""}`,
    };
  }

  if ("practitioner" in leaf) {
    const advocateOk = leaf.min_years_advocate !== undefined
      ? (profile.practitionerMonths ?? 0) >= leaf.min_years_advocate * 12
      : false;
    const attorneyOk = leaf.min_years_attorney !== undefined
      ? (profile.attorneyMonths ?? 0) >= leaf.min_years_attorney * 12
      : false;
    const combinedOk = leaf.combined_min_years !== undefined
      ? (profile.combinedPractitionerMonths ?? 0) >= leaf.combined_min_years * 12
      : false;
    const ageOk = leaf.min_age !== undefined
      ? true  // age is checked separately against ageCap; here just note requirement
      : true;

    const satisfied = ageOk && (advocateOk || attorneyOk || combinedOk);
    const parts: string[] = [];
    if (leaf.min_years_advocate) parts.push(`${leaf.min_years_advocate} yrs advocate`);
    if (leaf.min_years_attorney) parts.push(`${leaf.min_years_attorney} yrs HC attorney`);
    if (leaf.combined_min_years) parts.push(`${leaf.combined_min_years} yrs combined`);
    if (leaf.min_age) parts.push(`age ≥ ${leaf.min_age}`);

    return {
      node: leaf,
      satisfied,
      reason: satisfied
        ? "Practitioner requirement satisfied"
        : `Practising lawyer: need ${parts.join(" / ")}`,
    };
  }

  // Should not reach here if types are correct, but guard anyway
  return { node: leaf as EligibilityLeaf, satisfied: false, reason: "Unknown rule" };
}

// ── Tree evaluation ───────────────────────────────────────────────────────────

function collectLeaves(
  node: EligibilityNode,
  profile: UserProfile,
  leaves: LeafResult[],
): boolean {
  if ("all" in node) {
    let allOk = true;
    for (const child of node.all) {
      const ok = collectLeaves(child, profile, leaves);
      if (!ok) allOk = false;
    }
    return allOk;
  }

  if ("any" in node) {
    let anyOk = false;
    const branchLeaves: LeafResult[] = [];
    for (const child of node.any) {
      const childLeaves: LeafResult[] = [];
      const ok = collectLeaves(child, profile, childLeaves);
      if (ok) {
        // Only keep the satisfied branch's leaves
        anyOk = true;
        leaves.push(...childLeaves);
        return true;
      }
      branchLeaves.push(...childLeaves);
    }
    // No branch satisfied — add all branch leaves so the user sees what failed
    leaves.push(...branchLeaves);
    return false;
  }

  // Leaf
  const result = evalLeaf(node as EligibilityLeaf, profile);
  leaves.push(result);
  return result.satisfied;
}

// ── Age evaluation ────────────────────────────────────────────────────────────

function evalAge(
  rules: EligibilityRules,
  profile: UserProfile,
  asOnDate: Date,
): { ageOk: boolean; ageCap?: number; ageOnDate?: number } {
  if (!rules.ageCap && !rules.ageCapOverall) {
    return { ageOk: true };
  }

  const age = ageOnDate(profile.dob, asOnDate);

  // Determine the applicable cap for this candidate's category + PwBD
  let cap: number | undefined;

  if (rules.ageCap) {
    const key = profile.category;
    if (profile.isPwbd) {
      // PwBD key convention: "<category>_pwbd" or "pwbd"
      cap = rules.ageCap[`${key}_pwbd`] ?? rules.ageCap["pwbd"] ?? rules.ageCap[key];
    } else {
      cap = rules.ageCap[key];
    }
  }

  // Override with ex-serviceman / central-govt relaxation if higher
  // (These are common government-wide relaxations — 5 yrs for ex-SM, etc.)
  if (profile.isExServiceman && rules.ageCap) {
    const exsmKey = `${profile.category}_exsm`;
    const exsmCap = rules.ageCap[exsmKey] ?? rules.ageCap["exsm"];
    if (exsmCap && (!cap || exsmCap > cap)) cap = exsmCap;
  }

  // Apply overall cap
  if (rules.ageCapOverall && cap && cap > rules.ageCapOverall) {
    cap = rules.ageCapOverall;
  }

  if (cap === undefined) {
    return { ageOk: true, ageOnDate: age };
  }

  return { ageOk: age <= cap, ageCap: cap, ageOnDate: age };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Evaluate whether a candidate profile satisfies an EligibilityRules tree.
 *
 * @param rules   The EligibilityRules from extraContent.eligibilityRules.
 * @param profile The candidate's profile.
 * @param closingDate ISO date string for the closing date of the post.
 *                    Used when rules.as_on === "closing_date".
 */
export function evalEligibility(
  rules: EligibilityRules,
  profile: UserProfile,
  closingDate: string,
): EvalResult {
  const asOnDate = rules.as_on === "closing_date"
    ? new Date(closingDate)
    : new Date(rules.as_on);

  const leaves: LeafResult[] = [];
  const qualificationOk = collectLeaves(rules.rules, profile, leaves);
  const { ageOk, ageCap, ageOnDate: age } = evalAge(rules, profile, asOnDate);

  const eligible = qualificationOk && ageOk;

  let summary: string;
  if (eligible) {
    summary = `Eligible${ageCap ? ` · Age ${age} is within the ${ageCap}-year cap for ${profile.category}${profile.isPwbd ? " (PwBD)" : ""}` : ""}`;
  } else {
    const ageReason = !ageOk
      ? `Age ${age} exceeds the ${ageCap}-year cap for ${profile.category}${profile.isPwbd ? " (PwBD)" : ""}`
      : null;
    const qualReason = !qualificationOk
      ? "One or more eligibility requirements not met (see details below)"
      : null;
    summary = [ageReason, qualReason].filter(Boolean).join(" · ");
  }

  return { eligible, ageOk, ageCap, ageOnDate: age, leaves, summary };
}
