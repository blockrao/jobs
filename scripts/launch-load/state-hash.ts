/**
 * Before/after hashes of existing rows. Run `beforeSql()` on the target just before the
 * load; it returns, per table, the highest id, the row count and an md5 over every row
 * (all columns, so any edit shows). After the load, `afterSql(before)` hashes the same
 * rows (id <= the recorded highest id) and the two results must be identical.
 */
export const STATE_TABLES = [
  "organizations", "organization_aliases", "organization_candidates", "sources", "source_documents",
  "positions", "recruitments", "posts", "vacancies", "postings", "posting_updates", "posting_categories",
  "source_observations", "exams", "commissions", "categories", "articles",
];

/** Tables whose primary key is not a single `id` column: hashed whole, in a stable order, with no id filter. */
const NO_ID = new Set(["posting_categories"]);

const id = (s: string) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error(`unsafe identifier ${s}`);
  return s;
};

export function beforeSql(): string {
  return (
    STATE_TABLES.map(
      (t) =>
        NO_ID.has(t)
          ? `select '${id(t)}' as tbl, 0::bigint as max_id, count(*)::int as n, coalesce(md5(string_agg(md5(x::text), '' order by md5(x::text))), md5('')) as h from public.${id(t)} x`
          : `select '${id(t)}' as tbl, coalesce(max(id),0)::bigint as max_id, count(*)::int as n, coalesce(md5(string_agg(md5(x::text), '' order by x.id)), md5('')) as h from public.${id(t)} x`,
    ).join("\nunion all\n") + ";\n"
  );
}

export function afterSql(before: { tbl: string; max_id: string | number }[]): string {
  const maxOf = new Map(before.map((b) => [b.tbl, Number(b.max_id)]));
  return (
    STATE_TABLES.map(
      (t) =>
        NO_ID.has(t)
          ? `select '${id(t)}' as tbl, 0::bigint as max_id, count(*)::int as n, coalesce(md5(string_agg(md5(x::text), '' order by md5(x::text))), md5('')) as h from public.${id(t)} x`
          : `select '${id(t)}' as tbl, ${maxOf.get(t) ?? 0}::bigint as max_id, count(*)::int as n, coalesce(md5(string_agg(md5(x::text), '' order by x.id)), md5('')) as h from public.${id(t)} x where x.id <= ${maxOf.get(t) ?? 0}`,
    ).join("\nunion all\n") + ";\n"
  );
}

/** Tables hashed with an id bound (everything except NO_ID tables); apply.sh reads each maximum before the load. */
export const BOUNDED_TABLES = STATE_TABLES.filter((t) => !NO_ID.has(t));

/** One SQL file for psql: hashes rows with id <= :max_<table>, set with -v by apply.sh. Run before and after the load. */
export function parametricSql(): string {
  return (
    STATE_TABLES.map((t) =>
      NO_ID.has(t)
        ? `select '${id(t)}', 0, count(*)::int, coalesce(md5(string_agg(md5(x::text), '' order by md5(x::text))), md5('')) from public.${id(t)} x`
        : `select '${id(t)}', :max_${id(t)}, count(*)::int, coalesce(md5(string_agg(md5(x::text), '' order by x.id)), md5('')) from public.${id(t)} x where x.id <= :max_${id(t)}`,
    ).join("\nunion all\n") + ";\n"
  );
}

if (process.argv[1]?.endsWith("state-hash.ts")) {
  console.log(beforeSql());
}
