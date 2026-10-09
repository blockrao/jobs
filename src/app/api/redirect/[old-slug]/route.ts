/**
 * Redirect API
 * Handles 301 redirects from old recruitment URLs to new semantic URLs
 * Used during URL slug migration to preserve SEO value
 */

import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { recruitment_slug_redirects } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ "old-slug": string }> }
) {
  const resolvedParams = await params;
  const oldSlug = resolvedParams["old-slug"];

  if (!oldSlug) {
    notFound();
  }

  try {
    const db = getDb();

    // Look up the redirect mapping
    const redirect_record = await db
      .select()
      .from(recruitment_slug_redirects)
      .where(eq(recruitment_slug_redirects.old_slug, oldSlug))
      .limit(1);

    if (!redirect_record || redirect_record.length === 0) {
      notFound();
    }

    const newSlug = redirect_record[0].new_slug;

    // Return 301 permanent redirect to new URL
    return new Response(null, {
      status: 301,
      headers: {
        Location: `/jobs/${newSlug}`,
      },
    });
  } catch (error) {
    console.error("Redirect lookup error:", error);
    notFound();
  }
}
