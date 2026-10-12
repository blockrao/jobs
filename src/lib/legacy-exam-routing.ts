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


/**
 * Validate authoritative exam slugs before they become proxy redirect rules.
 * Static routes always win: a collision is a release error, never a redirect.
 */
export function validateLegacyExamSlugs(
  slugs: unknown[],
  reservedRootPaths: ReadonlySet<string>,
): string[] {
  if (slugs.length === 0) {
    throw new Error("The exams table returned zero rows; refusing to publish an empty legacy redirect manifest");
  }

  const seen = new Set<string>();
  const validated: string[] = [];
  for (const slug of slugs) {
    if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error(`Invalid exam slug in manifest: ${String(slug)}`);
    }
    if (reservedRootPaths.has(slug)) {
      throw new Error(`Exam slug collides with a reserved root route: ${slug}`);
    }
    if (seen.has(slug)) {
      throw new Error(`Duplicate exam slug in manifest: ${slug}`);
    }
    seen.add(slug);
    validated.push(slug);
  }
  return validated;
}
