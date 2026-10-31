import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isManuallyVerifiedOfficialLink, isUnverifiedAggregatorSource } from "../../../src/lib/source-verification";
import { transformEnrichment } from "../../../src/db/operations/enrichment-transformer";

describe("aggregator source trust gate", () => {
  it("requires a distinct manual verification state for official links", () => {
    expect(isManuallyVerifiedOfficialLink("MANUAL_VERIFIED")).toBe(true);
    expect(isManuallyVerifiedOfficialLink("AGGREGATOR_DISCOVERED")).toBe(false);
    expect(isManuallyVerifiedOfficialLink("UNVERIFIED")).toBe(false);
  });

  it("treats aggregator discovery as unverified unless the recruitment is explicitly VERIFIED", () => {
    expect(isUnverifiedAggregatorSource("AGGREGATOR_DISCOVERED", "UNVERIFIABLE")).toBe(true);
    expect(isUnverifiedAggregatorSource("AGGREGATOR_DISCOVERED", "UNVERIFIED")).toBe(true);
    expect(isUnverifiedAggregatorSource("AGGREGATOR_DISCOVERED", null)).toBe(true);
    const reviewedMetadata = {
      source_provenance: {
        authority_review: {
          status: "VERIFIED",
          evidence_url: "https://issuer.example/recruitment",
          reviewed_by: "reviewer",
          reviewed_at: "2026-10-31T10:00:00Z",
          notes: "Issuer page cross-checked against the notice",
        },
        fact_review: {
          status: "VERIFIED",
          reviewed_by: "reviewer",
          reviewed_at: "2026-10-31T10:00:00Z",
          notes: "All populated fields checked against the notice",
          reviewed_fields: ["hub:official_url"],
          evidence: { "hub:official_url": { evidence_ref: "PDF p.1", excerpt: "Official notice" } },
        },
      },
    };
    expect(isUnverifiedAggregatorSource("AGGREGATOR_DISCOVERED", "VERIFIED")).toBe(true);
    expect(isUnverifiedAggregatorSource(null, "VERIFIED", reviewedMetadata, undefined, "AGGREGATOR_DISCOVERED")).toBe(true);
    expect(isUnverifiedAggregatorSource("AGGREGATOR_DISCOVERED", "VERIFIED", reviewedMetadata, undefined, "MANUAL_VERIFIED")).toBe(false);
    const incompleteEvidence = {
      source_provenance: {
        ...reviewedMetadata.source_provenance,
        fact_review: {
          ...reviewedMetadata.source_provenance.fact_review,
          evidence: {},
        },
      },
    };
    expect(isUnverifiedAggregatorSource("AGGREGATOR_DISCOVERED", "VERIFIED", incompleteEvidence, undefined, "MANUAL_VERIFIED")).toBe(true);
  });

  it("hides aggregator education and experience unless their individual fact keys were reviewed", () => {
    const raw = {
      education: [{
        degree: "Relevant degree",
        source: "fja_post_inventory",
        verified_at: "2026-10-30T10:00:00Z",
        source_ref: "https://issuer.example/notice.pdf",
        source_locator: "PDF page 2, education section",
      }],
      experience: [{ total_years: 5 }],
      source_provenance: {
        fact_review: {
          reviewed_fields: ["post:Professor:education"],
        },
      },
    };

    const partial = transformEnrichment(raw, {
      sourceOrigin: "AGGREGATOR_DISCOVERED",
      postName: "Professor",
    });
    expect(partial.education).toHaveLength(1);
    expect(partial.experience).toHaveLength(0);

    const absent = transformEnrichment({
      education: raw.education,
      experience: raw.experience,
    }, {
      sourceOrigin: "AGGREGATOR_DISCOVERED",
      postName: "Professor",
    });
    expect(absent.education).toHaveLength(0);
    expect(absent.experience).toHaveLength(0);
  });

  it("hides legacy FJA child facts even when the parent recruitment source is not marked aggregator-discovered", () => {
    const unverified = transformEnrichment({
      education: [{
        degree: "Unverified degree",
        source: "fja_post_inventory",
        confidence_score: 60,
        verified_at: null,
      }],
      experience: [{
        type: "Unverified experience",
        source: "fja_post_inventory",
        confidence_score: 60,
        verified_at: null,
      }],
    }, {
      sourceOrigin: "ISSUER_CONTROLLED",
      postName: "Professor",
    });

    expect(unverified.education).toHaveLength(0);
    expect(unverified.experience).toHaveLength(0);

    const verified = transformEnrichment({
      education: [{
        degree: "Verified degree",
        source: "issuer_notification",
        confidence_score: 95,
        verified_at: "2026-10-30T10:00:00Z",
        source_ref: "https://issuer.example/notice.pdf",
        source_locator: "PDF page 2, education section",
      }],
      experience: [{
        type: "Verified experience",
        source: "issuer_notification",
        confidence_score: 95,
        verified_at: "2026-10-30T10:00:00Z",
        source_ref: "https://issuer.example/notice.pdf",
        source_locator: "PDF page 3, experience section",
      }],
    }, {
      sourceOrigin: "ISSUER_CONTROLLED",
      postName: "Professor",
    });

    expect(verified.education).toHaveLength(1);
    expect(verified.experience).toHaveLength(1);
  });

  it("hides other enrichment fact families until their matching review keys exist", () => {
    const partial = transformEnrichment({
      age_rules: { General: { max: 35 } },
      vacancies: { total: 5, categories: { General: 5 } },
      application_fees: { General: { amount: 100 } },
      documents: [{ name: "Degree certificate" }],
      selection_process: [{ name: "Interview" }],
      important_dates: [{ label: "Application closes", date: "2026-11-15" }],
      official_links: [{ type: "notification", url: "https://issuer.example/notice.pdf" }],
      source_provenance: {
        fact_review: { reviewed_fields: ["post:Professor:education"] },
      },
    }, {
      sourceOrigin: "AGGREGATOR_DISCOVERED",
      postName: "Professor",
    });

    expect(partial.ageRules).toHaveLength(0);
    expect(partial.vacancies).toHaveLength(0);
    expect(partial.applicationFees).toHaveLength(0);
    expect(partial.requiredDocuments).toHaveLength(0);
    expect(partial.selectionProcess).toHaveLength(0);
    expect(partial.importantDates).toHaveLength(0);
    expect(partial.officialLinks).toHaveLength(0);
  });

  it("does not downgrade records whose source was not aggregator-discovered", () => {
    expect(isUnverifiedAggregatorSource("ISSUER_CONTROLLED", "UNVERIFIABLE")).toBe(false);
    expect(isUnverifiedAggregatorSource(null, null)).toBe(false);
  });

  it("suppresses aggregator-derived leaf facts and indexing while verification is outstanding", () => {
    const route = readFileSync(
      "src/app/(default)/jobs/[recruitment-slug]/[post-slug]/page.tsx",
      "utf8",
    );

    expect(route).toContain("index: !unverifiedAggregator");
    expect(route).toContain("indexable={!unverifiedAggregator");
    expect(route).toContain("description: unverifiedAggregator");
    expect(route).toContain("officialSourceUrl: unverifiedAggregator ? null");
    expect(route).toContain("qualificationText: unverifiedAggregator ? null");
    expect(route).toContain("experienceText: unverifiedAggregator ? null");
    expect(route).toContain("educationRequirements: !unverifiedAggregator");
    expect(route).toContain("experienceRequirements: !unverifiedAggregator");
  });

  it("loads source authority and verification state from the canonical recruitment", () => {
    const query = readFileSync("src/db/operations/get-posts.ts", "utf8");
    expect(query).toContain('r.verification_status AS "recruitmentVerificationStatus"');
    expect(query).toContain('r.official_link_source AS "recruitmentOfficialLinkSource"');
    expect(query).toContain('r.source_discovery_origin AS "recruitmentSourceDiscoveryOrigin"');
    expect(query).toContain("sourceOrigin: data.recruitmentSourceDiscoveryOrigin ??");
    expect(query).toContain('data.recruitmentSourceDiscoveryOrigin == null && data.recruitmentOfficialLinkSource === "AGGREGATOR_DISCOVERED"');
    expect(query).toContain('r.metadata AS "recruitmentMetadata"');
    expect(query).toContain('post:${data.title}:${field}');
    const transformer = readFileSync("src/db/operations/enrichment-transformer.ts", "utf8");
    expect(transformer).toContain("const trustedFactSources = new Set");
    expect(transformer).not.toContain("'FJA_POST_INVENTORY'");
    expect(transformer).toContain("verifiedAt != null");
    expect(transformer).toContain("sourceRef");
    expect(transformer).toContain("sourceLocator");
    const recruitmentLoader = readFileSync("src/db/operations/get-recruitments.ts", "utf8");
    expect(recruitmentLoader).toContain('eq(eligibilities.status, "VERIFIED")');
    expect(recruitmentLoader).toContain("isNotNull(eligibilities.verifiedAt)");
    expect(recruitmentLoader).toContain("isNotNull(eligibilities.sourceRef)");
    expect(recruitmentLoader).toContain("isNotNull(eligibilities.sourceLocator)");
  });
  it("withholds unverified aggregator records from recruitment hubs and live discovery listings", () => {
    const hubRoute = readFileSync(
      "src/app/(default)/jobs/[recruitment-slug]/page.tsx",
      "utf8",
    );
    const hubComponent = readFileSync("src/components/recruitment/recruitment-hub.tsx", "utf8");
    const listingQueries = readFileSync("src/lib/queries.ts", "utf8");
    const recruitmentQueries = readFileSync("src/db/operations/get-recruitments.ts", "utf8");
    const sitemap = readFileSync("src/app/sitemap.ts", "utf8");
    const relatedQueries = readFileSync("src/db/operations/get-related-posts.ts", "utf8");
    const leafRoute = readFileSync("src/app/(default)/jobs/[recruitment-slug]/[post-slug]/page.tsx", "utf8");
    const leafComponent = readFileSync("src/components/job-posting/job-detail-page-production.tsx", "utf8");

    expect(hubRoute).toContain("publicHubInput(recruitment, posts)");
    expect(hubRoute).toContain('recruitment.sourceDiscoveryOrigin == null && recruitment.officialLinkSource === "AGGREGATOR_DISCOVERED"');
    expect(hubRoute).toContain("posts: []");
    expect(hubRoute).toContain("index: !safeInput.unverifiedAggregator");
    expect(hubRoute).toContain("hasPostReview(name, \"education\")");
    expect(hubRoute).toContain("hasPostReview(name, \"experience\")");
    expect(hubComponent).toContain("recruitment.sourceDiscoveryOrigin === 'AGGREGATOR_DISCOVERED' && verified");
    expect(hubComponent).toContain("isManuallyVerifiedOfficialLink(recruitment.officialLinkSource)");
    expect(hubComponent).toContain("Application link (not manually verified)");
    expect(hubComponent).toContain("A notification link is available, but it has not been manually verified");
    expect(hubComponent).toContain(") && !recruitment.applicationEndDate");
    expect(leafRoute).toContain('post.recruitmentSourceDiscoveryOrigin === "AGGREGATOR_DISCOVERED" && !post.recruitmentApplicationEndDate');
    expect(listingQueries).toContain("issuerSourcePublicCondition");
    expect(listingQueries).toContain("metadata -> 'source_provenance' -> 'fact_review'");
    expect(listingQueries).toContain("'AGGREGATOR_DISCOVERED'");
    expect(recruitmentQueries).toContain("'AGGREGATOR_DISCOVERED'");
    expect(recruitmentQueries).toContain("r.source_discovery_origin");
    expect(recruitmentQueries).toContain("COALESCE(r.source_discovery_origin, r.official_link_source, '') <> 'AGGREGATOR_DISCOVERED'");
    expect(recruitmentQueries).toContain("r.official_link_source = 'MANUAL_VERIFIED'");
    expect(relatedQueries).toContain("r.source_discovery_origin");
    expect(relatedQueries).toContain("r.official_link_source = 'MANUAL_VERIFIED'");
    expect(leafComponent).toContain("notificationLinkVerified && applicationLinkVerified");
    expect(leafComponent).toContain("isManuallyVerifiedOfficialLink(post.officialLinkSource)");
    expect(sitemap).toContain("COALESCE(r.source_discovery_origin, r.official_link_source, '') <> 'AGGREGATOR_DISCOVERED'");
    expect(sitemap).toContain("r.official_link_source = 'MANUAL_VERIFIED'");
    expect(sitemap).toContain("r.metadata -> 'source_provenance' -> 'fact_review' ->> 'status' = 'VERIFIED'");
  });

  it("requires a human issuer-source review before official-digest promotion", () => {
    const migration = readFileSync(
      "supabase/migrations/20261031120000_p0_official_digest_source_authority_gate.sql",
      "utf8",
    );

    expect(migration).toContain("authority_review_status text NOT NULL DEFAULT 'UNVERIFIED'");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS source_discovery_origin text");
    expect(migration).toContain("NEW.official_link_source := 'MANUAL_VERIFIED'");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS category varchar(100)");
    expect(migration).toContain("AGGREGATOR_DISCOVERED discovery origin is immutable");
    expect(migration).toContain("authority_evidence_url");
    expect(migration).toContain("authority_reviewed_by");
    expect(migration).toContain("authority_reviewed_at");
    expect(migration).toContain("authority_review_notes");
    expect(migration).toContain("fact_review_status text NOT NULL DEFAULT 'UNVERIFIED'");
    expect(migration).toContain("fact_reviewed_fields text[] NOT NULL DEFAULT '{}'");
    expect(migration).toContain("fact_review_evidence jsonb NOT NULL DEFAULT '{}'::jsonb");
    expect(migration).toContain("official_digest_fact_review_complete");
    expect(migration).toContain("jsonb_array_length(coalesce(p_posts, '[]'::jsonb)) > 0");
    expect(migration).toContain("guard_aggregator_eligibility_verification");
    expect(migration).toContain("HAVING count(*) > 1");
    expect(migration).toContain("source_discovery_origin, official_notification_url, metadata");
    expect(migration).toContain("official_digest_required_fact_keys");
    expect(migration).toContain("uq_official_digest_promote_batch_official_url");
    expect(migration).toContain("'staging_row', v_review.rownum");
    expect(migration).toContain("ALTER TABLE public.posts_experience");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS verified_at timestamp without time zone");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS source_ref text");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS source_locator text");
    expect(migration).toContain("'application_start_date'");
    expect(migration).toContain("'application_end_date'");
    expect(migration).toContain("'education'");
    expect(migration).toContain("'experience'");
    expect(migration).toContain("sync_promoted_digest_review_state");
    expect(migration).toContain("UPDATE public.eligibilities");
    expect(migration).toContain("source_locator = v_review.fact_review_evidence");
    expect(migration).toContain("source_provenance");
    expect(migration).toContain("preserve_post_source_provenance");
    expect(migration).toContain("'confidence_score', pe.confidence_score");
    expect(migration).toContain("'verified_at', pe.verified_at");
    expect(migration).toContain("'confidence_score', pex.confidence_score");
    expect(migration).toContain("'verified_at', pex.verified_at");
    expect(migration).toContain("'sourceVerificationStatus', 'UNVERIFIABLE'");
    expect(migration).toContain("OLD.enrichment ? 'sourceVerificationStatus'");
    expect(migration).toContain("UPDATE public.posts p");
    expect(migration).toContain("aggregate_enrichment_for_post");
    expect(migration).toContain("OLD.hub IS DISTINCT FROM NEW.hub OR OLD.posts IS DISTINCT FROM NEW.posts");
    expect(migration).not.toContain("SET official_link_source = 'UNVERIFIED'");
    expect(migration).toContain("sync_promoted_digest_review_state");
    expect(migration).toContain("'evidence_ref'");
    expect(migration).toContain("'excerpt'");
    expect(migration).toContain("Official-digest promotion blocked");
    expect(migration).toContain("verification_status = 'UNVERIFIABLE'");
    expect(migration).toContain("'aggregator_extracted'");
    expect(migration).toContain('"sourceVerificationStatus" := \'UNVERIFIABLE\'');
  });
  
  it("keeps source verification independent from application deadline availability", () => {
    const recruitmentQueries = readFileSync("src/db/operations/get-recruitments.ts", "utf8");
    const postQueries = readFileSync("src/db/operations/get-posts.ts", "utf8");
    expect(recruitmentQueries).not.toContain("AND r.application_end_date IS NOT NULL");
    expect(postQueries).not.toContain("AND r.application_end_date IS NOT NULL");
    expect(recruitmentQueries).toContain("r.metadata -> 'source_provenance' -> 'fact_review' ->> 'status' = 'VERIFIED'");
    expect(postQueries).toContain("r.metadata -> 'source_provenance' -> 'fact_review' ->> 'status' = 'VERIFIED'");
  });

  it("backfills and verifies all aggregator extraction origins", () => {
    const migration = readFileSync(
      "supabase/migrations/20261031120000_p0_official_digest_source_authority_gate.sql",
      "utf8",
    );
    const postCheck = readFileSync(
      "scripts/audits/official-source-provenance-post-migration-check.sql",
      "utf8",
    );
    expect(migration).toContain("enrichment_data->'meta'->>'source' IN (");
    expect(migration).toContain("'institutional_aggregation'");
    expect(migration).toContain("'institution_aggregation'");
    expect(migration).toContain("'fja_html'");
    expect(migration).toContain("'notification_date',\n      'application_start_date',\n      'application_end_date'");
    expect(migration).toContain("NEW.enrichment_data->'meta'->>'source' IN (");
    expect(migration).toContain("official_notification_url, metadata, enrichment_data");
    expect(postCheck).toContain("aggregator_extraction_without_discovery_origin");
    expect(postCheck).toContain("uppsc_contamination_without_discovery_origin");
  });

});
