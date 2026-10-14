import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // React Compiler rules (eslint-plugin-react-hooks 6). They flag patterns
    // that work today but block the compiler's optimisations. Fixing them means
    // restructuring component logic, which is a runtime change and belongs in a
    // reviewed change of its own, not in a lint pass (ledger A-090, 2026-10-14).
    // Kept visible as warnings; 21 occurrences in 15 client components at the
    // time of writing. Re-promote to "error" once that change lands.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
    },
  },
  {
    // CommonJS build script executed by `node` in the `prebuild` step; the
    // package has no "type": "module", so `require` is the correct form here.
    files: ["scripts/patch-next-build.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);

export default eslintConfig;
