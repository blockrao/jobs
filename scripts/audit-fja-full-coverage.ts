import postgres from "postgres";
import { mkdir, writeFile } from "node:fs/promises";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required; no report generated.");
const sql = postgres(url, { max: 2, connect_timeout: 15, prepare: false });

async function main() {
  const rows = await sql`
    SELECT i.id, i.external_id, i.source_url, i.title, i.organization_name,
           i.detail_status, i.source_status, i.application_start_date::text,
           i.application_end_date::text, i.official_notification_url,
           i.listing_category, i.first_seen_at::text,
           EXISTS (SELECT 1 FROM recruitments r
             WHERE lower(regexp_replace(trim(r.source_url), '/+$', '')) =
                   lower(regexp_replace(trim(i.source_url), '/+$', ''))) AS matched_recruitment_url,
           EXISTS (SELECT 1 FROM postings p
             WHERE lower(regexp_replace(trim(p.source_url), '/+$', '')) =
                   lower(regexp_replace(trim(i.source_url), '/+$', ''))) AS matched_posting_url,
           EXISTS (SELECT 1 FROM postings p WHERE p.external_id = i.external_id) AS matched_posting_external_id
    FROM fja_job_inventory i
    WHERE i.source_slug = 'freejobalert'
    ORDER BY i.first_seen_at DESC NULLS LAST, i.id
  `;
  const today = new Date().toISOString().slice(0, 10);
  const audited = rows.map((r: any) => {
    const end = r.application_end_date ? String(r.application_end_date).slice(0, 10) : "";
    const duplicate = !!(r.matched_recruitment_url || r.matched_posting_url || r.matched_posting_external_id);
    const flags = {
      duplicate_existing: duplicate,
      detail_not_extracted: r.detail_status !== "EXTRACTED",
      source_not_open: r.source_status !== "OPEN",
      deadline_missing: !end,
      deadline_expired: !!end && end < today,
      official_notification_url_missing: !r.official_notification_url,
      organization_missing: !r.organization_name || !String(r.organization_name).trim(),
    };
    const reason = duplicate ? "EXISTING_MATCH_OR_DUPLICATE"
      : r.detail_status !== "EXTRACTED" ? "DETAIL_INCOMPLETE"
      : r.source_status !== "OPEN" ? "NOT_CONFIRMED_OPEN"
      : !end ? "DEADLINE_MISSING"
      : end < today ? "DEADLINE_EXPIRED"
      : "ELIGIBLE_FOR_PROMOTION_CHECKS";
    return {
      id: r.id, external_id: r.external_id, source_url: r.source_url, title: r.title,
      organization_name: r.organization_name, detail_status: r.detail_status,
      source_status: r.source_status, application_start_date: r.application_start_date,
      application_end_date: r.application_end_date, official_notification_url: r.official_notification_url,
      listing_category: r.listing_category, first_seen_at: r.first_seen_at,
      ...flags, primary_reason: reason,
    };
  });
  const counts: Record<string, number> = {};
  for (const row of audited) counts[row.primary_reason] = (counts[row.primary_reason] ?? 0) + 1;
  const eligible = audited.filter(r => r.primary_reason === "ELIGIBLE_FOR_PROMOTION_CHECKS").length;
  const summary = {
    generated_at: new Date().toISOString(),
    inventory_rows: audited.length,
    eligible_for_promotion_checks: eligible,
    primary_reason_counts: counts,
    note: "Exclusive primary reason is prioritized; boolean flags preserve overlapping reasons. Eligibility here is not authorization to publish; official URL and organization resolution still require validation.",
    records: audited,
  };
  await mkdir("artifacts/fja-full-coverage", { recursive: true });
  await writeFile("artifacts/fja-full-coverage/coverage-audit.json", JSON.stringify(summary, null, 2));
  const columns = ["id","external_id","source_url","title","organization_name","detail_status","source_status","application_start_date","application_end_date","official_notification_url","listing_category","matched_existing_placeholder","duplicate_existing","detail_not_extracted","source_not_open","deadline_missing","deadline_expired","official_notification_url_missing","organization_missing","primary_reason"];
  const csvCell = (v: unknown) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const csv = [columns.join(","), ...audited.map((r: any) => [
    r.id,r.external_id,r.source_url,r.title,r.organization_name,r.detail_status,r.source_status,
    r.application_start_date,r.application_end_date,r.official_notification_url,r.listing_category,
    "",r.duplicate_existing,r.detail_not_extracted,r.source_not_open,r.deadline_missing,r.deadline_expired,
    r.official_notification_url_missing,r.organization_missing,r.primary_reason
  ].map(csvCell).join(","))].join("\\n");
  await writeFile("artifacts/fja-full-coverage/coverage-audit.csv", csv);
  console.log("FJA FULL-COVERAGE AUDIT");
  console.log(JSON.stringify({inventory_rows: audited.length, eligible_for_promotion_checks: eligible, primary_reason_counts: counts}, null, 2));
  console.log("Detailed JSON/CSV written to artifacts/fja-full-coverage/");
}
main().finally(() => sql.end());
