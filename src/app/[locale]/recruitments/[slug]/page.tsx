// /hi/recruitments/[slug] — redirects to the canonical /jobs/[slug] URL.
// The canonical for all recruitment pages is /jobs/[slug].
// This locale path is unused; it now permanently redirects to maintain clean crawl hygiene.

import { redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string; slug: string }> };

export default async function LocaleRecruitmentsRedirectPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/jobs/${slug}`);
}
