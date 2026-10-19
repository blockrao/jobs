import { getDb } from "@/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postSlug = searchParams.get("slug") || "professor-social-work-tuljapur-campus-709-jobs";

  try {
    const db = getDb();

    // Get post with all enrichment data
    const result = await db.execute<any>(sql`
      SELECT 
        p.*,
        r.slug as recruitment_slug,
        r.name as recruitment_name,
        json_build_object(
          'id', pe.id,
          'vacancies_total', pe.vacancies_total,
          'vacancies_by_category', pe.vacancies_by_category,
          'salary_min', pe.salary_min,
          'salary_max', pe.salary_max,
          'application_closing_date', pe.application_closing_date,
          'qualification_text', pe.qualification_text,
          'experience_text', pe.experience_text,
          'selection_process', pe.selection_process
        ) as enrichment,
        json_build_object(
          'qualification_raw', fja.qualification_raw,
          'experience_raw', fja.experience_raw,
          'salary_raw', fja.salary_raw,
          'age_limit_raw', fja.age_limit_raw,
          'location_raw', fja.location_raw,
          'eligibility_raw', fja.eligibility_raw
        ) as fja_extract
      FROM posts p
      LEFT JOIN recruitments r ON p.recruitment_id = r.id
      LEFT JOIN post_enrichments pe ON p.id = pe.post_id
      LEFT JOIN fja_extracts fja ON p.id = fja.post_id
      WHERE p.slug = ${postSlug}
      LIMIT 1
    `);

    if (!result.length) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(result[0], { 
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
