/**
 * Canonical URL decisions for the transitional Recruitment/Posting route tree.
 *
 * A legacy flat Posting URL (/jobs/[posting-slug]) must not remain a second
 * indexable representation when the canonical Post Leaf exists.
 * Recruitment hubs are transitional and noindex; where every Post maps to the
 * same Position, their canonical destination is the matching /posts hub.
 * Mixed-role recruitments are not canonicalized to an arbitrary role.
 */

type SlugRef = { slug?: string | null } | null | undefined;

export function canonicalPostLeafPath(
  posting: {
    canonicalRecruitment?: SlugRef;
    canonicalPost?: SlugRef;
  } | null | undefined,
  locale?: string,
): string | null {
  const recruitmentSlug = posting?.canonicalRecruitment?.slug;
  const postSlug = posting?.canonicalPost?.slug;
  if (!recruitmentSlug || !postSlug) return null;

  const prefix = locale === "hi" ? "/hi" : "";
  return `${prefix}/jobs/${recruitmentSlug}/${postSlug}`;
}

export function recruitmentHubCanonicalPath(
  recruitment: { slug?: string | null } | null | undefined,
  linkedPosts: Array<{ position?: SlugRef }> | null | undefined,
): string | null {
  if (!recruitment?.slug) return null;

  const positionSlugs = [
    ...new Set(
      (linkedPosts ?? [])
        .map((post) => post.position?.slug)
        .filter((slug): slug is string => Boolean(slug)),
    ),
  ];

  // Only canonicalize to a role hub when the relationship is unambiguous.
  if (positionSlugs.length === 1) return `/posts/${positionSlugs[0]}`;

  // A multi-role recruitment must not be canonicalized to one arbitrary role.
  // The caller keeps this transitional hub noindex.
  return `/jobs/${recruitment.slug}`;
}
