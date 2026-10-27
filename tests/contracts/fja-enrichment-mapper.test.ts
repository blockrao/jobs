import { describe, expect, it } from "vitest";
import { parseFjaResearchDetail } from "../../scripts/lib/fja-research-parser";
import { buildFjaEnrichmentCandidate } from "../../scripts/lib/fja-enrichment-mapper";

describe("FJA enrichment candidate mapping", () => {
  it("maps source facts and role rows but always blocks publication pending official verification", () => {
    const html = '<main><h1>Sample Recruitment</h1>' +
      '<table><tr><th>Particulars</th><th>Details</th></tr>' +
      '<tr><td>Organization</td><td>Sample Authority</td></tr>' +
      '<tr><td>Post Name</td><td>Technical Assistant</td></tr>' +
      '<tr><td>Total Vacancies</td><td>5</td></tr>' +
      '<tr><td>Age Limit</td><td>18 to 30 years</td></tr>' +
      '<tr><td>Qualification</td><td>Diploma in relevant discipline</td></tr>' +
      '<tr><td>Last Date</td><td>30 October 2026</td></tr></table>' +
      '<h2>Selection Process</h2><p>Selection based on merit.</p>' +
      '<table><tr><th>Post</th><th>Vacancies</th><th>Pay</th></tr>' +
      '<tr><td>Assistant</td><td>3</td><td>Rs. 20,000</td></tr>' +
      '<tr><td>Technician</td><td>2</td><td>Rs. 25,000</td></tr></table></main>';
    const sourceUrl = "https://www.freejobalert.com/articles/sample-1234";
    const parsed = parseFjaResearchDetail(html, sourceUrl, "2026-10-27");
    const candidate = buildFjaEnrichmentCandidate(parsed, sourceUrl, "2026-10-27T00:00:00.000Z", "a".repeat(64));

    expect(candidate.core.organization).toBe("Sample Authority");
    expect(candidate.core.total_vacancies).toBe(5);
    expect(candidate.vacancies_breakdown).toEqual([
      { category: "Assistant", count: 3 },
      { category: "Technician", count: 2 },
    ]);
    expect(candidate.eligibility.age_limit?.text).toBe("18 to 30 years");
    expect(candidate.application.deadline).toBe("30 October 2026");
    expect(candidate.selection_process[0].description).toContain("Selection based on merit");
    expect(candidate.meta.verified).toBe(false);
    expect(candidate.publication_gate.status).toBe("REVIEW_REQUIRED");
    expect(candidate.publication_gate.reasons[0]).toContain("not the issuing authority");
    expect(candidate.source_capture.source_tables.length).toBe(2);
  });
});
