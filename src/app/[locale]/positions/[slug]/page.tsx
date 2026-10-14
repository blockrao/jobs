// /[locale]/positions/[slug] → 308 → /posts/[slug]
// Frozen URL architecture (ARC-001): the Position Hub is /posts/[slug], one
// canonical URL per position. /positions/ is a locale-aware prefix, so the
// plain /positions/x request is served here too. Hindi product work is
// deferred (A-054–056) and /posts has no locale variant, so every locale
// redirects to the English canonical.

import { permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ locale: string; slug: string }> };

export default async function LocalePositionRedirectPage({ params }: Props) {
  const { slug } = await params;
  permanentRedirect(`/posts/${slug}`);
}
