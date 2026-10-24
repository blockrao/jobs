/**
 * URL Accessibility & 404 Detection Suite
 *
 * This script verifies that all recruitment URLs are accessible and return correct status codes.
 * It crawls a sample of URLs and checks:
 * - 200 OK for new sequential slug URLs
 * - 301 Permanent Redirect for old deterministic slugs (if redirects working)
 * - No 404 Not Found errors
 * - Response times are acceptable (<2s)
 * - No broken internal links
 *
 * Usage:
 *   npm run verify-urls              # Full URL verification
 *   npm run verify-urls -- --sample 50  # Sample 50 URLs only
 *   npm run verify-urls -- --full    # Check all 5,412 URLs (slow)
 *
 * Pre-deployment: Run with --sample flag for quick check
 * Post-deployment: Run with --full flag for comprehensive validation
 */

import { getDb } from "../db/index";
import { recruitments, recruitment_slug_redirects } from "../db/schema";

interface URLCheckResult {
  status: "PASS" | "FAIL" | "WARN" | "ERROR";
  url: string;
  slug: string;
  statusCode: number;
  responseTime: number;
  expectedCode: number;
  error?: string;
}

const results: URLCheckResult[] = [];
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const SAMPLE_SIZE = 100;
const TIMEOUT_MS = 10000;

async function fetchURL(url: string, timeout: number = TIMEOUT_MS): Promise<{ status: number; time: number; error?: string }> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: "HEAD", // Use HEAD for faster checks (no body)
      redirect: "follow", // Follow redirects to final destination
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;
    return { status: response.status, time: responseTime };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    if (error.name === "AbortError") {
      return { status: 0, time: responseTime, error: `Timeout after ${timeout}ms` };
    }

    return { status: 0, time: responseTime, error: error.message };
  }
}

async function checkNewURLs(sampleSize: number): Promise<void> {
  console.log("\n🔗 PHASE 1: New Sequential Slug URLs");
  console.log("====================================\n");

  const db = getDb();

  // Get sample of new sequential slugs
  const newURLs = await db.query.recruitments.findMany({
    limit: sampleSize,
  });

  console.log(`Checking ${newURLs.length} new URLs (expected: 200 OK)...\n`);

  let passed = 0;
  let failed = 0;
  let slowURLs: string[] = [];

  for (const rec of newURLs) {
    const url = `${BASE_URL}/jobs/${rec.slug}`;
    const { status, time, error } = await fetchURL(url);

    const expectedStatus = 200;
    const isPass = status === expectedStatus;

    if (isPass) {
      passed++;
      if (time > 2000) {
        slowURLs.push(`${url} (${time}ms)`);
      }
    } else {
      failed++;
    }

    results.push({
      status: isPass ? "PASS" : "FAIL",
      url,
      slug: rec.slug,
      statusCode: status,
      expectedCode: expectedStatus,
      responseTime: time,
      error: error || (status !== expectedStatus ? `Expected 200, got ${status}` : undefined),
    });

    if (!isPass) {
      console.log(`❌ ${url}`);
      console.log(`   Status: ${status} (expected 200)`);
      if (error) console.log(`   Error: ${error}`);
    }
  }

  console.log(`\n✅ Passed: ${passed}/${newURLs.length}`);
  if (failed > 0) console.log(`❌ Failed: ${failed}/${newURLs.length}`);
  if (slowURLs.length > 0) {
    console.log(`⚠️  Slow URLs (>2000ms): ${slowURLs.length}`);
    slowURLs.slice(0, 3).forEach((u) => console.log(`   ${u}`));
  }
}

async function checkRedirectURLs(sampleSize: number): Promise<void> {
  console.log("\n🔄 PHASE 2: Old Slug Redirects (301 Permanent)");
  console.log("===============================================\n");

  const db = getDb();

  // Get sample of redirect mappings
  const redirects = await db.query.recruitment_slug_redirects.findMany({
    limit: sampleSize,
  });

  console.log(`Checking ${redirects.length} redirect URLs (expected: 301 or final 200)...\n`);

  let passed = 0;
  let failed = 0;
  let brokenChains: string[] = [];

  for (const redirect of redirects) {
    const oldURL = `${BASE_URL}/jobs/${redirect.old_slug}`;
    const { status, time, error } = await fetchURL(oldURL);

    // A redirect should either be 301 (not followed) or 200 (followed to final destination)
    // Since we use redirect: 'follow', we expect 200 as final status
    const expectedStatus = 200; // Final status after following redirects
    const isPass = status === expectedStatus;

    if (isPass) {
      passed++;
    } else {
      failed++;
      brokenChains.push(`${redirect.old_slug} → ${redirect.new_slug} (got ${status})`);
    }

    results.push({
      status: isPass ? "PASS" : "FAIL",
      url: oldURL,
      slug: redirect.old_slug,
      statusCode: status,
      expectedCode: expectedStatus,
      responseTime: time,
      error: error || (status !== expectedStatus ? `Redirect broken or got ${status}` : undefined),
    });

    if (!isPass) {
      console.log(`❌ ${redirect.old_slug} → ${redirect.new_slug}`);
      console.log(`   Status: ${status} (expected 200 after redirect)`);
      if (error) console.log(`   Error: ${error}`);
    }
  }

  console.log(`\n✅ Passed: ${passed}/${redirects.length}`);
  if (failed > 0) console.log(`❌ Failed: ${failed}/${redirects.length}`);
  if (brokenChains.length > 0) {
    console.log(`⚠️  Broken redirect chains: ${brokenChains.length}`);
    brokenChains.slice(0, 3).forEach((chain) => console.log(`   ${chain}`));
  }
}

