# Migrations — the authoritative forward path

Established by MIG-001 on 2026-10-03. Everything applied before this
directory existed is documented in `../baseline/` and archived in
`docs/legacy-migrations/`.

## Invariant

All future production schema changes must occur through this migration path
and the approved ownership/privilege model. Direct production DDL or object
creation outside this path is not an accepted production mechanism.

The reason is concrete: default privileges protect only objects created by
the migration owner role. An object created by any other role, or by hand,
is outside that protection.

## Rules

1. One file per change: `<UTC timestamp>_<change-id>_<name>.sql`, plain SQL.
2. One concern per file. Unrelated changes are separate migrations.
3. Additive first. A destructive change never ships in the same migration as
   its replacement.
4. Every migration is committed before it is applied, and is applied
   unmodified.
5. Every migration is applied as the owning role `postgres`, through a
   mechanism that records it in the applied-migration history.
6. A rollback script for each migration lives in `../rollback/` and is never
   applied automatically.
7. `src/db/schema.ts` is updated in the same change, deliberately, so the
   application's model of the database stays true.
8. Each migration has a changelog entry and a ledger reference.
9. A file in this directory is never edited after it is applied. A
   correction is a new migration.

## What is not a mechanism any more

`npm run db:generate` and `npm run db:migrate` are disabled. The Drizzle
runner never ran against the production database and `drizzle-kit push`
is known to fail on it.

The tool that applies a file may change. The rule that there is exactly one
recorded, reproducible path may not.

## Deployment order for schema changes (PQ-003)

The public page query reads every column of the posting row, so code that
reads a new column breaks every job page until that column exists. Always:

1. **Migration first.** Apply the committed migration (additive, nullable or
   defaulted) and confirm it in the applied-migration history.
2. **Then code.** Deploy the code that reads or writes the new column.
3. **Then data.** Backfill or edit data only after the code that understands
   it is live.

Never reverse steps 1 and 2. A destructive change follows the additive-first
rule above and is its own later migration.

## Derived fields

`index_tier` and `quality_missing` are derived from fields the quality gate
reads. Whenever such a field is changed outside the write path (manual SQL,
backfill, script), recompute both derived fields for the affected rows in
the same change, and record that in the RESULT. Otherwise the stored tier,
the sitemap and the robots meta can disagree with the actual content.

## Live check after deployment

Run `npm run verify:live -- <slug>` for each changed page and attach the
output to the RESULT (the agent workspace cannot reach the live site).
