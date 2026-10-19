/**
 * /recruitments/[slug] — permanent redirect to the canonical recruitment hub
 *
 * FIX-005: Redirect chain fixed for locale-aware routing
 *
 * Old: /recruitments/[slug] → /jobs/[slug] (OLD URL - no locale prefix)
 * New: /recruitments/[slug] → /en/jobs/[slug] (NEW URL - with locale)
 *
 * This is a permanent 301 redirect. Crawlers see the final canonical URL
 * as /en/jobs/[slug], preserving SEO value from old /recruitments links.
 */

import { permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export default async function RecruitmentsRedirectPage({ params }: Props) {
  const { slug } = await params;
  // FIX-005: Redirect to new locale-based recruitment hub URL
  // permanentRedirect produces HTTP 301, which preserves SEO value
  permanentRedirect(`/en/jobs/${slug}`);
}
