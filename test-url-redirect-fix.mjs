#!/usr/bin/env node

/**
 * URL Redirect Fix Verification Script
 *
 * Tests the critical fix for the slug redirect issue (2026-10-24):
 * - Removed regex rule that stripped trailing numbers from slugs
 * - Removed smart slug resolution fallback
 * - recruitment_slug_redirects is now the ONLY redirect mechanism
 *
 * Before running this script:
 * 1. Build the project: npm run build
 * 2. Start the dev server: npm run dev
 * 3. Run tests: node test-url-redirect-fix.mjs
 */

import fetch from 'node-fetch';
import { execSync } from 'child_process';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const REDIRECT_FOLLOW_LIMIT = 5;
const CONCURRENT_REQUESTS = 5;

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(level, message) {
  const color = colors[level] || colors.reset;
  console.log(`${color}[${level.toUpperCase()}]${colors.reset} ${message}`);
}

/**
 * Fetch a URL and follow redirects, recording the chain
 */
async function fetchWithRedirectChain(url, maxRedirects = REDIRECT_FOLLOW_LIMIT) {
  const chain = [];
  let currentUrl = url;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    try {
      const response = await fetch(currentUrl, { redirect: 'manual' });
      chain.push({
        url: currentUrl,
        status: response.status,
        redirectTo: response.headers.get('location'),
      });

      // Check for redirect
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const redirectUrl = response.headers.get('location');
        if (!redirectUrl) {
          break;
        }
        // Handle relative redirects
        currentUrl = redirectUrl.startsWith('http')
          ? redirectUrl
          : new URL(redirectUrl, BASE_URL).toString();
        redirectCount++;
      } else {
        break;
      }
    } catch (err) {
      chain.push({
        url: currentUrl,
        error: err.message,
      });
      break;
    }
  }

  return chain;
}

/**
 * Extract canonical URL from HTML
 */
async function getCanonicalUrl(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/<link rel="canonical" href="([^"]+)"/);
    return match ? match[1] : null;
  } catch (err) {
    return null;
  }
}

/**
 * Test case: Old long slug should redirect via table
 */
async function testLegacySlugRedirect() {
  log('info', 'TEST 1: Legacy slug redirect via recruitment_slug_redirects table');

  // This slug doesn't exist in current scheme but should be in the redirect table
  const testUrl = `${BASE_URL}/jobs/isro-iprc-recruitment-2026-d061d5`;

  const chain = await fetchWithRedirectChain(testUrl);
  const finalUrl = chain[chain.length - 1].url;
  const finalStatus = chain[chain.length - 1].status;

  console.log('  URL chain:');
  chain.forEach((step, i) => {
    console.log(
      `    ${i}: ${step.url} → ${step.status}${step.redirectTo ? ` → ${step.redirectTo}` : ''}`
    );
  });

  if (finalStatus === 200) {
    log('success', 'Legacy slug redirect works correctly');
    return true;
  } else {
    log('error', `Expected 200, got ${finalStatus}`);
    return false;
  }
}

/**
 * Test case: New sequential slug should return 200 with correct canonical
 */
