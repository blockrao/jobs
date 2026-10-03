/**
 * Source-level architecture contracts. These read the repository's own
 * source to assert structural rules that cannot be observed from a single
 * function's output: "exactly one place builds X", "no page invents its own
 * Y". They are deliberately strict — several fail today and are expected to
 * until the wave named in each comment lands.
 */
import { describe, expect, test } from "vitest";
import { filesMatching, listFiles, readSource, stripComments } from "../helpers/source";

const JOB_LEAF_PAGE = "src/app/[locale]/jobs/[slug]/page.tsx";
const STRUCTURED_DATA_LIB = "src/lib/structured-data.ts";

/** Body of a pgTable("<name>", { ... }) column block in src/db/schema.ts. */
function tableColumns(table: string): string {
  const src = readSource("src/db/schema.ts");
  const start = src.indexOf(`pgTable(\n  "${table}"`) >= 0 ? src.indexOf(`pgTable(\n  "${table}"`) : src.indexOf(`pgTable("${table}"`);
  if (start < 0) throw new Error(`table ${table} not found in src/db/schema.ts`);
  const open = src.indexOf("{", start);
  let depth = 1;
  let i = open + 1;
  while (depth > 0 && i < src.length) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") depth--;
    i++;
  }
  return stripComments(src.slice(open, i));
}

const columnLine = (block: string, dbName: string) =>
  block.split("\n").find((l) => l.includes(`("${dbName}"`)) ?? "";

