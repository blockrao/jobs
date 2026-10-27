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
        <tr><td>Total Vacancies</td><td></td><td>3</td></tr>
      </table>
      <table>
        <tr><th>Post Name</th><th>Educational Qualification Information</th></tr>
        <tr><td>Junior Engineer</td><td>Diploma in Engineering</td></tr>
      </table>
      <a href="https://upsssc.gov.in/OnlineApplication.aspx">Apply Online</a>
      <a href="https://play.google.com/store/apps/details?id=com.freejobalert">Download Mobile APP</a>
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
    expect(result.post_table_candidates.find((table) => table.headers.includes("Department / Organization"))?.rows).toHaveLength(1);
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

  it("rejects non-date application modes and nonnumeric vacancy descriptions", () => {
    const html = '<main><h1>Kerala University Recruitment</h1>' +
      '<table><tr><th>Particulars</th><th>Details</th></tr>' +
      '<tr><td>Organisation</td><td>Kerala University</td></tr>' +
      '<tr><td>Vacancies</td><td>Vacancies to be occurred / Panel preparation</td></tr>' +
      '<tr><td>Apply By</td><td>Email or Post</td></tr></table>' +
      '<table><tr><th>Event</th><th>Date</th></tr>' +
      '<tr><td>Application Last Date</td><td>05-11-2026</td></tr></table></main>';
    const result = parseFjaResearchDetail(html, "https://www.freejobalert.com/articles/example-1234", "2026-10-12");
    expect(result.facts.application_end_date).toBe("05-11-2026");
    expect(result.facts.vacancies).toBeUndefined();
    expect(result.derived_close_date).toBe("2026-11-05");
    expect(result.open_status).toBe("OPEN_AS_OF_CUTOFF");
    expect(result.review_reasons.some((reason) => reason.includes("no numeric count"))).toBe(true);
  });

  it("holds records with no application deadline for review", () => {
    const result = parseFjaResearchDetail("<main><h1>Recruitment</h1><p>Details soon.</p></main>", "https://www.freejobalert.com/articles/example-1234", "2026-10-12");
    expect(result.open_status).toBe("REVIEW_DATE_UNCLEAR");
    expect(result.review_reasons).toContain("No unambiguous application closing date was extracted.");
  });

  it("preserves article sections, list items, tables, and all links", () => {
    const html = '<main><h1>Example Recruitment</h1><h2>Eligibility Criteria</h2>' +
      '<p>Applicants must hold a relevant degree.</p><ul><li>Minimum age 18 years</li><li>Full-time degree</li></ul>' +
      '<h2>Vacancy Details</h2><table><caption>Role-wise vacancies</caption>' +
      '<tr><th>Post</th><th>Vacancies</th></tr><tr><td>Analyst</td><td>2</td></tr></table>' +
      '<a href="https://example.gov.in/apply">Apply Online</a></main>';
    const result = parseFjaResearchDetail(html, "https://www.freejobalert.com/articles/example-1234", "2026-10-12");
    expect(result.content_sections.some((section) => section.heading === "Eligibility Criteria")).toBe(true);
    expect(result.content_sections.some((section) => section.blocks.some((block) => block.type === "list" && block.items?.length === 2))).toBe(true);
    expect(result.source_tables[0].caption).toBe("Role-wise vacancies");
    expect(result.source_tables[0].rows).toContainEqual(["Analyst", "2"]);
    expect(result.all_links.some((link) => link.text === "Apply Online")).toBe(true);
    expect(result.capture_quality.detail_text_chars).toBeGreaterThan(0);
    expect(result.capture_quality.source_table_count).toBe(1);
    expect(result.capture_quality.list_item_count).toBe(2);
    expect(result.capture_quality.status).toBe("CAPTURED_NEEDS_REVIEW");
  });

  it("preserves blank table cells so post-wise columns do not shift", () => {
    const html = '<main><h1>Multi-post Recruitment</h1>' +
      '<table><tr><th>Post Name</th><th>Vacancies</th><th>Qualification</th></tr>' +
      '<tr><td>Assistant</td><td>2</td><td>Degree</td></tr>' +
      '<tr><td>Clerk</td><td></td><td>12th pass</td></tr></table></main>';
    const result = parseFjaResearchDetail(html, "https://www.freejobalert.com/articles/example-1234", "2026-10-12");
    expect(result.source_tables[0].rows).toContainEqual(["Clerk", "", "12th pass"]);
    expect(result.post_table_candidates[0].rows.some((row) => row.values["qualification"] === "12th pass")).toBe(true);
    expect(result.capture_quality.status).toBe("CAPTURED_NEEDS_REVIEW");
  });


});
