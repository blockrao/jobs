// /[locale]/recruitments/[slug] → 308 → /jobs/[slug] (English canonical).
// Because /recruitments/ is a locale-aware prefix, the plain /recruitments/x
// request is also served by this page (next-intl rewrites it through
// [locale]); the (default) copy is kept for completeness. DISC-001: a
// temporary redirect() hid the permanent signal from crawlers.

import { permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ locale: string; slug: string }> };

export default async function LocaleRecruitmentsRedirectPage({ params }: Props) {
  const { slug } = await params;
  permanentRedirect(`/jobs/${slug}`);
}
