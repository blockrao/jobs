# Hindi Content Translation Pipeline Guide

## Overview

This guide explains how to translate all 212 existing job postings to Hindi using the Claude Opus API with prompt caching for efficiency.

## Current Status

- **Database**: ✅ Migration applied successfully (Hindi columns added to 8 tables)
- **Translation Script**: ✅ Created (`src/scripts/translate-jobs-to-hindi.ts`)
- **Translations**: ⏳ Ready to execute
- **Dependencies**: ✅ `@anthropic-ai/sdk` added to package.json

## Prerequisites

Ensure you have:
1. `ANTHROPIC_API_KEY` in `.env.local` (your Claude API key)
2. `DATABASE_URL` pointing to Supabase
3. Node.js 18+ with npm installed
4. Network access to both Anthropic API and Supabase

## How It Works

### Architecture

The translation pipeline uses a **batch processing approach** with **prompt caching** for cost efficiency:

```
Existing English Postings (212)
           ↓
   Read in batches of 100
           ↓
   Translate in Claude API
   (batches of 10 for context)
           ↓
   Cache system prompt for efficiency
           ↓
   Update postings with Hindi content
           ↓
   Verify coverage (title_hi, description_hi, etc.)
```

### Key Features

1. **Prompt Caching**: System prompt is cached after first use, reducing API costs by 90%+
2. **Batch Processing**: Fetches jobs in chunks to manage memory
3. **Sub-batching**: Claude translates 10 jobs at a time for better quality
4. **Error Handling**: Continues to next batch if one fails
5. **Progress Tracking**: Real-time feedback on translation status

## Running Locally

### Step 1: Setup

```bash
cd /home/claude/jobs

# Install dependencies (if not already done)
npm install --legacy-peer-deps

# Verify .env.local has required keys
echo "ANTHROPIC_API_KEY=$(echo $ANTHROPIC_API_KEY)"
echo "DATABASE_URL=$(grep DATABASE_URL .env.local)"
```

### Step 2: Execute Translation

```bash
# Run the translation pipeline
npm run i18n:translate-hindi

# Expected output:
# Starting Hindi translation pipeline...
# Found 212 postings to translate (batch size: 100)
# 
# Processing batch 1 (10 jobs)...
# ✓ Successfully translated and updated 10 jobs
# 
# Processing batch 2 (10 jobs)...
# ✓ Successfully translated and updated 10 jobs
# ... (continues for all batches)
# 
# 📊 Translation complete: 212 succeeded, 0 failed
# Final status: [{"total":212,"translated":212}]
```

### Step 3: Verify Results

```bash
# Check translation coverage
npx tsx -e "
import { getDb } from './src/db';
import { postings } from './src/db/schema';

const db = getDb();
const result = await db
  .select({
    total: sql\`count(*)\`,
    translated: sql\`count(case when title_hi is not null then 1 end)\`
  })
  .from(postings);

console.log('Translation Status:', result[0]);
process.exit(0);
"
```

Expected result: `{ total: 212, translated: 212 }`

## Troubleshooting

### Error: "Cannot read properties of undefined (reading 'select')"
**Solution**: Make sure you're using `getDb()` function, not importing `db` directly.

### Error: "getaddrinfo ENOTFOUND db.xxxxx.supabase.co"
**Solution**: Run the script from your local machine, not a container. Network access to Supabase is required.

### Error: "401 Unauthorized" from Anthropic
**Solution**: Check that `ANTHROPIC_API_KEY` is set correctly in `.env.local`

### Error: "rate limit exceeded"
**Solution**: The script already includes 1-second delays between batches. If rate limiting persists:
- Increase delay in script: `await new Promise(resolve => setTimeout(resolve, 3000));`
- Or reduce batch size from 10 to 5

### Partial translations (some fields null)
**Solution**: Claude correctly returns `null` for empty English fields. This is expected behavior.

## Cost Estimation

**API Costs for Full Translation**:
- 212 postings × 3 main fields (title, description, eligibility) ≈ ~50,000 tokens input
- With prompt caching:
  - First batch: Full system prompt cached (~1500 tokens)
  - Subsequent batches: Use cached prompt (cost reduction ~90%)
  - Estimated total: $0.50 - $1.00 using Claude Opus

**Database Storage**: Minimal (adds Hindi text columns, ~5-10MB for all translations)

## Translation Quality

### Translation Strategy
- Professional, formal Hindi (Devanagari script)
- Preserves technical terminology and official job titles
- Maintains numbers, dates, and abbreviations
- Uses official Hindi names for locations (e.g., Delhi = दिल्ली)

### Manual Review Recommended
For production deployment, consider:
1. Sample review (10-20 postings) by Hindi speaker
2. QA checks for:
   - Proper Devanagari script rendering
   - Location names accuracy
   - Technical term consistency
3. Update any incorrect translations directly in database

### Fields Translated

| English Field | Hindi Field | Notes |
|---|---|---|
| title | title_hi | Job position title |
| description | description_hi | Full job description |
| eligibility | eligibility_hi | Who can apply |
| responsibilities | responsibilities_hi | Job duties |
| requirements | requirements_hi | Required skills/experience |
| age_relaxation_notes | age_relaxation_notes_hi | Age limit exceptions |
| location_city | location_city_hi | Job location |

## Scaling to Other Languages

Once Hindi is complete, adding more languages is straightforward:

```typescript
// For example, adding Marathi (mr):
const SYSTEM_PROMPT_MR = `...translate to Marathi...`;

// Add mr columns to schema
ALTER TABLE postings ADD COLUMN title_mr VARCHAR(220);

// Update translation script with new language
// Re-run with new locale
```

## Post-Translation Tasks

### 1. SEO Updates
- [x] hreflang tags created in layout
- [ ] Verify both /en and /hi routes indexed in Google Search Console
- [ ] Monitor search impressions by language

### 2. Content Integration
- [ ] Update UI to display titleHi in Hindi searches
- [ ] Add language detection to search endpoints
- [ ] Test voice search with Hindi queries

### 3. Analytics
- [ ] Add language dimension to GA4
- [ ] Track engagement by language
- [ ] Monitor bounce rate per language

### 4. QA
- [ ] Manual spot-check of translations
- [ ] Test Hindi character rendering across browsers
- [ ] Mobile testing for language switcher

## Monitoring Translation Process

While the script runs, monitor:

```bash
# In another terminal, check progress every 30 seconds
watch -n 30 'echo "SELECT COUNT(*), COUNT(CASE WHEN title_hi IS NOT NULL THEN 1 END) FROM postings;" | psql $DATABASE_URL'
```

## Timeline

- **Translation Execution**: 5-10 minutes (212 postings)
- **Database Updates**: Included in script (batched)
- **Verification**: 1-2 minutes
- **QA Review**: 30-60 minutes (sample review)
- **Deployment**: 5 minutes

**Total Time**: ~1 hour including QA

## Next Steps

After translation completes:

1. ✅ Database migration applied
2. ⏳ Run translation script locally
3. 📝 Verify translations (spot-check)
4. 🚀 Deploy updated schema to production
5. 🔍 Monitor Hindi search queries in analytics
6. 🎤 Test voice search integration
7. 📊 Track adoption metrics

## Questions?

Check these files for additional context:
- `I18N_IMPLEMENTATION.md` - Overall architecture
- `src/scripts/translate-jobs-to-hindi.ts` - Translation script source
- `QUERY_ENGINE_ARCHITECTURE_V2.md` - Search & discovery architecture

---

**Last Updated**: 2026-10-01  
**Status**: Ready for execution
