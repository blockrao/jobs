# Smart Extraction Pipeline: Implementation Kickoff

**Status**: GO — Sprint starts immediately
**Timeline**: 3 weeks (Week 1-3)
**Owner**: Engineering Team
**Decision Date**: 2026-10-16

---

## Week 1: Foundation (60-80 hours)

### Phase 1A: PDF Parser Framework
**What**: Build extraction service for official notification PDFs

**Deliverables**:
- [ ] PDF download + caching mechanism
- [ ] Regex-based field extractors (eligibility, vacancies, dates)
- [ ] Claude Vision fallback for complex/scanned PDFs
- [ ] Parser configuration for SSC, UPSC, State PSC formats
- [ ] Extraction confidence scoring (0-100)

**Output**: `src/lib/extractors/pdf-parser.ts`
```typescript
interface PdfParserResult {
  eligibility: EligibilityCriteria;
  vacancies: VacancyBreakdown[];
  dates: RecruitmentDates;
  selection_process: string;
  confidence: number;
  notes: string[];
  failed_sections: string[];
}
```

**Success**: Extract 90%+ of eligibility info from SSC/UPSC PDFs

---

### Phase 1B: Portal Scraper Framework
**What**: Build portal-specific extractors for official application sites

**Deliverables**:
- [ ] Puppeteer/Playwright setup for JavaScript-heavy sites
- [ ] Per-portal configuration (selectors, patterns)
- [ ] Rate limiter + robots.txt respect
- [ ] Fallback to manual extraction flag
- [ ] Session handling for portals requiring login

**Output**: `src/lib/extractors/portal-scraper.ts`
```typescript
interface PortalConfig {
  url_pattern: string;
  selectors: {
    eligibility: string;
    vacancies: string;
    dates: string;
    [key: string]: string;
  };
  auth?: {
    username_field: string;
    password_field: string;
    login_url: string;
  };
}
```

**Success**: Successfully scrape upanganwadibharti.in, SSC portal sample pages

---

### Phase 1C: Unified Data Schema
**What**: Define the canonical extraction schema

**Deliverables**:
- [ ] TypeScript interfaces for all recruitment data
- [ ] JSON schema for validation
- [ ] Database migrations for extracted_recruitment_data table

**Output**: `src/types/extracted-recruitment.ts`
```typescript
interface ExtractedRecruitmentData {
  recruitment_id: string;
  eligibility: EligibilityCriteria;
  vacancies: VacancyByLocation[];
  dates: RecruitmentDates;
  how_to_apply: string[];
  required_documents: string[];
  selection_process: SelectionProcessInfo;
  instructions: string[];
  official_links: OfficialLinks;
  extracted_at: Date;
  extraction_confidence: number;
  extraction_source: "pdf" | "portal" | "manual";
  parsing_notes: string[];
}
```

**Success**: Schema passes all type checks, DB migrations run cleanly

---

### Week 1 Effort Breakdown
- PDF Parser: 25-30 hours
- Portal Scraper: 25-30 hours  
- Data Schema: 10-15 hours
- Testing: 5-10 hours
- **Total: 65-85 hours**

---

## Week 2: Integration (40-60 hours)

### Phase 2A: Job Page Template Enhancement
**What**: Modify job detail page to render extracted data

**Deliverables**:
- [ ] New components: `<WhoCanApply />`, `<VacancyBreakdown />`, `<HowToApply />`, `<SelectionProcess />`, `<ImportantInstructions />`, `<RequiredDocuments />`
- [ ] Auto-generate FAQs from extracted data (8-10 context-specific Qs)
- [ ] Render official_links section
- [ ] Mobile-responsive layout for all new sections
- [ ] Fallback for missing data (graceful degradation)

**Output**: `src/components/job-detail/*`

**Success**: Render Anganwadi page with all extracted data, responsive on mobile

---

### Phase 2B: Promotion Flow Integration
**What**: Wire extraction into the promotion/ingestion pipeline

**Deliverables**:
- [ ] Update `promoteRecruitment()` function
- [ ] Call extraction service automatically
- [ ] Store extracted data in DB
- [ ] Flag for manual review if extraction fails
- [ ] Logging + observability

**Output**: `src/db/operations/promote-recruitment-v3.ts`

**Success**: Promotion flow enriches 90%+ of jobs automatically

---

### Phase 2C: Manual Review Queue
**What**: Build dashboard for failed extractions

**Deliverables**:
- [ ] DB table: `extraction_reviews` (recruitment_id, status, assigned_to, notes)
- [ ] Queue view: Show 10 jobs pending manual enrichment
- [ ] Quick-edit form for staff to fill missing data
- [ ] Mark-as-reviewed workflow

