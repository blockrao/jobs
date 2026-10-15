# Smart Extraction Pipeline: Auto-Populate Job Detail Pages

## Current State (Broken)
```
Excel Record → Extract Title, Vacancies, Date → Insert into JobOye DB → Job Page
                (STOPS HERE)
                
Missing: Eligibility, Vacancy Breakdown, How-to-Apply, Instructions, Selection Process
```

## Target State (Smart Extraction)
```
Excel Record 
  ↓
Extract Title, Vacancies, Date, official_notification_url
  ↓
FOLLOW official_notification_url → Official PDF/HTML
  ↓
Parse & Extract Structured Data:
  ├─ Eligibility (Gender, Residence, Education, Age, Income/Preferences)
  ├─ Vacancy Breakdown (By Block/Project/Category)
  ├─ Important Dates (Notification, Open, Close)
  ├─ How to Apply (Step-by-step)
  ├─ Required Documents (List)
  ├─ Selection Process (Method + Criteria)
  ├─ Important Instructions (Rules & Requirements)
  └─ Official Links (Notification PDF, Portal, Website)
  ↓
Structure into Job Detail Object
  ↓
Insert into JobOye DB + Generate Rich Page
  ↓
Result: Job Page with 25-30KB content (vs current 5KB)
```

---

## Data Extraction Map

### **Source 1: Official Notification PDF**
**URL Pattern**: official_notification_url from Excel

**Extract**:
```javascript
{
  eligibility: {
    gender: "Female only",
    residence: "Permanent resident of Gram Sabha/Ward",
    education: "Intermediate (Class 12) or equivalent",
    age: {
      min: 18,
      max: 35,
      as_on: "1 July 2026"
    },
    income_preferences: "Widows, divorced, abandoned women below poverty line"
  },
  
  vacancies: {
    total: 208,
    by_location: [
      { name: "Soro", count: 51 },
      { name: "Ganjdundwara", count: 42 },
      { name: "Kasganj", count: 34 },
      // ... etc
    ]
  },
  
  dates: {
    notification_issued: "15 Oct 2026",
    application_start: "As per official portal",
    application_end: "4 Nov 2026",
    exam_date: null // if available
  },
  
  how_to_apply: [
    "Visit the official portal",
    "Read the notification carefully",
    "Fill online form with personal/educational/residential details",
    "Upload self-attested documents, certificates, photos",
    "Submit by deadline",
    "Print and verify against originals"
  ],
  
  required_documents: [
    "Educational certificates",
    "Caste certificate (online, digitally signed)",
    "Residence certificate (online, digitally signed)",
    "Income certificate (per UP Revenue Dept guidelines)",
    "Passport-size photo",
    "Identity proof"
  ],
  
  selection_process: {
    method: "Merit-based direct recruitment",
    criteria: "Educational qualifications + performance",
    stages: ["Merit list preparation", "Document verification", "Final selection"]
  },
  
  instructions: [
    "Only female permanent residents of specific Gram Sabha/Ward eligible",
    "Incomplete applications will be rejected",
    "Certificates must be online with digital signatures",
    "Income certificate must follow UP Revenue Dept guidelines",
    "Verify all details before submission",
    "Vacant posts may increase/decrease based on departmental reports"
  ],
  
  official_links: {
    notification_pdf: "https://...",
    application_portal: "https://upanganwadibharti.in",
    official_website: "https://..."
  }
}
```

---

## Implementation Strategy

### **Phase 1: PDF Parser** (Week 1)
Build a PDF extraction service that:
- Takes official_notification_url
- Downloads & parses PDF
- Uses regex/pattern matching to extract:
  - Eligibility criteria
  - Vacancy numbers & locations
  - Dates
  - Selection process

**Challenges**:
- PDFs vary in structure (no standard format)
- Some are scanned images (need OCR)
- Data often scattered across pages

**Solution**:
- Build extractors per source type (UPSC, SSC, State PSCs, etc.)
- Use Claude API (vision) for complex PDFs
- Fallback to manual extraction if parsing fails

---

### **Phase 2: Portal Parser** (Week 1-2)
Build portal scraper for official application sites:
- UPSC (upsc.gov.in) → Extract from notification pages
- SSC (ssc.gov.in) → Standardized format
- State portals (upanganwadibharti.in, etc.) → Varies widely

**Challenges**:
- Sites have different HTML structures
- Some block scraping
- Data layout varies

**Solution**:
- Build per-portal extractors (configurable selectors)
- Use Puppeteer/Playwright for JavaScript-heavy sites
- Detect & respect robots.txt, rate-limit appropriately

---

### **Phase 3: Data Structuring** (Week 1)
Create unified schema that all extraction routes funnel into:

```typescript
interface ExtractedRecruitmentData {
  recruitment_id: string;
  
  // Core (from Excel)
  title: string;
  organization_id: string;
  total_vacancies: number;
  application_end_date: Date;
  official_notification_url: string;
  
  // Extracted (from official source)
  eligibility: EligibilityCriteria;
  vacancy_breakdown: VacancyByLocation[];
  dates: RecruitmentDates;
  how_to_apply: string[];
  required_documents: string[];
  selection_process: SelectionProcessInfo;
  instructions: string[];
  official_links: OfficialLinks;
  
  // Metadata
  extracted_at: Date;
  extraction_confidence: number; // 0-100
  extraction_source: "pdf" | "portal" | "manual";
  parsing_notes: string;
}
```

