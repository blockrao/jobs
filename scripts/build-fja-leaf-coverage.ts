#!/usr/bin/env tsx
/**
 * Build a deterministic coverage manifest for all FJA inventory records.
 * Non-mutating: it never creates canonical rows or publishes pages.
 */
import { writeFile } from "node:fs/promises";
import { getDb } from "../src/db";
import { sql } from "drizzle-orm";

type Row = {
  id: number;
  external_id: string;
  source_url: string;
  title: string;
  organization_name: string | null;
  detail_status: string;
  source_status: string;
  official_notification_url: string | null;
  details: unknown;
  other_info_raw: unknown;
  canonical_recruitment_id: number | null;
};

function obj(v: unknown): Record<string, any> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, any>;
  if (typeof v === "string" && v.trim()) {
    try {
      const parsed = JSON.parse(v);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return {};
}

function strings(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(x => typeof x === "string" ? x.trim() : "").filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function officialUrl(row: Row): string | null {
  if (row.official_notification_url?.trim()) return row.official_notification_url.trim();
  const wrapper = obj(row.details);
  const detail = obj(wrapper.detail ?? wrapper);
  const other = obj(row.other_info_raw);
  const candidates: unknown[] = [
    detail.official_notification_url, detail.officialNotificationUrl,
    other.official_notification_url, other.officialNotificationUrl,
    ...strings(detail.official_links), ...strings(other.official_links),
  ];
  const links = [detail.links, wrapper.links, other.links, detail.facts, other.facts];
  for (const source of links) {
    if (Array.isArray(source)) {
      for (const item of source) {
        if (typeof item === "string") candidates.push(item);
        else if (item && typeof item === "object") candidates.push((item as any).url, (item as any).href);
      }
    } else if (source && typeof source === "object") {
      const o = source as Record<string, any>;
      for (const [key, value] of Object.entries(o)) {
        if (/official|notification|advertisement|apply|website|pdf/i.test(key)) {
          if (typeof value === "string") candidates.push(value);
          else if (value && typeof value === "object") candidates.push(value.url, value.href);
        }
      }
    }
  }
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    try {
      const url = new URL(candidate);
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (url.protocol === "https:" && !/(freejobalert\.com|facebook\.com|instagram\.com|youtube\.com|google\.com|twitter\.com|x\.com)$/.test(host)) {
        return url.toString();
      }
    } catch {}
  }
  return null;
}

function proposedLeaves(row: Row): { titles: string[]; basis: string } {
  const wrapper = obj(row.details);
  const other = obj(row.other_info_raw);
  const detail = obj(wrapper.detail ?? wrapper);
  const facts = obj(detail.facts ?? other.facts);
  let names = strings(facts.post_names ?? facts.postNames ?? facts.post_name ?? detail.postNames);
  if (!names.length) {
    const tables = (detail.tables ?? facts.tables) as any;
    if (Array.isArray(tables)) {
      const table = tables.find((t: any) => /vacanc|post.?wise|department.?wise/i.test(String(t.heading ?? t.title ?? "")));
      if (table && Array.isArray(table.rows)) {
        const header = table.rows.find((r: any) => r.rowIndex === 0 || r.isHeader === true);
        if (header && Array.isArray(header.cells)) {
          const headers = header.cells.map((c: any) => String(typeof c === "object" ? c.text ?? c.value ?? "" : c).toLowerCase().trim());
          const ix = headers.findIndex((h: string) => /name|post|position|role|department|designation/i.test(h));
          if (ix >= 0) names = table.rows.filter((r: any) => r !== header && r.rowIndex !== 0)
            .map((r: any) => {
              const cell = r.cells?.[ix];
              return String(typeof cell === "object" ? cell.text ?? cell.value ?? "" : cell ?? "").trim();
            })
            .filter((n: string) => n && !/^total$/i.test(n));
        }
      }
    }
  }
  names = [...new Set(names.filter(n => n.length <= 180))];
  return names.length
    ? { titles: names, basis: "captured_role_names_or_post_table" }
    : { titles: [row.title], basis: "headline_fallback_review_required" };
}

async function main() {
  const db = getDb();
  const result = await db.execute(sql.raw(`
    SELECT i.id, i.external_id, i.source_url, i.title, i.organization_name,
           i.detail_status, i.source_status, i.official_notification_url,
           i.details, i.other_info_raw,
           CASE
             WHEN COALESCE(i.other_info_raw->>'canonical_recruitment_id', '') ~ '^\\d+$'
             THEN (i.other_info_raw->>'canonical_recruitment_id')::int
             ELSE NULL
           END AS canonical_recruitment_id
    FROM public.fja_job_inventory i
    WHERE i.source_slug = 'freejobalert'
    ORDER BY i.id
  `));
  const rows = (Array.isArray(result) ? result : (result as any).rows ?? []) as Row[];
  const manifest = rows.flatMap(row => {
    const leaves = proposedLeaves(row);
    const notificationUrl = officialUrl(row);
    const usable = row.detail_status === "EXTRACTED" && row.source_status === "OPEN";
    return leaves.titles.map((leafTitle, idx) => {
      const fallback = leaves.basis === "headline_fallback_review_required";
      const disposition = !usable ? "ENRICH_OR_REVIEW_STATUS"
        : !notificationUrl ? "VERIFY_OFFICIAL_NOTIFICATION_URL"
        : fallback ? "REVIEW_LEAF_TITLE" : "READY_FOR_CANONICAL_PREFLIGHT";
      return {
        inventory_id: row.id, external_id: row.external_id, recruitment_title: row.title,
        organization_name: row.organization_name, source_url: row.source_url,
        canonical_recruitment_id: row.canonical_recruitment_id,
        proposed_leaf_title: leafTitle, leaf_number: idx + 1, proposed_leaf_count: leaves.titles.length,
        leaf_basis: leaves.basis, detail_status: row.detail_status, source_status: row.source_status,
        official_notification_url: notificationUrl, official_notification_url_present: Boolean(notificationUrl),
        initial_publish_eligible: usable && Boolean(notificationUrl) && !fallback,
        disposition,
      };
    });
  });
  const counts = manifest.reduce((a, r) => {
    a[r.disposition] = (a[r.disposition] ?? 0) + 1;
    return a;
  }, {} as Record<string, number>);
  await writeFile("fja-1434-leaf-coverage.json", JSON.stringify({
    inventoryRows: rows.length, proposedLeafRows: manifest.length, dispositionCounts: counts, rows: manifest,
  }, null, 2));
  const columns = [
    "inventory_id","external_id","recruitment_title","organization_name","source_url",
    "canonical_recruitment_id","proposed_leaf_title","leaf_number","proposed_leaf_count","leaf_basis",
    "detail_status","source_status","official_notification_url","official_notification_url_present",
    "initial_publish_eligible","disposition",
  ];
  const csv = [columns.join(","), ...manifest.map(r => columns.map(c => {
    const v = (r as any)[c];
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(","))].join("\n");
  await writeFile("fja-1434-leaf-coverage.csv", csv);
  console.log("FJA_LEAF_COVERAGE_SUMMARY " + JSON.stringify({
    inventoryRows: rows.length, proposedLeafRows: manifest.length, dispositionCounts: counts,
  }));
  const expected = Number(process.env.EXPECTED_INVENTORY_ROWS ?? "1434");
  if (Number.isFinite(expected) && expected > 0 && rows.length !== expected) {
    throw new Error(`Inventory count guard failed: expected ${expected}, observed ${rows.length}. Manifest is diagnostic only and must not be used for rollout.`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