**Output**: `src/pages/admin/extraction-queue.tsx`

**Success**: Staff can easily review/fix failed extractions in <2 min each

---

### Week 2 Effort Breakdown
- Job Page Template: 25-30 hours
- Promotion Flow: 10-15 hours
- Manual Review Queue: 10-15 hours
- Testing: 5-10 hours
- **Total: 50-70 hours**

---

## Week 3: Testing & QA (40-60 hours)

### Phase 3A: Extraction Accuracy Testing
**Deliverables**:
- [ ] Test suite for PDF parser (SSC, UPSC, State PSC formats)
- [ ] Test suite for portal scraper (10+ sample pages)
- [ ] Benchmark: 90%+ accuracy on 50 real notifications
- [ ] Manual verification of extracted data vs source

**Success**: Extraction accuracy >85% on diverse sources

---

### Phase 3B: Integration Testing
**Deliverables**:
- [ ] End-to-end test: Excel → Extraction → Job Page
- [ ] Test all 4 extraction paths: SSC PDF, UPSC PDF, Portal scrape, Manual fallback
- [ ] Test data quality: All fields present, no truncation, proper formatting
- [ ] Performance: Extraction <30 sec per job

**Success**: Full pipeline works, no data loss, reasonable speed

---

### Phase 3C: Production Readiness
**Deliverables**:
- [ ] Error handling + fallback mechanisms
- [ ] Logging & monitoring setup
- [ ] Documentation for manual review process
- [ ] Runbook for adding new portal types
- [ ] Confidence score calibration

**Success**: Pipeline ready for production deployment

---

### Week 3 Effort Breakdown
- Accuracy Testing: 15-20 hours
- Integration Testing: 15-20 hours
- Production Readiness: 10-15 hours
- **Total: 40-55 hours**

---

## Overall Project Stats

| Metric | Target |
|--------|--------|
| **Total Engineering Hours** | 260-370 hours (3 weeks) |
| **Extraction Accuracy** | >85% |
| **Manual Fallback Rate** | <10% |
| **Auto-Enrichment Rate** | 90%+ |
| **Jobs Enriched by End of Week 3** | ~1,450 (90% of 1,612) |
| **Manual Review Queue** | <100 jobs (10%) |

---

## Success Criteria (Launch Gate)

- ✅ 90%+ auto-enrichment rate across all source types
- ✅ <5% of jobs need manual correction after review
- ✅ Average job page: 25-30KB (up from 5KB)
- ✅ All 12-15 new sections render correctly on mobile
- ✅ Extraction confidence >80% on average
- ✅ Zero data loss (all extracted data persists correctly)
- ✅ Manual review queue operational and testable
- ✅ Documentation complete + runbook for new portals

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| **PDF parsing complexity** | Use Claude Vision + regex fallback |
| **Portal structure varies** | Build per-portal extractors, don't try single regex |
| **OCR needed for scans** | Fallback to manual review (acceptable <10% of jobs) |
| **Rate limiting on portals** | Implement throttling, respect robots.txt |
| **Data quality issues** | Manual review queue for low-confidence extractions |
| **DB migration failures** | Test migrations on staging first |

---

## Post-Launch (Ongoing)

### Maintenance (5-10 hours/week)
- New portal types emerge → Add extractor for that portal
- Extraction failures in queue → Staff manual review (2-5 min each)
- Extraction accuracy monitoring → Track confidence scores
- Bug fixes → Fast turnaround for failing extractors

### Growth
- By month 2: All 1,612 jobs enriched + auto-enriching all new promotions
- By month 3: 60-70% of JobOye pages outrank FreeJobAlert for high-intent searches
- By month 4: Competitive advantage: JobOye has better content faster & cheaper

---

## Team Assignments

**Engineering** (260-370 hours total):
- Lead Engineer: PDF Parser + Portal Scraper framework (Week 1, 60-80 hours)
- Frontend Engineer: Job Page template + Queue UI (Week 2, 40-50 hours)
- Full-Stack: Integration + Testing (Week 2-3, 80-120 hours)
- QA/Product: Testing + Production readiness (Week 3, 40-60 hours)

**Product/Ops** (ongoing):
- Manual review queue: Staff reviews failed extractions (5-10 hours/week post-launch)
- Extraction monitoring: Track accuracy + success rates

---

## Go/No-Go Decision

**DECISION**: GO ✅
**Reasoning**: 
- Solves the root problem (extraction is incomplete)
- Scales to all 1,612+ jobs automatically
- Competitive moat: FreeJobAlert can't replicate manual process
- Clear success criteria
- Acceptable risks with mitigation

**Next Step**: Engineering team starts Week 1 work immediately

---

