# Live schema baseline (MIG-001)

A snapshot of the production `public` schema as it stood on **2026-10-03**,
immediately before the migration boundary. It documents what exists. It is
**not a migration and is never applied**.

| | |
| --- | --- |
| Database | PostgreSQL 17 |
| Last applied migration at the boundary | `20261001090748 platform_rebuild_canonical_layer` |
| Boundary checksum (sha256 of `MD5SUMS`) | `350d3056738fb04dd61f3a7a14a6a0cf913bde83118cd449875fe2506c6d11c2` |

## Contents

| File | Holds |
| --- | --- |
| `01_columns.txt` | every column of the 20 tables: type, nullability, default |
| `02_objects.txt` | constraints and foreign keys, indexes, sequences, enums, extensions, triggers, row-level-security flags and policy counts, grants on tables/views/sequences/functions, default privileges, schema privileges, applied migration history |
| `views/*.sql` | the 6 view definitions |
| `functions/*.sql` | the 9 function definitions (two overloads of `calculate_recruitment_status`) |
| `MD5SUMS` | checksum of each file above |
| `snapshot-queries.sql` | the read-only queries that produced every file |

## How it was verified

No direct database connection is available from the workspace that produced
this, so each file was written from query output and then compared with an
md5 the database computed over the same text. All 17 files matched byte for
byte. To re-verify at any time, run `snapshot-queries.sql` and compare the
returned md5 values with `MD5SUMS`.

## What this baseline is for

Everything before the boundary is treated as pre-existing. The applied
migration history cannot be reconstructed from the repository (see change
G2-001), and no migration file has been written to pretend otherwise. From
the boundary onward, every schema change is a file in `supabase/migrations/`.

The state recorded here includes known defects, deliberately unmodified:
the open privileges that SEC-001 closes, the unused `calculated_status`
column, and a function that references a table that does not exist.
