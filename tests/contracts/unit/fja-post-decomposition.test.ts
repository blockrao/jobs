import { describe, expect, test } from "vitest";
import { extractPostCandidates } from "../../../scripts/fja-inventory";

describe("FJA notification versus post-level fact boundaries", () => {
  test("does not copy notification-level salary or age onto multiple post rows", () => {
    const item = {
      externalId: "999999",
      sourceUrl: "https://www.freejobalert.com/articles/example-999999/",
      title: "Example Multi-Post Recruitment",
      qualification: "Graduation",
      details: {
        tableFields: {},
        postNames: "Assistant Professor | Research Associate",
        salary: "₹50,000 per month",
        ageLimit: "18 to 30 years",
        location: "Delhi",
        lists: [],
        tables: [{
          tableIndex: 0,
          caption: "",
          heading: "Vacancy Details",
          rows: [
            { rowIndex: 0, cells: ["Post", "Vacancies"] },
            { rowIndex: 1, cells: ["Assistant Professor", "10"] },
            { rowIndex: 2, cells: ["Research Associate", "5"] },
          ],
        }],
      },
    } as never;

    const posts = extractPostCandidates(item);
    expect(posts).toHaveLength(2);
    expect(posts.map((post) => post.postNameRaw)).toEqual(["Assistant Professor", "Research Associate"]);
    expect(posts.map((post) => post.vacancyCountCandidate)).toEqual([10, 5]);
    expect(posts.every((post) => post.salaryRaw === null)).toBe(true);
    expect(posts.every((post) => post.ageLimitRaw === null)).toBe(true);
    expect(posts[0].otherInfoRaw).toMatchObject({
      genericArticleFieldsNotAssignedToPost: {
        salary: "₹50,000 per month",
        ageLimit: "18 to 30 years",
      },
    });
  });

  test("retains article-level wording as a candidate when the article has one unsplit post", () => {
    const item = {
      externalId: "888888",
      sourceUrl: "https://www.freejobalert.com/articles/example-888888/",
      title: "Example Single-Post Recruitment",
      details: {
        tableFields: {},
        postNames: "Junior Engineer",
        salary: "₹35,400 per month",
        ageLimit: "18 to 27 years",
        lists: [],
        tables: [],
      },
    } as never;

    const posts = extractPostCandidates(item);
    expect(posts).toHaveLength(1);
    expect(posts[0].postNameRaw).toBe("Junior Engineer");
    expect(posts[0].salaryRaw).toBe("₹35,400 per month");
    expect(posts[0].ageLimitRaw).toBe("18 to 27 years");
  });
});
