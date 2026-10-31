import { describe, expect, it } from "vitest";
import {
  isAggregatorDiscoveredSource,
  isRecruitmentSourceTrusted,
  isUnverifiedAggregatorSource,
} from "@/lib/source-verification";

describe("complete persisted source-origin coverage", () => {
  it.each([
    ["recruitment discovery origin", { sourceDiscoveryOrigin: "AGGREGATOR_DISCOVERED" }],
    ["recruitment official-link extraction", { officialLinkSource: "fja_official_link_extracted" }],
    ["recruitment legacy link extraction", { officialLinkSource: "official_link_extracted" }],
    ["recruitment enrichment metadata", { enrichmentData: { meta: { source: "institutional_aggregation" } } }],
    ["canonical Post sourceName", { sourceName: "aggregator_extracted" }],
    ["preliminary canonical Post", { sourceName: "pilot_preliminary" }],
    ["FJA source reference", { sourceReference: "https://www.freejobalert.com/example/" }],
    ["FJA original recruitment URL", { originalRecruitmentUrl: "https://freejobalert.com/example/" }],
    ["FJA Recruitment source URL", { recruitmentSourceUrl: "https://jobs.freejobalert.com/example/" }],
    ["legacy postings.source", { legacyPostingSource: "fja" }],
    ["legacy postings.source_type", { legacyPostingSourceType: "AGGREGATOR" }],
    ["legacy postings.source_portals", { legacyPostingSourcePortals: ["fja"] }],
    ["external aggregator portal", { legacyPostingSourcePortals: ["ext-5"] }],
  ])("detects %s", (_label, input) => {
    expect(isAggregatorDiscoveredSource(input)).toBe(true);
    expect(isUnverifiedAggregatorSource(input)).toBe(true);
  });

  it("does not classify a lookalike hostname as FJA", () => {
    expect(isAggregatorDiscoveredSource({
      sourceReference: "https://freejobalert.com.evil.example/jobs",
    })).toBe(false);
  });

  it("does not classify an official CMD listing label as an aggregator by itself", () => {
    expect(isAggregatorDiscoveredSource({
      officialLinkSource: "official_CMD_listing",
    })).toBe(false);
  });

  it("does not trust an aggregator record based on VERIFIED alone", () => {
    expect(isRecruitmentSourceTrusted({
      sourceDiscoveryOrigin: "AGGREGATOR_DISCOVERED",
      verificationStatus: "VERIFIED",
      officialLinkSource: "MANUAL_VERIFIED",
    })).toBe(false);
  });

  it("requires issuer review and field-addressable evidence for aggregator records", () => {
    const reviewedAt = new Date(Date.now() - 60_000).toISOString();
    const metadata = {
      source_provenance: {
        authority_review: {
          status: "VERIFIED",
          evidence_url: "https://official.example.gov/notice",
          reviewed_by: "reviewer",
          reviewed_at: reviewedAt,
          notes: "Issuer domain and notice were checked.",
        },
        fact_review: {
          status: "VERIFIED",
          reviewed_by: "reviewer",
          reviewed_at: reviewedAt,
          notes: "Required hub facts were checked against the notice.",
          reviewed_fields: ["hub:notification_date"],
          evidence: {
            "hub:notification_date": {
              evidence_ref: "https://official.example.gov/notice#page-1",
              excerpt: "Notification published on the stated date.",
            },
          },
        },
      },
    };

    expect(isRecruitmentSourceTrusted({
      sourceDiscoveryOrigin: "AGGREGATOR_DISCOVERED",
      verificationStatus: "VERIFIED",
      officialLinkSource: "MANUAL_VERIFIED",
      metadata,
    })).toBe(true);
  });

  it("rejects incomplete field evidence even when review labels say VERIFIED", () => {
    const reviewedAt = new Date(Date.now() - 60_000).toISOString();
    const metadata = {
      source_provenance: {
        authority_review: {
          status: "VERIFIED",
          evidence_url: "https://official.example.gov/notice",
          reviewed_by: "reviewer",
          reviewed_at: reviewedAt,
          notes: "Issuer checked.",
        },
        fact_review: {
          status: "VERIFIED",
          reviewed_by: "reviewer",
          reviewed_at: reviewedAt,
          notes: "Facts checked.",
          reviewed_fields: ["hub:notification_date"],
          evidence: {},
        },
      },
    };

    expect(isRecruitmentSourceTrusted({
      sourceDiscoveryOrigin: "AGGREGATOR_DISCOVERED",
      verificationStatus: "VERIFIED",
      officialLinkSource: "MANUAL_VERIFIED",
      metadata,
    })).toBe(false);
  });
});
