import { describe, expect, it } from "vitest";
import { parseFjaDate, parseFjaResearchDetail } from "../../scripts/lib/fja-research-parser";

describe("FJA research parser", () => {
  it("parses Indian numeric and written dates without losing the year", () => {
    expect(parseFjaDate("25-11-2026")).toBe("2026-11-25");
    expect(parseFjaDate("28 October 2026, 5:00 PM")).toBe("2026-10-28");
    expect(parseFjaDate("02 November 2026")).toBe("2026-11-02");
    expect(parseFjaDate("31 February 2026")).toBeNull();
  });

  it("extracts recruitment-level facts only from recognized key/value rows", () => {
    const html = `
      <main><h1>UPSSSC Combined Junior Engineer Recruitment</h1>
      <table>
        <tr><th>Particulars</th><th>Details</th></tr>
        <tr><td>Recruiting Organization</td><td>Uttar Pradesh Subordinate Services Selection Commission (UPSSSC)</td></tr>
        <tr><td>Advertisement Number</td><td>24-Exam/2026</td></tr>
        <tr><td>Total Vacancies</td><td>1,156</td></tr>
        <tr><td>Online Application Start Date</td><td>03 November 2026</td></tr>
        <tr><td>Last Date to Apply Online</td><td>25 November 2026</td></tr>
      </table>
      <table>
        <tr><th>Department / Organization</th><th>Post Name</th><th>Vacancies</th></tr>
        <tr><td>Ground Water Department</td><td>Technical Assistant</td><td>3</td></tr>
      </table>
      <table>
        <tr><th>Post Name</th><th>Educational Qualification Information</th></tr>
        <tr><td>Junior Engineer</td><td>Diploma in Engineering</td></tr>
      </table>
      <a href="https://upsssc.gov.in/OnlineApplication.aspx">Apply Online</a>
      <a href="https://www.freejobalert.com/latest-notifications/">Latest Notifications</a>
      </main>`;
    const result = parseFjaResearchDetail(html, "https://www.freejobalert.com/articles/example-1234", "2026-10-12");
    expect(result.facts.organization).toContain("Uttar Pradesh Subordinate Services Selection Commission");
    expect(result.facts.advertisement_number).toBe("24-Exam/2026");
    expect(result.facts.vacancies).toBe("1,156");
    expect(result.facts.application_start_date).toBe("03 November 2026");
    expect(result.facts.application_end_date).toBe("25 November 2026");
    expect(result.facts.organization).not.toBe("Post Name | Vacancies");
    expect(result.facts.post_name).toBeUndefined();
    expect(result.derived_close_date).toBe("2026-11-25");
    expect(result.open_status).toBe("OPEN_AS_OF_CUTOFF");
    expect(result.official_link_candidates).toHaveLength(1);
    expect(result.official_link_candidates[0].host).toBe("upsssc.gov.in");
    expect(result.post_table_candidates.length).toBeGreaterThan(0);
    expect(result.post_table_candidates.some((table) => table.rows.some((row) => Object.values(row.values).includes("Technical Assistant")))).toBe(true);
  });

  it("never treats a walk-in/interview date as an application deadline", () => {
    const html = `
      <main><h1>ESIC Teaching Posts Walk-in</h1>
      <table><tr><th>Particulars</th><th>Details</th></tr>
      <tr><td>Organization</td><td>ESIC Medical College</td></tr>
      <tr><td>Walk-in Date</td><td>27.10.2026</td></tr>
      <tr><td>Vacancies</td><td>34 Posts</td></tr></table></main>`;
    const result = parseFjaResearchDetail(html, "https://www.freejobalert.com/articles/example-1234", "2026-10-12");
    expect(result.facts.walk_in_date).toBe("27.10.2026");
    expect(result.derived_close_date).toBeNull();
    expect(result.open_status).toBe("REVIEW_WALKIN_DATE_UNCLEAR");
    expect(result.review_reasons).toContain("Walk-in/interview dates are not equivalent to an application closing date.");
  });

  it("holds records with no application deadline for review", () => {
    const result = parseFjaResearchDetail("<main><h1>Recruitment</h1><p>Details soon.</p></main>", "https://www.freejobalert.com/articles/example-1234", "2026-10-12");
    expect(result.open_status).toBe("REVIEW_DATE_UNCLEAR");
    expect(result.review_reasons).toContain("No unambiguous application closing date was extracted.");
  });
});
