import postgres from "postgres";
import { mkdir, writeFile } from "node:fs/promises";

const connection = process.env.DATABASE_URL;
if (!connection) throw new Error("DATABASE_URL is required; no audit generated.");
const sql = postgres(connection, { max: 2, connect_timeout: 20, prepare: false });

type Row = Record<string, any>;
const obj = (v: unknown): Row => v && typeof v === "object" && !Array.isArray(v) ? v as Row : {};
const norm = (v: string) => v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();

function roleLines(detail: Row): { names: string[]; basis: string } {
  const facts = obj(detail.facts);
  const names: string[] = [];
  for (const table of Array.isArray(detail.post_table_candidates) ? detail.post_table_candidates : []) {
    for (const row of Array.isArray(table?.rows) ? table.rows : []) {
      const values = obj(row?.values);
      const key = Object.keys(values).find(k => /^(post|post name|name of post|designation|position|trade|discipline)$/i.test(k.trim()));
      const value = key ? String(values[key] ?? "").trim() : "";
      if (value && !/^total$/i.test(value)) names.push(value);
    }
  }
  if (!names.length) {
    const raw = facts.post_names ?? facts.postNames;
    if (Array.isArray(raw)) names.push(...raw.map(String));
    else if (typeof facts.post_name === "string" && facts.post_name.trim()) names.push(facts.post_name.trim());
  }
  const unique = [...new Map(names.map(n => [norm(n), n.trim()])).values()].filter(Boolean);
  return unique.length ? { names: unique, basis: "FJA_structured_post_table_or_post_name" } : { names: [], basis: "NO_ROLE_NAME_REQUIRES_REVIEW" };
}

function candidateOfficialUrl(row: Row, detail: Row): string | null {
  if (typeof row.official_notification_url === "string" && row.official_notification_url.trim()) return row.official_notification_url.trim();
  const links = Array.isArray(detail.official_link_candidates) ? detail.official_link_candidates : [];
  const candidates = links.filter((x: Row) => typeof x?.url === "string" && /(notification|advertisement|advt|official notice)/i.test(String(x.text ?? "")));
  return candidates.length === 1 ? String(candidates[0].url) : null;
}

