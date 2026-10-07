# Pre-Change Report: WCDC Bihar Post Seed & Org Fix

**Status: PENDING OWNER APPROVAL**
**Migration:** `supabase/migrations/20261007180000_wcdc_bihar_seed_posts_fix_org.sql`
**Scope:** Posting 858, Recruitment 1263, Posts 766–767, 2 new post inserts
**Source:** Official notification PDF — https://miswcdc.bihar.gov.in/SysAdmin/HRM/Documents/Advertisements/2026930451.pdf

---

## Scorecard

| Check | Result |
|---|---|
| Source verified by owner? | ✅ Owner uploaded the official PDF |
| Backup gate cleared? | ⚠️ NOT YET — backup/restore test not done |
| All values from official notification? | ✅ Yes |
| Destructive changes? | ❌ None — UPDATE + INSERT only |
| New constraints or migrations? | ❌ None |
| Affects other postings? | ❌ No |

> **Blocker:** The pre-data backup gate (per HANDOFF.md §3 and WP001_BACKUP_GATE.md) has not been cleared. This migration must wait until a tested backup and restore procedure is in place. The owner must confirm before this is applied to production.

---

## What is wrong today

| Field | Current (wrong) | Correct |
|---|---|---|
| `postings.organization_id` (posting 858) | 17 = Bihar Public Service Commission | 1581 = Women and Child Development Corporation Bihar |
| `recruitments.organization_id` (rec 1263) | 17 = Bihar Public Service Commission | 1581 = Women and Child Development Corporation Bihar |
| `postings.post_names` (posting 858) | `[]` (empty) | 4 post names from official notification |
| `posts` count for rec 1263 | 2 posts (Accountant, Assistant) | 4 posts — two State Project Manager posts missing |
| `posts.salary_min/max` (posts 766, 767) | NULL | Official notification values |
| `posts.vacancy_details` (posts 766, 767) | NULL | Category breakdown from notification |

---

## What the official notification says

**Issuing body:** Mahila evam Bal Vikas Nigam, Bihar (WCDC Bihar) — wcdc.bih.nic.in  
**Advertisement reference:** 2026930451  
**Apply:** Online only at wcdc.bihar.gov.in  
**Application window:** 01-10-2026 to 06-11-2026  
**Fee:** Nil for all categories  

### Posts

| # | Name | Vacancies | UR | Salary range |
|---|---|---|---|---|
| 1 | State Project Manager (Monitoring & Evaluation) | 1 | 1 | ₹50,000–₹60,000 p.m. (consolidated) |
| 2 | State Project Manager (Communication & Documentation) | 1 | 1 | ₹35,000–₹40,000 p.m. (consolidated) |
| 3 | Accountant | 1 | 1 | ₹25,000–₹30,000 p.m. (consolidated) |
| 4 | Assistant | 4 | 4 | ₹18,000–₹20,000 p.m. (consolidated) |
| **Total** | | **7** | | |

### Qualifications (summary)

| Post | Qualification | Experience |
|---|---|---|
| SPM (M&E) | PG Diploma / Master in Rural Dev / Women Studies / Rural Mgmt / Social Work | 5 yrs relevant |
| SPM (Comm&Doc) | Degree in Communications / Media Studies / IT | 3 yrs relevant |
| Accountant | B.Com (Hons), preference CA/ICWA Inter | — |
| Assistant | Graduate with Hindi & English typing | — |

### Age limits (as on 01-10-2026)

| Category | Max Age |
|---|---|
| UR (Male) | 37 years |
| UR (Female) | 40 years |
| OBC | 40 years |
| SC/ST | 42 years |

---

## Migration changes in detail

### 1. Update `postings` row 858

```sql
UPDATE postings SET
  organization_id = 1581,              -- BPSC → WCDC Bihar
  post_names = ARRAY['State Project Manager (Monitoring & Evaluation)',
                     'State Project Manager (Communication & Documentation)',
                     'Accountant', 'Assistant']::jsonb,
  apply_url = 'https://wcdc.bihar.gov.in'
WHERE id = 858;
```

### 2. Update `recruitments` row 1263

```sql
UPDATE recruitments SET organization_id = 1581 WHERE id = 1263;
```

### 3. Enrich posts 766, 767

```sql
UPDATE posts SET salary_min=25000, salary_max=30000,
  vacancy_details='{"ur":1,"ews":0,"obc":0,"sc":0,"st":0,"total":1}'
WHERE id = 766; -- Accountant

UPDATE posts SET salary_min=18000, salary_max=20000,
  vacancy_details='{"ur":4,"ews":0,"obc":0,"sc":0,"st":0,"total":4}'
WHERE id = 767; -- Assistant
```

### 4. Insert two new posts

State Project Manager (M&E) and State Project Manager (Comm&Doc) into recruitment 1263. Both use position_id=6 (generic "Other") as there are no dedicated position rows for these roles. This is acceptable for now; a `positions` row is not user-facing.

---

## What this does NOT do

- Does not change any other postings
- Does not add age rules or eligibility rows to posts (a separate, follow-up migration after validation)
- Does not delete or reassign the BPSC organization itself
- Does not touch posting 1078 (PENDING status, separate scraped duplicate — handled separately)

---

## Rollback

All changes are reversible:
- `UPDATE` changes can be reversed by re-running the opposite values
- New post INSERT rows can be deleted by id (ids known after insert)

---

## Required action from owner

1. Confirm the backup gate is cleared (or waive it for this non-destructive seed)
2. Read and approve this report
3. Apply the migration in the Supabase SQL editor (or ask Claude to apply via MCP)
4. Verify the WCDC Bihar page at https://www.joboye.com/jobs/wcdc-bihar-recruitment-2026-apply-online-for-state-project-manager-accountant-assistant-posts-166250 shows 4 distinct post cards with correct organization name
