/**
 * Pure generator for the state_slug backfill. No DB access: it turns a JSON
 * export of postings into ONE reviewable, fill-only SQL script plus a CSV for
 * human review. Slugs and state names only ever come from STATES; free text
 * (titles) appears only in the CSV, never in SQL.
 */
import { getStateBySlug } from "./states";
import { resolveState, type StateBasis } from "./resolve-state";

export interface BackfillRow {
  id: number;
  title: string;
  organizationName: string | null;
  locationRegion: string | null;
  locationCity: string | null;
  organizationState: string | null;
  reviewStatus?: string | null;
  currentLocationRegion?: string | null;
}

export interface BackfillResult {
  sql: string;
  csv: string;
  unresolvedIds: number[];
  resolvedCount: number;
  regionFillCount: number;
}

export const BACKUP_SCHEMA = "backup_20261005";
export const BACKUP_TABLE = "postings_state_backfill";
const BATCH = 500;

export const sqlString = (s: string): string => `'${s.replace(/'/g, "''")}'`;

function csvField(v: string | number): string {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const blank = (v: string | null | undefined) => v == null || v.trim() === "";

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export function buildBackfill(inputRows: BackfillRow[]): BackfillResult {
  const seen = new Set<number>();
  const rows: BackfillRow[] = [];
  for (const r of inputRows) {
    if (!Number.isInteger(r.id)) throw new Error(`Invalid posting id: ${String(r.id)}`);
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    rows.push(r);
  }

  const resolved: Array<{ row: BackfillRow; slug: string; name: string; basis: StateBasis }> = [];
  const unresolvedIds: number[] = [];
  for (const row of rows) {
    const res = resolveState({
      title: row.title,
      organizationName: row.organizationName,
      locationRegion: row.locationRegion,
      locationCity: row.locationCity,
      organizationState: row.organizationState,
    });
    const st = res ? getStateBySlug(res.slug) : undefined;
    if (!res || !st) {
      unresolvedIds.push(row.id);
      continue;
    }
    resolved.push({ row, slug: st.slug, name: st.name, basis: res.basis });
  }

  // (c) region text is filled only where no location data exists at all, and
  // only for bases that are not themselves location evidence. 'place' (an
  // employer named after the place it sits in) is treated like
  // organization_name: it may fill region only when region AND city are blank.
  const REGION_FILL_BASES: ReadonlySet<StateBasis> = new Set<StateBasis>([
    "organization_state",
    "organization_name",
    "title",
    "place",
  ]);
  const regionFill = resolved.filter(
    (x) =>
      REGION_FILL_BASES.has(x.basis) &&
      blank(x.row.locationRegion) &&
      blank(x.row.locationCity) &&
      blank(x.row.currentLocationRegion),
  );

  const lines: string[] = [];
  lines.push(
    "-- state_slug backfill. Fill-only: never overwrites an existing state_slug or location data.",
    `-- Rows examined: ${rows.length}; resolved: ${resolved.length}; unresolved (left NULL): ${unresolvedIds.length}.`,
    "-- Review the CSV summary first. Run statements in order; each is idempotent after the backup exists.",
    "",
  );

  if (resolved.length === 0) {
    lines.push("-- Nothing resolved: no statements generated.", "");
  } else {
    const ids = resolved.map((x) => x.row.id);
    lines.push(
      "-- (a) Backup of the rows about to change (fails if the backup table already exists, by design).",
      `CREATE SCHEMA IF NOT EXISTS ${BACKUP_SCHEMA};`,
      `CREATE TABLE ${BACKUP_SCHEMA}.${BACKUP_TABLE} AS`,
      `SELECT id, location_region, state_slug FROM public.postings WHERE id IN (${ids.join(", ")});`,
      "",
      "-- (b) Fill state_slug only where it is still NULL.",
    );
    for (const part of chunk(resolved, BATCH)) {
      lines.push(
        "UPDATE public.postings AS p SET state_slug = v.slug",
        `FROM (VALUES ${part.map((x) => `(${x.row.id}, ${sqlString(x.slug)})`).join(", ")}) AS v(id, slug)`,
        "WHERE p.id = v.id AND p.state_slug IS NULL;",
        "",
      );
    }
    lines.push("-- (c) Fill the display region only where the posting has no location data at all.");
    if (regionFill.length === 0) {
      lines.push("-- (no eligible rows)", "");
    } else {
      for (const part of chunk(regionFill, BATCH)) {
        lines.push(
          "UPDATE public.postings AS p SET location_region = v.region",
          `FROM (VALUES ${part.map((x) => `(${x.row.id}, ${sqlString(x.slug)}, ${sqlString(x.name)})`).join(", ")}) AS v(id, slug, region)`,
          "WHERE p.id = v.id AND p.state_slug = v.slug AND p.location_region IS NULL AND p.location_city IS NULL;",
          "",
        );
      }
    }
  }

  lines.push(
    "-- (d) Verification.",
    "SELECT state_slug, count(*) AS postings FROM public.postings GROUP BY state_slug ORDER BY postings DESC, state_slug;",
    "",
  );

  const csvLines = ["id,title,slug,basis"];
  for (const x of resolved) csvLines.push([x.row.id, x.row.title, x.slug, x.basis].map(csvField).join(","));
  const unresolvedSet = new Set(unresolvedIds);
  for (const row of rows) {
    if (unresolvedSet.has(row.id)) csvLines.push([row.id, row.title, "", "unresolved"].map(csvField).join(","));
  }

  return {
    sql: lines.join("\n"),
    csv: csvLines.join("\n") + "\n",
    unresolvedIds,
    resolvedCount: resolved.length,
    regionFillCount: regionFill.length,
  };
}
