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
