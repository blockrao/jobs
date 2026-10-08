/**
 * Debug API route to test Supabase connection and query
 * GET /api/debug/posts
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("Debug API: Starting post query test");

    const supabase = await createClient();
    console.log("Debug API: Supabase client created");

    const { data, error } = await supabase
      .from("posts")
      .select("id, title, slug, recruitmentSlug, isLive")
      .eq("id", 2)
      .single();

    if (error) {
      console.error("Debug API: Query error", error);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      );
    }

    if (!data) {
      console.warn("Debug API: No data returned");
      return NextResponse.json(
        { message: "No post found" },
        { status: 404 }
      );
    }

    console.log("Debug API: Query successful", data);
    return NextResponse.json({ success: true, post: data });
  } catch (err) {
    console.error("Debug API: Exception", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
