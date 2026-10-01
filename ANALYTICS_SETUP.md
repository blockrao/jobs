# Analytics Setup & Traffic Tracking

## Overview

This platform now tracks user navigation and engagement across the exam hierarchy. Data helps identify:
- **High-traffic exams** → Prioritize scraper for these exams
- **User navigation patterns** → Which commissions/exams drive engagement
- **Job posting engagement** → Which jobs candidates actually click
- **Search intent** → (Future) Popular exam queries

## Setup Instructions

### 1. Create Google Analytics 4 Property

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create new property for the jobs platform
3. In Admin → Property Settings, copy the **Measurement ID** (format: `G_XXXXXXXXXXXXX`)

### 2. Add GA4 Measurement ID to Environment

For **Production (Vercel):**
- Go to Vercel dashboard → Project Settings → Environment Variables
- Add: `NEXT_PUBLIC_GA4_MEASUREMENT_ID=G_XXXXXXXXXXXXX`
- Redeploy

For **Local Development:**
- Copy `.env.example` to `.env.local`
- Add: `NEXT_PUBLIC_GA4_MEASUREMENT_ID=G_XXXXXXXXXXXXX`
- Restart dev server

## Events Tracked

### 1. **view_commission_hub**
**When:** User visits `/commissions/[slug]`
**Data:**
- `commission_slug` — e.g., "ssc", "state", "banking"
- `commission_name` — e.g., "SSC (Staff Selection Commission)"

**Insight:** Which commissions get traffic. High traffic = high-value category for scraper.

### 2. **view_exam_page**
**When:** User visits `/[exam_slug]`
**Data:**
- `exam_slug` — e.g., "ssc-cgl", "delhi-police-constable"
- `exam_label` — Full exam name
- `commission_slug` — Parent commission

**Insight:** Most popular exams by traffic. Sort by page views to prioritize job scraping.

### 3. **click_job_posting**
**When:** User clicks on a job posting link
**Data:**
- `job_slug` — Individual job posting ID
- `job_title` — Job title
- `exam_slug` — Which exam the posting came from

**Insight:** Which jobs candidates actually engage with. High clicks = good job postings = scraper is finding valuable content.

## Interpreting the Data

### Dashboard Setup in GA4

1. Create custom report:
   - **Dimensions:** `exam_slug`, `commission_slug`
   - **Metrics:** `Views`, `Clicks`, `Engagement Rate`
   - **Filter:** `event_name` = `view_exam_page` or `click_job_posting`

2. Key Metrics to Watch:
   - **Exam Page Views** — Raw traffic to exam pages
   - **Job Click-Through Rate (CTR)** — (Clicks / Views) % → Higher = better content
   - **Commission Hub Bounce Rate** → High bounce = people aren't drilling into exams
   - **Conversion Funnel** — Commission → Exam → Job Click

### Decision Points for Expansion

**Phase 2 Validation:**
- Which state PSCs drive traffic?
- Which get zero traffic? (Consider deprioritizing in scraper)

**Phase 3 Decisions:**
- Are specialized exams (CLAT, AFCAT) getting searched?
- If yes → Add to Phase 3
- If no → Focus on deepening coverage of Phase 2 exams

## Example Queries

### "Which exams are most popular?"
```
Event: view_exam_page
Dimensions: exam_slug
Metrics: Views
Sort by: Views (descending)
Limit: Top 20
```

### "Which job postings drive most engagement?"
```
Event: click_job_posting
Dimensions: exam_slug, job_slug
Metrics: Event count
Sort by: Event count (descending)
```

### "Commission hub effectiveness"
```
Event: view_commission_hub
Dimensions: commission_slug
Add secondary dimension: Path
Metrics: Views, Engagement rate
```

## Next Steps

1. **Wait 1-2 weeks** for meaningful traffic data
2. **Export data** from GA4 (Reports → Export)
3. **Analyze exam popularity** across Phase 1 & Phase 2
4. **Update scraper priorities** based on traffic patterns
5. **Plan Phase 3** exams based on search intent data

## Tracking Code Details

### Files Modified/Added:

- `src/lib/analytics.ts` — Event tracking functions
- `src/components/analytics-tracker.tsx` — Automatic page view tracking
- `src/components/job-posting-link.tsx` — Job click tracking wrapper
- `src/app/layout.tsx` — GA4 script injection + AnalyticsTracker component

### How It Works:

1. **GA4 Script Loads** → `layout.tsx` injects Google Analytics script
2. **Page Navigation** → `AnalyticsTracker` detects route changes, calls `trackCommissionView()` or `trackExamView()`
3. **Job Clicks** → `JobPostingLink` component fires `trackJobClick()` on link click
4. **Data Sent** → gtag pushes events to GA4 property

## Troubleshooting

### Events not showing in GA4?

1. Check `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is set
2. Open browser DevTools → Network → Look for requests to `www.googletagmanager.com`
3. Check GA4 Real-Time report (wait 30 seconds for events to appear)
4. If still missing: Check GA4 data retention settings

### Need Custom Events?

Add to `src/lib/analytics.ts`:
```typescript
export function trackCustomEvent(eventName: string, params?: EventParams) {
  trackEvent(eventName as AnalyticsEvent, params);
}
```

Then call: `trackCustomEvent('my_event', { my_param: 'value' })`
