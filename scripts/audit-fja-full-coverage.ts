import postgres from "postgres";
import { mkdir, writeFile } from "node:fs/promises";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required; no report generated.");
const sql = postgres(url, { max: 2, connect_timeout: 15, prepare: false });

function isOfficialAuthorityHost(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/\.$/, "");
    return /(^|\.)(gov\.in|nic\.in|ac\.in|edu\.in|res\.in|mil\.in)$/.test(host)
      || /(^|\.)(hmtindia\.com|sbi\.co\.in|ibps\.in|ongcindia\.com|ntpc\.co\.in|iocl\.com|bharatpetroleum\.in|hindustanpetroleum\.com|gailonline\.com|bel-india\.in|bhel\.com|sail\.co\.in|coalindia\.in|powergrid\.in|ecil\.co\.in|rites\.com|ircon\.org|mazagondock\.in|grse\.in|nclcil\.in|nlcindia\.in)$/.test(host);
  } catch {
    return false;
  }
}

function extractOfficialNotificationUrl(links: Array<Record<string, unknown>>): string | undefined {
  return links
    .filter((link) => typeof link.url === "string" && isOfficialAuthorityHost(link.url as string))
    .map((link) => {
      const url = String(link.url);
      const label = String(link.text ?? link.label ?? "").toLowerCase();
      const isPdf = /\.pdf(?:[?#]|$)/i.test(url);
      const notificationLabel = /(notification|advertisement|advt|official notice|recruitment notice|detailed notice|notification pdf|download notice)/i.test(label);
      const careerPath = /(recruit|vacan|career|job|advt|notice|advertisement|notification)/i.test(url);
      return { url, score: (notificationLabel ? 5 : 0) + (isPdf ? 3 : 0) + (careerPath ? 2 : 0), isPdf, notificationLabel, careerPath };
    })
    .filter((item) => item.notificationLabel || (item.isPdf && item.careerPath))
    .sort((a, b) => b.score - a.score)[0]?.url;
}

function nestedSourceFacts(row: any) {
  const wrapper = (row.details ?? {}) as Record<string, any>;
  const detail = (wrapper.detail ?? wrapper) as Record<string, any>;
  const facts = (detail.facts ?? (row.other_info_raw as Record<string, any> | null)?.facts ?? {}) as Record<string, any>;
  const rawLinks = (detail.all_links ?? detail.allLinks ?? facts.all_links ?? facts.allLinks ?? []) as Array<Record<string, unknown>>;
  return { wrapper, detail, facts, rawLinks };
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^20\d{2}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const numeric = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})$/);
  if (numeric && Number(numeric[1]) <= 31 && Number(numeric[2]) <= 12) {
    const d = new Date(Date.UTC(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1])));
    if (!Number.isNaN(d.getTime()) && d.getUTCDate() === Number(numeric[1])) return d.toISOString().slice(0, 10);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

async function main() {
  const rows = await sql`
    SELECT i.id, i.external_id, i.source_url, i.title, i.organization_name,
           i.detail_status, i.source_status, i.application_start_date::text,
           i.application_end_date::text, i.official_notification_url,
           i.listing_category, i.first_seen_at::text, i.details, i.other_info_raw,
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
    const { facts, rawLinks } = nestedSourceFacts(r);
    const end = normalizeDate(r.application_end_date) ?? normalizeDate(facts.application_end_date ?? facts.last_date ?? facts.lastDate);
    const rawStoredOfficial = typeof r.official_notification_url === "string" && isOfficialAuthorityHost(r.official_notification_url)
      ? r.official_notification_url : null;
    const nestedOfficial = extractOfficialNotificationUrl(rawLinks);
    const officialUrl = rawStoredOfficial ?? nestedOfficial ?? null;
    const duplicate = !!(r.matched_recruitment_url || r.matched_posting_url || r.matched_posting_external_id);
    const flags = {
      duplicate_existing: duplicate,
      detail_not_extracted: r.detail_status !== "EXTRACTED",
      source_not_open: r.source_status !== "OPEN",
      deadline_missing: !end,
      deadline_expired: !!end && end < today,
      official_notification_url_missing: !officialUrl,
      official_notification_url_from_nested_detail: !rawStoredOfficial && !!nestedOfficial,
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
      source_status: r.source_status, application_start_date: normalizeDate(r.application_start_date),
      application_end_date: end, official_notification_url: officialUrl,
      official_notification_url_stored: rawStoredOfficial, listing_category: r.listing_category,
      first_seen_at: r.first_seen_at, ...flags, primary_reason: reason,
    };
  });
  const counts: Record<string, number> = {};
  for (const row of audited) counts[row.primary_reason] = (counts[row.primary_reason] ?? 0) + 1;
  const eligible = audited.filter(r => r.primary_reason === "ELIGIBLE_FOR_PROMOTION_CHECKS").length;
  const officialLinkCount = audited.filter(r => !!r.official_notification_url).length;
  const deadlineCount = audited.filter(r => !!r.application_end_date).length;
  const summary = {
    generated_at: new Date().toISOString(),
    inventory_rows: audited.length,
    eligible_for_promotion_checks: eligible,
    records_with_official_notification_url: officialLinkCount,
    records_with_application_end_date: deadlineCount,
    primary_reason_counts: counts,
    note: "Official links and dates are derived from stored columns and captured nested detail facts/links when available. Eligibility is not authorization to publish; organization resolution and live-page visibility still require validation.",
    records: audited,
  };
  await mkdir("artifacts/fja-full-coverage", { recursive: true });
  await writeFile("artifacts/fja-full-coverage/coverage-audit.json", JSON.stringify(summary, null, 2));
  const columns = ["id","external_id","source_url","title","organization_name","detail_status","source_status","application_start_date","application_end_date","official_notification_url","official_notification_url_stored","listing_category","duplicate_existing","detail_not_extracted","source_not_open","deadline_missing","deadline_expired","official_notification_url_missing","official_notification_url_from_nested_detail","organization_missing","primary_reason"];
  const csvCell = (v: unknown) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const csv = [columns.join(","), ...audited.map((r: any) => columns.map((col) => r[col] ?? "").map(csvCell).join(","))].join("\n");
  await writeFile("artifacts/fja-full-coverage/coverage-audit.csv", csv);
  console.log("FJA FULL-COVERAGE AUDIT");
  console.log(JSON.stringify({
    inventory_rows: audited.length, eligible_for_promotion_checks: eligible,
    records_with_official_notification_url: officialLinkCount,
    records_with_application_end_date: deadlineCount, primary_reason_counts: counts,
  }, null, 2));
  console.log("Detailed JSON/CSV written to artifacts/fja-full-coverage/");
}
main().finally(() => sql.end());
