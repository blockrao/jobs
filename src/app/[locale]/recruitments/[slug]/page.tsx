// /hi/recruitments/[slug] is a transitional alias for the Recruitment compatibility route.
// Preserve the explicit locale during redirect; the target applies the shared SEO policy.

import { permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ locale: string; slug: string }> };

export default async function LocaleRecruitmentsRedirectPage({ params }: Props) {
  const { slug, locale } = await params;
  const prefix = locale === "hi" ? "/hi" : "";
  permanentRedirect(`${prefix}/jobs/${slug}`);
}
