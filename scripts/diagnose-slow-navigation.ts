#!/usr/bin/env node
/**
 * Targeted Slow-Navigation Diagnostics
 *
 * Purpose: Measure and compare TTFB, query counts, and duplicate operations
 * for slow vs fast URLs
 *
 * Usage: node scripts/diagnose-slow-navigation.ts
 */

import https from "https";

interface DiagnosticResult {
  url: string;
  status: number;
  ttfb: number; // Time to first byte (ms)
  totalTime: number; // Total request time (ms)
  isRedirect: boolean;
  redirectTarget?: string;
  headers: Record<string, string>;
  metrics?: {
    duplicateQueries?: string[];
    queryCount?: number;
  };
}

const PRODUCTION_DOMAIN = "www.joboye.com";

// Sample URLs for testing
// Slow candidates: old semantic slug format (150+ char slugs)
// Fast candidates: new semantic slug format (org-year-seq)
const TEST_URLS = {
  slow: [
    // Old semantic slugs (trigger redirect lookup + redirect)
    `/jobs/ibps-rural-regional-bank-gramin-bank-rrb-15th-recruitment-notification-2026`,
    `/jobs/ssc-combined-graduate-level-examination-2026-notification-eligibility`,
    `/jobs/upsc-civil-services-examination-2026-apply-online`,
  ],
  fast: [
    // New semantic slugs (direct match, no redirect)
    `/jobs/ibps-rrb-2026-01`,
    `/jobs/ssc-cgl-2026-01`,
    `/jobs/upsc-ias-2026-01`,
  ],
  recruitment: [
    // Recruitment hub URLs (test duplicate query issue)
    `/jobs/ibps-rrb-2026-01`, // Should show recruitment hub
    `/jobs/ssc-cgl-2026-01`,
  ],
};

async function measureUrl(path: string): Promise<DiagnosticResult> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let firstByteTime = 0;
    const request = https.get(
      `https://${PRODUCTION_DOMAIN}${path}`,
      {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Diagnostic Tool)",
        },
        timeout: 10000,
      },
      (response) => {
        // First byte received
        firstByteTime = Date.now() - startTime;

        let data = "";
        const headers: Record<string, string> = {};

        // Capture response headers
        for (const [key, value] of Object.entries(response.headers)) {
          headers[key] = String(value);
        }

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          const totalTime = Date.now() - startTime;
          const redirectTarget = headers.location;
          const isRedirect = response.statusCode === 301 || response.statusCode === 302;

          // Try to extract metrics from HTML comment or headers
          let metrics: any = undefined;
          if (data.includes("<!-- Metrics:")) {
            const match = data.match(/<!-- Metrics:(.*?)-->/);
            if (match) {
              try {
                metrics = JSON.parse(match[1]);
              } catch (e) {
                // Metrics not available
              }
            }
          }

          resolve({
            url: path,
            status: response.statusCode || 0,
            ttfb: firstByteTime,
            totalTime,
            isRedirect,
            redirectTarget,
            headers,
            metrics,
          });
        });
      }
    );

    request.on("error", reject);
    request.on("timeout", () => {
      request.destroy();
      reject(new Error(`Timeout for ${path}`));
    });
  });
}

async function runDiagnostics() {
  console.log(`
🔍 JobOye Slow Navigation Diagnostics
=====================================

Testing against production: https://${PRODUCTION_DOMAIN}

`);

  console.log("📊 SLOW ROUTES (old semantic slugs → redirect lookup required)");
  console.log("=========================================================");
  const slowResults: DiagnosticResult[] = [];
  for (const url of TEST_URLS.slow) {
    try {
      const result = await measureUrl(url);
      slowResults.push(result);
      console.log(`
✓ ${result.url}
  Status: ${result.status}
  TTFB: ${result.ttfb}ms
  Total: ${result.totalTime}ms
  Redirect: ${result.isRedirect ? `→ ${result.redirectTarget}` : "No"}
`);
    } catch (err) {
      console.error(`✗ ${url}: ${err}`);
    }
  }

  console.log("\n📊 FAST ROUTES (new semantic slugs → direct match)");
  console.log("==================================================");
  const fastResults: DiagnosticResult[] = [];
  for (const url of TEST_URLS.fast) {
    try {
      const result = await measureUrl(url);
      fastResults.push(result);
      console.log(`
✓ ${result.url}
  Status: ${result.status}
  TTFB: ${result.ttfb}ms
  Total: ${result.totalTime}ms
`);
    } catch (err) {
      console.error(`✗ ${url}: ${err}`);
    }
  }

  // Compare results
  console.log("\n📈 ANALYSIS");
  console.log("===========");

  if (slowResults.length > 0 && fastResults.length > 0) {
    const avgSlowTTFB = slowResults.reduce((sum, r) => sum + r.ttfb, 0) / slowResults.length;
    const avgFastTTFB = fastResults.reduce((sum, r) => sum + r.ttfb, 0) / fastResults.length;
    const slowdownPercent = ((avgSlowTTFB / avgFastTTFB - 1) * 100).toFixed(1);

    console.log(`
Average TTFB (slow routes): ${avgSlowTTFB.toFixed(0)}ms
Average TTFB (fast routes): ${avgFastTTFB.toFixed(0)}ms
Slowdown factor: ${slowdownPercent}%
`);

    if (parseFloat(slowdownPercent) > 20) {
      console.log(`
🔴 SIGNIFICANT PERFORMANCE DIFFERENCE DETECTED
  Slow routes are ${slowdownPercent}% slower
  Likely causes:
  1. Redirect lookup in proxy middleware (recruitment_slug_redirects table)
  2. Extra HTTP round-trip due to 301 redirect
  3. Possible duplicate database queries in page render
`);
    }
  }

  // Print expected query patterns
  console.log(`
📋 EXPECTED QUERY PATTERNS (instrumentation enabled)

For /jobs/[recruitment-slug]/[post-slug] (fast):
  1. One call to getPostBySlug()
  2. Queries: posts ← post_enrichments ← recruitments
  3. No redirect lookup

For /jobs/[slug] recruitment hub (slow):
  1. Query getRecruitmentWithPosts() in generateMetadata
  2. Query getRecruitmentWithPosts() again in page component ⚠️  DUPLICATE
  3. Each includes: redirect lookup + recruitment query + posts query
  4. Total expected: 3+ queries per request

For /jobs/[slug] with redirect:
  1. Proxy middleware: redirect lookup (recruitment_slug_redirects)
  2. 301 redirect issued
  3. Browser follows to /jobs/[new-slug]
  4. Same flow as above
`);
}

// Run diagnostics
runDiagnostics().catch((err) => {
  console.error("Diagnostic failed:", err);
  process.exit(1);
});
