# Historical migration files — not authoritative

Moved here unchanged by MIG-001 on 2026-10-03 from `drizzle/`, `migrations/`
and `src/db/migrations/`. `SHA256SUMS` records each file's checksum; the
move was verified to leave every file byte-identical.

These files are historical artifacts. They do not describe what was applied
to production: of the nine migrations recorded as applied, at most one
matches a file here in content, and several files here create objects that
do not exist in the database. Do not apply, edit or "complete" them.

The actual pre-boundary state is in `supabase/baseline/`. New changes go in
`supabase/migrations/`.
