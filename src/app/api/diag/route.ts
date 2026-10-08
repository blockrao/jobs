/**
 * Diagnostic endpoint to check Vercel environment configuration
 * and trace Gate 4D value chain for recruitment.totalVacancies.
 *
 * GET /api/diag
 * GET /api/diag?recruitment_slug=<slug>   — traces the full value chain
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const recruitmentSlug = searchParams.get("recruitment_slug");

  const checks = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SITE_URL: !!process.env.NEXT_PUBLIC_SITE_URL,
    DATABASE_URL: !!process.env.DATABASE_URL,
  };

  // Try to initialize Supabase client
  let supabaseOk = false;
  let supabaseError = null;

  if (checks.NEXT_PUBLIC_SUPABASE_URL && checks.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { error } = await client.from("posts").select("id").limit(1);
      if (error) {
        supabaseError = error.message;
      } else {
        supabaseOk = true;
      }
    } catch (err) {
      supabaseError = err instanceof Error ? err.message : String(err);
    }
  }

  // Gate 4D value-chain trace (only when recruitment_slug is provided)
  let vacancyTrace: Record<string, unknown> | null = null;

  if (recruitmentSlug) {
    try {
      const { getDb } = await import("@/db/index");
      const { recruitments } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      const { resolveRecruitmentVacancy } = await import("@/lib/resolvers/fact-resolvers");

      const db = getDb();

      // Boundary 1: raw ORM .select() — exactly what getRecruitmentWithPosts() does
      const ormResult = await db
        .select()
        .from(recruitments)
        .where(eq(recruitments.slug, recruitmentSlug))
        .limit(1);

      const ormRow = ormResult[0] ?? null;

      // Boundary 2: the specific field the Hub page reads
      const totalVacanciesFromOrm = ormRow?.totalVacancies ?? null;

      // Boundary 3: resolver output
      const resolverOutput = ormRow
        ? resolveRecruitmentVacancy({ totalVacancies: totalVacanciesFromOrm })
        : null;

      // Boundary 4: all column keys actually returned by the ORM
      const ormKeys = ormRow ? Object.keys(ormRow) : [];
      const ormKeysHasTotalVacancies = ormKeys.includes("totalVacancies");

      vacancyTrace = {
        slug: recruitmentSlug,
        boundary1_orm_row_found: ormRow !== null,
        boundary1_orm_row_id: ormRow?.id ?? null,
        boundary1_orm_keys_include_totalVacancies: ormKeysHasTotalVacancies,
        boundary1_orm_all_keys: ormKeys,
        boundary2_totalVacancies_from_orm: totalVacanciesFromOrm,
        boundary2_typeof: typeof totalVacanciesFromOrm,
        boundary3_resolver_output: resolverOutput,
        boundary4_note: ormKeysHasTotalVacancies
          ? "ORM key present — value is what ORM returned"
          : "ORM key MISSING — Drizzle did not map this column",
      };
    } catch (err) {
      vacancyTrace = {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack?.slice(0, 500) : null,
      };
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      deployment: "Vercel",
    },
    envVarsSet: checks,
    supabaseConnection: {
      ok: supabaseOk,
      error: supabaseError,
    },
    status:
      checks.NEXT_PUBLIC_SUPABASE_URL &&
      checks.SUPABASE_SERVICE_ROLE_KEY &&
      supabaseOk
        ? "✅ Ready"
        : "❌ Missing configuration",
    gate4d_vacancy_trace: vacancyTrace,
  });
}
