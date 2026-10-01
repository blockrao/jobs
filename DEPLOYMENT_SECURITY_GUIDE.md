# Deployment Security Guide

## Environment Variables & Secrets Management

### ✅ What NOT to Commit to Git

- ❌ `.env.local` - Local development secrets
- ❌ `.env.production.local` - Production secrets
- ❌ API keys, passwords, tokens
- ❌ Private credentials
- ❌ Database passwords in plaintext

### ✅ What IS Safe in Git

- ✅ `.env.example` - Template showing required variables (no real values)
- ✅ Public configuration (NEXT_PUBLIC_* variables)
- ✅ Non-sensitive feature flags

### Security Setup Checklist

#### Step 1: Local Development

```bash
# Copy example to local
cp .env.example .env.local

# Edit .env.local with YOUR actual values (never commit this file)
# DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT.supabase.co:5432/postgres
# CRON_SECRET=your-strong-random-secret
```

⚠️ **IMPORTANT:** `.env.local` is automatically ignored by `.gitignore` (see line 5: `.env*`)

#### Step 2: Production on Vercel

1. Go to **Vercel Project Settings** → **Environment Variables**
2. Add these secrets (NOT in code, in Vercel dashboard only):

| Variable | Value | Type |
|----------|-------|------|
| `DATABASE_URL` | Supabase connection string | Secret |
| `CRON_SECRET` | Strong random string (min 32 chars) | Secret |
| `NEXT_PUBLIC_SITE_URL` | https://www.joboye.com | Public |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | Your GA4 ID (optional) | Public |

3. Set **Environment** scope to:
   - `DATABASE_URL` → Production, Preview, Development
   - `CRON_SECRET` → Production only
   - `NEXT_PUBLIC_*` → All environments

#### Step 3: Supabase Database Security

1. **Change default password:**
   - Go to Supabase Dashboard → Project Settings → Database
   - Click "Reset password" and set a strong password
   - Save new password in Vercel env vars

2. **Network security:**
   - Supabase → Project Settings → Network
   - Consider IP whitelisting if needed
   - Enable VPC if available in your plan

3. **Database backups:**
   - Enable automatic daily backups
   - Set retention to 7+ days

#### Step 4: Cron Secret Generation

Generate a strong cron secret:

```bash
# Using OpenSSL (recommended)
openssl rand -hex 32

# Or using node (if no OpenSSL)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example:** `a7f3e8c2b1d9e4f6a8c5b2d7e9f1a3c6d8e0f2a4c6e8f0a2b4d6e8f0a2b4`

Add this to Vercel env vars as `CRON_SECRET` (Production only).

### Security Headers

All responses now include security headers (configured in `next.config.ts`):

```
X-Content-Type-Options: nosniff          → Prevent MIME sniffing
X-Frame-Options: DENY                    → Prevent clickjacking
X-XSS-Protection: 1; mode=block         → Enable browser XSS protection
Referrer-Policy: strict-origin-when-cross-origin → Control referrer leaks
Permissions-Policy: geolocation=(), microphone=(), camera=() → Disable sensors
Strict-Transport-Security: max-age=31536000; includeSubDomains → Force HTTPS
```

### Admin Authentication

- Admin login uses SHA-256 password hashing (see `src/lib/admin-token.ts`)
- Admin session stored in `admin_session` cookie
- Middleware (`src/middleware.ts`) enforces authentication on `/admin/*` routes
- Session validity checked on each form submission

**Never:**
- Expose admin password in logs
- Use plaintext passwords
- Share admin credentials over insecure channels

### API Rate Limiting

Search API (`/api/search/jobs`) rate limited to:
- **100 requests per minute** per IP address
- Returns HTTP 429 with `Retry-After` header when exceeded
- Cleanup runs every 10 minutes to prevent memory leak

For production, consider upgrading to Redis-based rate limiting:
```bash
npm install redis
```

Then update `src/lib/rate-limit.ts` to use Redis instead of in-memory storage.

### Cron Jobs Security

Cron endpoints require `Authorization: Bearer {CRON_SECRET}` header.

**Vercel Cron:**
- Automatically includes auth headers on scheduled runs
- Set `CRON_SECRET` in Vercel env vars

**Manual Testing:**
```bash
# Test cron endpoint locally
curl -X POST http://localhost:3000/api/cron/update-recruitment-lifecycle \
  -H "Authorization: Bearer your-cron-secret"
```

### Monitoring & Logging

1. **Enable Vercel Analytics:**
   - Vercel Dashboard → Analytics
   - Monitor traffic, errors, performance

2. **Enable Supabase Monitoring:**
   - Supabase Dashboard → Reports
   - Monitor query performance, connections

3. **Application Errors:**
   - Check `src/app/error.tsx` logs in browser console
   - Add centralized error tracking (e.g., Sentry) for production

### Preventing Common Vulnerabilities

#### SQL Injection Prevention
✅ All database queries use parameterized statements:
```typescript
// Safe - parameterized
db.raw("SELECT * FROM postings WHERE id = $1", [id])

// Unsafe - string concatenation (NEVER DO THIS)
db.raw(`SELECT * FROM postings WHERE id = '${id}'`)
```

#### XSS Prevention
✅ React auto-escapes JSX content
✅ Next.js sanitizes URLs in next/link
✅ Use `dangerouslySetInnerHTML` only with trusted content

#### CSRF Prevention
✅ Admin forms use Next.js server actions (built-in CSRF protection)
✅ Middleware checks session cookies

#### Rate Limiting
✅ Search API limited to 100 req/min per IP
✅ Cron endpoints require secret token

### Pre-Deployment Checklist

- [ ] `.env.local` NOT committed to git
- [ ] All secrets in Vercel env vars (not in code)
- [ ] Database password rotated and strong
- [ ] CRON_SECRET generated and set
- [ ] NEXT_PUBLIC_SITE_URL matches your domain
- [ ] Security headers present in next.config.ts
- [ ] Admin middleware active in src/middleware.ts
- [ ] Rate limiting enabled on search API
- [ ] Supabase backups enabled
- [ ] Vercel project has "Environment Variables" configured
- [ ] Build succeeds: `npm run build`
- [ ] No secrets in build output: `grep -r "password\|secret\|key" .next/`

### Post-Deployment Verification

After deploying to production:

1. **Verify environment variables:**
   ```bash
   # Check that secrets are NOT in deployed code
   curl https://www.joboye.com/.env  # Should 404
   curl https://www.joboye.com/.env.local  # Should 404
   ```

2. **Test API endpoints:**
   ```bash
   # Search without rate limit header
   curl https://www.joboye.com/api/search/jobs?q=software
   
   # Check rate limiting kicks in after 100 requests
   for i in {1..150}; do curl https://www.joboye.com/api/search/jobs?q=test; done
   ```

3. **Test cron access control:**
   ```bash
   # Should fail (missing/wrong secret)
   curl -X POST https://www.joboye.com/api/cron/update-recruitment-lifecycle
   
   # Should fail (wrong secret)
   curl -X POST https://www.joboye.com/api/cron/update-recruitment-lifecycle \
     -H "Authorization: Bearer wrong-secret"
   ```

4. **Test admin protection:**
   ```bash
   # Should redirect to /admin/login (no session cookie)
   curl -L https://www.joboye.com/admin
   
   # After login, should show admin dashboard
   curl -L -b "admin_session=valid_token" https://www.joboye.com/admin
   ```

5. **Check security headers:**
   ```bash
   curl -I https://www.joboye.com
   
   # Should include:
   # X-Content-Type-Options: nosniff
   # X-Frame-Options: DENY
   # X-XSS-Protection: 1; mode=block
   # Strict-Transport-Security: max-age=31536000; includeSubDomains
   ```

### Incident Response

**If credentials are accidentally exposed:**

1. **Immediately rotate:**
   - Supabase database password
   - CRON_SECRET
   - Any API keys

2. **Audit access:**
   - Check Supabase logs for suspicious queries
   - Review Vercel logs for failed requests

3. **Update deployment:**
   - Add new secrets to Vercel env vars
   - Redeploy application
   - Invalidate CDN cache

4. **Review history:**
   - Check git history for any exposed secrets
   - Use BFG Repo-Cleaner if secrets were committed

### Additional Resources

- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Supabase Security](https://supabase.com/docs/guides/database/security)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/going-to-production)
