/**
 * /recruitments/[slug] — permanent redirect to the canonical /jobs/[slug] URL.
 *
 * P0-1 (canonical URL): /jobs/[slug] is the one public entity URL.
 * This route 301-redirects all traffic and crawlers to the canonical path.
 *
 * Previously this file rendered a full hub page; that content now lives at
 * /jobs/[slug]/page.tsx and is not duplicated here.
 */

import { permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export default async function RecruitmentsRedirectPage({ params }: Props) {
  const { slug } = await params;
  permanentRedirect(`/jobs/${slug}`);
}
