import { describe, expect, test } from "vitest";
import {
  buildDiscoveryCollectionPageSchema,
  buildDiscoveryItemListSchema,
} from "@/lib/structured-data";
import { SITE } from "../helpers/metadata";

describe("discovery hub structured data", () => {
  test("CollectionPage identifies the canonical page and links to its ItemList", () => {
    const schema = buildDiscoveryCollectionPageSchema({
      name: "Government Jobs in India",
      description: "Current and upcoming government recruitment posts.",
      path: "/government-jobs",
      itemListPath: "/government-jobs",
    });

    expect(schema).toMatchObject({
      "@type": "CollectionPage",
      "@id": `${SITE}/government-jobs#collection`,
      url: `${SITE}/government-jobs`,
      mainEntity: { "@id": `${SITE}/government-jobs#job-list` },
    });
  });

  test("ItemList contains exactly the supplied visible items and canonical leaf URLs", () => {
    const schema = buildDiscoveryItemListSchema({
      name: "Government job vacancies",
      description: "Visible current and upcoming government posts.",
      path: "/government-jobs",
      items: [
        { name: "Assistant Security Officer", path: "/jobs/bmrc/assistant-security-officer" },
        { name: "Clerical Trainee", path: "/jobs/mehsana-bank/clerical-trainee" },
      ],
    });

    expect(schema.numberOfItems).toBe(2);
    expect(schema.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "Assistant Security Officer",
        url: `${SITE}/jobs/bmrc/assistant-security-officer`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Clerical Trainee",
        url: `${SITE}/jobs/mehsana-bank/clerical-trainee`,
      },
    ]);
    expect(JSON.stringify(schema)).not.toContain('"JobPosting"');
  });

  test("paginated ItemList positions continue from the supplied offset", () => {
    const schema = buildDiscoveryItemListSchema({
      name: "Government job vacancies",
      description: "Visible posts on page two.",
      path: "/government-jobs?page=2",
      positionOffset: 100,
      items: [{ name: "Junior Engineer", path: "/jobs/example/junior-engineer" }],
    });

    expect(schema.numberOfItems).toBe(1);
    expect(schema.itemListElement[0].position).toBe(101);
    expect(schema["@id"]).toBe(`${SITE}/government-jobs?page=2#job-list`);
  });

  test("empty inventory produces an empty list, not fabricated entries", () => {
    const schema = buildDiscoveryItemListSchema({
      name: "Government job vacancies",
      description: "No visible posts.",
      path: "/government-jobs",
      items: [],
    });

    expect(schema.numberOfItems).toBe(0);
    expect(schema.itemListElement).toEqual([]);
  });
});
