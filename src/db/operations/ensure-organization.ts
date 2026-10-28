import { eq } from "drizzle-orm";
import type { getDb } from "../index";
import { organizations } from "../schema";

type Db = ReturnType<typeof getDb>;
type OrgRow = typeof organizations.$inferSelect;

/** Create a canonical organization entity from an official notice when identity matching is unresolved.
 * The UNKNOWN sector explicitly avoids asserting a false public/private classification.
 */
export async function createUnverifiedOrganization(
  db: Db,
  input: { name: string; slug: string; websiteUrl?: string | null },
): Promise<OrgRow> {
  const existing = await db.query.organizations.findFirst({ where: eq(organizations.slug, input.slug) });
  if (existing) return existing;
  const [row] = await db.insert(organizations).values({
    name: input.name.slice(0, 200),
    slug: input.slug.slice(0, 160),
    sector: "UNKNOWN",
    websiteUrl: input.websiteUrl ?? null,
    description: "Organization entity created from an official recruitment notification; classification has not yet been verified.",
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return row;
}

