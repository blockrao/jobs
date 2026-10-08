#!/usr/bin/env node
/**
 * Patches Next.js 16 build-complete.js for Turbopack compatibility.
 *
 * Turbopack does not always write .next/server/middleware.js before the
 * Vercel adapter's onBuildComplete runs. Two places in build-complete.js
 * assume the file exists:
 *
 *  1. handleTraceFiles(middlewareFile, 'neutral') — throws ENOENT on the NFT
 *     file. Fix: add .catch() so a missing NFT is non-fatal.
 *
 *  2. outputs.middleware = { filePath: middlewareFile, … } — the Vercel
 *     adapter later does lstat(filePath) and throws ENOENT. Fix: skip the
 *     entire assignment if middlewareFile doesn't exist at runtime.
 *
 * Both patches are idempotent: re-running on an already-patched file is safe.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../node_modules/next/dist/build/adapter/build-complete.js');
let content = fs.readFileSync(FILE, 'utf8');
let changed = false;

// ── Patch 1: handleTraceFiles ENOENT ──────────────────────────────────────
const FROM1 = `await handleTraceFiles(middlewareFile, 'neutral');`;
const TO1   = `await handleTraceFiles(middlewareFile, 'neutral').catch(()=>({assets:{},assetsHashes:{}}));`;
if (content.includes(FROM1)) {
  content = content.replace(FROM1, TO1);
  console.log('patch-next-build: applied patch 1 (handleTraceFiles .catch)');
  changed = true;
} else if (content.includes(TO1)) {
  console.log('patch-next-build: patch 1 already applied');
} else {
  console.warn('patch-next-build: patch 1 pattern not found — may need updating');
}

// ── Patch 2: guard outputs.middleware assignment against missing file ──────
// Replace the entire "outputs.middleware = { … };" statement with one wrapped
// in an existsSync guard. We do a single atomic replacement of the full block.
//
// FROM: outputs.middleware = {\n    …\n    };\n
// TO:   if(fs.existsSync(middlewareFile)){outputs.middleware = {\n    …\n    };}\n

// The block to replace ends with the `};` that closes the outputs.middleware object.
// The line after is `            }` which closes the hasNodeMiddleware if — we don't touch that.

const BLOCK_FROM = `                outputs.middleware = {
                    pathname: '/_middleware',
                    id: '/_middleware',
                    sourcePage: 'middleware',
                    assets,
                    assetsHashes,
                    type: _constants.AdapterOutputType.MIDDLEWARE,
                    runtime: 'nodejs',
                    filePath: middlewareFile,
                    config: {
                        matchers: ((_functionConfig_matchers = functionConfig.matchers) == null ? void 0 : _functionConfig_matchers.map((item)=>{
                            return {
                                source: item.originalSource,
                                sourceRegex: item.regexp,
                                has: item.has,
                                missing: [
                                    ...item.missing || [],
                                    // always skip middleware for on-demand revalidate
                                    {
                                        type: 'header',
                                        key: 'x-prerender-revalidate',
                                        value: prerenderManifest.preview.previewModeId
                                    }
                                ]
                            };
                        })) || []
                    }
                };`;

// The open guard wraps this — the existsSync check makes the assignment
// conditional on the file existing so the Vercel adapter never sees a
// filePath that doesn't exist on disk.
const BLOCK_TO = `                if(require('fs').existsSync(middlewareFile)){outputs.middleware = {
                    pathname: '/_middleware',
                    id: '/_middleware',
                    sourcePage: 'middleware',
                    assets,
                    assetsHashes,
                    type: _constants.AdapterOutputType.MIDDLEWARE,
                    runtime: 'nodejs',
                    filePath: middlewareFile,
                    config: {
                        matchers: ((_functionConfig_matchers = functionConfig.matchers) == null ? void 0 : _functionConfig_matchers.map((item)=>{
                            return {
                                source: item.originalSource,
                                sourceRegex: item.regexp,
                                has: item.has,
                                missing: [
                                    ...item.missing || [],
                                    // always skip middleware for on-demand revalidate
                                    {
                                        type: 'header',
                                        key: 'x-prerender-revalidate',
                                        value: prerenderManifest.preview.previewModeId
                                    }
                                ]
                            };
                        })) || []
                    }
                };}`;

// Idempotent check: look for the existsSync guard in any form (indentation may vary)
const GUARD_MARKER = `require('fs').existsSync(middlewareFile)){outputs.middleware`;

if (content.includes(BLOCK_FROM)) {
  content = content.replace(BLOCK_FROM, BLOCK_TO);
  console.log('patch-next-build: applied patch 2 (outputs.middleware existsSync guard)');
  changed = true;
} else if (content.includes(GUARD_MARKER)) {
  console.log('patch-next-build: patch 2 already applied');
} else {
  console.warn('patch-next-build: patch 2 pattern not found — inspect manually');
}

if (changed) {
  fs.writeFileSync(FILE, content);
}
