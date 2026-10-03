/**
 * Live-database invariants. Each query returns ONE row with an integer
 * `violations` column; the invariant holds when it is 0.
 *
 * This list is the single source of truth: tests/contracts/db/
 * entity-integrity.test.ts runs it when CONTRACT_DATABASE_URL is set, and
 * the same SQL is what docs/ARCHITECTURE_CHANGELOG.md baselines are taken
 * from. Every query is read-only.
 */
export type DbInvariant = { id: string; title: string; sql: string };

const norm = (col: string) => `regexp_replace(lower(${col}), '[^a-z0-9]+', '', 'g')`;
// Name with any trailing/embedded "(ABBR)" parenthetical removed, then normalized.
const normNoParen = (col: string) => norm(`regexp_replace(${col}, '\\s*\\([^)]*\\)', '', 'g')`);

export const DB_INVARIANTS: DbInvariant[] = [
  {
    id: "ENT-01",
    title: "every Recruitment has an Organization (column NOT NULL and row resolves)",
    sql: `select (select count(*) from information_schema.columns where table_schema='public' and table_name='recruitments' and column_name='organization_id' and is_nullable='YES')
               + (select count(*) from recruitments r left join organizations o on o.id=r.organization_id where o.id is null) as violations`,
  },
  {
    id: "ENT-02",
    title: "Exam is optional on Recruitment (exam_id is nullable)",
    sql: `select count(*) as violations from information_schema.columns where table_schema='public' and table_name='recruitments' and column_name='exam_id' and is_nullable='NO'`,
  },
  {
    id: "ENT-03",
    title: "every Post belongs to a Recruitment",
    sql: `select count(*) as violations from posts p left join recruitments r on r.id=p.recruitment_id where r.id is null`,
  },
  {
    id: "ENT-04",
    title: "every Post references a Position",
    sql: `select count(*) as violations from posts p left join positions x on x.id=p.position_id where x.id is null`,
  },
  {
    id: "ENT-05",
    title: "Position is evergreen (no recruitment/organization/year column)",
    sql: `select count(*) as violations from information_schema.columns where table_schema='public' and table_name='positions' and column_name in ('recruitment_id','organization_id','year','valid_through')`,
  },
  {
    id: "ENT-06",
    title: "every foreign key targets a primary key (entity ID), never a slug or other column",
    sql: `select count(*) as violations from pg_constraint fk
          where fk.contype='f' and fk.connamespace='public'::regnamespace
            and not exists (select 1 from pg_constraint pk where pk.contype='p' and pk.conrelid=fk.confrelid and pk.conkey=fk.confkey)`,
  },
  {
    id: "ENT-08a",
    title: "no two Organizations share a normalized name",
    sql: `select count(*) as violations from (select 1 from organizations group by ${norm("name")} having count(*)>1) s`,
  },
  {
    id: "ENT-08b",
    title: "no two Organizations differ only by a parenthetical abbreviation",
    sql: `select count(*) as violations from (select 1 from organizations group by ${normNoParen("name")} having count(*)>1) s`,
  },
  {
    id: "ENT-08c",
    title: "no two Recruitments of one Organization share a normalized name",
    sql: `select count(*) as violations from (select 1 from recruitments group by organization_id, ${norm("name")} having count(*)>1) s`,
  },
  {
    id: "ENT-08d",
    title: "no two Positions share a normalized name",
    sql: `select count(*) as violations from (select 1 from positions group by ${norm("name")} having count(*)>1) s`,
  },
  {
    id: "ENT-09a",
    title: "a posting's Post belongs to the posting's Recruitment",
    sql: `select count(*) as violations from postings p join posts po on po.id=p.inferred_post_id where po.recruitment_id is distinct from p.inferred_recruitment_id`,
  },
  {
    id: "ENT-09b",
    title: "a posting's Recruitment belongs to the posting's Organization",
    sql: `select count(*) as violations from postings p join recruitments r on r.id=p.inferred_recruitment_id where r.organization_id <> p.organization_id`,
  },
  {
    id: "ENT-10",
    title: "slugs are unique per entity type (one URL identifier per entity)",
    sql: `select (select count(*) from (select 1 from organizations group by slug having count(*)>1) a)
               + (select count(*) from (select 1 from recruitments group by slug having count(*)>1) b)
               + (select count(*) from (select 1 from positions group by slug having count(*)>1) c)
               + (select count(*) from (select 1 from exams group by slug having count(*)>1) d)
               + (select count(*) from (select 1 from posts group by recruitment_id, slug having count(*)>1) e) as violations`,
  },
  // --- Trust boundary (SEC-001, ledger A-022). An untrusted caller reaches the
  // database only as one of the public roles; these prove those roles can do
  // nothing, and that new objects are closed by default.
  {
    id: "SEC-01",
    title: "every table in the public schema has row-level security on",
    sql: `select count(*) as violations from pg_class where relnamespace='public'::regnamespace and relkind='r' and not relrowsecurity`,
  },
  {
    id: "SEC-02",
    title: "the public roles hold no privilege on any table, view or sequence",
    sql: `select (select count(*) from pg_class c, unnest(array['anon','authenticated']) r, unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p
                  where c.relnamespace='public'::regnamespace and c.relkind in ('r','v') and has_table_privilege(r, c.oid, p))
               + (select count(*) from (select oid from pg_class where relnamespace='public'::regnamespace and relkind='S' offset 0) s, unnest(array['anon','authenticated']) r, unnest(array['USAGE','SELECT','UPDATE']) p
                  where has_sequence_privilege(r, s.oid, p)) as violations`,
  },
  {
    id: "SEC-03",
    title: "neither the public roles nor PUBLIC can execute any function",
    sql: `select (select count(*) from pg_proc f, unnest(array['anon','authenticated']) r where f.pronamespace='public'::regnamespace and has_function_privilege(r, f.oid, 'EXECUTE'))
               + (select count(*) from pg_proc f where f.pronamespace='public'::regnamespace and (f.proacl is null or exists (select 1 from aclexplode(f.proacl) a where a.grantee=0))) as violations`,
  },
  {
    id: "SEC-04",
    title: "objects created by the migration owner are closed to the public roles by default",
    sql: `select (select count(*) from pg_default_acl d, aclexplode(d.defaclacl) a
                  where d.defaclrole='postgres'::regrole and d.defaclnamespace='public'::regnamespace and a.grantee in ('anon'::regrole, 'authenticated'::regrole))
               + (case when exists (select 1 from pg_default_acl d where d.defaclrole='postgres'::regrole and d.defaclnamespace=0 and d.defaclobjtype='f'
                                    and not exists (select 1 from aclexplode(d.defaclacl) a where a.grantee=0)) then 0 else 1 end) as violations`,
  },
];

/** Columns present live but absent from src/db/schema.ts, per table (SCH-01). */
export const LIVE_COLUMNS_SQL = `select table_name, column_name from information_schema.columns
  where table_schema='public' and table_name in (select tablename from pg_tables where schemaname='public')
  order by table_name, ordinal_position`;
