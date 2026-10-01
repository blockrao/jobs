# Hindi Multilingual (i18n) Implementation Progress

**Date**: 2026-10-01  
**Status**: Phase 1 Complete (Foundation), Phase 2 In Progress (Integration)  
**Priority**: Critical for product adoption in India market

## Overview

Implementing comprehensive multilingual support for JobOye with English (en) and Hindi (hi) as primary languages. This implementation follows next-intl best practices for Next.js 16 with locale-aware routing, SEO optimization, and progressive language detection.

## Completed Tasks

### 1. Database Schema Migration (✅ DONE)
- **File**: `drizzle/0001_add_hindi_content.sql`
- **Coverage**: Added Hindi columns (`*_hi`) to 8 tables:
  - `postings`: titleHi, descriptionHi, eligibilityHi, responsibilitiesHi, requirementsHi, ageRelaxationNotesHi, locationCityHi
  - `organizations`: nameHi, descriptionHi
  - `commissions`: nameHi, descriptionHi  
  - `exams`: labelHi, descriptionHi, eligibilityHi
  - `articles`: titleHi, dekHi, bodyHi
  - `categories`: nameHi, descriptionHi
  - `locations`: stateNameHi, districtNameHi, cityNameHi
  - `postingUpdates`: titleHi, descriptionHi
- **SEO**: Added Hindi full-text search index (to_tsvector('hindi')) and language_default routing field
- **Status**: Ready for migration execution in Supabase

### 2. TypeScript Schema Updates (✅ DONE)
- **File**: `src/db/schema.ts`
- **Changes**: Added Hindi column definitions to all Drizzle ORM schema tables for type safety
- **Type Safety**: All `*_hi` columns properly typed as `varchar` or `text` fields

### 3. Package Dependencies (✅ DONE)
- **File**: `package.json`
- **Added**: `"next-intl": "^3.23.0"` for multilingual routing and message management
- **Installed**: npm install --legacy-peer-deps (due to Next.js 16 peer deps)

### 4. i18n Configuration (✅ DONE)
- **File**: `src/i18n/request.ts`
- **Exports**:
  - `locales`: ['en', 'hi'] configuration
  - `defaultLocale`: 'en'
  - `getMessages(locale)`: Async message loader for dynamic imports
- **Message Files Created**:
  - `src/i18n/messages/en.json`: 100+ UI strings in English
  - `src/i18n/messages/hi.json`: Devanagari translations of all keys
  - Coverage: Navigation, search, jobs, exams, articles, filters, forms, alerts, admin, errors, metadata

