/**
 * Pure URL decision for the bounded legacy root exam URL compatibility layer.
 * No database access belongs here: the build-generated allowlist is authoritative
 * for the lifetime of a deployment.
 */
export function getLegacyExamRedirect(
  pathname: string,
  knownExamSlugs: ReadonlySet<string>,
): string | null {
  const match = pathname.match(/^\/([^/]+)\/?$/);
  const slug = match?.[1];
  if (!slug || !knownExamSlugs.has(slug)) return null;
  return `/exams/${slug}`;
}
