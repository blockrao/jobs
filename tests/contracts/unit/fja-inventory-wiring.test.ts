/**
 * FJA inventory integration contracts.
 * Protects the boundary between the reusable section extractor and durable source inventory.
 */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const source = readFileSync("scripts/fja-inventory.ts", "utf8");

describe("FJA inventory extractor wiring", () => {
  test("section-based article facts are wired into the inventory crawler", () => {
    expect(source).toContain('import { parseFreeJobAlertArticle } from "@/enrich/freejobalert-article";');
    expect(source).toContain("const articleFacts = parseFreeJobAlertArticle(html);");
    expect(source).toContain("articleFacts: articleFactsStored");
  });

  test("field coverage retains unparsed sections and review flags instead of silently discarding them", () => {
    expect(source).toContain("unparsedSections: articleFacts.unparsed");
    expect(source).toContain("reviewFlags: articleFacts.review");
    expect(source).toContain("Coverage reports what extraction found");
  });

  test("inventory still stores immutable raw captures and source observations", () => {
    expect(source).toContain("INSERT INTO public.fja_source_captures");
    expect(source).toContain("ON CONFLICT (source_slug,external_id,html_sha256) DO NOTHING");
    expect(source).toContain("INSERT INTO public.source_observations");
  });
});