async function main() {
  const rows = await sql<Row[]> `
    SELECT i.id, i.external_id, i.source_url, i.title, i.organization_name,
           i.detail_status, i.source_status, i.application_start_date::text,
           i.application_end_date::text, i.official_notification_url,
           i.details, i.other_info_raw, i.first_seen_at::text,
           COALESCE(l.posting_count, 0)::int AS legacy_posting_count,
           COALESCE(l.recruitment_ids, ARRAY[]::int[]) AS inferred_recruitment_ids,
           COALESCE(l.post_ids, ARRAY[]::int[]) AS inferred_post_ids,
           r.id AS canonical_recruitment_id, r.name AS canonical_recruitment_name,
           r.slug AS canonical_recruitment_slug, r.status::text AS canonical_recruitment_status,
           COALESCE(h.leaf_count, 0)::int AS canonical_leaf_count,
           COALESCE(h.leaf_names, ARRAY[]::text[]) AS canonical_leaf_names,
           COALESCE(c.capture_count, 0)::int AS html_capture_count
    FROM public.fja_job_inventory i
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS posting_count,
             array_agg(DISTINCT inferred_recruitment_id) FILTER (WHERE inferred_recruitment_id IS NOT NULL) AS recruitment_ids,
             array_agg(DISTINCT inferred_post_id) FILTER (WHERE inferred_post_id IS NOT NULL) AS post_ids
      FROM public.postings p WHERE p.external_id = i.external_id
    ) l ON true
    LEFT JOIN public.recruitments r
      ON cardinality(COALESCE(l.recruitment_ids, ARRAY[]::int[])) = 1
     AND r.id = l.recruitment_ids[1]
    LEFT JOIN LATERAL (
      SELECT count(*) FILTER (WHERE p.posting_status IS DISTINCT FROM 'DUPLICATE')::int AS leaf_count,
             array_agg(p.name ORDER BY p.id) FILTER (WHERE p.posting_status IS DISTINCT FROM 'DUPLICATE') AS leaf_names
      FROM public.posts p WHERE p.recruitment_id = r.id
    ) h ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS capture_count
      FROM public.fja_source_captures fc
      WHERE fc.source_slug = i.source_slug AND fc.external_id = i.external_id
    ) c ON true
    WHERE i.source_slug = 'freejobalert'
    ORDER BY i.id
  `;

  const audited = rows.map(row => {
    const wrapper = obj(row.details);
    const detail = obj(wrapper.detail ?? wrapper);
    const facts = obj(detail.facts);
    const proposed = roleLines(detail);
    const officialUrl = candidateOfficialUrl(row, detail);
    const recruitmentIds = Array.isArray(row.inferred_recruitment_ids) ? row.inferred_recruitment_ids : [];
    const postIds = Array.isArray(row.inferred_post_ids) ? row.inferred_post_ids : [];
    const existingNames = Array.isArray(row.canonical_leaf_names) ? row.canonical_leaf_names : [];
    const missingLeaves = proposed.names.filter(name => !existingNames.some((existing: string) => norm(existing) === norm(name)));
    const hasOneHub = recruitmentIds.length === 1 && !!row.canonical_recruitment_id;
    const flags = {
      source_open: row.source_status === "OPEN",
      detail_extracted: row.detail_status === "EXTRACTED",
      official_url_present: !!officialUrl,
      html_capture_present: Number(row.html_capture_count) > 0,
      canonical_hub_present: hasOneHub,
      linked_post_reference_present: postIds.length > 0,
      canonical_hub_has_any_leaf: Number(row.canonical_leaf_count) > 0,
      role_names_extracted: proposed.names.length > 0,
      all_proposed_roles_have_leaf: proposed.names.length > 0 && missingLeaves.length === 0,
    };
    let disposition = "REVIEW";
    if (!flags.source_open) disposition = "SOURCE_NOT_OPEN_OR_UNKNOWN";
    else if (!flags.official_url_present) disposition = "MISSING_OFFICIAL_NOTIFICATION_URL";
    else if (!row.organization_name) disposition = "ORGANIZATION_IDENTITY_REVIEW";
    else if (recruitmentIds.length > 1) disposition = "MULTIPLE_HUB_MATCHES_REVIEW";
    else if (!hasOneHub) disposition = "NEW_CANONICAL_HUB_PREFLIGHT";
    else if (!proposed.names.length) disposition = "POST_DECOMPOSITION_REVIEW";
    else if (missingLeaves.length) disposition = "MISSING_OR_MISMATCHED_POST_LEAVES";
    else disposition = "HUB_AND_ROLE_LEAVES_PRESENT_VERIFY_SOURCE_AND_LIFECYCLE";

    return {
      inventory_id: row.id,
      external_id: row.external_id,
      fja_title: row.title,
      organization_name: row.organization_name,
      fja_source_url: row.source_url,
      source_status: row.source_status,
      detail_status: row.detail_status,
      application_start_date: row.application_start_date,
      application_end_date: row.application_end_date,
      official_notification_url_candidate: officialUrl,
      html_capture_count: row.html_capture_count,
      legacy_posting_count: row.legacy_posting_count,
      inferred_recruitment_ids: recruitmentIds.join("|"),
      inferred_post_ids: postIds.join("|"),
      canonical_recruitment_id: row.canonical_recruitment_id,
      canonical_recruitment_name: row.canonical_recruitment_name,
      canonical_recruitment_slug: row.canonical_recruitment_slug,
      canonical_recruitment_status: row.canonical_recruitment_status,
      canonical_leaf_count: row.canonical_leaf_count,
      canonical_leaf_names: existingNames.join(" | "),
      proposed_leaf_names: proposed.names.join(" | "),
      proposed_leaf_basis: proposed.basis,
      missing_leaf_names: missingLeaves.join(" | "),
      ...flags,
      disposition,
    };
  });

  const counts = audited.reduce((acc: Record<string, number>, row) => {
    acc[row.disposition] = (acc[row.disposition] ?? 0) + 1;
    return acc;
  }, {});
  const summary = {
    generated_at: new Date().toISOString(),
    inventory_rows: audited.length,
    source_open_rows: audited.filter(r => r.source_open).length,
    open_with_official_url: audited.filter(r => r.source_open && r.official_url_present).length,
    open_with_html_capture: audited.filter(r => r.source_open && r.html_capture_present).length,
    disposition_counts: counts,
    important: "Read-only reconciliation only. An official URL candidate is not proof of issuer ownership, validity, or reachability. No database rows or publication states are changed.",
    records: audited,
  };

  await mkdir("artifacts/fja-canonical-coverage", { recursive: true });
  await writeFile("artifacts/fja-canonical-coverage/coverage.json", JSON.stringify(summary, null, 2));
  const columns = Object.keys(audited[0] ?? {});
  const cell = (v: unknown) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const csv = [columns.join(","), ...audited.map(row => columns.map(col => cell((row as Row)[col])).join(","))].join("\n");
  await writeFile("artifacts/fja-canonical-coverage/coverage.csv", csv);
  console.log(JSON.stringify({
    inventory_rows: summary.inventory_rows,
    source_open_rows: summary.source_open_rows,
    open_with_official_url: summary.open_with_official_url,
    open_with_html_capture: summary.open_with_html_capture,
    disposition_counts: counts,
    report_directory: "artifacts/fja-canonical-coverage",
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => sql.end());
