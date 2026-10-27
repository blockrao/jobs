import { RawPosting } from "./types";

export interface DedupedPosting {
  title: string;
  organizationName: string;
  locationCity: string;
  deadline: Date | null;
  primary: RawPosting;
  sources: Array<{
    portal: string;
    externalId: string;
    score: number;
  }>;
}

/**
 * In-batch deduplication uses stable source identity only.
 *
 * Title + organization + location is not a safe identity: different recruitment
 * cycles can reuse the same title, and one recruitment can contain multiple
 * roles. Cross-source candidates are reconciled against canonical database
 * identities in the writer; they are not collapsed here on fuzzy similarity.
 */
export function deduplicate(rawPostings: RawPosting[]): DedupedPosting[] {
  const bySourceIdentity = new Map<string, RawPosting[]>();

  for (const posting of rawPostings) {
    const source = posting.source || "JobOye HR Team";
    const key = `${source}\u0000${posting.externalId}`;
    const group = bySourceIdentity.get(key) ?? [];
    group.push(posting);
    bySourceIdentity.set(key, group);
  }

  const deduped: DedupedPosting[] = [];
  for (const group of bySourceIdentity.values()) {
    // Keep the most confident representation of the same source record.
    const primary = group.reduce((acc, posting) =>
      (posting.confidence || 0) > (acc.confidence || 0) ? posting : acc
    );
    const deadlines = group.map((posting) => posting.validThrough).filter((d): d is Date => !!d);
    const deadline = deadlines.length ? new Date(Math.min(...deadlines.map((d) => d.getTime()))) : null;
    const location = primary.locationCity || primary.locationRegion || "India";

    deduped.push({
      title: primary.title,
      organizationName: primary.organizationName,
      locationCity: location,
      deadline,
      primary,
      sources: group.map((posting) => ({
        portal: posting.source || "JobOye HR Team",
        externalId: posting.externalId,
        score: posting.confidence || 0,
      })),
    });
  }

  return deduped;
}