---

### **Phase 4: Job Page Generation** (Week 2)
Modify job detail page template to render extracted data:

```html
<!-- Current JobOye page -->
<QuickAnswers />
<RecruitmentDetails />
<ImportantDates />
<PostsSection />
<FAQs /> <!-- 3 generic -->

<!-- Enhanced with extracted data -->
<QuickAnswers /> <!-- Same -->
<RecruitmentDetails /> <!-- Same -->
<ImportantDates /> <!-- Same -->

<!-- NEW SECTIONS from extracted data -->
<WhoCanApply data={extracted.eligibility} />
<VacancyBreakdown data={extracted.vacancy_breakdown} />
<HowToApply steps={extracted.how_to_apply} />
<RequiredDocuments docs={extracted.required_documents} />
<SelectionProcess data={extracted.selection_process} />
<ImportantInstructions list={extracted.instructions} />

<FAQs data={generateFAQsFromExtracted(extracted)} /> <!-- 8+ context-specific -->

<OfficialLinks links={extracted.official_links} />

<PostsSection /> <!-- Same -->
```

---

### **Phase 5: Promotion Flow Update** (Week 2)
Modify the promotion/ingestion pipeline:

```typescript
async function promoteRecruitment(excelRecord) {
  // Step 1: Create base recruitment record
  const recruitment = await createRecruitment({
    title: excelRecord.title,
    organization: excelRecord.organization,
    vacancies: excelRecord.vacancies,
    application_end_date: excelRecord.application_end_date
  });

  // Step 2: NEW — Extract from official source
  try {
    const extracted = await extractFromOfficialSource({
      notification_url: excelRecord.official_notification_url,
      organization: excelRecord.organization
    });
    
    // Step 3: NEW — Store extracted data
    await storeExtractedData(recruitment.id, extracted);
    
    // Step 4: NEW — Mark as enriched
    recruitment.enrichment_status = "complete";
  } catch (error) {
    // Fallback: Flag for manual review
    recruitment.enrichment_status = "pending_manual";
    await flagForManualReview(recruitment.id, error);
  }

  // Step 5: Generate rich job detail page
  await generateJobDetailPage(recruitment);
  
  return recruitment;
}
```

---

## Data Quality & Fallback Strategy

**Extraction Success Rates:**
- SSC notifications (PDF, standardized): ~90%
- UPSC notifications (PDF, detailed): ~85%
- Portal-based (varies): ~60-75%
- Scanned PDFs (OCR needed): ~40-50%

**Fallback Hierarchy:**
1. **Full extraction** (90%+) → Auto-generate rich page
2. **Partial extraction** (50-89%) → Auto-generate page + flag gaps for review
3. **Failed extraction** (<50%) → Create basic page + flag for manual enrichment
4. **Manual flag** → Staff review queue for manual data entry

---

## Impact Estimate

| Metric | Current | With Smart Extraction |
|--------|---------|----------------------|
| **Avg job page size** | 5KB | 25-30KB |
| **Content sections** | 3-4 | 12-15 |
| **FAQs per page** | 3 (generic) | 8-10 (context-specific) |
| **Manual effort per job** | ~15-30 min | ~2-5 min (manual review only) |
| **Time to enrich 1,612 jobs** | ~300-400 hours | ~30-50 hours (extraction) + ~50-100 hours (QA) |
| **Ongoing enrichment** | Manual forever | Automatic (unless extraction fails) |

**SEO Impact**:
- **Before**: 1,612 sparse pages competing with FreeJobAlert
- **After**: 1,612 comprehensive pages, ranking on 10x more long-tail searches
- **Expected ranking improvement**: 60-70% of JobOye pages outrank FreeJobAlert within 3-4 months

---

## Engineering Effort Estimate

| Phase | Effort | Timeline |
|-------|--------|----------|
| PDF Parser | 60-80 hours | Week 1 |
| Portal Parser | 80-120 hours | Week 1-2 |
| Data Structuring | 20-30 hours | Week 1 |
| Job Page Template | 40-60 hours | Week 2 |
| Promotion Flow Update | 20-30 hours | Week 2 |
| Testing & QA | 40-60 hours | Week 3 |
| **TOTAL** | **260-370 hours** | **3 weeks** |

**Ongoing**:
- Maintain extractors for new portal types: 10-20 hours/quarter
- QA failed extractions: 5-10 hours/week

---

## Success Metrics

**Launch Criteria:**
- ✅ 90%+ of SSC/UPSC/State PSC jobs auto-enriched
- ✅ Manual review queue <5% of total jobs
- ✅ Extraction confidence >80% avg
- ✅ Job detail pages 25-30KB avg

**Post-Launch KPIs:**
- Pages ranking #1-3 for target keywords: >50% within 2 months
- Avg dwell time per job page: +300% vs current
- Search traffic to job pages: +5-10x within 3 months
- Outrank FreeJobAlert on high-intent searches: >70% by month 4

---

## Why This Works at Scale

**Current bottleneck**: Manual enrichment doesn't scale. You'd need a team of people copying-pasting eligibility info for 1,612+ jobs.

**Smart extraction scales**: Once built, it works for every new recruitment automatically. FreeJobAlert still manually curates every page (which is why their content is good but process is slow).

**Competitive advantage**: You'll have better content *faster* and *cheaper* than FreeJobAlert, because your extraction is automated and theirs is manual.

