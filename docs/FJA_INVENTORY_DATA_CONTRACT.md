# FJA Inventory Data Contract — Superseded

This earlier six-tab design is superseded by the two-table workbook contract and broader JobOye data architecture documented in:

- [JobOye Collection → Canonical Data → Verification → Structured Data Contract v1](./JOBOYE_COLLECTION_CANONICAL_VERIFICATION_STRUCTURED_DATA_CONTRACT.md)
- [FJA Inventory Pilot Runbook — Two-Table Contract](./FJA_PILOT_RUNBOOK_V2.md)

The human import workbook has exactly two main sheets: `Recruitments` and `Posts`. Repeated dates, fees, selection stages, field evidence, raw captures and audit history must still be preserved through structured arrays and/or internal supporting tables. They must not be discarded just because they do not have their own workbook tabs.

FJA is an internal discovery source only. FJA identifiers, URLs and branding must not appear in JobOye's public canonical data, page content, APIs, sitemaps or structured data. Canonical promotion requires official-notification verification and the applicable quality gates.

The crawler, exporter and database implementation have not yet been fully aligned to this contract. The three-record pilot must pass before a full crawl or daily schedule is enabled.
