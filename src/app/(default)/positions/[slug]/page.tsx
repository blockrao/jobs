import { permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";

/**
 * /positions/[slug] → 301 → /posts/[slug]
 *
 * Frozen URL architecture (ARC-001, 2026-10-08): the Position Hub lives at
 * /posts/[position-slug]; /positions/[slug] must permanently redirect so there
 * is one canonical URL per position. This had been left as a noindex duplicate.
 */
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    ...pageSeo(`/posts/${slug}`, { index: false }),
  };
}

export default async function PositionRedirectPage({ params }: Props) {
  const { slug } = await params;
  permanentRedirect(`/posts/${slug}`);
}
