# FreeJobAlert Data Extraction Reference

**Purpose**: Show engineers what data we're extracting from FJA pages and how to structure it

**Last Updated**: 2026-10-16

---

## Example: UP Anganwadi Recruitment

### Source
- FJA URL: `https://www.freejobalert.com/up/12345` (example)
- Official Notification: `https://example.gov.in/notification.pdf`
- Portal: `https://example.gov.in/apply`

---

## Data Structure We're Extracting

### 1. Overview / Basics
**FJA Page Section**: Top table with basic info

**Fields to Extract**:
```javascript
{
  post_name: "Anganwadi Worker", // What FJA shows
  organization: "ICDS, Uttar Pradesh", // Employer
  vacancy_total: 12345, // Total vacancies (sum of all locations)
  application_fee: "₹0", // May be missing
  selection_process_summary: "Written Test, Interview", // If shown
  important_dates: {
    notification_date: "2026-10-01",
    application_start: "2026-10-05",
    application_end: "2026-10-20", // CRITICAL: We need this
    exam_date: "2026-11-15", // If known
    result_date: null,
  }
}
```

**Location on FJA Page**: Usually a table at the top of the page

---

### 2. Who Can Apply (Eligibility)

**FJA Page Section**: "Who Can Apply" section (usually h3 or bold text)

**Raw HTML Example**:
```html
<h3>Who Can Apply?</h3>
<ul>
  <li>Age: 18-35 years as on 01-01-2026</li>
  <li>Qualification: 10th Pass or equivalent</li>
  <li>Nationality: Indian Citizens Only</li>
  <li>Relaxation: OBC +3 years, SC/ST +5 years</li>
</ul>
```

**Fields to Extract**:
```javascript
{
  eligibility_criteria: {
    age: "18-35 years as on 01-01-2026",
    age_relaxation: {
      obc: "+3 years",
      sc_st: "+5 years",
      ph: "+10 years",
    },
    qualification: "10th Pass or equivalent",
    experience: null, // If required
    nationality: "Indian Citizens Only",
    gender: null, // If restricted
    marital_status: null,
    caste_eligible: ["General", "OBC", "SC", "ST", "EWS"],
    ph_eligible: true,
    ex_servicemen_eligible: true,
  }
}
```

**Challenges**:
- FJA formats vary (sometimes HTML list, sometimes plain text)
- Age calculation might be shown as "as on date" (need to parse)
- Relaxation details may be scattered across the page

---

### 3. Vacancy Breakdown by Location

**FJA Page Section**: Large table titled "Vacancy Details" or "Post Details"

**Raw HTML Example**:
```html
<table>
  <thead>
    <tr>
      <th>District</th>
      <th>Block</th>
      <th>Position</th>
      <th>Vacancies</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Agra</td>
      <td>Agra City</td>
      <td>Anganwadi Worker</td>
      <td>150</td>
    </tr>
    <tr>
      <td>Agra</td>
      <td>Fatehpur Sikri</td>
      <td>Anganwadi Worker</td>
      <td>80</td>
    </tr>
    ...
  </tbody>
</table>
```

**Fields to Extract**:
```javascript
{
  vacancies: [
    {
      district: "Agra",
      block: "Agra City",
      post_name: "Anganwadi Worker",
      vacancies: 150,
      reservation: "UR: 75, OBC: 45, SC: 20, ST: 10", // If shown in separate columns
    },
    {
      district: "Agra",
      block: "Fatehpur Sikri",
      post_name: "Anganwadi Worker",
      vacancies: 80,
      reservation: null,
    },
    // ... more rows
  ],
  vacancy_summary: {
    by_district: { "Agra": 230, "Allahabad": 150, ... },
    by_category: { "UR": 1500, "OBC": 600, "SC": 400, "ST": 200, "EWS": 100 },
    total: 2800,
  }
}
```

**Challenges**:
- Table structure varies significantly
- Some pages have reservation breakdown in separate columns
- Some pages show only district-level or block-level data
- Column headers may differ

---

### 4. How to Apply

**FJA Page Section**: "How to Apply" section (step-by-step)

**Raw HTML Example**:
```html
<h3>How to Apply?</h3>
<ol>
  <li>Visit the official portal: <a href="https://example.gov.in/apply">https://example.gov.in/apply</a></li>
  <li>Click "New Registration" and fill basic details</li>
  <li>Upload scanned copies of documents (PDF, size <500 KB each)</li>
  <li>Fill the application form completely</li>
  <li>Pay application fee (if applicable) online</li>
  <li>Submit and download confirmation receipt</li>
  <li>Print and keep receipt for future reference</li>
</ol>
```

