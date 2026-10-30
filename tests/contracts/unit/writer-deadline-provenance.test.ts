import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  loadExamSlugs: vi.fn(),
  resolveRecruitment: vi.fn(),
  resolvePostLines: vi.fn(),
  resolvePost: vi.fn(),
  postLineSlug: vi.fn(),
  truncateForColumn: vi.fn(),
  normalizeAdvertisementNumber: vi.fn(),
  refreshRecruitmentDates: vi.fn(),
  evaluateContentQuality: vi.fn(),
  publicLink: vi.fn(),
  sanitizeForStorage: vi.fn(),
  loadOrgIndex: vi.fn(),
  resolveOrganization: vi.fn(),
  createUnverifiedOrganization: vi.fn(),
  normalizeIdentityTitle: vi.fn(),
  normalizeIdentityUrl: vi.fn(),
  inferStage: vi.fn(),
  slugify: vi.fn(),
}));

vi.mock("../../../src/db/index", () => ({ getDb: mocks.getDb }));
vi.mock("../../../src/ingest/exam-linker", () => ({ loadExamSlugs: mocks.loadExamSlugs }));
vi.mock("../../../src/ingest/resolve", () => ({
  resolveRecruitment: mocks.resolveRecruitment,
  resolvePostLines: mocks.resolvePostLines,
  resolvePost: mocks.resolvePost,
  postLineSlug: mocks.postLineSlug,
  truncateForColumn: mocks.truncateForColumn,
  normalizeAdvertisementNumber: mocks.normalizeAdvertisementNumber,
  refreshRecruitmentDates: mocks.refreshRecruitmentDates,
}));
vi.mock("../../../src/lib/content-quality/gate", () => ({ evaluateContentQuality: mocks.evaluateContentQuality }));
vi.mock("../../../src/lib/aggregators", () => ({ publicLink: mocks.publicLink }));
vi.mock("../../../src/ingest/enrich-facts", () => ({ sanitizeForStorage: mocks.sanitizeForStorage }));
vi.mock("../../../src/ingest/organization-resolution", () => ({
  loadOrgIndex: mocks.loadOrgIndex,
  resolveOrganization: mocks.resolveOrganization,
}));
vi.mock("../../../src/db/operations/ensure-organization", () => ({
  createUnverifiedOrganization: mocks.createUnverifiedOrganization,
}));
vi.mock("../../../src/ingest/duplicate-identity", () => ({
  normalizeIdentityTitle: mocks.normalizeIdentityTitle,
  normalizeIdentityUrl: mocks.normalizeIdentityUrl,
}));
vi.mock("../../../src/ingest/normalize", () => ({
  inferStage: mocks.inferStage,
  slugify: mocks.slugify,
}));

import { writePostingsToDB } from "../../../src/db/operations/write-postings-v2";
import { postings, sourceDocuments, sourceObservations } from "../../../src/db/schema";

type InsertWrite = { table: unknown; values: Record<string, unknown> };

