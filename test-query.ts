import postgres from "postgres";

const url = "postgresql://postgres:postgres@db.cusxodjgkrttwmdmhvso.supabase.co:5432/postgres";
const sql = postgres(url, {
  prepare: false,
  connect_timeout: 10,
});

async function test() {
  try {
    console.log("Attempting database connection...");
    const result = await sql`
      SELECT
        p.id,
        p.slug,
        p."isLive",
        p.title,
        r.slug as "recruitmentSlug"
      FROM posts p
      LEFT JOIN recruitments r ON p."recruitmentId" = r.id
      WHERE p.slug = ${'professor-social-work-tuljapur-campus-709-jobs'}
        AND r.slug = ${'tata-institute-of-social-sciences-2026-07'}
        AND p."isLive" = true
      LIMIT 1
    `;
    console.log("Query successful! Result:", result);
    process.exit(0);
  } catch (err) {
    console.error("Query failed with error:", err);
    process.exit(1);
  }
}

test();
