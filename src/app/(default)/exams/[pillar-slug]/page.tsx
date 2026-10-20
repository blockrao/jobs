/**
 * /exams/{pillar-slug} — retired organization "pillar" guides (Phase 2 Tier 1).
 *
 * Consolidated 2026-10-20: one canonical page per organization at
 * /organizations/{slug}. A pillar slug that maps to an organization 301s
 * there; anything else is a 404. Exam hubs proper (Master Plan §4) will own
 * this route when they ship; until then no page renders here.
 */
import { notFound, permanentRedirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { resolveOrganization } from "@/lib/organizations/resolve";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ "pillar-slug": string }> };

export default async function RetiredPillarRoute({ params }: Props) {
  const { "pillar-slug": pillarSlug } = await params;
  const db = getDb();

  const byPillar = await db
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.pillarSlug, pillarSlug))
    .limit(1);

  const target = byPillar.length > 0 ? await resolveOrganization(byPillar[0].slug) : await resolveOrganization(pillarSlug);

  if (target.kind === "canonical") permanentRedirect(`/organizations/${target.org.slug}`);
  if (target.kind === "redirect") permanentRedirect(`/organizations/${target.slug}`);
  notFound();
}
