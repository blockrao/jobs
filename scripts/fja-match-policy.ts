/**
 * Conservative identity checks for read-only FJA reconciliation.
 * False negatives are intentionally preferred to cross-employer false positives.
 */
const normalize = (value: unknown): string => String(value ?? "")
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/&/g, " and ")
  .replace(/\bindian institute of information technology\b/g, " iiit information technology ")
  .replace(/\biiit\b/g, " iiit information technology ")
  .replace(/\bindian institute of technology\b/g, " iit technology ")
  .replace(/\biit\b/g, " iit technology ")
  .replace(/\ball india institute of medical sciences\b/g, " aiims medical sciences ")
  .replace(/\baiims\b/g, " aiims medical sciences ")
  .replace(/\bcentral marine fisheries research institute\b/g, " cmfri marine fisheries ")
  .replace(/\bcmfri\b/g, " cmfri marine fisheries ")
  .replace(/\bsree chitra tirunal institute for medical sciences and technology\b/g, " sctimst medical sciences technology ")
  .replace(/\bsctimst\b/g, " sctimst medical sciences technology ")
  .replace(/\b(recruitment|recruitments|notification|online form|offline form|apply online|application form|20\d{2})\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

const tokens = (value: unknown): Set<string> =>
  new Set(normalize(value).split(" ").filter(token => token.length > 1));

const ORGANIZATION_NOISE = new Set([
  "and", "of", "the", "for", "in", "at", "government", "govt", "department",
  "ministry", "organization", "organisation", "office", "board", "authority",
  "commission", "corporation", "company", "limited", "ltd", "public", "sector",
  "undertaking", "institute", "institutes", "institution", "institutions",
  "university", "universities", "college", "colleges", "school", "national",
  "central", "state", "india", "indian", "research", "centre", "center"
]);

const ROLE_NOISE = new Set([
  "recruitment", "vacancy", "vacancies", "post", "posts", "job", "jobs",
  "apply", "online", "offline", "notification", "walk", "in", "the", "for",
  "and", "of", "at", "on", "2024", "2025", "2026"
]);

export function organizationCompatible(source: unknown, candidate: unknown): boolean {
  const a = normalize(source), b = normalize(candidate);
  if (!a || !b) return false;
  // Exact normalized identity or exact distinctive-token identity only. No fuzzy employer matching.
  if (a === b) return tokens(a).size >= 2;
  const x = new Set([...tokens(a)].filter(t => !ORGANIZATION_NOISE.has(t)));
  const y = new Set([...tokens(b)].filter(t => !ORGANIZATION_NOISE.has(t)));
  if (x.size < 2 || y.size < 2 || x.size !== y.size) return false;
  return [...x].every(token => y.has(token));
}
export function roleSimilarity(a: unknown, b: unknown): number {
  const x = new Set([...tokens(a)].filter(t => !ROLE_NOISE.has(t) && !/^20\d{2}$/.test(t)));
  const y = new Set([...tokens(b)].filter(t => !ROLE_NOISE.has(t) && !/^20\d{2}$/.test(t)));
  if (!x.size || !y.size) return 0;
  let overlap = 0;
  for (const token of x) if (y.has(token)) overlap++;
  return (2 * overlap) / (x.size + y.size);
}

export function hasRoleGradeConflict(a: unknown, b: unknown): boolean {
  const grade = (value: unknown): string | null => {
    const text = normalize(value);
    const match = text.match(/\b(?:grade|level|scientist|assistant|officer|technician|engineer|manager|research associate|research fellow)\s*(i{1,3}|iv|v|[1-5])\b/);
    if (!match) return null;
    const raw = match[1];
    const roman: Record<string, string> = { i: "1", ii: "2", iii: "3", iv: "4", v: "5" };
    return roman[raw] ?? raw;
  };
  const left = grade(a), right = grade(b);
  return left !== null && right !== null && left !== right;
}

export function safeEntityMatch(input: {
  sourceOrganization: unknown;
  candidateOrganization: unknown;
  sourceTitle: unknown;
  candidateTitle: unknown;
  minimumRoleSimilarity?: number;
}): { safe: boolean; reason: string; organizationSimilarity: number; roleSimilarity: number } {
  const orgSafe = organizationCompatible(input.sourceOrganization, input.candidateOrganization);
  const role = roleSimilarity(input.sourceTitle, input.candidateTitle);
  if (!orgSafe) return { safe: false, reason: "organization_identity_not_established", organizationSimilarity: 0, roleSimilarity: role };
  if (hasRoleGradeConflict(input.sourceTitle, input.candidateTitle)) {
    return { safe: false, reason: "role_grade_conflict", organizationSimilarity: 1, roleSimilarity: role };
  }
  const minimum = input.minimumRoleSimilarity ?? 0.65;
  if (role < minimum) return { safe: false, reason: "role_identity_not_established", organizationSimilarity: 1, roleSimilarity: role };
  return { safe: true, reason: "organization_and_role_agree", organizationSimilarity: 1, roleSimilarity: role };
}
