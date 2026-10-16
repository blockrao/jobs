# FreeJobAlert Scraping Implementation — One Pager

**Status**: 🟢 GO  
**Timeline**: 1-2 weeks  
**Effort**: 60-85 hours  
**Decision**: 2026-10-16

---

## What We're Doing

Scrape FreeJobAlert's already-extracted content and use it to enrich JobOye's job pages from 5KB → 25-30KB.

## Why This Way

- ✅ FreeJobAlert already extracted from PDFs/portals (we use their work)
- ✅ Excel already has `fja_url` field (direct link to their page)
- ✅ Low risk (just HTML scraping, not PDF parsing)
- ✅ 4x faster (1-2 weeks vs 3-4 weeks for own extractor)
- ✅ Same quality (use proven FreeJobAlert data)

## The Flow (30 seconds)

```
Excel (fja_url) → Scrape FJA page → Extract 8 data types → Store in DB → Render on JobOye page
```

## Week 1: 5 Phases

| Phase | What | Hours | Owner |
|-------|------|-------|-------|
| **1A** | Build FJA scraper (Puppeteer + CSS selectors) | 15-20 | Lead Eng |
| **1B** | Map data to JobOye schema | 10-15 | Full-stack |
| **1C** | Job page components (eligibility, vacancies, how-to-apply, FAQs) | 15-20 | Frontend |
| **1D** | Hook into promotion flow | 10-15 | Full-stack |
| **1E** | Test and QA | 10-15 | QA |

**Total**: 60-85 hours = ~10 days (1-2 weeks with concurrent work)

## What We're Extracting

From each FreeJobAlert page:
1. **Eligibility criteria** (age, qualification, caste, relaxation)
2. **Vacancy breakdown** (by district/block/location)
3. **How to apply** (step-by-step)
4. **Required documents**
5. **Selection process** (exam stages, marks)
6. **Important instructions**
7. **Official links** (PDF, portal)
8. **FAQs** (auto-generated)

## Launch Checklist

- [ ] 90%+ scrape success rate
- [ ] 25-30KB avg page size
- [ ] Mobile rendering perfect
- [ ] <5 sec per page
- [ ] 95% accuracy verified
- [ ] Fallback for missing data
- [ ] Monitoring configured

## Key Files

- `SMART_EXTRACTION_IMPLEMENTATION_KICKOFF.md` — Full spec
- `FJA_DATA_EXTRACTION_REFERENCE.md` — Technical guide with examples
- `FJA_SCRAPING_IMPLEMENTATION_CHECKLIST_2026_10_16.md` — Detailed checklist

## Next Step

1. Read the kickoff (15 min)
2. Read the technical reference (20 min)
3. Start Phase 1A immediately

## Questions?

Check project docs or ask in standup. All answers are documented.

---

**Approved by**: Engineering  
**Committed**: 2026-10-16  
**Go-Live Target**: End of Week 1
