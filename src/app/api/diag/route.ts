/**
 * Diagnostic endpoint to check Vercel environment configuration
 * GET /api/diag
 */

import { NextResponse } from "next/server";

export async function GET() {
  const checks = {
    // Check if required env vars are set (not their values)
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
      // Try a simple query to verify connection
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
    status: checks.NEXT_PUBLIC_SUPABASE_URL &&
      checks.SUPABASE_SERVICE_ROLE_KEY &&
      supabaseOk
      ? "✅ Ready"
      : "❌ Missing configuration",
  });
}
