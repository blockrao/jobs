import { describe, expect, it } from "vitest";
import { parseFjaDate, parseFjaResearchDetail } from "./fja-research-parser";

describe("FreeJobAlert research parser", () => {
  it.each([
    ["25 November 2026", "2026-11-25"],
    ["November 25, 2026", "2026-11-25"],
    ["25-11-2026", "2026-11-25"],
    ["25/11/2026", "2026-11-25"],
    ["31 February 2026", null],
    ["25 November", null],
  ])("parses dates conservatively: %s", (input, expected) => {
    expect(parseFjaDate(input)).toBe(expected);
  });

  it("rejects table headings masquerading as organization and post facts", () => {
    const html = `
      <main>
        <h1>UPSSSC Junior Engineer Recruitment 2026</h1>
        <table>
          <tr><td>Organization</td><td>Post Name | Vacancies</td></tr>
          <tr><td>Post Name</td><td>Educational Qualification Information</td></tr>
          <tr><td>Vacancies</td><td>1156 Posts</td></tr>
          <tr><td>Last Date to Apply</td><td>25 November 2026</td></tr>
        </table>
        <a href="https://upsssc.gov.in/"><span>Official Notification PDF</span></a>
      </main>`;
    const result = parseFjaResearchDetail(html, "https://www.freejobalert.com/articles/test-12345", "2026-10-27");
    expect(result.facts.organization).toBeUndefined();
    expect(result.facts.post_name).toBeUndefined();
    expect(result.facts.vacancies).toBe("1156 Posts");
    expect(result.vacancy_count_candidate).toBe(1156);
    expect(result.derived_close_date).toBe("2026-11-25");
    expect(result.open_status).toBe("OPEN_AS_OF_CUTOFF");
    expect(result.official_link_candidates.some((link) => link.host === "upsssc.gov.in")).toBe(true);
  });

  it("keeps walk-in dates separate from application closing dates", () => {
    const html = `
      <main>
        <h1>Hospital Senior Resident Walk-in</h1>
        <table><tr><td>Interview Date</td><td>27 October 2026</td></tr></table>
      </main>`;
    const result = parseFjaResearchDetail(html, "https://www.freejobalert.com/articles/test-12346", "2026-10-27");
    expect(result.derived_close_date).toBeNull();
    expect(result.open_status).toBe("REVIEW_WALKIN_DATE_UNCLEAR");
  });

  it("preserves post-wise rows as candidates instead of treating them as recruitment totals", () => {
    const html = `
      <main>
        <h1>Recruitment 2026</h1>
        <table>
          <tr><th>Post Name</th><th>Vacancies</th><th>Qualification</th></tr>
          <tr><td>Junior Engineer</td><td>100</td><td>Diploma</td></tr>
          <tr><td>Assistant Engineer</td><td>25</td><td>Degree</td></tr>
        </table>
      </main>`;
    const result = parseFjaResearchDetail(html, "https://www.freejobalert.com/articles/test-12347", "2026-10-27");
    expect(result.post_table_candidates).toHaveLength(1);
    expect(result.post_table_candidates[0].rows).toHaveLength(2);
    expect(result.facts.vacancies).toBeUndefined();
  });
  it("does not convert explanatory vacancy prose into a numeric count", () => {
    const html = `
      <main>
        <h1>Kannur University Registrar Recruitment 2026</h1>
        <table>
          <tr><td>Organization</td><td>Kannur University</td></tr>
          <tr><td>Vacancies</td><td>1 (the notice does not print a number)</td></tr>
          <tr><td>Last Date to Apply</td><td>24 November 2026</td></tr>
        </table>
      </main>`;
    const result = parseFjaResearchDetail(html, "https://www.freejobalert.com/articles/test-12348", "2026-10-27");
    expect(result.vacancy_count_candidate).toBeNull();
    expect(result.review_reasons.some((reason) => reason.includes("no defensible numeric total"))).toBe(true);
  });

  it("does not mistake a later correction-window date for the application deadline", () => {
    const html = `
      <main>
        <h1>RRB Station Master Recruitment 2026</h1>
        <table>
          <tr><td>Organization</td><td>Railway Recruitment Boards</td></tr>
          <tr><td>Post Name</td><td>Station Master</td></tr>
          <tr><td>Vacancies</td><td>1,215</td></tr>
          <tr><td>Application Last Date</td><td>25 November 2026</td></tr>
        </table>
        <p>Last Date 7 December 2026 Modification Fee Rs 250</p>
      </main>`;
    const result = parseFjaResearchDetail(html, "https://www.freejobalert.com/articles/test-12349", "2026-10-27");
    expect(result.derived_close_date).toBe("2026-11-25");
    expect(result.open_status).toBe("OPEN_AS_OF_CUTOFF");
    expect(result.vacancy_count_candidate).toBe(1215);
    expect(result.date_candidates.some((candidate) => candidate.date === "2026-12-07" && candidate.kind === "other")).toBe(true);
  });

});
