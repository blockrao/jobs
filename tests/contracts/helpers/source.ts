import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export const REPO_ROOT = path.resolve(__dirname, "../../..");

export function readSource(relPath: string): string {
  return readFileSync(path.join(REPO_ROOT, relPath), "utf8");
}

/** Every file under `relDir` (recursive), as repo-relative POSIX paths. */
export function listFiles(relDir: string, exts = [".ts", ".tsx"]): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (exts.some((e) => entry.endsWith(e))) {
        out.push(path.relative(REPO_ROOT, full).split(path.sep).join("/"));
      }
    }
  };
  walk(path.join(REPO_ROOT, relDir));
  return out.sort();
}

/** Strips // and block comments so prose in comments can't satisfy or trip a check. */
export function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

export function filesMatching(relDir: string, pattern: RegExp): string[] {
  return listFiles(relDir).filter((f) => pattern.test(stripComments(readSource(f))));
}
