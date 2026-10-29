#!/usr/bin/env tsx
/**
 * Build a deterministic coverage manifest for all FJA inventory records.
 * This is a non-mutating audit: it does not create canonical rows or publish pages.
 * It proposes leaves only from captured role names/table rows; otherwise it labels
 * the source headline as a fallback that requires review before publication.
 */
import { writeFile } from "node:fs/promises";
import { getDb } from "../src/db";
import { sql } from "drizzle-orm";

type Row = {
  id: number; external_id: string; source_url: string; title: string;
  organization_name: string | null; detail_status: string; source_status: string;
  official_notification_url: string | null; details: unknown; other_info_raw: unknown;
  canonical_recruitment_id: number | null;
};
function obj(v: unknown): Record<string, any> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, any>;
  if (typeof v === "string") { try { const p = JSON.parse(v); if (p && typeof p === "object" && !Array.isArray(p)) return p; } catch {} }
  return {};
}
function strings(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(x => typeof x === "string" ? x.trim() : "").filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}
function proposedLeaves(row: Row): { titles: string[]; basis: string } {
  const wrapper = obj(row.details), other = obj(row.other_info_raw);
  const detail = obj(wrapper.detail ?? wrapper);
  const facts = obj(detail.facts ?? other.facts);
  let names = strings(facts.post_names ?? facts.postNames ?? facts.post_name ?? detail.postNames);
  if (!names.length) {
    const tables = (detail.tables ?? facts.tables) as any;
    if (Array.isArray(tables)) {
      const table = tables.find(t => /vacanc|post.?wise|department.?wise/i.test(String(t.heading ?? "")));
      if (table && Array.isArray(table.rows)) {
        const header = table.rows.find((r: any) => r.rowIndex === 0);
        if (header && Array.isArray(header.cells)) {
          const headers = header.cells.map((c: any) => String(c).toLowerCase().trim());
          const ix = headers.findIndex((h: string) => /name|post|position|role|department|area/i.test(h));
          if (ix >= 0) names = table.rows.filter((r: any) => r.rowIndex !== 0)
            .map((r: any) => String(r.cells?.[ix] ?? "").trim())
            .filter((n: string) => n && !/^total$/i.test(n));
        }
      }
    }
  }
  names = [...new Set(names)];
  return names.length ? { titles: names, basis: "captured_role_names_or_post_table" }
    : { titles: [row.title], basis: "headline_fallback_review_required" };
}
async function main() {
  const db = getDb();
  const result = await db.execute(sql.raw(`
    SELECT i.id, i.external_id, i.source_url, i.title, i.organization_name,
           i.detail_status, i.source_status, i.official_notification_url,
           i.details, i.other_info_raw,
           CASE WHEN COALESCE(i.other_info_raw->>'canonical_recruitment_id','') ~ '^\\d+
    FROM public.fja_job_inventory i
    WHERE i.source_slug = 'freejobalert'
    ORDER BY i.id
  `));
  const rows = (Array.isArray(result) ? result : (result as any).rows ?? []) as Row[];
  const manifest = rows.flatMap(row => {
    const leaves = proposedLeaves(row);
    const usable = row.detail_status === "EXTRACTED" && row.source_status === "OPEN";
    return leaves.titles.map((leafTitle, idx) => ({
      inventory_id: row.id, external_id: row.external_id, recruitment_title: row.title,
      organization_name: row.organization_name, source_url: row.source_url,
      canonical_recruitment_id: row.canonical_recruitment_id,
      proposed_leaf_title: leafTitle, leaf_number: idx + 1, proposed_leaf_count: leaves.titles.length,
      leaf_basis: leaves.basis, detail_status: row.detail_status, source_status: row.source_status,
      official_notification_url_present: Boolean(row.official_notification_url),
      initial_publish_eligible: usable && Boolean(row.official_notification_url),
      disposition: !usable ? "ENRICH_OR_REVIEW_STATUS" : !row.official_notification_url ? "VERIFY_OFFICIAL_NOTIFICATION_URL" : leaves.basis === "headline_fallback_review_required" ? "REVIEW_LEAF_TITLE" : "READY_FOR_CANONICAL_PREFLIGHT"
    }));
  });
  const counts = manifest.reduce((a, r) => { a[r.disposition] = (a[r.disposition] ?? 0) + 1; return a; }, {} as Record<string, number>);
  await writeFile("fja-1434-leaf-coverage.json", JSON.stringify({ inventoryRows: rows.length, proposedLeafRows: manifest.length, dispositionCounts: counts, rows: manifest }, null, 2));
  const columns = ["inventory_id","external_id","recruitment_title","organization_name","source_url","canonical_recruitment_id","proposed_leaf_title","leaf_number","proposed_leaf_count","leaf_basis","detail_status","source_status","official_notification_url_present","initial_publish_eligible","disposition"];
  const csv = [columns.join(","), ...manifest.map(r => columns.map(c => {
    const v = (r as any)[c]; const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(","))].join("\n");
  await writeFile("fja-1434-leaf-coverage.csv", csv);
  console.log("FJA_LEAF_COVERAGE_SUMMARY " + JSON.stringify({ inventoryRows: rows.length, proposedLeafRows: manifest.length, dispositionCounts: counts }));
  const expected = Number(process.env.EXPECTED_INVENTORY_ROWS ?? "1434");
  if (Number.isFinite(expected) && expected > 0 && rows.length !== expected) {
    throw new Error(`Inventory count guard failed: expected ${expected}, observed ${rows.length}. Manifest written for diagnostics but must not be used for rollout.`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
 THEN (i.other_info_raw->>'canonical_recruitment_id')::int ELSE NULL END AS canonical_recruitment_id
    FROM public.fja_job_inventory i
    WHERE i.source_slug = 'freejobalert'
    ORDER BY i.id
  `));
  const rows = (Array.isArray(result) ? result : (result as any).rows ?? []) as Row[];
  const manifest = rows.flatMap(row => {
    const leaves = proposedLeaves(row);
    const usable = row.detail_status === "EXTRACTED" && row.source_status === "OPEN";
    return leaves.titles.map((leafTitle, idx) => ({
      inventory_id: row.id, external_id: row.external_id, recruitment_title: row.title,
      organization_name: row.organization_name, source_url: row.source_url,
      canonical_recruitment_id: row.canonical_recruitment_id,
      proposed_leaf_title: leafTitle, leaf_number: idx + 1, proposed_leaf_count: leaves.titles.length,
      leaf_basis: leaves.basis, detail_status: row.detail_status, source_status: row.source_status,
      official_notification_url_present: Boolean(row.official_notification_url),
      initial_publish_eligible: usable && Boolean(row.official_notification_url),
      disposition: !usable ? "ENRICH_OR_REVIEW_STATUS" : !row.official_notification_url ? "VERIFY_OFFICIAL_NOTIFICATION_URL" : leaves.basis === "headline_fallback_review_required" ? "REVIEW_LEAF_TITLE" : "READY_FOR_CANONICAL_PREFLIGHT"
    }));
  });
  const counts = manifest.reduce((a, r) => { a[r.disposition] = (a[r.disposition] ?? 0) + 1; return a; }, {} as Record<string, number>);
  await writeFile("fja-1434-leaf-coverage.json", JSON.stringify({ inventoryRows: rows.length, proposedLeafRows: manifest.length, dispositionCounts: counts, rows: manifest }, null, 2));
  const columns = ["inventory_id","external_id","recruitment_title","organization_name","source_url","canonical_recruitment_id","proposed_leaf_title","leaf_number","proposed_leaf_count","leaf_basis","detail_status","source_status","official_notification_url_present","initial_publish_eligible","disposition"];
  const csv = [columns.join(","), ...manifest.map(r => columns.map(c => {
    const v = (r as any)[c]; const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(","))].join("\n");
  await writeFile("fja-1434-leaf-coverage.csv", csv);
  console.log("FJA_LEAF_COVERAGE_SUMMARY " + JSON.stringify({ inventoryRows: rows.length, proposedLeafRows: manifest.length, dispositionCounts: counts }));
  const expected = Number(process.env.EXPECTED_INVENTORY_ROWS ?? "1434");
  if (Number.isFinite(expected) && expected > 0 && rows.length !== expected) {
    throw new Error(`Inventory count guard failed: expected ${expected}, observed ${rows.length}. Manifest written for diagnostics but must not be used for rollout.`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
