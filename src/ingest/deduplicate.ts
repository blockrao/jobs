import { RawPosting } from './types';

export interface DedupedPosting {
  title: string;
  organizationName: string;
  locationCity: string;
  // Earliest deadline wins
  deadline: Date | null;
  // Highest confidence posting used as primary
  primary: RawPosting;
  // All sources that reported this job
  sources: Array<{
    portal: string;
    externalId: string;
    score: number;
  }>;
}

export function deduplicate(rawPostings: RawPosting[]): DedupedPosting[] {
  const byTitleOrgLocation = new Map<string, RawPosting[]>();

  for (const posting of rawPostings) {
    const location = posting.locationCity || posting.locationRegion || 'India';
    const key = `${posting.title}|${posting.organizationName}|${location}`;
    if (!byTitleOrgLocation.has(key)) {
      byTitleOrgLocation.set(key, []);
    }
    byTitleOrgLocation.get(key)!.push(posting);
  }

  const deduped: DedupedPosting[] = [];

  for (const [key, group] of Array.from(byTitleOrgLocation.entries())) {
    const location = group[0].locationCity || group[0].locationRegion || 'India';

    if (group.length === 1) {
      const p = group[0];
      deduped.push({
        title: p.title,
        organizationName: p.organizationName,
        locationCity: location,
        deadline: p.validThrough || null,
        primary: p,
        sources: [
          { portal: p.source || 'unknown', externalId: p.externalId, score: p.confidence || 0 },
        ],
      });
      continue;
    }

    // Multiple sources: earliest deadline wins
    let earliestDeadline: Date | null = group[0].validThrough || null;
    for (const p of group.slice(1)) {
      if (
        p.validThrough &&
        (!earliestDeadline || p.validThrough < earliestDeadline)
      ) {
        earliestDeadline = p.validThrough;
      }
    }

    // Tiebreak on highest confidence for primary posting
    const primary = group.reduce((acc, p) =>
      (p.confidence || 0) > (acc.confidence || 0) ? p : acc
    );

    deduped.push({
      title: primary.title,
      organizationName: primary.organizationName,
      locationCity: location,
      deadline: earliestDeadline,
      primary,
      sources: group.map((p) => ({
        portal: p.source || 'unknown',
        externalId: p.externalId,
        score: p.confidence || 0,
      })),
    });
  }

  return deduped;
}
