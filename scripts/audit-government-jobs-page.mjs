#!/usr/bin/env node
/**
 * Read-only production smoke audit for /government-jobs.
 *
 * Usage:
 *   BASE_URL=https://www.joboye.com PAGE_PATH=/government-jobs node scripts/audit-government-jobs-page.mjs
 *
 * Measures HTML response timing/size, checks essential SEO metadata, and probes
 * referenced Next.js JS/CSS assets. No database writes and no third-party URLs
 * are crawled. Performance thresholds warn; broken responses/metadata fail.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const BASE_URL = (process.env.BASE_URL || "https://www.joboye.com").replace(/\/$/, "");
const PAGE_PATH = process.env.PAGE_PATH || "/government-jobs";
const ASSET_LIMIT = Math.max(1, Math.min(Number(process.env.ASSET_LIMIT || 80), 250));
const CONCURRENCY = Math.max(1, Math.min(Number(process.env.CONCURRENCY || 8), 12));
const TIMEOUT_MS = Math.max(1000, Math.min(Number(process.env.TIMEOUT_MS || 15000), 60000));
const TTFB_WARN_MS = Number(process.env.TTFB_WARN_MS || 2000);
const TOTAL_WARN_MS = Number(process.env.TOTAL_WARN_MS || 5000);
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || "artifacts";

function assertHttpUrl(value, label) {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error(`${label} must use HTTP or HTTPS`);
  return url;
}

function extractMeta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<meta\\b[^>]*(?:name|property)=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i");
  const reverse = new RegExp(`<meta\\b[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${escaped}["'][^>]*>`, "i");
  return html.match(re)?.[1] ?? html.match(reverse)?.[1] ?? null;
}

function extractCanonical(html) {
  const match = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
    ?? html.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  return match?.[1] ?? null;
}

function extractAssets(html, origin) {
  const refs = new Set();
  const re = /(?:src|href)=["']([^"']+)["']/gi;
  for (const match of html.matchAll(re)) {
    const raw = match[1].replaceAll("&amp;", "&");
    if (!raw.includes("/_next/static/") || !/\.(?:js|css)(?:\?|$)/i.test(raw)) continue;
    try {
      const url = new URL(raw, origin);
      if (url.origin === origin.origin) refs.add(url.href);
    } catch {}
  }
  return [...refs].slice(0, ASSET_LIMIT);
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = performance.now();
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "JobOye-ReadOnly-SEO-Audit/1.0" },
    });
    const headersMs = Math.round(performance.now() - started);
    const reader = response.body?.getReader();
    let bytes = 0;
    let firstByteMs = null;
    if (reader) {
      const first = await reader.read();
      if (!first.done) {
        firstByteMs = Math.round(performance.now() - started);
        bytes += first.value.byteLength;
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
        }
      }
    }
    return {
      status: response.status,
      finalUrl: response.url,
      headersMs,
      firstByteMs,
      totalMs: Math.round(performance.now() - started),
      bytes,
      headers: {
        cacheControl: response.headers.get("cache-control"),
        age: response.headers.get("age"),
        xVercelCache: response.headers.get("x-vercel-cache"),
        serverTiming: response.headers.get("server-timing"),
        contentType: response.headers.get("content-type"),
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      try {
        results[index] = await worker(items[index]);
      } catch (error) {
        results[index] = { url: items[index], error: error instanceof Error ? error.message : String(error) };
      }
    }
  }));
  return results;
}

async function main() {
  const pageUrl = assertHttpUrl(new URL(PAGE_PATH, BASE_URL).href, "page URL");
  const origin = new URL(BASE_URL);
  const htmlStarted = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response;
  let html;
  let firstByteMs = null;
  let headersMs = null;
  try {
    response = await fetch(pageUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "JobOye-ReadOnly-SEO-Audit/1.0" },
    });
    headersMs = Math.round(performance.now() - htmlStarted);
    if (!response.body) throw new Error("HTML response has no readable body");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let byteLength = 0;
    let parts = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (firstByteMs === null) firstByteMs = Math.round(performance.now() - htmlStarted);
      byteLength += chunk.value.byteLength;
      parts += decoder.decode(chunk.value, { stream: true });
    }
    parts += decoder.decode();
    html = parts;
    var htmlBytes = byteLength;
  } finally {
    clearTimeout(timer);
  }
  const totalMs = Math.round(performance.now() - htmlStarted);
  const canonicalRaw = extractCanonical(html);
  const canonicalUrl = canonicalRaw ? new URL(canonicalRaw, pageUrl).href : null;
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/&amp;/g, "&").trim() ?? null;
  const ogUrlRaw = extractMeta(html, "og:url");
  const ogUrl = ogUrlRaw ? new URL(ogUrlRaw, pageUrl).href : null;
  const ogTitle = extractMeta(html, "og:title");
  const twitterTitle = extractMeta(html, "twitter:title");
  const appName = extractMeta(html, "application-name");
  const jsonLdBlocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const jsonLdErrors = [];
  let itemLists = [];
  for (const raw of jsonLdBlocks) {
    try {
      const parsed = JSON.parse(raw);
      const candidates = Array.isArray(parsed) ? parsed : [parsed, ...(Array.isArray(parsed["@graph"]) ? parsed["@graph"] : [])];
      itemLists.push(...candidates.filter((x) => x && x["@type"] === "ItemList"));
    } catch (error) {
      jsonLdErrors.push(error instanceof Error ? error.message : String(error));
    }
  }
  // Use the final host after redirects so root-relative assets are tested on the canonical origin.
  const visibleLeafPaths = [...html.matchAll(/href=["']([^"']+)["']/gi)]
    .map((match) => {
      try { return new URL(match[1].replaceAll("&amp;", "&"), pageUrl).pathname; } catch { return null; }
    })
    .filter((path) => typeof path === "string" && /^\/jobs\/[^/]+\/[^/]+\/?$/.test(path))
    .map((path) => path.replace(/\/$/, ""));
  const schemaLeafPaths = itemLists.flatMap((list) => (list.itemListElement || [])
    .map((item) => {
      try { return new URL(item.url, pageUrl).pathname.replace(/\/$/, ""); } catch { return null; }
    })
    .filter(Boolean));
  const uniqueVisibleLeafPaths = [...new Set(visibleLeafPaths)];
  const uniqueSchemaLeafPaths = [...new Set(schemaLeafPaths)];
  const visibleSchemaParity = uniqueVisibleLeafPaths.length === visibleLeafPaths.length
    && uniqueSchemaLeafPaths.length === schemaLeafPaths.length
    && uniqueVisibleLeafPaths.length === uniqueSchemaLeafPaths.length
    && uniqueVisibleLeafPaths.every((path) => uniqueSchemaLeafPaths.includes(path));
  const assets = extractAssets(html, new URL(response.url));
  const assetResults = await mapLimit(assets, CONCURRENCY, async (url) => ({ url, ...(await fetchWithTimeout(url)) }));
  const brokenAssets = assetResults.filter((x) => x.error || x.status < 200 || x.status >= 400);

  const checks = [
    { name: "HTML status is 200", pass: response.status === 200, actual: response.status },
    { name: "HTML content type is HTML", pass: (response.headers.get("content-type") || "").includes("text/html"), actual: response.headers.get("content-type") },
    { name: "Page title exists", pass: Boolean(title), actual: title },
    { name: "Title does not duplicate JobOye brand", pass: (title?.match(/JobOye/g) || []).length <= 1, actual: title },
    { name: "Canonical exists", pass: Boolean(canonicalUrl), actual: canonicalUrl },
    { name: "Open Graph URL matches canonical", pass: Boolean(canonicalUrl && ogUrl === canonicalUrl), actual: { canonicalUrl, ogUrl } },
    { name: "Page-specific Open Graph title exists", pass: Boolean(ogTitle && /government jobs/i.test(ogTitle)), actual: ogTitle },
    { name: "Page-specific Twitter title exists", pass: Boolean(twitterTitle && /government jobs/i.test(twitterTitle)), actual: twitterTitle },
    { name: "No unsupported 'India's Best' application-name claim", pass: !/india.?s best/i.test(appName || ""), actual: appName },
    { name: "ItemList JSON-LD parses", pass: jsonLdErrors.length === 0, actual: jsonLdErrors },
    { name: "ItemList item count matches declared count", pass: itemLists.length > 0 && itemLists.every((x) => x.numberOfItems === (x.itemListElement || []).length), actual: itemLists.map((x) => ({ numberOfItems: x.numberOfItems, actualItems: x.itemListElement?.length })) },
    { name: "Visible job links match ItemList URLs", pass: visibleSchemaParity, actual: { visibleLinks: visibleLeafPaths.length, uniqueVisibleLinks: uniqueVisibleLeafPaths.length, schemaLinks: schemaLeafPaths.length, uniqueSchemaLinks: uniqueSchemaLeafPaths.length, missingFromSchema: uniqueVisibleLeafPaths.filter((path) => !uniqueSchemaLeafPaths.includes(path)).slice(0, 20), missingFromVisible: uniqueSchemaLeafPaths.filter((path) => !uniqueVisibleLeafPaths.includes(path)).slice(0, 20) } },
    { name: "Referenced JS/CSS assets respond successfully", pass: brokenAssets.length === 0, actual: brokenAssets.map((x) => ({ url: x.url, status: x.status, error: x.error })) },
  ];

  const report = {
    checkedAt: new Date().toISOString(),
    requestedUrl: pageUrl.href,
    finalUrl: response.url,
    document: {
      status: response.status,
      headersMs,
      firstByteMs,
      totalMs,
      bytes: htmlBytes,
      headers: {
        cacheControl: response.headers.get("cache-control"),
        age: response.headers.get("age"),
        xVercelCache: response.headers.get("x-vercel-cache"),
        serverTiming: response.headers.get("server-timing"),
        contentType: response.headers.get("content-type"),
      },
    },
    metadata: { title, canonicalUrl, ogUrl, ogTitle, twitterTitle, appName },
    itemLists: itemLists.map((x) => ({ numberOfItems: x.numberOfItems, actualItems: x.itemListElement?.length })),
    assetsChecked: assetResults.length,
    brokenAssets,
    checks,
    performanceWarnings: [
      ...(firstByteMs !== null && firstByteMs > TTFB_WARN_MS ? [`First byte took ${firstByteMs}ms (warning threshold ${TTFB_WARN_MS}ms)`] : []),
      ...(totalMs > TOTAL_WARN_MS ? [`HTML took ${totalMs}ms total (warning threshold ${TOTAL_WARN_MS}ms)`] : []),
    ],
  };

  await mkdir(ARTIFACT_DIR, { recursive: true });
  const reportPath = `${ARTIFACT_DIR}/government-jobs-audit-${Date.now()}.json`;
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`Report written to ${reportPath}`);

  const failures = checks.filter((check) => !check.pass);
  if (failures.length) {
    console.error(`Audit failed: ${failures.length} check(s) failed.`);
    process.exitCode = 1;
  } else if (report.performanceWarnings.length) {
    console.warn(`Audit passed functional checks with ${report.performanceWarnings.length} performance warning(s).`);
  } else {
    console.log("Audit passed all functional and performance warning thresholds.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
