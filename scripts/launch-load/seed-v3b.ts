/**
 * Applies the owner-approved organization decisions (review sheet v3b) to a LOCAL scratch
 * database that mirrors production. Conservative, identity-first:
 *   - exact / token-equal match to an existing organization  -> ALIAS to it (no new row)
 *   - the name is a strict part of an existing organization, or an existing organization is a
 *     strict part of the name (a sub-unit)                     -> HELD, left as a candidate
 *   - otherwise                                                -> CREATE one organization with aliases
 * Rows may force a target organization (recruitment cells -> parent body).
 *
 *   npx tsx scripts/launch-load/seed-v3b.ts --db postgres://localhost.../scratch_p3 --rows rows.json --out report.json
 * Writes only to a local scratch database.
 */
import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";
import { lookupForms, normalizeOrgName, normalizeWithoutParens, orgNameVerdict } from "../../src/lib/org-name";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const db = arg("db")!; const rowsFile = arg("rows")!; const outFile = arg("out")!;
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(db).hostname)) throw new Error("local scratch database only");
const SOURCE = "launch-seed-v3b-2026-10-04";
const STOP = new Set(["and", "the", "of", "for", "in", "at", "a", "government", "govt", "india", "indian", "ltd", "limited"]);
const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100).replace(/-$/, "");
const toks = (s: string) => new Set(normalizeWithoutParens(s).split(" ").filter((w) => w.length > 1 && !STOP.has(w)));
const eq = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((w) => b.has(w));
const sub = (a: Set<string>, b: Set<string>) => a.size < b.size && [...a].every((w) => b.has(w));
const STATES = /\b(andhra|arunachal|assam|bihar|chhattisgarh|goa|gujarat|haryana|himachal|jharkhand|karnataka|kerala|madhya pradesh|maharashtra|manipur|meghalaya|mizoram|nagaland|odisha|punjab|rajasthan|sikkim|tamil nadu|telangana|tripura|uttar pradesh|uttarakhand|west bengal|delhi|jammu|ladakh|puducherry)\b/i;
function sector(n: string): string {
  if (/\bbank\b/i.test(n)) return "BANKING";
  if (/\b(drdo|defence|naval|army|armed forces|ordnance|navy|air force)\b/i.test(n)) return "DEFENCE";
  if (/\b(konkan railway|rites|irctc|indian railway catering)\b/i.test(n)) return "PSU";
  if (/\brailway/i.test(n)) return "RAILWAY";
  if (/\b(limited|ltd|corporation|steel authority|power grid|grid)\b/i.test(n) && !/\b(university|commission|hospital|board|institute|mission)\b/i.test(n)) return "PSU";
  if (STATES.test(n) && !/\b(national|central|all india|indian|ministry|union)\b/i.test(n)) return "GOVERNMENT_STATE";
  return "GOVERNMENT_CENTRAL";
}
const UNIT = /\b(hospital|plant|college|centre|center|division|zone|regional|laboratory|institute|school|campus|unit|refinery|yard|office|cell|project|directorate|department|district|board|society|schools|complex|court|branch|circle|region)\b/;
type Row = { rank: number; seen: string; canonical: string; target?: number; hold?: boolean };
async function main() {
  const sql = postgres(db, { max: 2, onnotice: () => {} });
  const rows: Row[] = JSON.parse(readFileSync(rowsFile, "utf8"));
  const orgs: any[] = [...(await sql`select id, slug, name from public.organizations`)];
  const haveAlias = new Map<string, number>((await sql`select alias_normalized, organization_id from public.organization_aliases`).map((a: any) => [a.alias_normalized, a.organization_id]));
  const haveSlug = new Set(orgs.map((o) => o.slug));
  const rep: any = { created: [], aliased: [], held: [] };
  const addAliases = async (id: number, raw: string, canonical: string) => {
    const seen = new Set<string>();
    for (const [form, rawText] of [...lookupForms(canonical).map((f) => [f, canonical]), ...lookupForms(raw).map((f) => [f, raw])] as [string, string][]) {
      if (seen.has(form) || haveAlias.has(form)) continue;
      seen.add(form);
      await sql`insert into public.organization_aliases (organization_id, alias_normalized, alias_raw, source) values (${id}, ${form}, ${rawText}, ${SOURCE})`;
      haveAlias.set(form, id);
    }
  };
  for (const r of rows) {
    const c = r.canonical.trim();
    const hold = (reason: string, w?: string) => rep.held.push({ rank: r.rank, seen: r.seen, canonical: c, reason, with: w });
    if (r.target) {
      const t = orgs.find((o) => o.id === r.target)!;
      await addAliases(t.id, r.seen, c); rep.aliased.push({ rank: r.rank, seen: r.seen, to: t.name, why: "forced" }); continue;
    }
    if (!normalizeOrgName(c)) { hold("EMPTY"); continue; }
    if (!orgNameVerdict(c).ok) { hold("NAME_FAILS_VALIDATOR"); continue; }
    if (r.hold) { hold("HELD_BY_DECISION"); continue; }
    const hitForm = lookupForms(c).map((f) => haveAlias.get(f)).find((x) => x);
    const mine = toks(c);
    const same = hitForm ? orgs.find((o) => o.id === hitForm) : orgs.find((o) => orgNameVerdict(o.name).ok && eq(mine, toks(o.name)));
    if (same) { await addAliases(same.id, r.seen, c); rep.aliased.push({ rank: r.rank, seen: r.seen, to: same.name, why: hitForm ? "alias" : "token-equal" }); continue; }
    // An existing valid organization whose full name is the leading words of this name.
    const cw = ` ${normalizeWithoutParens(c)} `;
    const lead = orgs.filter((o) => orgNameVerdict(o.name).ok && normalizeWithoutParens(o.name).split(" ").length >= 3 && cw.startsWith(` ${normalizeWithoutParens(o.name)} `)).sort((x, y) => y.name.length - x.name.length)[0];
    if (lead) {
      const rest = cw.slice(` ${normalizeWithoutParens(lead.name)} `.length);
      if (UNIT.test(rest)) { hold("SUB_UNIT_OF_EXISTING", lead.name); continue; }
      await addAliases(lead.id, r.seen, c); rep.aliased.push({ rank: r.rank, seen: r.seen, to: lead.name, why: "qualifier-only" }); continue;
    }
    const slug = slugify(c);
    if (!slug || haveSlug.has(slug)) { hold("SLUG_COLLISION"); continue; }
    const s = sector(c);
    const o = await sql`insert into public.organizations (slug, name, sector) values (${slug}, ${c}, ${s}::org_sector) returning id`;
    orgs.push({ id: o[0].id, slug, name: c }); haveSlug.add(slug);
    await addAliases(o[0].id, r.seen, c);
    rep.created.push({ rank: r.rank, canonical: c, sector: s });
  }
  rep.counts = { rows: rows.length, created: rep.created.length, aliased: rep.aliased.length, held: rep.held.length };
  writeFileSync(outFile, JSON.stringify(rep, null, 1)); console.log(JSON.stringify(rep.counts));
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
