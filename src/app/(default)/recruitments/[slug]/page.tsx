/**
 * /recruitments/[slug] — permanent redirect to canonical recruitment hub
 *
 * PHASE 2 FIX (2026-10-20): Updated redirect path
 *
 * Old: /recruitments/[slug] → /en/jobs/[slug] (locale-based, no longer exists)
 * New: /recruitments/[slug] → /jobs/[slug] (canonical unprefixed path)
 *
 * This is a permanent 301 redirect. Crawlers see the final canonical URL
 * as /jobs/[slug], preserving SEO value from old /recruitments links.
 */

import { permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export default async function RecruitmentsRedirectPage({ params }: Props) {
  const { slug } = await params;
  // Redirect to canonical recruitment hub (unprefixed, no locale)
  // permanentRedirect produces HTTP 301, which preserves SEO value
  permanentRedirect(`/jobs/${slug}`);
}
