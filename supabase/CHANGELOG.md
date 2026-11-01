# Database change log

## 2026-10-27 — FJA private inventory bootstrap

- Adds private source-inventory, post-candidate, and append-only HTML-capture tables for FreeJobAlert research.
- Adds source-reported typed candidate fields and official-notification URL index.
- These tables are evidence only; they do not change canonical `recruitments` or `posts`, and they do not authorize publication.
- Migration: `20261027190000_fja_private_inventory_bootstrap.sql`.
- Rollback: `supabase/rollback/20261027190000_fja_private_inventory_bootstrap.sql` (manual only; export evidence before any rollback).


## 2026-11-01 — FJA-005 canonical provenance and notification URL checks

- Adds nullable direct canonical recruitment_id and post_id links to source_observations; retains posting_id for historical/legacy provenance.
- Adds private, append-only notification_url_checks history for HTTP HEAD destination checks, including explicit approved-host evidence, redirect trace, final destination, status, content type and timestamps.
- The table stores reachability/host-validation outcomes only. A successful HEAD check is not independent verification of notification contents or job facts.
- Canonical entity links are nullable so a check can be recorded before entity resolution; each check must reference a source observation.
- RLS is enabled; no anon/authenticated policies or grants are added.
- No data backfill, ingestion, publication or scheduling is included.
- Migration: supabase/migrations/20261101093000_fja_005_canonical_provenance.sql.
- Rollback: supabase/rollback/20261101093000_fja_005_canonical_provenance.down.sql (manual only; export check history first).
- Status: committed in implementation PR; NOT applied to production.
