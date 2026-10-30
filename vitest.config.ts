import path from "node:path";
import { defineConfig } from "vitest/config";

// Architecture contract tests (W1-A). See tests/contracts/README.md and
// docs/ARCHITECTURE_CHANGELOG.md (change W1A-001).
//
// These run in plain Node — no Next.js server, no database, no network —
// except the two opt-in suites under tests/contracts/db and
// tests/contracts/http, which skip themselves unless their env var is set.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  esbuild: { jsx: "automatic" },
  test: {
    include: ["tests/contracts/**/*.test.ts", "tests/unit/ingest-deadline-parser.test.ts", "tests/unit/deadline-authority.test.ts", "tests/unit/lifecycle-deadline-boundary.test.ts", "tests/unit/recruitment-lifecycle-sql.test.ts", "tests/unit/recruitment-lifecycle-contract.test.ts"],
    environment: "node",
    // src/lib/site.ts resolves SITE_URL once at import time. Pin it so
    // canonical/hreflang assertions are deterministic regardless of the
    // machine the suite runs on.
    env: { NEXT_PUBLIC_SITE_URL: "https://www.joboye.com" },
  },
});