**Fields to Extract**:
```javascript
{
  how_to_apply: {
    steps: [
      "Visit the official portal: https://example.gov.in/apply",
      "Click 'New Registration' and fill basic details",
      "Upload scanned copies of documents (PDF, size <500 KB each)",
      "Fill the application form completely",
      "Pay application fee (if applicable) online",
      "Submit and download confirmation receipt",
      "Print and keep receipt for future reference",
    ],
    portal_url: "https://example.gov.in/apply",
    online_only: true,
    offline_allowed: false,
  }
}
```

**Challenges**:
- Steps may be formatted as ul/ol or as plain text
- Portal URL may be inline or in a separate section
- Some steps may include sub-bullets

---

### 5. Important Instructions / Notes

**FJA Page Section**: "Important" or "Note" section

**Raw Text Example**:
```
Important Instructions:
- All fields in application form are mandatory
- Upload color scanned copy of documents only
- Do not use special characters in name field
- Female candidates must apply with father's/husband's name as per documents
- Date format: DD-MM-YYYY
- Do not close browser before final submission
- Selection based on merit list only
```

**Fields to Extract**:
```javascript
{
  instructions: [
    "All fields in application form are mandatory",
    "Upload color scanned copy of documents only",
    "Do not use special characters in name field",
    "Female candidates must apply with father's/husband's name as per documents",
    "Date format: DD-MM-YYYY",
    "Do not close browser before final submission",
    "Selection based on merit list only",
  ]
}
```

---

### 6. Required Documents

**FJA Page Section**: Often under "Documents Required" or in eligibility section

**Raw HTML Example**:
```html
<h3>Documents Required</h3>
<ul>
  <li>10th Certificate / Pass Mark Sheet</li>
  <li>12th Certificate (if applicable)</li>
  <li>Degree Certificate (for graduate posts)</li>
  <li>Caste Certificate (SC/ST/OBC only)</li>
  <li>Photo ID (Aadhar / Passport / Voter ID / Driving License)</li>
  <li>Address Proof (Utility Bill / Rent Agreement)</li>
  <li>Medical Certificate (if applicable)</li>
</ul>
```

**Fields to Extract**:
```javascript
{
  required_documents: [
    "10th Certificate / Pass Mark Sheet",
    "12th Certificate (if applicable)",
    "Degree Certificate (for graduate posts)",
    "Caste Certificate (SC/ST/OBC only)",
    "Photo ID (Aadhar / Passport / Voter ID / Driving License)",
    "Address Proof (Utility Bill / Rent Agreement)",
    "Medical Certificate (if applicable)",
  ]
}
```

---

### 7. Selection Process

**FJA Page Section**: "Selection Process" or "Selection Procedure"

**Raw HTML Example**:
```html
<h3>Selection Process</h3>
<p><strong>Written Exam (Objective):</strong> 100 Marks, 120 minutes, 50 questions</p>
<p><strong>Interview:</strong> 25 Marks, 10 minutes</p>
<p><strong>Final Merit List:</strong> Written (100) + Interview (25) = 125 Marks</p>
<p><strong>Negative Marking:</strong> 0.25 marks for each wrong answer</p>
```

**Fields to Extract**:
```javascript
{
  selection_process: {
    stages: [
      {
        name: "Written Exam (Objective)",
        marks: 100,
        duration: "120 minutes",
        questions: 50,
        description: "100 Marks, 120 minutes, 50 questions"
      },
      {
        name: "Interview",
        marks: 25,
        duration: "10 minutes",
        description: "25 Marks, 10 minutes"
      }
    ],
    total_marks: 125,
    negative_marking: "0.25 marks for each wrong answer",
    merit_based: true,
  }
}
```

---

### 8. Official Links

**FJA Page Section**: Scattered throughout (usually in sidebar or bottom)

**Fields to Extract**:
```javascript
{
  official_links: {
    notification_pdf: "https://example.gov.in/notification.pdf",
    official_website: "https://example.gov.in",
    application_portal: "https://example.gov.in/apply",
    recruitment_board: "ICDS, Uttar Pradesh",
    official_announcement: "https://example.gov.in/announcement",
  }
}
```

---

### 9. FAQs (Auto-Generated)

**FJA Page Section**: Usually at the bottom, or auto-generate from content

**Fields to Extract**:
```javascript
{
  faqs: [
    {
      question: "Who is eligible for this recruitment?",
      answer: "Age: 18-35 years as on 01-01-2026. Qualification: 10th Pass or equivalent. Nationality: Indian Citizens Only.",
      source: "eligibility_section",
    },
    {
      question: "How many vacancies are available?",
      answer: "Total 12,345 Anganwadi Worker positions across UP.",
      source: "vacancy_summary",
    },
    {
      question: "When is the application deadline?",
      answer: "2026-10-20",
      source: "dates",
    },
    {
      question: "How to apply?",
      answer: "Apply online via https://example.gov.in/apply",
      source: "how_to_apply",
    },
    {
      question: "What documents are required?",
      answer: "10th Certificate, ID Proof, Address Proof, Caste Certificate (if applicable)",
      source: "documents",
    },
    {
      question: "What is the selection process?",
      answer: "Written Exam (100 marks) + Interview (25 marks). Total 125 marks.",
      source: "selection_process",
    },
    {
      question: "Is there any application fee?",
      answer: "No, application is completely free.",
      source: "overview",
    },
    {
      question: "When will results be announced?",
      answer: "To be announced soon. Check official website for updates.",
      source: "dates",
    },
  ]
}
```

