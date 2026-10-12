import { describe, expect, it } from "vitest";
import { extractFreeJobAlertCompleteness } from "../../scripts/fja-completeness-extractor";

const html = `
<html><head><title>MDU Recruitment 2026</title></head><body>
<h1>MDU Recruitment 2026 – 7 Field Investigator, Research Assistant & More Posts</h1>
<h2>Project</h2><p>Skill Development and Employability of Youth in Haryana: An Evaluation Using a Demand Driven Employability Framework</p>
<p>Sponsored by Haryana State Research Fund (HSRF).</p>
<table><tr><th>Post Name</th><th>Vacancies</th><th>Qualification</th><th>Salary</th><th>Duration</th></tr>
<tr><td>Research Assistant</td><td>1</td><td>Postgraduate with 55%; PhD/NET as stated</td><td>₹37,000/month</td><td>4 months</td></tr>
<tr><td>Project Fellow</td><td>1</td><td>Postgraduate with 55%</td><td>₹25,000/month</td><td>6 months</td></tr>
<tr><td>Field Investigator</td><td>5</td><td>Graduate or postgraduate</td><td>₹15,000/month</td><td>5 months</td></tr></table>
<table><tr><th>Last Date</th><td>17 October 2026</td></tr><tr><th>Selection Process</th><td>Shortlisting and physical interview</td></tr></table>
<ul><li>Submit application by email.</li><li>No TA/DA for interview.</li><li>University may decide not to fill any post.</li></ul>
<a href="https://mdu.ac.in/notice.pdf">Download official notification PDF</a>
</body></html>`;

describe("FreeJobAlert completeness extractor", () => {
  it("preserves tables, text, lists, project context and official links", () => {
    const result = extractFreeJobAlertCompleteness(html, "https://www.freejobalert.com/articles/mdu-recruitment-2026-3071555");
    expect(result.page_title).toContain("MDU Recruitment 2026");
    expect(result.tables.length).toBe(2);
    expect(result.body_text).toContain("Skill Development and Employability");
    expect(result.lists.flatMap(list => list.items).join(" ")).toContain("No TA/DA");
    expect(result.official_link_candidates.some(link => link.href?.endsWith("notice.pdf"))).toBe(true);
    expect(result.coverage.field_audit.find(field => field.field === "application_end_date")?.extracted).toBe(true);
    expect(result.page_sha256).toHaveLength(64);
  });

  it("reports missing structured fields without inventing values", () => {
    const result = extractFreeJobAlertCompleteness("<html><body><h1>Example recruitment</h1><p>Some text</p></body></html>", "https://www.freejobalert.com/articles/example-1234");
    expect(result.facts.application_fee ?? null).toBeNull();
    expect(result.coverage.needs_manual_review).toBe(true);
    expect(result.extraction_note).toContain("does not mean absent from the source");
  });
});
