# Development Guide: Recruitment Hub Data Completeness

## Overview

This guide ensures that new recruitment data fields are properly implemented end-to-end, preventing the 43% completeness gap that previously existed.

## The Problem We Solved

Previously:
- 4+ database fields existed but weren't displayed (selection_process, official_application_url, etc.)
- Critical data like salary and job descriptions were never added
- No enforcement mechanism to catch missing fields
- Competitive gaps weren't discovered until audits

Now:
- Single source of truth: `src/components/recruitment/data-spec.ts`
- Automated completeness checks
- Clear checklist for developers

---

## Adding a New Recruitment Data Field

### Step 1: Define in Data Specification
**File**: `src/components/recruitment/data-spec.ts`

Add your field to the appropriate section:

```typescript
export const RECRUITMENT_DATA_SPEC = {
  overview: {
    // ... existing fields
    myNewField: {
      label: 'Display Label',
      format: 'text' | 'date' | 'link' | 'number' | 'list' | 'html',
      priority: 'critical' | 'high' | 'medium' | 'low',
      description: 'What this field represents',
      source: 'notification' | 'extracted' | 'enriched',
      example: 'Example value',
    },
  },
};
```

**Priority Guidelines:**
- `critical`: Must-have for decision making (salary, job description, dates)
- `high`: Important but not blocking (location, selection process)
- `medium`: Nice-to-have (promotion prospects, working hours)
- `low`: Optional (company benefits, travel policy)

### Step 2: Add to Database Schema

**File**: `supabase/migrations/YYYYMMDDHHMMSS_add_my_field.sql`

```sql
-- For recruitment-level data
ALTER TABLE recruitments ADD COLUMN IF NOT EXISTS my_field_name TEXT;
COMMENT ON COLUMN recruitments.my_field_name IS 'Clear description of what this field contains';

-- For position-level data
ALTER TABLE posts ADD COLUMN IF NOT EXISTS my_field_name TEXT;

-- For category-specific data
ALTER TABLE eligibilities ADD COLUMN IF NOT EXISTS my_field_name TEXT;
```

Name conventions:
- Use snake_case (my_field_name, not myFieldName)
- Add `_hi` suffix for Hindi versions: `my_field_name` + `my_field_name_hi`
- Timestamp fields: include timezone: `timestamp(3) with time zone`
- Large text: use `text`, not `varchar`

### Step 3: Update Data Type

**File**: `src/db/schema.ts`

Add the field to the appropriate Drizzle table definition:

```typescript
export const recruitments = pgTable('recruitments', {
  // ... existing fields
  myFieldName: text('my_field_name'),
  myFieldNameHi: text('my_field_name_hi'),
});
```

**Type Mapping:**
- text → `text()`
- timestamp → `timestamp('my_field', { withTimezone: true })`
- integer → `integer()`
- json → `jsonb()`

### Step 4: Update buildHubData

**File**: `src/components/recruitment/recruitment-hub.tsx`

Add code to populate the field from the database:

```typescript
// In buildHubData function
const myFieldValue = str(recruitment.myFieldName);

// In appropriate glance, section, or details array
if (myFieldValue) {
  glance.push({
    label: 'My Field Label',
    value: myFieldValue,
  });
}
```

### Step 5: Run Completeness Test

```bash
npm test -- completeness.test.ts
```

This automatically verifies:
- ✅ Field is in data spec
- ✅ Field is in database schema
- ✅ Field is in UI component
- ✅ Field has correct data type
- ✅ No orphaned fields exist

### Step 6: Document in PR

Use this checklist in your PR description:

```markdown
## New Field: [Field Name]

- [ ] Added to RECRUITMENT_DATA_SPEC (src/components/recruitment/data-spec.ts)
- [ ] Database migration created (supabase/migrations/...)
- [ ] Schema updated (src/db/schema.ts)
- [ ] buildHubData updated (src/components/recruitment/recruitment-hub.tsx)
- [ ] Completeness test passes
- [ ] Competitive parity verified (compared with FJA)

### Completeness Impact
- Before: X% of critical fields displayed
- After: Y% of critical fields displayed
```

---

## Architecture: Data Spec-Driven UI

The `RECRUITMENT_DATA_SPEC` is the single source of truth. All UI generation should reference it:

```typescript
// ❌ DON'T: Hardcode field labels
glance.push({ label: 'My Field', value: data.myField });

// ✅ DO: Reference spec
const spec = RECRUITMENT_DATA_SPEC.overview.myField;
glance.push({ label: spec.label, value: data.myField });
```

### Benefits
1. **Single point of change**: Update label in spec, it updates everywhere
2. **Automatic validation**: Spec tells you required format
3. **Completeness tracking**: Easy to see which fields are missing
4. **Documentation**: Every field has a description + example

---

## Data Completeness Levels

### Level 1: Critical (Must-Have) — 100% Required
Core decision-making fields:
- Organization
- Posts/Positions
- Total vacancies
- Application deadline
- Job description
- Salary
- Qualifications
- Age limit
- Application mode