describe("structured data is built in exactly one place", () => {
  test("SD-01 JobPosting is built only by the individual job leaf page", () => {
    expect(filesMatching("src/app", /buildJobPostingSchema\s*\(/)).toEqual([JOB_LEAF_PAGE]);
  });

  test("SD-06 no parent, listing or utility page references JobPosting markup", () => {
    const offenders = listFiles("src/app")
      .filter((f) => f !== JOB_LEAF_PAGE)
      .filter((f) => /["']JobPosting["']/.test(stripComments(readSource(f))));
    expect(offenders).toEqual([]);
  });

  // Fails until W1-D: organizations and exams pages define private copies.
  test("SD-03 no schema builder is defined outside the shared structured-data library", () => {
    const offenders = listFiles("src")
      .filter((f) => f !== STRUCTURED_DATA_LIB)
      .filter((f) => /function\s+build\w*Schema\s*\(|const\s+build\w*Schema\s*=/.test(stripComments(readSource(f))));
    expect(offenders).toEqual([]);
  });

  // Fails until W1-D: the same two pages hand-roll "@context" per object.
  test("SD-04 every page that injects JSON-LD wraps it with the shared jsonLdGraph", () => {
    const offenders = filesMatching("src/app", /application\/ld\+json/).filter(
      (f) => !/jsonLdGraph\s*\(/.test(stripComments(readSource(f))),
    );
    expect(offenders).toEqual([]);
  });
});

describe("SEO policy is centralized", () => {
  // Fails until W1-D creates src/lib/seo and every page adopts it.
  test("CAN-05 no route file builds canonical/hreflang/robots itself; all go through src/lib/seo", () => {
    const offenders = filesMatching("src/app", /\balternates\s*:|\brobots\s*:\s*[{"'`]/).filter(
      (f) => !/from\s+["']@\/lib\/seo/.test(readSource(f)),
    );
    expect(offenders).toEqual([]);
  });

  // Fails until W1-D: <html lang="en"> is a literal, repaired client-side.
  test("LOC-01 the root layout does not hardcode <html lang>", () => {
    const layout = stripComments(readSource("src/app/layout.tsx"));
    expect(layout).not.toMatch(/<html[^>]*\blang=["'][a-zA-Z-]+["']/);
  });

  test("LOC-01b no client component is responsible for correcting <html lang> after hydration", () => {
    expect(filesMatching("src", /document\.documentElement\.lang\s*=/)).toEqual([]);
  });
});

describe("entity model shape (application schema)", () => {
  test("ENT-01 a Recruitment always has an Organization", () => {
    const line = columnLine(tableColumns("recruitments"), "organization_id");
    expect(line).toMatch(/\.notNull\(\)/);
    expect(line).toMatch(/references\(\s*\(\)\s*=>\s*organizations\.id/);
  });

  test("ENT-02 Exam is optional on a Recruitment (direct recruitment is first-class)", () => {
    const line = columnLine(tableColumns("recruitments"), "exam_id");
    expect(line).toMatch(/references\(\s*\(\)\s*=>\s*exams\.id/);
    expect(line).not.toMatch(/\.notNull\(\)/);
  });

  test("ENT-03 / ENT-04 a Post belongs to a Recruitment and references a Position", () => {
    const block = tableColumns("posts");
    expect(columnLine(block, "recruitment_id")).toMatch(/\.notNull\(\)/);
    expect(columnLine(block, "recruitment_id")).toMatch(/recruitments\.id/);
    expect(columnLine(block, "position_id")).toMatch(/positions\.id/);
  });

  test("ENT-05 Position is evergreen: it carries no recruitment, organization or year column", () => {
    const block = tableColumns("positions");
    for (const col of ["recruitment_id", "organization_id", "year", "valid_through"]) {
      expect(columnLine(block, col), col).toBe("");
    }
  });

  test("ENT-06 no foreign key in the application schema points at a slug", () => {
    expect(stripComments(readSource("src/db/schema.ts"))).not.toMatch(/references\(\s*\(\)\s*=>\s*\w+\.slug/);
  });

  // Fails until W1-B: resolveRecruitment() uses the slug as its conflict
  // target and then looks the row up again by slug, and
  // getOrCreateOrganization() treats a slugified name as the organization's
  // identity (how one real body became several Organization rows).
  //
  // Scope is the WRITE path only. Reading an entity by slug to serve its URL
  // (src/db/operations/get-*.ts) is routing, not identity, and is fine.
  test("ENT-07 entity resolution never uses a slug as the identity of a canonical entity", () => {
    const offenders = listFiles("src/ingest")
      .concat(listFiles("src/db/operations").filter((f) => /\/write-/.test(f)))
      .filter((f) =>
        /target:\s*(recruitments|posts|positions|organizations)\.slug|eq\(\s*(recruitments|posts)\.slug/.test(
          stripComments(readSource(f)),
        ),
      );
    expect(offenders).toEqual([]);
  });
});

describe("trust boundary in application code (SEC-001)", () => {
  const CRON_ENDPOINTS = ["src/pages/api/ingest.ts", "src/app/api/cron/update-recruitment-lifecycle/route.ts"];

  // A privileged endpoint must refuse when its secret is not configured. A
  // literal fallback secret, or a comparison that passes when both sides are
  // undefined, leaves it open.
  test.each(CRON_ENDPOINTS)("SEC-05 %s fails closed when CRON_SECRET is unset", (file) => {
    const src = stripComments(readSource(file));
    expect(src, "no fallback secret").not.toMatch(/CRON_SECRET\s*(\|\||\?\?)/);
    expect(src, "explicit refusal when the secret is missing").toMatch(/if\s*\(\s*!\s*\w*[sS]ecret\w*\s*\|\|/);
  });

  // Server actions are reachable as public endpoints, so a path guard is not
  // enough: each mutating action must check the admin session itself.
  test("SEC-06 every mutating admin action verifies the admin session itself", () => {
    const src = stripComments(readSource("src/app/admin/actions.ts"));
    const exempt = new Set(["loginAction", "logoutAction"]);
    const parts = src.split(/\nexport async function /).slice(1);
    const unguarded = parts
      .map((part) => ({ name: part.match(/^\w+/)![0], body: part.split(/\n(?:async )?function /)[0] }))
      .filter(({ name }) => !exempt.has(name))
      .filter(({ body }) => !/await requireAdmin\(\)/.test(body))
      .map(({ name }) => name);
    expect(parts.length).toBeGreaterThan(2);
    expect(unguarded).toEqual([]);
  });

  test("SEC-07 the application schema declares row-level security on every table", () => {
    const src = stripComments(readSource("src/db/schema.ts"));
    const tables = (src.match(/=\s*pgTable\(/g) ?? []).length;
    const declared = (src.match(/\.enableRLS\(\)/g) ?? []).length;
    expect(tables).toBeGreaterThan(0);
    expect(declared).toBe(tables);
  });
});
