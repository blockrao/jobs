# Database change log

## 2026-10-27 — FJA private inventory bootstrap

- Adds private source-inventory, post-candidate, and append-only HTML-capture tables for FreeJobAlert research.
- Adds source-reported typed candidate fields and official-notification URL index.
- These tables are evidence only; they do not change canonical `recruitments` or `posts`, and they do not authorize publication.
- Migration: `20261027190000_fja_private_inventory_bootstrap.sql`.
- Rollback: `supabase/rollback/20261027190000_fja_private_inventory_bootstrap.sql` (manual only; export evidence before any rollback).