**Target**: 100% of critical fields displayed

### Level 2: High Priority — 90% Target
Important context:
- Application start date
- Exam date
- Selection process
- Location
- Experience required
- Vacancy breakdown by category

**Target**: 90% of high fields displayed

### Level 3: Medium Priority — 70% Target
Nice-to-have enhancements:
- Admit card date
- Interview date
- Promotion prospects
- Previous year cutoffs
- Physical test requirements

**Target**: 70% of medium fields displayed

### Level 4: Low Priority — Optional
Bonus information:
- Working hours
- Travel policy
- Benefits details
- Company culture info

**Target**: 50%+ of low fields displayed

---

## Completeness Audit

### Running the Audit

```bash
# See which fields are missing
npm run audit:completeness

# Output example:
# ✅ Critical: 18/20 (90%)
# ✅ High: 15/16 (94%)
# ⚠️  Medium: 8/12 (67%)
# 🔴 Missing: interview_date, admit_card_date, physical_test
```

### Monthly Review

Every month, run:

```bash
npm run audit:completeness -- --output=csv > completeness-$(date +%Y-%m).csv
```

Track progress in: `/metrics/data-completeness-trend.csv`

---

## Common Field Patterns

### Date Fields
```typescript
// In spec:
{ format: 'date', example: '2026-11-09' }

// In buildHubData:
const dateStr = recruitment.applicationEndDate
  ? formatDate(recruitment.applicationEndDate)
  : null;
glance.push({ label: 'Last date', value: dateStr });
```

### Link Fields
```typescript
// In spec:
{ format: 'link', example: 'https://upsc.gov.in' }

// In buildHubData:
glance.push({ label: 'Official notification', value: notification Url, href: notificationUrl });
```

### Category-Wise Data
```typescript
// In spec:
{ format: 'list', example: 'UR: 250, OBC: 150, SC: 80' }

// In buildHubData:
const breakdown = posts
  .flatMap(p => p.vacancyBreakdown)
  .map(vb => `${vb.categoryName}: ${vb.count}`)
  .join(', ');
```

### HTML Content
```typescript
// In spec:
{ format: 'html', description: 'Rich text job description' }

// In buildHubData:
// Use dangerouslySetInnerHTML only after sanitization
const sanitized = DOMPurify.sanitize(recruitment.jobDescription);
```

---

## Quick Reference: Field Checklist

Use this when adding any new field:

```
CHECKLIST: Adding "[Field Name]"

SPECIFICATION
[ ] Added to RECRUITMENT_DATA_SPEC
[ ] Correct section (overview/timeline/selectionProcess/jobDetails/etc)
[ ] Label, format, priority set
[ ] Description written
[ ] Example provided

DATABASE
[ ] Migration file created
[ ] Added to correct table (recruitments/posts/eligibilities)
[ ] Column names use snake_case
[ ] Includes Hindi version (-_hi suffix)
[ ] Includes COMMENT for documentation
[ ] Includes INDEX if frequently queried

CODE
[ ] Added to Drizzle schema (src/db/schema.ts)
[ ] buildHubData updated
[ ] Field is fetched from database
[ ] Null/empty values handled gracefully
[ ] Data type matches spec.format

TESTING
[ ] Completeness test passes
[ ] Sample data exists for testing
[ ] Formatting works correctly

DOCUMENTATION
[ ] PR checklist filled out
[ ] Field documented in data-spec.ts
[ ] Database migration commented
```

---

## FAQ

### Q: Where should my field go?
A: Check RECRUITMENT_DATA_SPEC. It's organized by section. Ask: "When would a candidate want to know this?" That's the section.

### Q: What priority should I set?
A: Critical = "I won't apply without knowing this". High = "I need this to decide". Medium = "Nice context". Low = "Fun to know".

### Q: Can I add a field without updating the spec?
A: No. The spec is the contract. Database change + spec change must happen together. The completeness test will catch it.

### Q: How do I handle translation (Hindi)?
A: Add `fieldName_hi` alongside `fieldName`. In UI, check user's language preference and show appropriate version.

### Q: What if the data isn't available?
A: The spec doesn't change. In UI, show "Not stated in this notification" (already implemented). The field is still tracked as captured, just not populated.

---

## Related Files

- **Data Spec**: `src/components/recruitment/data-spec.ts` — Master specification
- **UI Component**: `src/components/recruitment/recruitment-hub.tsx` — buildHubData function
- **Schema**: `src/db/schema.ts` — Database types
- **Tests**: `src/components/recruitment/__tests__/completeness.test.ts` — Validation
- **Migrations**: `supabase/migrations/` — Database changes

---

## Historical Context

This guide was created to solve a 43% data completeness gap where:
- `selection_process` existed in DB for 6+ months but wasn't displayed
- `salary` field was never added despite being critical
- No systematic way to track which fields were missing

The spec-driven approach ensures fields go from DB → spec → UI as a single atomic unit.
