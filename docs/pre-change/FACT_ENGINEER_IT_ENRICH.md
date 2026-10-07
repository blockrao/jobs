# Pre-change report: FACT Engineer (IT) — data enrichment

**Scorecard**

| Gate | Status |
|------|--------|
| Source is official | ✅ Official notification No. 7/2026 dated 01.10.2026 (PDF uploaded and reviewed) |
| Changes are bounded | ✅ UPDATE on one posting (id=976); no schema changes |
| Pre-change state recorded | ✅ Below |
| Rollback available | ✅ Reverse UPDATE restores prior values |
| Approved | ✅ Owner approved (PDF reviewed, migration reviewed) |

**Source:** Official Notification No. 7/2026 dated 01.10.2026  
**URL:** https://fact.co.in/images/upload/Recruitment-Notification-7-2026---Engineer-(IT)_3057.pdf  
**Posting:** id=976, slug=`fact-engineer-recruitment-2026-apply-online-b3560b`  
**Org:** The Fertilisers and Chemicals Travancore Limited (FACT), id=1677

## Pre-change state (observed in production)

| Field | Current value |
|-------|---------------|
| employment_type | FULL_TIME |
| salary_min | 31000 |
| salary_max | NULL |
| age_limit_min | NULL |
| age_limit_max | NULL |
| apply_url | NULL |
| valid_through | 2026-10-14 (correct) |

## Changes

| Field | Before | After | Source clause |
|-------|--------|-------|---------------|
| employment_type | FULL_TIME | CONTRACT | §2: "Fixed Tenure Contract basis for a period of one year on adhoc basis" |
| salary_max | NULL | 31000 | §3: "Consolidated fixed pay of ₹31,000/- per month" (min=max) |
| age_limit_min | NULL | 18 | §1: "above 18 years" |
| age_limit_max | NULL | 35 | §1: "Less than 35 years as on 01.10.2026" |
| apply_url | NULL | https://www.fact.co.in/careers | §14: online applications via official careers portal |

## Not changed

- `valid_through`: 2026-10-14 already correct (§14e online form deadline)
- `total_vacancies`: Left NULL — notification forms a panel, no fixed head count stated
- `post_names`: ['Engineer (IT)'] already correct
- `official_notification_url`: already set and correct
- `title`: acceptable as-is

## Migration

File: `supabase/migrations/20261007160000_fact_engineer_it_enrich.sql`

## Rollback

```sql
UPDATE public.postings
SET
  employment_type = 'FULL_TIME',
  salary_max      = NULL,
  age_limit_min   = NULL,
  age_limit_max   = NULL,
  apply_url       = NULL
WHERE id = 976;
```
