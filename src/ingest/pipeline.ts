/**
 * The one processing path: raw postings -> dedupe -> normalize -> write.
 * `run.ts` (live adapters) and `load-file.ts` (captured dataset) both use it,
 * so a pilot load behaves like real ingestion (no special importer).
 */

import type { RawPosting } from "./types";
import { deduplicate, type DedupedPosting } from "./deduplicate";
import { normalize, type NormalizedPosting } from "./normalize";
import { writePostingsToDB, type WriteResult } from "../db/operations/write-postings-v2";

export interface Prepared {
  deduped: DedupedPosting[];
  normalized: NormalizedPosting[];
}

export function prepare(allRaw: RawPosting[]): Prepared {
  const deduped = deduplicate(allRaw);
  return { deduped, normalized: normalize(deduped) };
}

export async function processRaw(allRaw: RawPosting[], opts: { runId?: string } = {}): Promise<Prepared & { write: WriteResult }> {
  const prepared = prepare(allRaw);
  const write = await writePostingsToDB(prepared.deduped, prepared.normalized, { runId: opts.runId });
  return { ...prepared, write };
}