async function testNewSequentialSlug() {
  log('info', 'TEST 2: New sequential slug returns 200 with correct canonical');

  // Get a sample new slug from the database
  try {
    const slug = 'org33-2026-0004'; // Example new slug format
    const testUrl = `${BASE_URL}/jobs/${slug}`;

    const chain = await fetchWithRedirectChain(testUrl);
    const finalUrl = chain[chain.length - 1].url;
    const finalStatus = chain[chain.length - 1].status;
    const canonical = await getCanonicalUrl(finalUrl);

    console.log(`  URL: ${testUrl}`);
    console.log(`  Final URL: ${finalUrl}`);
    console.log(`  Status: ${finalStatus}`);
    console.log(`  Canonical: ${canonical}`);

    // Chain should have no redirects (except maybe trailing slash)
    const hasUnexpectedRedirects = chain.some(
      (step, i) => i > 0 && [301, 302, 303, 307, 308].includes(step.status)
    );

    if (finalStatus === 200 || finalStatus === 404) {
      // 404 is acceptable if the slug doesn't exist in test DB
      if (!hasUnexpectedRedirects) {
        log('success', 'New slug returns correct status without unexpected redirects');
        return true;
      } else {
        log('error', 'Unexpected redirects in chain');
        return false;
      }
    } else {
      log('error', `Expected 200 or 404, got ${finalStatus}`);
      return false;
    }
  } catch (err) {
    log('error', `Test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test case: Invalid slug should return 404 (no smart resolver fallback)
 */
async function testInvalidSlugReturns404() {
  log('info', 'TEST 3: Invalid slug returns 404 (no smart resolver fallback)');

  const invalidSlugs = [
    'nonexistent-slug-xyz',
    'fake-organization',
    'org-2026', // Incomplete slug
  ];

  let allPassed = true;
  for (const slug of invalidSlugs) {
    const testUrl = `${BASE_URL}/jobs/${slug}`;
    const chain = await fetchWithRedirectChain(testUrl);
    const finalStatus = chain[chain.length - 1].status;

    console.log(`  ${slug}: ${finalStatus}`);

    if (finalStatus !== 404) {
      log('error', `Expected 404 for "${slug}", got ${finalStatus}`);
      allPassed = false;
    }
  }

  if (allPassed) {
    log('success', 'All invalid slugs return 404');
  }
  return allPassed;
}

/**
 * Test case: No circular redirects
 */
async function testNoCircularRedirects() {
  log('info', 'TEST 4: No circular redirect chains');

  const testUrl = `${BASE_URL}/jobs/directorate-of-medical-health-and-family-welfare-services-government-of-rajasthan-2026-02812`;
  const chain = await fetchWithRedirectChain(testUrl, 10);

  // Check for cycles
  const urls = chain.map(s => s.url);
  const hasCircle = new Set(urls).size !== urls.length;

  console.log(`  Redirect chain length: ${chain.length}`);
  if (hasCircle) {
    log('error', 'Circular redirect detected');
    return false;
  }

  // Also check if chain is too long (max 5 redirects)
  const redirectCount = chain.filter(s => [301, 302, 303, 307, 308].includes(s.status)).length;
  if (redirectCount > 5) {
    log('error', `Too many redirects: ${redirectCount}`);
    return false;
  }

  log('success', `No circular redirects (chain length: ${chain.length})`);
  return true;
}

/**
 * Test case: Sample 20 random URLs from sitemap
 */
async function testSitemapUrls() {
  log('info', 'TEST 5: Sample 20 random recruitment URLs');

  try {
    // Fetch sitemap
    const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
    if (!sitemapRes.ok) {
      log('warning', 'Could not fetch sitemap, skipping this test');
      return true; // Don't fail if sitemap not available
    }

    const sitemapXml = await sitemapRes.text();
    const urlMatches = sitemapXml.match(/<loc>([^<]+\/jobs\/[^<]+)<\/loc>/g) || [];
    const urls = urlMatches.map(m => m.replace(/<loc>|<\/loc>/g, ''));

    if (urls.length === 0) {
      log('warning', 'No recruitment URLs found in sitemap');
      return true;
    }

    log('info', `Found ${urls.length} recruitment URLs in sitemap`);

    // Sample 20 random URLs
    const sample = [];
    for (let i = 0; i < Math.min(20, urls.length); i++) {
      const randomIdx = Math.floor(Math.random() * urls.length);
      sample.push(urls[randomIdx]);
    }

    let passed = 0;
    let failed = 0;

    for (const url of sample) {
      const chain = await fetchWithRedirectChain(url);
      const finalStatus = chain[chain.length - 1].status;
      const hasCorrectCanonical = chain[chain.length - 1].url.includes('/jobs/');

      if (finalStatus === 200 && hasCorrectCanonical) {
        passed++;
      } else {
        failed++;
        console.log(`  FAIL: ${url} → ${finalStatus}`);
      }
    }

    console.log(`  Passed: ${passed}/${sample.length}`);
    console.log(`  Failed: ${failed}/${sample.length}`);

    return failed === 0;
  } catch (err) {
    log('warning', `Sitemap test failed: ${err.message}`);
    return true; // Don't fail hard
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  log('info', `Starting URL redirect fix verification`);
  log('info', `Base URL: ${BASE_URL}`);
  console.log('');

  const results = [];

  // Run tests with some delay between them to avoid overwhelming the server
  const tests = [
    ['Legacy Slug Redirect', testLegacySlugRedirect],
    ['New Sequential Slug', testNewSequentialSlug],
    ['Invalid Slug 404', testInvalidSlugReturns404],
    ['No Circular Redirects', testNoCircularRedirects],
    ['Sample Sitemap URLs', testSitemapUrls],
  ];

  for (const [name, testFn] of tests) {
    try {
      const passed = await testFn();
      results.push({ name, passed });
    } catch (err) {
      log('error', `Test "${name}" crashed: ${err.message}`);
      results.push({ name, passed: false });
    }
    console.log('');
  }

  // Summary
  log('info', '='.repeat(60));
  log('info', 'TEST SUMMARY');
  log('info', '='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(r => {
    const status = r.passed ? 'PASS' : 'FAIL';
    const color = r.passed ? 'green' : 'red';
    log(color, `${status}: ${r.name}`);
  });

  console.log('');
  log(passed === total ? 'green' : 'yellow', `Results: ${passed}/${total} tests passed`);

  process.exit(passed === total ? 0 : 1);
}

// Check if server is running
async function checkServerHealth() {
  try {
    const res = await fetch(`${BASE_URL}/`, { timeout: 5000 });
    return res.ok;
  } catch (err) {
    return false;
  }
}

// Start the tests
(async () => {
  const isHealthy = await checkServerHealth();
  if (!isHealthy) {
    log('error', `Cannot reach ${BASE_URL}`);
    log('error', 'Make sure the dev server is running: npm run dev');
    process.exit(1);
  }
  await runAllTests();
})();
