/**
 * Conservative publication guard for a known cross-entity source-origin pattern.
 *
 * If the source-captured institution has a distinctive token in the Recruitment
 * title but none in the linked Organisation name, the Organisation relationship
 * is treated as unresolved for public attribution/indexing until reviewed.
 *
 * This is a safety signal only: it must never rewrite organisation IDs, merge
 * entities or change canonical URLs.
 */
const GENERIC_INSTITUTION_TOKENS = new Set([
  "indian", "india", "institute", "institutes", "of", "the", "and", "for",
  "department", "government", "recruitment", "jobs", "job", "board",
  "commission", "authority", "centre", "center", "one", "stop", "other",
  "post", "posts", "limited", "ltd", "company", "corporation", "national",
  "university", "college", "school", "medical", "sciences", "science",
  "technology", "public", "service", "services", "assistant", "reader",
  "professor", "inspector", "registrar", "direct", "aiims", "nlu", "iit", "iiit",
]);

function distinctiveTokens(value: string): Set<string> {
  const tokens = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !GENERIC_INSTITUTION_TOKENS.has(token))
    .map((token) => token.endsWith("s") ? token.slice(0, -1) : token);

  return new Set(tokens);
}

function overlaps(left: Set<string>, right: Set<string>): boolean {
  for (const token of left) {
    if (right.has(token)) return true;
  }
  return false;
}

export function hasHighConfidenceIssuerOrganizationMismatch(input: {
  source: string | null | undefined;
  institutionName: string | null | undefined;
  recruitmentName: string | null | undefined;
  organizationName: string | null | undefined;
}): boolean {
  if (input.source !== "institutional_aggregation") return false;
  if (!input.institutionName || !input.recruitmentName || !input.organizationName) return false;

  const issuerTokens = distinctiveTokens(input.institutionName);
  if (issuerTokens.size === 0) return false;

  const recruitmentTokens = distinctiveTokens(input.recruitmentName);
  const organizationTokens = distinctiveTokens(input.organizationName);

  const issuerMatchesRecruitment = overlaps(issuerTokens, recruitmentTokens);
  const issuerMatchesOrganization = overlaps(issuerTokens, organizationTokens);

  return issuerMatchesRecruitment && !issuerMatchesOrganization;
}
