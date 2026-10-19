import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

export async function GET(request: Request) {
  // Check admin authentication
  const isAdmin = await requireAdmin();
  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, exam_name, organization, location, vacancies, salary_min, salary_max, apply_deadline")
      .eq("is_active", true)
      .order("vacancies", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Supabase error:", error);
      return Response.json({ error: "Failed to fetch posts" }, { status: 500 });
    }

    return Response.json({ posts: data || [] });
  } catch (error) {
    console.error("API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
