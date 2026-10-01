# Canonical Routes & Entity Pages - Deployment Checklist

**Purpose:** Ensure every entity (organization, exam, job posting, article) has proper canonical routes and localization for all supported locales.

---

## 🚨 Critical Issue: Routing Architecture

**Status:** BROKEN
- ❌ Organization pages only work at `/organizations/[slug]` (English only)
- ❌ Hindi speakers can't access `/hi/organizations/[slug]`
- ❌ No proper hreflang links for multi-locale versions
- ❌ Missing `/[locale]/organizations/[slug]` routes

**Example:** User reports https://www.joboye.com/organizations/aiims-medical-institute is broken

---

## ✅ Pre-Deployment Checklist

### Phase 1: Validation (Before Any New Posting)

Every new posting must pass this validation:

```bash
# Run before deploying new content
npm run validate:routes

# Expected output:
# ✅ ALL CANONICAL ROUTES VALID
# OR
# ⚠️  ISSUES DETECTED (with recommendations)
```

**What it checks:**
- [ ] All organizations have slugs
- [ ] All exams have slugs
- [ ] All job postings have slugs
- [ ] All articles have slugs
- [ ] Hindi translations exist for organizations
- [ ] Hindi translations exist for exams
- [ ] Hindi translations exist for job postings
- [ ] Hindi translations exist for articles

### Phase 2: Route Structure (Next Release)

**MUST MIGRATE routes to [locale] segment:**

```diff
  src/app/
  ├── [locale]/
+ │   ├── organizations/[slug]/page.tsx    ← MOVE HERE
+ │   ├── exams/[slug]/page.tsx            ← MOVE HERE
+ │   ├── jobs/[slug]/page.tsx             ← MOVE HERE
+ │   ├── articles/[slug]/page.tsx         ← MOVE HERE
+ │   ├── recruitments/[slug]/page.tsx     ← MOVE HERE
  │   └── ...
- ├── organizations/[slug]/page.tsx    ← DELETE (MOVE to [locale])
- ├── exams/[slug]/page.tsx            ← DELETE (MOVE to [locale])
- ├── jobs/[slug]/page.tsx             ← DELETE (MOVE to [locale])
```

**Timeline:** 1 working day (routing + translations + testing)

### Phase 3: Content Translation (Parallel with Phase 2)

**Required before routes go live:**

```bash
# Translate organizations to Hindi
npm run i18n:translate-organizations

# Translate exams to Hindi  
npm run i18n:translate-exams

# Translate job postings to Hindi
npm run i18n:translate-hindi

# Translate articles to Hindi
npm run i18n:translate-articles
```

### Phase 4: Verification

```bash
# Check coverage after translations
npm run validate:routes

# Expected: ✅ ALL CANONICAL ROUTES VALID
```

---

## 📋 Entity Pages - Canonical URL Requirements

| Entity | English Route | Hindi Route | Required Fields | Translation Fields |
|--------|---------------|-------------|-----------------|--------------------|
| Organizations | `/organizations/[slug]` | `/hi/organizations/[slug]` | `slug`, `name` | `name_hi`, `description_hi` |
| Exams | `/exams/[slug]` | `/hi/exams/[slug]` | `slug`, `name` | `name_hi`, `description_hi` |
| Job Postings | `/jobs/[slug]` | `/hi/jobs/[slug]` | `slug`, `title` | `title_hi`, `description_hi` |
| Articles | `/articles/[slug]` | `/hi/articles/[slug]` | `slug`, `title` | `title_hi`, `content_hi` |
| Recruitments | `/recruitments/[slug]` | `/hi/recruitments/[slug]` | `slug`, `name` | N/A (use existing fields) |

---

## 🔄 Deployment Process

### Every Time You Add New Content:

1. **Create entity** (organization, exam, job posting, or article)
2. **Generate slug** (auto-generated from name)
3. **Run validation:**
   ```bash
   npm run validate:routes
   ```
4. **If issues found:** Translate missing fields to Hindi using Claude API
5. **Re-validate** until all pass ✅
6. **Deploy** to production

### When Deploying New Routes (Phase 2):

1. **Migrate routes** to `[locale]` segment
2. **Translate all entities** to Hindi
3. **Update all internal links** to include locale
4. **Add hreflang tags** for all entity pages
5. **Set canonical URLs** correctly
6. **Test in both locales** (/en/..., /hi/...)
7. **Verify Vercel deployment** succeeds
8. **Monitor analytics** for broken links

---

## 🛡️ Continuous Integration

### Add to CI Pipeline:

```yaml
# .github/workflows/validate-routes.yml
name: Validate Canonical Routes
on: [push]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run validate:routes
```

**Prevents:** Deploying broken entities or missing translations

---

## 📊 Monitoring

### Post-Deployment Checks:

```bash
# Check all entity pages render correctly
curl https://www.joboye.com/organizations/aiims-medical-institute
curl https://www.joboye.com/hi/organizations/aiims-medical-institute

# Verify hreflang tags exist
curl -s https://www.joboye.com/organizations/aiims-medical-institute | grep hreflang
```

### Analytics to Track:

- [ ] 404 errors on entity pages
- [ ] Page load times by locale
- [ ] User sessions by language (en vs hi)
- [ ] Click-through on language switcher
- [ ] Search impressions by locale

---

## 🚀 Long-Term: Route Architecture

**Current (BROKEN):**
```
/organizations/[slug]     ← English only
/exams/[slug]             ← English only
/jobs/[slug]              ← English only
```

**Target (FIXED):**
```
/[locale]/organizations/[slug]    ← en + hi
/[locale]/exams/[slug]            ← en + hi
/[locale]/jobs/[slug]             ← en + hi
/[locale]/articles/[slug]         ← en + hi
/[locale]/recruitments/[slug]     ← en + hi
```

**Benefits:**
✅ Proper hreflang links for SEO
✅ Hindi speakers can read all content
✅ Canonical URLs set correctly
✅ No duplicate content issues
✅ Consistent routing across all entities

---

## 🔧 Troubleshooting

### "npm run validate:routes" shows failures

1. **Check database connection:**
   ```bash
   echo $DATABASE_URL  # Should be set
   ```

2. **Check for missing translations:**
   ```bash
   npm run i18n:translate-hindi
   npm run i18n:translate-organizations
   npm run i18n:translate-exams
   ```

3. **Verify slug generation:**
   ```sql
   SELECT id, name, slug FROM organizations WHERE slug IS NULL;
   ```

### Organization page still broken after validation

Likely still using old routing architecture. Validation passes but routes haven't migrated yet.

**Next step:** Implement Phase 2 (routing migration)

---

## 📚 Related Documentation

- `ROUTING_ISSUE.md` - Detailed technical breakdown of the problem
- `TRANSLATION_GUIDE.md` - How to run translation scripts
- `I18N_IMPLEMENTATION.md` - i18n architecture overview
- `src/scripts/validate-canonical-routes.ts` - Validation script source

---

## ✅ Success Criteria

- [x] All entity pages have slugs (no NULL slugs)
- [x] Hindi translations exist for all entities (212 postings done)
- [ ] Routes migrated to `[locale]` segment (Phase 2 - IN PROGRESS)
- [ ] All entity pages render in both locales (Phase 2 - IN PROGRESS)
- [ ] Proper hreflang links on all pages (Phase 2 - IN PROGRESS)
- [ ] Pre-deployment validation blocks broken deployments
- [ ] CI/CD validates canonical routes before deploy
- [ ] Analytics shows balanced en/hi traffic

---

**Last Updated:** 2026-10-01
**Status:** Critical - Phase 1 complete, Phase 2 in progress
**Owner:** Prav
