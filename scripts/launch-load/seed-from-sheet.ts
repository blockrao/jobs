/**
 * Applies the owner-approved alias seed (alias_seed_review_v2, approved 2026-10-04) to a
 * LOCAL scratch database that mirrors production, under the conservative rule:
 *
 *   - one organization per approved body, with ONE alias: its own normalized canonical name;
 *   - fuzzy-merged variants are NOT aliased (they stay candidates, unresolved);
 *   - a body that already resolves to an existing organization is not created again;
 *   - a body whose name is wholly contained in an existing organization's name (the sheet's
 *     "close" matches that are the same body or a broader name) is left unresolved;
 *   - a name that fails the organization-name validator is left unresolved.
 *
 *   npx tsx scripts/launch-load/seed-from-sheet.ts --db postgres://...localhost.../scratch --rows scripts/launch-load/seed_rows.json --out seed_report.json
 *
 * Writes only to the given local database. Never connects to production.
 */
import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";
import { lookupForms, normalizeOrgName, normalizeWithoutParens, orgNameVerdict } from "../../src/lib/org-name";

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const db = arg("db")!;
const rowsFile = arg("rows")!;
const outFile = arg("out")!;
const host = new URL(db).hostname;
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) throw new Error(`seed runs on a local scratch database only (got "${host}")`);

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100)
    .replace(/-$/, "");

function familySector(family: string, canonical: string): string {
  if (family === "Bank") return "BANKING";
  if (family === "Railway") return "RAILWAY";
  if (family === "Public Service Commission" && !/^union\b/i.test(canonical)) return "GOVERNMENT_STATE";
  return "GOVERNMENT_CENTRAL";
}

const toks = (s: string) => new Set(normalizeWithoutParens(s).split(" ").filter((w) => w.length > 2 && !["and", "the", "of", "for"].includes(w)));
const subset = (a: Set<string>, b: Set<string>) => [...a].every((w) => b.has(w));

async function main() {
  const sql = postgres(db, { max: 2, onnotice: () => {} });
  const rows: { rank: number; canonical: string; family: string; existing: string | null; fuzzy: boolean }[] = JSON.parse(readFileSync(rowsFile, "utf8"));
  const orgs = await sql`select id, slug, name from public.organizations`;
  const aliasRows = await sql`select alias_normalized from public.organization_aliases`;
  const haveAlias = new Set(aliasRows.map((a: any) => a.alias_normalized));
  const haveSlug = new Set(orgs.map((o: any) => o.slug));
  const existingForms = new Map<string, number[]>();
  for (const o of orgs as any[]) {
    if (!orgNameVerdict(o.name).ok) continue;
    for (const f of lookupForms(o.name)) existingForms.set(f, [...(existingForms.get(f) ?? []), o.id]);
  }

  const report: any = { created: [], skipped: [] as { canonical: string; reason: string; with?: string }[], fuzzyRowsKept: 0 };
  for (const r of rows) {
    const canonical = r.canonical.trim();
    const norm = normalizeOrgName(canonical);
    const skip = (reason: string, withName?: string) => report.skipped.push({ rank: r.rank, canonical, reason, with: withName });
    if (r.fuzzy) report.fuzzyRowsKept++;
    if (!norm) { skip("EMPTY_NORMALIZED_NAME"); continue; }
    if (!orgNameVerdict(canonical).ok) { skip("NAME_FAILS_VALIDATOR"); continue; }

    // Already resolves to an existing organization (exact name, or the sheet's "exact" match): reuse it, no new row.
    const forms = lookupForms(canonical);
    const hit = forms.map((f) => existingForms.get(f)).find((ids) => ids && ids.length > 0);
    if (hit) {
      skip(hit.length > 1 ? "EXISTING_AMBIGUOUS_NOT_ALIASED" : "EXISTING_ORG_REUSED_BY_NAME", orgs.find((o: any) => o.id === hit[0])?.name);
      continue;
    }
    // Same body or broader name already present (sheet "close" matches): leave unresolved.
    const mine = toks(canonical);
    const container = (orgs as any[]).find((o) => orgNameVerdict(o.name).ok && mine.size >= 2 && subset(mine, toks(o.name)));
    if (container) { skip("NAME_CONTAINED_IN_EXISTING_ORG", container.name); continue; }
    if (haveAlias.has(norm)) { skip("ALIAS_ALREADY_EXISTS"); continue; }

    let slug = slugify(canonical);
    if (!slug || haveSlug.has(slug)) { skip("SLUG_COLLISION"); continue; }
    const sector = familySector(r.family, canonical);
    const o = await sql`insert into public.organizations (slug, name, sector) values (${slug}, ${canonical}, ${sector}::org_sector) returning id`;
    await sql`insert into public.organization_aliases (organization_id, alias_normalized, alias_raw, source) values (${o[0].id}, ${norm}, ${canonical}, ${"launch-seed-2026-10-04"})`;
    haveAlias.add(norm);
    haveSlug.add(slug);
    report.created.push({ rank: r.rank, canonical, sector });
  }
  report.counts = {
    sheetRows: rows.length,
    created: report.created.length,
    skipped: report.skipped.length,
    skippedByReason: report.skipped.reduce((a: any, s: any) => ((a[s.reason] = (a[s.reason] ?? 0) + 1), a), {}),
    fuzzyRowsCreatedWithOneAliasOnly: rows.filter((r) => r.fuzzy).length,
  };
  writeFileSync(outFile, JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report.counts, null, 1));
  await sql.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
