/**
 * /exams/{pillar-slug} — retired organization "pillar" guides (Phase 2 Tier 1).
 *
 * Resolution order:
 *  1. Exam slug → redirect to its commission page (/commissions/{commission-slug})
 *  2. Org pillar slug → redirect to org page (/organizations/{slug})
 *  3. Org slug → redirect to org page (/organizations/{slug})
 *  4. 404
 *
 * Exam hub pages proper (Master Plan §4) will own this route when they ship.
 */
import { notFound, permanentRedirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations, exams, commissions } from "@/db/schema";
import { resolveOrganization } from "@/lib/organizations/resolve";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ "pillar-slug": string }> };

export default async function RetiredPillarRoute({ params }: Props) {
  const { "pillar-slug": pillarSlug } = await params;
  const db = getDb();

  // 1. Check if it's an exam slug — redirect to the exam's commission page
  const examRow = await db
    .select({ commissionSlug: commissions.slug })
    .from(exams)
    .innerJoin(commissions, eq(commissions.id, exams.commissionId))
    .where(eq(exams.slug, pillarSlug))
    .limit(1);

  if (examRow.length > 0 && examRow[0].commissionSlug) {
    permanentRedirect(`/commissions/${examRow[0].commissionSlug}`);
  }

  // 2 & 3. Check if it's an org pillar slug or org slug
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
