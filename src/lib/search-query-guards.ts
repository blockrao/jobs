export interface HindiSearchConstraintInput {
  query: string;
  examsCount: number;
  statesCount: number;
  qualificationsCount: number;
  hasExplicitFilter: boolean;
}

/**
 * A non-empty Hindi/Hinglish query must resolve to at least one supported
 * constraint. Otherwise returning the entire open inventory would be a false
 * relevance claim.
 */
export function hasHindiSearchConstraints(input: HindiSearchConstraintInput): boolean {
  return !input.query.trim() ||
    input.examsCount > 0 ||
    input.statesCount > 0 ||
    input.qualificationsCount > 0 ||
    input.hasExplicitFilter;
}