function setupWriter(authority: "AGGREGATED" | "OFFICIAL", isOfficial: boolean) {
  const organization = { id: 7, name: "Example Department", slug: "example-department" };
  const source = { id: 9, authority, isOfficial };
  const insertWrites: InsertWrite[] = [];
  const outcomeWrites: Record<string, unknown>[] = [];

  const db = {
    query: {
      sourceObservations: { findFirst: vi.fn().mockResolvedValue(null) },
      postings: { findFirst: vi.fn().mockResolvedValue(null) },
      sources: { findFirst: vi.fn().mockResolvedValue(source) },
      sourceDocuments: { findFirst: vi.fn().mockResolvedValue(null) },
      recruitments: { findFirst: vi.fn().mockResolvedValue(null) },
    },
    insert: vi.fn((table: unknown) => {
      const builder: Record<string, any> = {
        values: vi.fn((values: Record<string, unknown>) => {
          insertWrites.push({ table, values });
          return builder;
        }),
        onConflictDoNothing: vi.fn(() => builder),
        returning: vi.fn(async () => [{
          id: table === sourceObservations ? 101 : table === sourceDocuments ? 202 : 303,
        }]),
      };
      return builder;
    }),
    update: vi.fn(() => {
      const builder: Record<string, any> = {
        set: vi.fn((values: Record<string, unknown>) => {
          outcomeWrites.push(values);
          return builder;
        }),
        where: vi.fn(async () => undefined),
      };
      return builder;
    }),
    execute: vi.fn(async () => undefined),
  };

  mocks.getDb.mockReturnValue(db);
  mocks.loadExamSlugs.mockResolvedValue(new Map());
  mocks.loadOrgIndex.mockResolvedValue({});
  mocks.resolveOrganization.mockReturnValue({
    kind: "EXISTING",
    organization,
    matchedOn: "exact",
  });
  mocks.resolveRecruitment.mockResolvedValue({ id: 42, created: true });
  mocks.resolvePostLines.mockResolvedValue({ singlePostId: 55 });
  mocks.resolvePost.mockResolvedValue({ id: 55 });
  mocks.postLineSlug.mockReturnValue("assistant");
  mocks.truncateForColumn.mockImplementation((value: string) => value);
  mocks.normalizeAdvertisementNumber.mockReturnValue(null);
  mocks.refreshRecruitmentDates.mockResolvedValue({ filledStart: false, extendedEnd: false });
  mocks.evaluateContentQuality.mockReturnValue({ tier: "INDEX", missing: [] });
  mocks.publicLink.mockImplementation((value: unknown) => value);
  mocks.sanitizeForStorage.mockImplementation((value: unknown) => ({ clean: value, rejectReason: null }));
  mocks.normalizeIdentityTitle.mockReturnValue("assistant");
  mocks.normalizeIdentityUrl.mockReturnValue(null);
  mocks.inferStage.mockReturnValue("APPLICATIONS_OPEN");
  mocks.slugify.mockReturnValue("example-department");

  return { db, insertWrites, outcomeWrites };
}

function normalizedDeadline(values: {
  validThrough: Date | null;
  precision: "DATE_ONLY" | "DATE_TIME" | "UNKNOWN";
  sourceText: string;
  timezone: string | null;
  timezoneBasis: "EXPLICIT_SOURCE" | "INDIA_SOURCE_DEFAULT" | "UNKNOWN";
}) {
  return {
    externalId: "fja-job-001",
    title: "Assistant Recruitment 2026",
    description: "Official recruitment notice details.",
    eligibility: "Graduation",
    organizationName: "Example Department",
    validThrough: values.validThrough,
    validThroughPrecision: values.precision,
    validThroughSourceText: values.sourceText,
    validThroughTimezone: values.timezone,
    validThroughTimezoneBasis: values.timezoneBasis,
    validThroughSourceLabel: "Last date to apply",
    officialNotificationUrl: null,
    applyUrl: null,
    websiteUrl: null,
    sourceUrl: "https://www.freejobalert.com/example/",
    slug: "assistant-recruitment-2026",
    postNames: ["Assistant"],
    observationLinks: [{ rel: "captured-from", url: "https://www.freejobalert.com/example/" }],
    observationRaw: { capturedDeadline: values.sourceText },
    observedAt: new Date("2026-10-30T10:00:00.000Z"),
    totalVacancies: 12,
    applicationStartDate: null,
    examDate: null,
    examSlug: null,
    advertisementNumber: null,
    kind: "GOVERNMENT_JOB",
    datePosted: new Date("2026-10-01T00:00:00.000Z"),
    locationCountry: "India",
    salaryCurrency: "INR",
    salaryPeriod: "MONTH",
  };
}

function dedupedInput() {
  return {
    primary: { confidence: 90 },
    sources: [{ portal: "freejobalert" }],
  };
}

