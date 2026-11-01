# Addendum — FJA live database audit count clarification (2026-11-01)

The audit's two SQL queries used different counting semantics:

- The existence-count query found **1,011 FJA inventory rows** with at least one matching `postings.external_id`.
- The row-level join returned **1,012 posting rows** because at least one FJA external ID has more than one matching posting row.

Therefore, 1,012 is the joined posting-row count, not the number of distinct FJA inventory records matched. The duplicate external-ID case must be identified in the next read-only reconciliation; no merge or deletion is authorised by this observation.
