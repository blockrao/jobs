# Smart Extraction Pipeline: Implementation Kickoff (Revised)

**Status**: GO — Implementation starts immediately
**Timeline**: 1-2 weeks (not 3 weeks)
**Owner**: Engineering Team
**Decision Date**: 2026-10-16

---

## Approach: Leverage FreeJobAlert's Extraction

Instead of building PDF parsers and portal scrapers from scratch, we leverage the fact that:
1. FreeJobAlert already extracted all the enriched content (eligibility, vacancies, how-to-apply, etc.)
2. Excel file already has `fja_url` field (link to FreeJobAlert page for each recruitment)
3. We simply scrape their page and extract the data into JobOye

**The Flow:**
```
Excel Record (with fja_url)
  ↓
Scrape FreeJobAlert page
  ↓
Extract structured data:
  • Who Can Apply (eligibility)
  • Vacancy breakdown by location
  • How to Apply (steps)
  • Required Documents
  • Selection Process
  • Important Instructions
  • Official Links
  ↓
Store in extracted_recruitment_data table
  ↓
Populate JobOye job detail page
  ↓
Result: Rich page (25-30KB) with same content as FreeJobAlert
```

---

## Week 1: Build & Deploy

### Phase 1A: FreeJobAlert Page Scraper
**What**: Extract structured data from FreeJobAlert pages

**Deliverables**:
- [ ] Puppeteer setup to load FreeJobAlert page
- [ ] CSS selectors for key sections:
  - Overview table (basics)
  - Who Can Apply (eligibility details)
  - Vacancies by Block table
  - Important Dates table
  - How to Apply (steps)
  - Important Instructions (list)
  - Important Links (PDF, portal, website)
  - FAQs (all 8)
- [ ] Error handling for missing sections
- [ ] Rate limiting + respectful scraping

**Output**: `src/lib/extractors/freejobalert-scraper.ts`
```typescript
interface FjaScrapedData {
  eligibility: EligibilityCriteria;
  vacancy_breakdown: VacancyByLocation[];
  dates: RecruitmentDates;
  how_to_apply: string[];
  required_documents: string[];
  selection_process: string;
  instructions: string[];
  official_links: OfficialLinks;
  faqs: FAQ[];
  source_url: string;
  scraped_at: Date;
}
```

**Success**: Successfully scrape Anganwadi, SSC, UPSC sample pages

**Effort**: ~15-20 hours

---

### Phase 1B: Data Extraction & Field Mapping
**What**: Map FreeJobAlert scraped data to JobOye schema

**Deliverables**:
- [ ] Define extraction rules per source (FJA markup varies)
- [ ] Clean & normalize extracted data
- [ ] Validation (ensure all required fields present)
- [ ] Fallback for missing data

**Output**: `src/lib/extractors/fja-to-joboye-mapper.ts`

**Success**: All fields extracted correctly, validation passes

**Effort**: ~10-15 hours

---

### Phase 1C: Job Detail Page Enhancement
**What**: Render extracted data on job detail page

**Deliverables**:
- [ ] Add sections: `<WhoCanApply />`, `<VacancyBreakdown />`, `<HowToApply />`, `<SelectionProcess />`, `<ImportantInstructions />`, `<RequiredDocuments />`
- [ ] Auto-generate FAQs from extracted data (8-10 context-specific Qs)
- [ ] Render official_links section
- [ ] Mobile-responsive layout
- [ ] Fallback for missing data

**Output**: `src/components/job-detail/*`

**Success**: Render Anganwadi page with all extracted data, responsive on mobile

**Effort**: ~15-20 hours

---

### Phase 1D: Integration into Promotion Flow
**What**: Wire extraction into the promotion pipeline

**Deliverables**:
- [ ] Update `promoteRecruitment()` function
- [ ] Call FJA scraper automatically when `fja_url` is available
- [ ] Store extracted data in DB
- [ ] Handle failures gracefully (flag for manual review if scraping fails)
- [ ] Logging + observability

**Output**: `src/db/operations/promote-recruitment-v3.ts`

**Success**: Promotion enriches 90%+ of jobs with FJA data

**Effort**: ~10-15 hours

---

### Phase 1E: Testing & QA
**What**: Test scraping accuracy and page rendering

**Deliverables**:
- [ ] Test scraper on 10+ real FreeJobAlert pages
- [ ] Verify extracted data matches source
- [ ] Test page rendering on mobile
- [ ] Test fallback for jobs missing `fja_url`
- [ ] Performance: <5 sec scrape per page

**Output**: Test suite + verification report

**Success**: 95%+ scraping accuracy, zero data loss

**Effort**: ~10-15 hours

---

## Week 1 Summary

| Phase | Hours | Days |
|-------|-------|------|
| FJA Scraper | 15-20 | 2-2.5 |
| Data Mapping | 10-15 | 1-1.5 |
| Job Page Enhancement | 15-20 | 2-2.5 |
| Promotion Integration | 10-15 | 1-1.5 |
| Testing & QA | 10-15 | 1-1.5 |
| **TOTAL** | **60-85 hours** | **8-10 days** |

**Deploy by**: End of Week 1 (or mid-week depending on team size)

---

## Success Criteria (Launch Gate)

- ✅ 90%+ of jobs scrape FJA data successfully
- ✅ 25-30KB avg job pages (up from 5KB)
- ✅ All new sections render correctly on mobile
- ✅ Zero data loss from FJA pages
- ✅ <5 sec scrape time per page
- ✅ Fallback for jobs missing `fja_url` (show basic info)
- ✅ No rate-limiting issues with FreeJobAlert

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| **FJA changes page structure** | Monitor for changes, quick selector update |
| **FJA blocks scraping** | Respectful rate limiting, user-agent headers |
| **Missing data on some pages** | Fallback to basic info (vacancies, date) |
| **Job missing fja_url in Excel** | Fallback: show existing basic job detail |
| **Scraping timeout** | Set 10-15 sec timeout, flag for manual review |

---

## Post-Launch (Ongoing)

### Immediate (Week 2)
- Monitor scraping accuracy + success rates
- Quick fixes for any FJA selector changes
- Review failed jobs in manual queue (if any)
- Deploy to production once verified

### Growth (Month 2-4)
- All 1,612 jobs enriched with FJA data
- Auto-enriching all new promotions with FJA URL
- Expected: 60-70% of JobOye pages outrank FreeJobAlert by month 3

---

## Why This Approach Wins

| Traditional Approach | Our Approach |
|---|---|
| Build PDF parsers (80 hrs) | Scrape FJA (20 hrs) |
| Build portal scrapers (80 hrs) | Data mapping (15 hrs) |
| 3-week project | 1-week project |
| Risk: Extraction accuracy | Zero risk: Use proven FJA data |
| Competitive moat: Own extraction | Pragmatic moat: Speed to market + quality |

**By the time FreeJobAlert optimizes their extraction, we've already shipped rich pages to all 1,612 jobs and captured market.**

---

## Team Assignments

**Engineering** (60-85 hours):
- Lead Engineer: FJA scraper + integration (Week 1, 30-40 hours)
- Frontend Engineer: Job page components (Week 1, 15-20 hours)
- Full-Stack/QA: Testing + launch (Week 1, 15-25 hours)

**No complex PDF parsing or portal scraping needed.**

---

## Go/No-Go Decision

**DECISION**: GO ✅
**Reasoning**: 
- 1-week project instead of 3 weeks
- Proven data source (FreeJobAlert already extracted)
- Low risk: Just scraping HTML
- High impact: 1,612 jobs enriched in 1 week
- Faster to market = competitive advantage

**Next Step**: Engineering team starts Week 1 immediately

