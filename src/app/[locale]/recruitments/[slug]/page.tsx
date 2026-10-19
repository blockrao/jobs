// /[locale]/recruitments/[slug] → 301 → /en/jobs/[slug] (English canonical).
//
// This route handles requests like:
// - /recruitments/ssc-cgl-2024 (rewritten by next-intl as /en/recruitments/ssc-cgl-2024)
// - /en/recruitments/ssc-cgl-2024 (explicit locale prefix)
// - /hi/recruitments/ssc-cgl-2024 (Hindi locale, still redirects to EN hub)
//
// All should redirect to the canonical English recruitment hub at /en/jobs/[slug].
//
// FIX-006: Redirect must include locale prefix to prevent broken chains.
// Old bug (DISC-001): permanentRedirect(`/jobs/${slug}`) created redirect loop.

import { permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ locale: string; slug: string }> };

export default async function LocaleRecruitmentsRedirectPage({ params }: Props) {
  const { slug } = await params;
  // Always redirect to English recruitment hub (canonical locale)
  // HTTP 301 (permanent) preserves SEO value from old /recruitments links
  permanentRedirect(`/en/jobs/${slug}`);
}