---

## Complete Extracted Data Object

```typescript
interface FJAExtractedData {
  // Source
  fja_url: string;
  official_notification_url?: string;
  application_portal_url?: string;
  
  // Basics
  post_name: string;
  organization: string;
  vacancy_total: number;
  
  // Dates (CRITICAL for uniqueness constraint)
  application_end_date: string; // YYYY-MM-DD
  notification_date?: string;
  application_start_date?: string;
  exam_date?: string;
  result_date?: string;
  
  // Eligibility
  eligibility_criteria: {
    age: string;
    age_relaxation?: Record<string, string>;
    qualification: string;
    experience?: string;
    nationality?: string;
    caste_eligible?: string[];
    ph_eligible?: boolean;
  };
  
  // Vacancies
  vacancies: Array<{
    district: string;
    block?: string;
    post_name: string;
    vacancies: number;
    reservation?: string;
  }>;
  
  vacancy_summary: {
    by_district: Record<string, number>;
    by_category?: Record<string, number>;
    total: number;
  };
  
  // How to Apply
  how_to_apply: {
    steps: string[];
    portal_url?: string;
    online_only: boolean;
    offline_allowed: boolean;
  };
  
  // Instructions & Documents
  instructions: string[];
  required_documents: string[];
  
  // Selection Process
  selection_process: {
    stages: Array<{
      name: string;
      marks?: number;
      duration?: string;
      description: string;
    }>;
    total_marks?: number;
    negative_marking?: string;
  };
  
  // Official Links
  official_links: {
    notification_pdf?: string;
    official_website?: string;
    application_portal?: string;
    recruitment_board?: string;
  };
  
  // FAQs (auto-generated from content)
  faqs: Array<{
    question: string;
    answer: string;
    source: string;
  }>;
  
  // Metadata
  source_url: string; // FJA URL
  scraped_at: Date;
  extraction_confidence: number; // 0-100 (how complete was extraction)
}
```

---

## Testing Data

Use these real FJA URLs to test extraction:

1. **Anganwadi (Simple)**
   - URL: Check FJA for recent Anganwadi Worker recruitments
   - Expected: Clear eligibility, vacancy table, simple selection

2. **UP Police (Complex Eligibility)**
   - URL: Check FJA for UP Police recruitment
   - Expected: Age relaxation rules, height/chest requirements, complex eligibility

3. **SSC (Complex Vacancies)**
   - URL: Check FJA for SSC recruitment
   - Expected: Many locations, reservation breakdown by category

4. **UPSC (Complex Dates)**
   - URL: Check FJA for UPSC recruitment
   - Expected: Multiple exam stages, different dates for each

---

## Scraper Implementation Tips

### CSS Selectors to Try

```javascript
// Overview
document.querySelector("table:first-of-type") // Often contains basics
document.querySelectorAll("h3")[0] // Usually first heading

// Who Can Apply
document.querySelector("h3:contains('Who Can Apply')")
document.querySelector("ul, ol") // Eligibility often in list

// Vacancy Table
document.querySelector("table:nth-of-type(2)") // Second table
document.querySelectorAll("table")[1] // Or second table

// How to Apply
document.querySelector("h3:contains('How')")
document.querySelectorAll("ol")[0] // Steps in ordered list

// FAQs
document.querySelectorAll(".faq, .faqs, .qa") // Common FAQ classes
document.querySelectorAll("h3, h4").filter(h => h.textContent.includes("FAQ"))
```

### Fallback Strategies

If CSS selectors don't match:
1. Use `text()` matching: "Who can apply contains..."
2. Fall back to heading-based extraction (h2, h3 structure)
3. Use semantic HTML: `<strong>`, `<em>`, `<ul>`
4. Manual review for edge cases

### Performance Tips

- **Load only once**: Cache page after Puppeteer load
- **Timeout**: 10-15 seconds per page (increase if needed)
- **Retry logic**: 2-3 retries on timeout
- **Rate limiting**: 1-2 second delay between pages

---

## Next Steps

1. **Engineering team** reads this reference
2. Implements scraper using CSS selectors above
3. Tests on 5+ real FJA pages
4. Compares extracted data vs original page
5. Adjusts selectors based on test results
6. Integrates into promotion flow

**Questions?** Check SMART_EXTRACTION_IMPLEMENTATION_KICKOFF.md or ask in standup.
