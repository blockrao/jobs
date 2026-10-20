/**
 * Recruitment Hub Page
 * 
 * Route: /jobs/[recruitment-slug]
 * 
 * This page handles recruitment-level URLs by redirecting to the primary role hub.
 * For example, if BPSC has multiple roles (Clerk, Grade-A, etc.), we redirect to
 * the role with the highest vacancy count as the canonical hub for that recruitment.
 * 
 * This preserves backward compatibility with recruitment-level links while directing
 * users to the most relevant role-specific page.
 */

import { permanentRedirect, notFound } from "next/navigation";
import { getRoleHubForRecruitmentSlug } from "@/lib/redirects";

export const revalidate = 86400; // 1 day ISR

type Props = { params: Promise<{ "recruitment-slug": string }> };

export default async function RecruitmentHubPage({ params }: Props) {
  const { "recruitment-slug": recruitmentSlug } = await params;

  // Try to resolve this recruitment to its primary role hub
  const roleSlug = await getRoleHubForRecruitmentSlug(recruitmentSlug);

  if (!roleSlug) {
    // No posts found for this recruitment - return 404
    notFound();
  }

  // Redirect to the role hub (the most relevant role for this recruitment)
  // This is a permanent redirect to preserve SEO value
  permanentRedirect(`/jobs/${roleSlug}`);
}