### 5. Middleware/Proxy Setup (✅ DONE)
- **File**: `src/proxy.ts` (merged i18n + admin auth)
- **Features**:
  - Locale detection from URL (/en/*, /hi/*)
  - Accept-Language header fallback
  - Default locale routing (defaultLocale = 'en')
  - Integrated with existing admin session authentication
  - Matcher pattern: All routes except /api/*, /_next/*, static assets

### 6. IntlProvider Component (✅ DONE)
- **File**: `src/components/intl-provider.tsx`
- **Purpose**: Client-side i18n context provider for all child components
- **Config**:
  - Locale and messages injection
  - Timezone: Asia/Kolkata (India Standard Time)
  - Error handling for missing messages

### 7. Language Switcher Component (✅ DONE)
- **File**: `src/components/language-switcher.tsx`
- **Features**:
  - /en ↔ /hi route switching
  - Current locale highlighting
  - Minimal inline styling (no external UI library dependency)
  - Client component with next/navigation routing

### 8. Root Layout Updates (✅ DONE)
- **File**: `src/app/layout.tsx`
- **Changes**:
  - Wrapped with IntlProvider at root level
  - Added hreflang links for SEO (en, hi, x-default)
  - Alternate language links in metadata
  - Open Graph metadata for social sharing
  - Messages loaded for default locale

### 9. Locale-Aware Layout (✅ DONE)
- **File**: `src/app/[locale]/layout.tsx`
- **Features**:
  - Dynamic locale parameter
  - generateStaticParams() for all supported locales
  - Locale validation
  - Comprehensive metadata generation with hreflang
  - Locale-specific lang attributes
  - OpenGraph with correct locale tags
  - Full i18n provider integration

### 10. Header Component Update (✅ DONE)
- **File**: `src/components/header.tsx`
- **Changes**: Made client component, added LanguageSwitcher in nav
- **User Experience**: Language toggle visible in header for easy access

## Remaining Tasks (Priority Order)

### Phase 2: Content Integration & Testing

#### 1. Database Migration Execution
- [ ] Run migration on Supabase: `drizzle-kit migrate` or direct SQL execution
- [ ] Verify Hindi columns created on all 8 tables
- [ ] Test language_default field filtering
- [ ] Verify Hindi FTS index on postings table

#### 2. Content Translation Pipeline
- [ ] Implement job content translation service
- [ ] Option A: Claude API batch translation (prompt-cached, cost-effective)
- [ ] Option B: Google Translate API integration
- [ ] Backfill existing 213 postings with Hindi translations
- [ ] Implement incremental translation for new postings

#### 3. Route Structure Completion
- [ ] Create /[locale]/jobs/page.tsx (internationalized listing)
- [ ] Create /[locale]/jobs/[slug]/page.tsx (job detail + Hindi metadata)
- [ ] Create /[locale]/search/page.tsx (multilingual search UI)
- [ ] Create /[locale]/exams/page.tsx (exam directory)
- [ ] Create /[locale]/articles/page.tsx (guide listing)
- [ ] Update all route links to be locale-aware
- [ ] Create /[locale]/page.tsx (home page with Hindi content)

#### 4. UI String Integration
- [ ] Replace hardcoded English strings with useTranslations() hook calls
- [ ] Update components in:
  - JobSearch.tsx → multilingual filters and labels
  - DiscoverySections.tsx → translated section headings
  - Existing page.tsx files → use i18n messages
- [ ] Implement pluralization for count messages ({count} jobs found)

#### 5. SEO Optimization
- [ ] Add hreflang tags to all dynamic pages
- [ ] Update robots.txt to include /hi/* paths
- [ ] Update sitemap.xml with locale variants
- [ ] Add lang attributes to <html> tag (now done in layout)
- [ ] Test with Google Search Console
- [ ] Verify voice search indexing for Hindi queries

#### 6. Search & Discovery
- [ ] Wire language-detector output to language switcher
- [ ] Implement language detection in search API
- [ ] Add lang parameter to search endpoints
- [ ] Test voice search in Hindi (Google Assistant)
- [ ] Verify Hinglish query handling

#### 7. Performance & Analytics
- [ ] Add language dimension to GA4
- [ ] Track language-specific conversion funnels
- [ ] Monitor page load times per locale
- [ ] Optimize Hindi font delivery (Devanagari)
- [ ] Cache warm-up for Hindi-translated pages

#### 8. Testing & QA
- [ ] Unit tests: Locale detection, message loading
- [ ] Integration tests: Route switching, language persistence
- [ ] E2E tests: Full user flow in both languages
- [ ] Manual testing: Hindi character rendering, RTL compatibility
- [ ] Accessibility: ARIA labels in both languages
- [ ] Mobile testing: Language switcher on small screens

## Architecture Decisions

### 1. Locale in URL (/en, /hi)
**Why**: Best for SEO, analytics, user preferences, browser back button  
**Alternative Considered**: User preference cookie (less SEO-friendly)

### 2. Next-intl Framework
**Why**: Purpose-built for Next.js, good performance, strong i18n patterns  
**Compatibility**: Requires --legacy-peer-deps with Next.js 16.3.7 (temporary)

### 3. Message Files (JSON)
**Why**: Simple, easy to maintain, integrates with next-intl  
**Extensibility**: Can add plural rules, date formatting per locale

### 4. Proxy-based Middleware
**Why**: Unified with existing admin auth in proxy.ts  
**Alternative**: Separate middleware.ts (rejected due to Next.js 16 proxy requirement)

### 5. Deferred Translation Service
**Why**: Separate concern, can be updated independently  
**Approach**: Claude API for batch translation, Google Translate as fallback

## Files Changed/Created This Session

```
Created:
  - src/middleware.ts (moved to proxy.ts)
  - src/i18n/request.ts
  - src/i18n/messages/en.json
  - src/i18n/messages/hi.json
  - src/components/intl-provider.tsx
  - src/components/language-switcher.tsx
  - src/app/[locale]/layout.tsx
  - drizzle/0001_add_hindi_content.sql
  - I18N_IMPLEMENTATION.md (this file)

Modified:
  - package.json (added next-intl)
  - src/db/schema.ts (added Hindi columns)
  - src/app/layout.tsx (added IntlProvider, hreflang)
  - src/components/header.tsx (added LanguageSwitcher)
  - src/proxy.ts (integrated i18n middleware)
```

## Known Issues & Blockers

### 1. TypeScript Errors (Pre-existing)
- Existing code has TypeScript errors in:
  - src/app/recruitments/[slug]/page.tsx (calculatedStatus, daysToClosing properties)
  - src/lib/query-engine/*.ts (type mismatches)
- These do NOT block i18n functionality but prevent clean builds
- **Action**: Fix in separate task or use `tsc --noEmit --skipLibCheck`

### 2. Next.js 16 Compatibility
- next-intl v3.23.0 targets Next.js ≤15, requires --legacy-peer-deps
- Consider upgrading to next-intl v4+ for official Next.js 16 support
- **Action**: Monitor next-intl releases for Next.js 16 compatibility

### 3. Existing Routes Need Migration
- Current routes at /jobs, /search, /articles are not under [locale]
- With proxy middleware, these work but aren't fully i18n'd
- **Action**: Complete Phase 2 route restructuring

## Deployment Checklist

- [ ] Database migration executed on production Supabase
- [ ] All Hindi translations completed and verified
- [ ] Routes restructured under [locale] pattern
- [ ] UI strings using useTranslations() hook
- [ ] SEO tags (hreflang, og:locale) verified
- [ ] Voice search tested in Hindi
- [ ] Analytics tracking language dimension
- [ ] Performance testing (Lighthouse, CWV)
- [ ] User testing with Hindi speakers
- [ ] Monitoring: Error rates, language-specific conversion
- [ ] Rollback plan ready (revert proxy config)

## Success Metrics

1. **Coverage**: 100% of UI strings available in English & Hindi
2. **Quality**: All Hindi translations reviewed by native speaker
3. **Performance**: <100ms additional latency for i18n (vs non-i18n)
4. **SEO**: Correct hreflang indexing, both languages ranking
5. **Adoption**: >30% of traffic from Hindi-speaking users within 30 days
6. **Voice Search**: 60% of voice queries in Hindi detected correctly

## Next Steps

1. Validate database schema with team
2. Start content translation (Claude API batch)
3. Begin route migration to /[locale] pattern
4. Set up language-specific analytics
5. Arrange Hindi language QA testing
6. Plan voice search integration
