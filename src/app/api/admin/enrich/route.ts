import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { adminSessionToken } from "@/lib/admin-token";

const COOKIE_NAME = "admin_session";

async function requireAdmin() {
  const token = await adminSessionToken();
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME)?.value;
  if (!token || cookie !== token) {
    return null;
  }
  return true;
}

interface EnrichmentRequest {
  post_id: string;
  enrichment: {
    salary: string;
    qualifications: string[];
    experience_years: number | null;
    age_limit: string;
    selection_process: string[];
    benefits: string[];
  };
}

export async function POST(request: Request) {
  // Check admin authentication
  const isAdmin = await requireAdmin();
  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: EnrichmentRequest = await request.json();
    const { post_id, enrichment } = body;

    if (!post_id || !enrichment) {
      return Response.json({ error: "Missing post_id or enrichment data" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    // Build the enrichment object with metadata
    const enrichmentData = {
      salary: enrichment.salary || null,
      qualifications: enrichment.qualifications && enrichment.qualifications.length > 0 ? enrichment.qualifications : null,
      experience_years: enrichment.experience_years,
      age_limit: enrichment.age_limit || null,
      selection_process:
        enrichment.selection_process && enrichment.selection_process.length > 0
          ? enrichment.selection_process
          : null,
      benefits: enrichment.benefits && enrichment.benefits.length > 0 ? enrichment.benefits : null,
      last_updated: new Date().toISOString(),
      enriched_by: "admin_form",
    };

    // Update the jobs table with enrichment data
    const { data, error } = await supabase
      .from("jobs")
      .update({
        enrichment: enrichmentData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post_id)
      .select("id, title, enrichment");

    if (error) {
      console.error("Supabase error:", error);
      return Response.json({ error: "Failed to update post: " + error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    return Response.json({
      success: true,
      post: data[0],
      message: `Post "${data[0].title}" enriched successfully`,
    });
  } catch (error) {
    console.error("API error:", error);
    return Response.json(
      { error: "Internal server error: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
