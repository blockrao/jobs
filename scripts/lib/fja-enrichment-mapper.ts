import type { FjaResearchParse } from "./fja-research-parser";

export interface FjaEnrichmentCandidate {
  meta: {
    source: "FreeJobAlert";
    extraction_timestamp: string;
    verified: false;
    source_url: string;
    source_sha256?: string;
  };
  core: {
    job_title: string | null;
    organization: string | null;
    total_vacancies: number | null;
    posting_location: string | null;
  };
  salary: { raw: string } | null;
  vacancies_breakdown: Array<{ category: string; count: number; location?: string }>;
  eligibility: {
    age_limit?: { text: string };
    education?: Array<{ degree: string }>;
    raw_qualification?: string;
  };
  application: {
    deadline: string | null;
    application_method: null;
  };
  selection_process: Array<{ name: string; description: string }>;
  job_terms: {
    tenure?: string;
    posting_location?: string;
  };
  reference: {
    fja_url: string;
    official_link_candidates: Array<{ text: string; url: string; host: string }>;
  };
  source_capture: {
    page_title: string | null;
    detail_text: string;
    content_sections: FjaResearchParse["content_sections"];
    source_tables: FjaResearchParse["source_tables"];
    all_links: FjaResearchParse["all_links"];
    facts: FjaResearchParse["facts"];
    capture_quality: FjaResearchParse["capture_quality"];
  };
  publication_gate: {
    status: "REVIEW_REQUIRED";
    reasons: string[];
  };
}

function firstInteger(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/^\s*([\d,]+)/);
  if (!match) return null;
  const parsed = Number(match[1].replace(/,/g, ""));
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function rowValue(values: Record<string, string>, pattern: RegExp): string | null {
  const entry = Object.entries(values).find(([key, value]) => pattern.test(key) && value.trim().length > 0);
  return entry?.[1]?.trim() ?? null;
}

/**
 * Convert research-only parser output into a display-shaped candidate.
 * This never writes to the database and never claims official verification.
 * Full source structure is retained alongside the candidate for review.
 */
export function buildFjaEnrichmentCandidate(
  parsed: FjaResearchParse,
  sourceUrl: string,
  extractedAt: string,
  sourceSha256?: string,
): FjaEnrichmentCandidate {
  const breakdown: FjaEnrichmentCandidate["vacancies_breakdown"] = [];
  for (const table of parsed.post_table_candidates) {
    for (const row of table.rows) {
      const role = rowValue(row.values, /^(?:post|post name|trade name|discipline|designation|position|name of post)$/i);
      const countRaw = rowValue(row.values, /vacanc|slots?|no\.? of posts/i);
      const count = firstInteger(countRaw);
      if (!role || count === null || /^total\b/i.test(role)) continue;
      breakdown.push({
        category: role,
        count,
        ...(parsed.facts.job_location ? { location: parsed.facts.job_location } : {}),
      });
    }
  }

  const selectionSections = parsed.content_sections
    .filter((section) => /selection process|method of selection|selection procedure/i.test(section.heading))
    .map((section) => ({
      name: section.heading,
      description: section.blocks.map((block) => block.text).filter(Boolean).join("\n"),
    }))
    .filter((section) => section.description.length > 0);

  const termSection = parsed.content_sections.find((section) =>
    /training duration|duration of training|tenure|contract period|period of engagement/i.test(section.heading),
  );
  const tenure = termSection?.blocks.map((block) => block.text).filter(Boolean).join("\n") || undefined;

  const officialLinkCandidates = parsed.official_link_candidates.map((link) => ({
    text: link.text,
    url: link.url,
    host: link.host,
  }));

  const missing = parsed.capture_quality.missing_core_fields;
  const reasons = [
    "Source is FreeJobAlert, not the issuing authority; official notification verification is required.",
    ...(missing.length ? [`Missing core fields: ${missing.join(", ")}.`] : []),
    ...(parsed.review_reasons.length ? parsed.review_reasons : []),
  ];

  return {
    meta: {
      source: "FreeJobAlert",
      extraction_timestamp: extractedAt,
      verified: false,
      source_url: sourceUrl,
      ...(sourceSha256 ? { source_sha256: sourceSha256 } : {}),
    },
    core: {
      job_title: parsed.facts.post_name ?? parsed.page_title,
      organization: parsed.facts.organization ?? null,
      total_vacancies: firstInteger(parsed.facts.vacancies),
      posting_location: parsed.facts.job_location ?? null,
    },
    salary: parsed.facts.salary_pay ? { raw: parsed.facts.salary_pay } : null,
    vacancies_breakdown: breakdown,
    eligibility: {
      ...(parsed.facts.age_limit ? { age_limit: { text: parsed.facts.age_limit } } : {}),
      ...(parsed.facts.qualification ? { education: [{ degree: parsed.facts.qualification }], raw_qualification: parsed.facts.qualification } : {}),
    },
    application: {
      deadline: parsed.facts.application_end_date ?? parsed.derived_close_date,
      application_method: null,
    },
    selection_process: selectionSections,
    job_terms: {
      ...(tenure ? { tenure } : {}),
      ...(parsed.facts.job_location ? { posting_location: parsed.facts.job_location } : {}),
    },
    reference: { fja_url: sourceUrl, official_link_candidates: officialLinkCandidates },
    source_capture: {
      page_title: parsed.page_title,
      detail_text: parsed.detail_text,
      content_sections: parsed.content_sections,
      source_tables: parsed.source_tables,
      all_links: parsed.all_links,
      facts: parsed.facts,
      capture_quality: parsed.capture_quality,
    },
    publication_gate: { status: "REVIEW_REQUIRED", reasons: [...new Set(reasons)] },
  };
}
