import { describe, expect, test } from "vitest";
import { readSource, stripComments } from "../helpers/source";
import {
  isManuallyVerifiedOfficialLink,
  isRecruitmentSourceTrusted,
  isUnverifiedAggregatorSource,
} from "../../../src/lib/source-verification";

describe("Recruitment source provenance trust contract", () => {
  const reviewedAt = new Date(Date.now() - 60_000).toISOString();
  const reviewedMetadata = {
    source_provenance: {
      discovery_origin: "AGGREGATOR_DISCOVERED",
      authority_review: {
        status: "VERIFIED",
        evidence_url: "https://recruitment.gov.in/notice.pdf",
        reviewed_by: "reviewer@example",
        reviewed_at: reviewedAt,
        notes: "Issuer identity and notice ownership checked.",
      },
      fact_review: {
        status: "VERIFIED",
        reviewed_fields: ["hub:notification_date"],
        evidence: {
          "hub:notification_date": {
            evidence_ref: "page:1",
            excerpt: "Notification issued on 08 October 2026.",
          },
        },
        reviewed_by: "reviewer@example",
        reviewed_at: reviewedAt,
        notes: "Required facts checked against the official notification.",
      },
    },
  };

  test("an aggregator origin stays untrusted without both human review records", () => {
    expect(isUnverifiedAggregatorSource({
      sourceDiscoveryOrigin: "AGGREGATOR_DISCOVERED",
      officialLinkSource: "AGGREGATOR_DISCOVERED",
      verificationStatus: "VERIFIED",
      metadata: {},
    })).toBe(true);
  });

  test("a complete issuer and fact review is required to trust aggregator-origin records", () => {
    const input = {
      sourceDiscoveryOrigin: "AGGREGATOR_DISCOVERED",
      officialLinkSource: "MANUAL_VERIFIED",
      verificationStatus: "VERIFIED",
      metadata: reviewedMetadata,
    };
    expect(isRecruitmentSourceTrusted(input)).toBe(true);
    expect(isUnverifiedAggregatorSource(input)).toBe(false);
  });

  test("missing evidence for any reviewed fact keeps the source untrusted", () => {
    const input = {
      sourceDiscoveryOrigin: "AGGREGATOR_DISCOVERED",
      officialLinkSource: "MANUAL_VERIFIED",
      verificationStatus: "VERIFIED",
      metadata: {
        source_provenance: {
          ...reviewedMetadata.source_provenance,
          fact_review: {
            ...reviewedMetadata.source_provenance.fact_review,
            evidence: {},
          },
        },
      },
    };
    expect(isUnverifiedAggregatorSource(input)).toBe(true);
  });

  test("extracted-link and Post source labels are treated as aggregator discovery", () => {
    for (const officialLinkSource of ["fja_official_link_extracted", "official_link_extracted"]) {
      expect(isUnverifiedAggregatorSource({ officialLinkSource })).toBe(true);
    }
    for (const sourceName of ["aggregator", "freejobalert", "aggregator_extracted"]) {
      expect(isUnverifiedAggregatorSource({ sourceName })).toBe(true);
    }
  });

  test("manual official-link source matching is exact after whitespace normalization", () => {
    expect(isManuallyVerifiedOfficialLink(" MANUAL_VERIFIED ")).toBe(true);
    expect(isManuallyVerifiedOfficialLink("AGGREGATOR_DISCOVERED")).toBe(false);
  });
});

describe("Source-provenance migration and public discovery gates", () => {
  const migration = stripComments(readSource(
    "supabase/migrations/20261031070000_p0_official_source_authority_gate.sql",
  ));

  test("backfills every audited aggregator-origin signal and rejects false relabelling", () => {
    expect(migration).toContain("institutional_aggregation");
    expect(migration).toContain("institution_aggregation");
    expect(migration).toContain("fja_html");
    expect(migration).toContain("fja_official_link_extracted");
    expect(migration).toContain("official_link_extracted");
    expect(migration).toContain("freejobalert");
    expect(migration).toContain("aggregator_extracted");
    expect(migration).toContain("NEW.source_discovery_origin <> 'AGGREGATOR_DISCOVERED'");
  });

  test("promotion requires exact Recruitment-to-Post ID and name parity", () => {
    expect(migration).toContain("official_digest_posts_match_recruitment");
    expect(migration).toContain("cardinality(coalesce(p_post_ids");
    expect(migration).toContain("jsonb_array_length(p_posts)");
    expect(migration).toContain("NEW.recruitment_id, NEW.post_ids, NEW.posts");
  });

  test("every canonical child fact family has an independent provenance guard", () => {
    for (const table of [
      "posts_education",
      "posts_experience",
      "posts_vacancies",
      "posts_selection_process",
      "posts_documents",
      "posts_important_dates",
      "post_age_rules",
      "posts_application_fee",
      "posts_official_links",
    ]) {
      expect(migration).toContain(`trg_guard_aggregator_${table}_provenance`);
    }
  });

  test("the shared SQL trust predicate requires manual link and issuer/fact review", () => {
    expect(migration).toContain("is_recruitment_source_trusted");
    expect(migration).toContain("p_official_link_source = 'MANUAL_VERIFIED'");
    expect(migration).toContain("authority ->> 'status' = 'VERIFIED'");
    expect(migration).toContain("facts ->> 'status' = 'VERIFIED'");
  });

  test("public listing, related-post, organization and sitemap paths share the SQL trust predicate", () => {
    const files = [
      "src/db/operations/get-recruitments.ts",
      "src/db/operations/get-related-posts.ts",
      "src/db/operations/get-organizations.ts",
      "src/app/sitemap.ts",
    ];
    for (const file of files) {
      expect(stripComments(readSource(file))).toContain("is_recruitment_source_trusted");
    }
  });

  test("unreviewed aggregator hubs and Post Leaves are noindex and do not expose extracted links", () => {
    const hub = stripComments(readSource("src/app/(default)/jobs/[recruitment-slug]/page.tsx"));
    const leaf = stripComments(readSource("src/app/(default)/jobs/[recruitment-slug]/[post-slug]/page.tsx"));
    const hubSchema = stripComments(readSource("src/components/recruitment/structured-data/recruitment-hub-schema.tsx"));
    expect(hub).toContain("isUnverifiedAggregatorSource");
    expect(hub).toContain("pageSeo(`/jobs/${recruitment.slug}`, { index: false })");
    expect(leaf).toContain("isUnverifiedAggregatorSource");
    expect(leaf).toContain("sourceVerified={officialLinksVerified}");
    expect(leaf).toContain("officialLinks: officialLinksVerified");
    expect(hubSchema).toContain("if (data.sourceFactsUnverified) return null");
  });
});
