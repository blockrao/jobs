import { describe, expect, test } from "vitest";
import { readSource, stripComments } from "../helpers/source";
import {
  isManuallyVerifiedOfficialLink,
  isRecruitmentSourceTrusted,
  isUnverifiedAggregatorSource,
} from "../../../src/lib/source-verification";

describe("source trust helper contract", () => {
  const reviewedAt = new Date(Date.now() - 60_000).toISOString();
  const metadata = {
    source_provenance: {
      discovery_origin: "AGGREGATOR_DISCOVERED",
      authority_review: {
        status: "VERIFIED",
        evidence_url: "https://recruitment.gov.in/notice.pdf",
        reviewed_by: "reviewer@example",
        reviewed_at: reviewedAt,
        notes: "Issuer identity checked.",
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
        notes: "Required facts checked against the official notice.",
      },
    },
  };

  test("aggregator-origin data is untrusted until issuer and fact review both pass", () => {
    expect(isUnverifiedAggregatorSource({
      sourceDiscoveryOrigin: "AGGREGATOR_DISCOVERED",
      officialLinkSource: "AGGREGATOR_DISCOVERED",
      verificationStatus: "VERIFIED",
      metadata: {},
    })).toBe(true);
    expect(isRecruitmentSourceTrusted({
      sourceDiscoveryOrigin: "AGGREGATOR_DISCOVERED",
      officialLinkSource: "MANUAL_VERIFIED",
      verificationStatus: "VERIFIED",
      metadata,
    })).toBe(true);
  });

  test("missing field evidence cannot make an aggregator-origin record trusted", () => {
    expect(isUnverifiedAggregatorSource({
      sourceDiscoveryOrigin: "AGGREGATOR_DISCOVERED",
      officialLinkSource: "MANUAL_VERIFIED",
      verificationStatus: "VERIFIED",
      metadata: {
        source_provenance: {
          ...metadata.source_provenance,
          fact_review: {
            ...metadata.source_provenance.fact_review,
            evidence: {},
          },
        },
      },
    })).toBe(true);
  });

  test("all audited extracted-link and canonical Post source labels identify aggregator discovery", () => {
    for (const officialLinkSource of ["fja_official_link_extracted", "official_link_extracted"]) {
      expect(isUnverifiedAggregatorSource({ officialLinkSource })).toBe(true);
    }
    for (const sourceName of ["aggregator", "freejobalert", "aggregator_extracted"]) {
      expect(isUnverifiedAggregatorSource({ sourceName })).toBe(true);
    }
    expect(isManuallyVerifiedOfficialLink(" MANUAL_VERIFIED ")).toBe(true);
    expect(isManuallyVerifiedOfficialLink("AGGREGATOR_DISCOVERED")).toBe(false);
  });
});

describe("additive source authority migration", () => {
  const migration = stripComments(readSource(
    "supabase/migrations/20261031070000_p0_official_source_authority_gate.sql",
  ));
  const rollback = stripComments(readSource(
    "supabase/rollback/20261031070000_p0_official_source_authority_gate.sql",
  ));

  test("backfills all three persisted origin signals and blocks false relabelling", () => {
    for (const value of [
      "institutional_aggregation",
      "institution_aggregation",
      "fja_html",
      "fja_official_link_extracted",
      "official_link_extracted",
      "freejobalert",
      "aggregator_extracted",
    ]) expect(migration).toContain(value);
    expect(migration).toContain("NEW.source_discovery_origin <> 'AGGREGATOR_DISCOVERED'");
  });

  test("a reviewed staging payload must match exact canonical Post IDs and names", () => {
    expect(migration).toContain("official_digest_posts_match_recruitment");
    expect(migration).toContain("cardinality(coalesce(p_post_ids");
    expect(migration).toContain("jsonb_array_length(p_posts)");
    expect(migration).toContain("NEW.recruitment_id, NEW.post_ids, NEW.posts");
  });

  test("all nine canonical child fact families have write guards", () => {
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
    ]) expect(migration).toContain(`trg_guard_aggregator_${table}_provenance`);
  });

  test("shared public trust predicate requires manual link and both review records", () => {
    expect(migration).toContain("is_recruitment_source_trusted");
    expect(migration).toContain("p_official_link_source = 'MANUAL_VERIFIED'");
    expect(migration).toContain("authority ->> 'status' = 'VERIFIED'");
    expect(migration).toContain("facts ->> 'status' = 'VERIFIED'");
  });

  test("the Stage 1 migration does not perform destructive cohort remediation", () => {
    expect(migration).not.toMatch(/DELETE\s+FROM\s+public\.(recruitments|posts)/i);
    expect(migration).not.toContain("TRUNCATE");
    expect(migration).toContain("source_discovery_origin = 'AGGREGATOR_DISCOVERED'");
  });

  test("rollback refuses to discard review evidence or newly written fact provenance", () => {
    expect(rollback).toContain("Rollback refused");
    expect(rollback).toContain("source_provenance");
    expect(rollback).toContain("fact provenance");
  });

  test("the legacy review manifest is a read-only transaction", () => {
    const manifest = stripComments(readSource(
      "scripts/audits/source-provenance-legacy-review-manifest.sql",
    ));
    expect(manifest).toContain("BEGIN TRANSACTION READ ONLY");
    expect(manifest).toContain("COMMIT");
    expect(manifest).not.toMatch(/\b(INSERT\s+INTO|UPDATE\s+public\.|DELETE\s+FROM|TRUNCATE)\b/i);
  });

  test("Drizzle schema maps the source origin and new child-fact provenance fields", () => {
    const schema = stripComments(readSource("src/db/schema.ts"));
    expect(schema).toContain('sourceDiscoveryOrigin: text("source_discovery_origin")');
    expect(schema).toContain('sourceRef: text("source_ref")');
    expect(schema).toContain('sourceLocator: text("source_locator")');
    expect(schema).toContain('verifiedAt: timestamp("verified_at", { withTimezone: false })');
  });
});