describe("writePostingsToDB deadline provenance integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores aggregator deadline evidence and links its observation without writing canonical deadlines", async () => {
    const { insertWrites, outcomeWrites } = setupWriter("AGGREGATED", false);
    const norm = normalizedDeadline({
      validThrough: null,
      precision: "UNKNOWN",
      sourceText: "07 September 2026 at 10:00 PM",
      timezone: null,
      timezoneBasis: "UNKNOWN",
    });

    const result = await writePostingsToDB([dedupedInput()] as never, [norm] as never, { runId: "test-run" });

    const observation = insertWrites.find((write) => write.table === sourceObservations)?.values;
    const posting = insertWrites.find((write) => write.table === postings)?.values;
    expect(result.inserted).toBe(1);
    expect(observation?.facts).toMatchObject({
      lastDate: null,
      deadlinePrecision: "UNKNOWN",
      deadlineSourceText: "07 September 2026 at 10:00 PM",
      deadlineTimezone: null,
      deadlineTimezoneBasis: "UNKNOWN",
    });
    expect(observation?.links).toEqual(norm.observationLinks);
    expect(mocks.resolveRecruitment).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      applicationEndDate: null,
    }));
    expect(mocks.refreshRecruitmentDates).toHaveBeenCalledWith(expect.anything(), 42, expect.objectContaining({
      applicationEndDate: null,
    }));
    expect(posting?.validThrough).toBeNull();
    expect(posting?.inferredRecruitmentId).toBe(42);
    expect(outcomeWrites).toContainEqual(expect.objectContaining({
      outcome: "LOADED",
      postingId: 303,
    }));
  });

  it("writes an eligible official deadline and retains matching observation provenance", async () => {
    const { insertWrites } = setupWriter("OFFICIAL", true);
    const deadline = new Date("2026-11-30T18:29:59.999Z");
    const norm = normalizedDeadline({
      validThrough: deadline,
      precision: "DATE_ONLY",
      sourceText: "30 November 2026",
      timezone: "Asia/Kolkata",
      timezoneBasis: "INDIA_SOURCE_DEFAULT",
    });

    const result = await writePostingsToDB([dedupedInput()] as never, [norm] as never);

    const observation = insertWrites.find((write) => write.table === sourceObservations)?.values;
    const posting = insertWrites.find((write) => write.table === postings)?.values;
    expect(result.inserted).toBe(1);
    expect(mocks.resolveRecruitment).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      applicationEndDate: deadline,
    }));
    expect(mocks.refreshRecruitmentDates).toHaveBeenCalledWith(expect.anything(), 42, expect.objectContaining({
      applicationEndDate: null,
      deadlineEvidence: null,
    }));
    expect(posting?.validThrough).toBe(deadline);
    expect(observation?.facts).toMatchObject({
      lastDate: deadline.toISOString(),
      deadlinePrecision: "DATE_ONLY",
      deadlineSourceText: "30 November 2026",
      deadlineTimezone: "Asia/Kolkata",
      deadlineTimezoneBasis: "INDIA_SOURCE_DEFAULT",
    });
  });

  it("persists a review-required outcome when an existing official deadline cannot be reconciled", async () => {
    const { outcomeWrites } = setupWriter("OFFICIAL", true);
    const reason = "DEADLINE_REVIEW_REQUIRED:EXISTING_DEADLINE_EVIDENCE_NOT_FOUND";
    mocks.resolveRecruitment.mockResolvedValue({ id: 42, created: false });
    mocks.refreshRecruitmentDates.mockResolvedValue({
      filledStart: false,
      extendedEnd: false,
      deadlineReviewReason: reason,
    });
    const deadline = new Date("2026-11-30T18:30:00.000Z");
    const norm = normalizedDeadline({
      validThrough: deadline,
      precision: "DATE_ONLY",
      sourceText: "30 November 2026",
      timezone: "Asia/Kolkata",
      timezoneBasis: "INDIA_SOURCE_DEFAULT",
    });

    const result = await writePostingsToDB([dedupedInput()] as never, [norm] as never);

    expect(result.results[0]).toMatchObject({
      deadlineReviewRequired: true,
      deadlineReviewReason: reason,
    });
    expect(outcomeWrites).toContainEqual(expect.objectContaining({
      outcome: "LOADED",
      outcomeReason: reason,
      postingId: 303,
    }));
  });

});
