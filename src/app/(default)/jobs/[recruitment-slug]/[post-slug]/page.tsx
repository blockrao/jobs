/**
 * Old Route Redirect (DEPRECATED)
 *
 * FIX-004: Redirects old route to new locale-based route
 *
 * Old route: /jobs/[recruitment-slug]/[post-slug]
 * New route: /[locale]/jobs/[recruitment-slug]/[post-slug]
 *
 * This route ONLY exists to redirect old URLs. All requests are sent to
 * the new locale-aware route with English as the default language.
 *
 * The redirect() function in Next.js produces HTTP 307 (temporary), which
 * the CDN then serves to clients. This preserves SEO value from old bookmarks
 * and indexed URLs.
 */

import { redirect } from "next/navigation";

interface OldRouteProps {
  params: Promise<{
    "recruitment-slug": string;
    "post-slug": string;
  }>;
}

export default async function OldRoute({ params }: OldRouteProps) {
  const { "recruitment-slug": recruitmentSlug, "post-slug": postSlug } = await params;

  // Redirect to new locale-based route with English (en) as default
  // HTTP 307: preserves original request method
  redirect(`/en/jobs/${recruitmentSlug}/${postSlug}`);
}