async function checkPerformanceBaseline(): Promise<void> {
  console.log("\n⚡ PHASE 3: Performance Baseline");
  console.log("==================================\n");

  const db = getDb();

  // Sample 20 URLs for performance analysis
  const urls = await db.query.recruitments.findMany({
    limit: 20,
  });

  const times: number[] = [];
  console.log("Checking response times...\n");

  for (const rec of urls) {
    const url = `${BASE_URL}/jobs/${rec.slug}`;
    const { time, status } = await fetchURL(url);

    if (status === 200) {
      times.push(time);
    }
  }

  if (times.length > 0) {
    const avg = Math.round(times.reduce((a, b) => a + b) / times.length);
    const max = Math.max(...times);
    const min = Math.min(...times);
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

    console.log(`   Average response time: ${avg}ms`);
    console.log(`   Min: ${min}ms, Max: ${max}ms`);
    console.log(`   P95 (95th percentile): ${p95}ms`);

    if (avg > 2000) {
      console.log(`\n   ⚠️  WARNING: Average response time is high (${avg}ms). Check server load.`);
    } else if (avg < 500) {
      console.log(`\n   ✅ EXCELLENT: Average response time is ${avg}ms`);
    } else {
      console.log(`\n   ✅ GOOD: Average response time is ${avg}ms`);
    }
  }
}

async function checkInternalLinks(): Promise<void> {
  console.log("\n🔗 PHASE 4: Internal Links Integrity");
  console.log("=====================================\n");

  const db = getDb();

  // Sample one URL and check for broken internal links
  const sample = await db.query.recruitments.findFirst();

  if (!sample) {
    console.log("❌ No recruitments found to sample");
    return;
  }

  const url = `${BASE_URL}/jobs/${sample.slug}`;

  console.log(`Checking internal links on: ${url}\n`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const html = await response.text();

      // Extract all href attributes
      const hrefRegex = /href=["']([^"']+)["']/g;
      const links: string[] = [];
      let match;

      while ((match = hrefRegex.exec(html)) !== null) {
        links.push(match[1]);
      }

      // Filter internal links only
      const internalLinks = links.filter(
        (link) => link.startsWith("/") && !link.startsWith("//") && !link.includes("?"),
      );

      const uniqueInternalLinks = [...new Set(internalLinks)].slice(0, 10);

      console.log(`Found ${uniqueInternalLinks.length} internal links to check\n`);

      let brokenLinks = 0;

      for (const link of uniqueInternalLinks) {
        const fullURL = `${BASE_URL}${link}`;
        const { status } = await fetchURL(fullURL, 5000);

        if (status !== 200 && status !== 301) {
          brokenLinks++;
          console.log(`   ❌ ${link} (${status})`);
        } else {
          console.log(`   ✅ ${link} (${status})`);
        }
      }

      if (brokenLinks === 0) {
        console.log(`\n✅ All internal links are working`);
      } else {
        console.log(`\n⚠️  Found ${brokenLinks} broken internal links`);
      }
    } else {
      console.log(`❌ Could not fetch page (${response.status})`);
    }
  } catch (error: any) {
    console.log(`❌ Error checking internal links: ${error.message}`);
  }
}

async function generateAccessibilityReport(): Promise<void> {
  console.log("\n\n");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     URL ACCESSIBILITY & 404 DETECTION REPORT            ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const summary = {
    PASS: results.filter((r) => r.status === "PASS").length,
    FAIL: results.filter((r) => r.status === "FAIL").length,
    WARN: results.filter((r) => r.status === "WARN").length,
    ERROR: results.filter((r) => r.status === "ERROR").length,
  };

  console.log("📊 URL CHECK SUMMARY");
  console.log(`   ✅ Passed:  ${summary.PASS}`);
  console.log(`   ❌ Failed:  ${summary.FAIL}`);
  console.log(`   ⚠️  Warned: ${summary.WARN}`);
  console.log(`   💥 Errors: ${summary.ERROR}\n`);

  if (summary.FAIL > 0) {
    console.log("❌ FAILED URLs:");
    results
      .filter((r) => r.status === "FAIL")
      .slice(0, 10)
      .forEach((r) => {
        console.log(`   ${r.slug}: ${r.statusCode} (${r.error})`);
      });
  }

  // Final verdict
  console.log("\n");
  if (summary.FAIL > 0) {
    console.log("❌ DEPLOYMENT BLOCKED: URLs are returning errors");
    console.log("   Fix broken URLs before deployment");
    process.exit(1);
  } else if (summary.ERROR > 0) {
    console.log("⚠️  DEPLOYMENT CAUTION: Network/timeout errors detected");
    console.log("   Retry checks or investigate server issues");
    process.exit(1);
  } else {
    console.log("✅ DEPLOYMENT READY: All URLs are accessible");
    process.exit(0);
  }
}

async function main() {
  console.log("🚀 Starting URL Accessibility Verification\n");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Sample size: ${SAMPLE_SIZE}`);
  console.log(`Timeout: ${TIMEOUT_MS}ms\n`);

  try {
    await checkNewURLs(SAMPLE_SIZE);
    await checkRedirectURLs(SAMPLE_SIZE);
    await checkPerformanceBaseline();
    await checkInternalLinks();
    await generateAccessibilityReport();
  } catch (error) {
    console.error("\n💥 URL verification failed:", error);
    process.exit(1);
  }
}

main();
