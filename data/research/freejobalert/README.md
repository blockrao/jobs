# Public recruitment-fact snapshot

This folder is for **separate, temporary research snapshots** used to compare aggregator-extracted leads with official recruitment notifications. It is not a JobOye content source and must not feed public pages or production tables directly.

## Utility

From the repository root:

```bash
MAX_PAGES=1000 DELAY_MS=1200 npx tsx scripts/snapshot-freejobalert-facts.ts
```

The script:
- discovers article URLs from publicly available sitemaps;
- uses a descriptive user agent and a delay between requests;
- stops if it receives access-denied or rate-limit responses;
- writes timestamped JSONL records and a separate JSONL error log here;
- records source URL, retrieval timestamp, SHA-256 of the retrieved HTML, table facts, candidate official links, section evidence, and visible text;
- does **not** connect to Supabase, alter JobOye data, publish pages, or treat any extracted value as verified.

Outputs are deliberately not checked into Git. Keep snapshots in a local research workspace and avoid committing full page text/HTML. Before running, review the site's current robots.txt and applicable terms. If robots rules or terms do not permit the crawl, do not run it.

## Reconciliation rules

1. Aggregator facts are **discovery leads**, not authority.
2. Match by organization, recruitment/notification identifier, role/Post, and notification date where available; do not match on title alone.
3. Verify every accepted field against the linked official notification or official application portal.
4. Store the official document URL and the exact evidence/section used to verify a fact.
5. Keep contradictions, missing facts, confidence, and review status explicit. Never overwrite production values automatically.
6. Do not reuse the aggregator's prose, branding, page layout, or editorial copy. Extract only factual candidates and independently verify them from official public documents.

## Snapshot fields

Each JSONL record is one source article. The extracted table fields are intentionally conservative; some pages will need manual/official-document review. `visible_text` and `section_evidence` are evidence aids, not approved JobOye copy.
