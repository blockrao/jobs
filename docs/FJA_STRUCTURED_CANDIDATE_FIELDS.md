# FJA-002 — structured discovery candidates

This increment adds typed candidate fields to `fja_post_inventory`; it does not change canonical JobOye Recruitments or Posts.

## Data rules
- Preserve `salary_raw`, `age_limit_raw`, and `age_reference_date_raw` as the evidence of what the aggregator page said.
- A parsed number is a candidate, not official truth. The source URL and original wording remain the audit trail.
- Currency and pay period are only populated when explicitly stated. An unmarked number is not presumed INR.
- Pay-scale/grade/pay-matrix ranges remain typed as `PAY_SCALE`; do not silently convert them into monthly salary.
- Consolidated pay, stipend, CTC, fixed salary, and ranges remain distinguishable.
- Missing values remain NULL. `NOT_PRESENT` means the source text explicitly signals absence or is blank; `NEEDS_REVIEW` means wording exists but cannot be safely normalized.
- Official verification is independent of extraction. The new verification metadata is not populated automatically by the normalizers.
- Do not promote these candidates to canonical data from this migration.

## Deployment order
1. Review migration and rollback in Git.
2. Apply the forward migration through the approved migration owner and recorded migration history.
3. Confirm all added columns and constraints in the live schema.
4. Only then deploy code that reads or writes the new columns.
5. Keep the FJA crawler manual-only and limited to pilot mode until extraction accuracy and parent/post mappings are reviewed.

## Pilot acceptance cases
- explicit INR salary range with explicit monthly period;
- pay matrix / pay scale without a stated period;
- a bare amount with no currency or period;
- explicit age range and age reference date;
- category-specific relaxations that must not be flattened into a single base-age range;
- missing salary/age text.
