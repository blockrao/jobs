import { redirect } from "next/navigation";

/**
 * Redirect: /organizations/[slug] → /exams/[slug]
 *
 * Phase 2A consolidation: pillar pages are the canonical org hub.
 * All individual organization pages are consolidated into /exams/ routes.
 * This route handles 301 redirects for any old /organizations/ links.
 */

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/exams/${slug}`);
}
