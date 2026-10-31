# Database change log

## 2026-10-27 — FJA private inventory bootstrap

- Adds private source-inventory, post-candidate, and append-only HTML-capture tables for FreeJobAlert research.
- Adds source-reported typed candidate fields and official-notification URL index.
- These tables are evidence only; they do not change canonical `recruitments` or `posts`, and they do not authorize publication.
- Migration: `20261027190000_fja_private_inventory_bootstrap.sql`.
- Rollback: `supabase/rollback/20261027190000_fja_private_inventory_bootstrap.sql` (manual only; export evidence before any rollback).

## 2026-10-31 — P0 official-source provenance and review gate (not yet applied)

- Adds immutable `recruitments.source_discovery_origin`, backfilled from Recruitment extraction metadata, extracted-link source labels, and canonical Post source labels.
- Adds field-level evidence columns to canonical Post fact families and explicit issuer/fact review fields to `official_digest_promote`.
- Adds database write guards so aggregator-discovered Recruitments, Posts, enrichment, eligibility and child facts cannot be marked official/verified without a reviewed issuer source, field evidence and exact Recruitment-to-Post identity match.
- Adds a shared SQL trust predicate for public listings, related posts, organization views and sitemaps.
- Does not demote, quarantine, suppress, delete, or re-ingest existing rows. The destructive remediation is a separate future migration and remains blocked on the legacy review queue in #208.
- Production audit baseline: 6,282 candidate aggregator-origin Recruitments; 4,449 live; 5,927 without a staging match. The 355 staging matches have exact canonical Post ID and name parity.
- Migration: `20261031070000_p0_official_source_authority_gate.sql`.
- Rollback: `supabase/rollback/20261031070000_p0_official_source_authority_gate.sql` (guarded; refuses to discard review evidence or post-migration fact provenance).
- Ledger: A-092.
