/**
 * Load a captured FreeJobAlert dataset through the real ingestion path and
 * measure what happened (WP-001 dry run). Local scratch database only.
 *
 *   DATABASE_URL=postgres://...@localhost:.../scratch \
 *   npx tsx src/ingest/load-file.ts --file fja_listings.jsonl --out report.json [--open-only] [--twice] [--probe]
 *
 * Nothing here publishes: rows land PENDING. The report lists what promotion
 * WOULD publish under the conservative rule; it does not apply it.
 */
import { writeFileSync } from "node:fs";
import { assertScratchDatabase } from "../scripts/wp001-guard";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

async function counts(db: any) {
  const { sql } = await import("drizzle-orm");
  const q = async (t: string) => Number((await db.execute(sql.raw(`select count(*)::int n from public.${t}`)))[0].n);
  return {
    organizations: await q("organizations"),
    recruitments: await q("recruitments"),
    posts: await q("posts"),
    vacancies: await q("vacancies"),
    postings: await q("postings"),
    source_observations: await q("source_observations"),
    organization_candidates: await q("organization_candidates"),
    organization_aliases: await q("organization_aliases"),
  };
}

function tally<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const o: Record<string, number> = {};
  for (const it of items) o[key(it)] = (o[key(it)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]));
}

async function main() {
  assertScratchDatabase();
  const { sql } = await import("drizzle-orm");
  const file = arg("file");
  if (!file) throw new Error("--file is required");
  const out = arg("out") ?? "wp001-dry-run-report.json";

  const { getDb } = await import("../db");
  const { loadFjaFile } = await import("./adapters/freejobalert-file");
  const { processRaw } = await import("./pipeline");
  const { inferOrg } = await import("./adapters/util");
  const { orgNameVerdict, normalizeOrgName } = await import("./organization-resolution");
  const { promotePending, isOfficialStyleUrl, postCountMismatchFromFacts } = await import("./promotion");
  const { organizations, postings, organizationCandidates } = await import("../db/schema");
  const { eq } = await import("drizzle-orm");
  const { evaluateJobPostingEligibility } = await import("../lib/content-quality/gate");

  const db = getDb();
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  let { postings: raw, stats } = loadFjaFile(file);
  const isOpen = (p: { validThrough?: Date }) => !!p.validThrough && p.validThrough.getTime() >= todayUtc;
  if (flag("open-only")) raw = raw.filter(isOpen);

  const before = await counts(db);
  const orgRowsBefore = await db.select().from(organizations);
  const existingSlugs = new Set(orgRowsBefore.map((o: any) => o.slug));

  const run = await processRaw(raw, { runId: `wp001-dry-${today.toISOString()}` });
  const w = run.write;
  const after = await counts(db);

  const candidateRows = await db.select().from(organizationCandidates);
  let second: any = null;
  if (flag("twice")) {
    const again = await processRaw(raw, { runId: `wp001-dry-again-${today.toISOString()}` });
    const a = again.write;
    second = { inserted: a.inserted, updated: a.updated, flagged: a.flagged, unchanged: a.unchanged, held: a.heldCandidates, rejected: a.rejected, countsAfterSecondRun: await counts(db) };
  }

  const byKey = new Map(w.results.map((r) => [r.externalId, r]));
  const loaded = w.results.filter((r) => ["inserted", "updated", "flagged", "unchanged"].includes(r.action));

  // ---- Organization ----
  const orgKinds = tally(w.results, (r) => r.orgResolution ?? "n/a");
  const legacy = raw.map((p) => {
    const name = inferOrg(p.title).organizationName;
    const verdict = orgNameVerdict(name);
    const legacySlugNew = !existingSlugs.has(
      name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 160),
    );
    return { name, ok: verdict.ok, reason: verdict.reason, wouldCreateNew: legacySlugNew };
  });
  const legacyBad = legacy.filter((l) => !l.ok);
  const legacyNew = legacy.filter((l) => l.wouldCreateNew);

  // ---- Posts / vacancies ----
  const withTable = raw.filter((p) => (p.postTable?.length ?? 0) > 0);
  const multiPost = raw.filter((p) => (p.postTable?.length ?? 0) >= 2);
  const mismatches = raw.filter((p) => postCountMismatchFromFacts({ stated: p.observationFacts }, p.totalVacancies ?? null));
  const postsExtracted = loaded.reduce((a, r) => a + (raw.find((p) => p.externalId === r.externalId)?.postTable?.length ?? 0), 0);

  // ---- Dates ----
  const dated = raw.filter((p) => p.validThrough);
  const startAfterEnd = raw.filter((p) => p.applicationStartDate && p.validThrough && p.applicationStartDate > p.validThrough);

  // ---- Provenance ----
  const linkClass = (p: any) => (!p.officialNotificationUrl ? "none" : isOfficialStyleUrl(p.officialNotificationUrl) ? "official-style" : "other-domain");

  // ---- Promotion (evaluate only) ----
  const promo = await promotePending(db, { apply: false, now: today });

  // ---- Examples of the post/vacancy structure problem ----
  const examples = multiPost
    .sort((a, b) => (b.postTable?.length ?? 0) - (a.postTable?.length ?? 0))
    .slice(0, 5)
    .map((p) => ({
      externalId: p.externalId,
      title: p.title.slice(0, 90),
      organization: p.organizationName,
      statedTotal: p.totalVacancies ?? null,
      postsInSourceTable: p.postTable!.length,
      postsStoredAsPostRows: byKey.get(p.externalId)?.action ? 1 : 0,
      tableSum: p.postTable!.reduce((a, r) => a + (r.vacancies ?? 0), 0),
    }));

  const publishedByIngestion = Number((await db.execute(sql`select count(*)::int n from public.postings where review_status = 'APPROVED' and ingested_at >= ${today.toISOString()}::timestamptz`))[0].n);
  const tiers = await db.execute(sql`select index_tier t, count(*)::int n from public.postings group by 1 order by 1`);
  const missingTop = await db.execute(sql`select m, count(*)::int n from public.postings, jsonb_array_elements_text(quality_missing) m group by 1 order by 2 desc`);

  // ---- Probe (scratch): what the public product would show after promotion ----
  let probe: any = null;
  if (flag("probe")) {
    const n = async (q: string) => Number((await db.execute(sql.raw(q)))[0].n);
    const listingFilter = "review_status = 'APPROVED' AND is_expired IS NOT TRUE"; // src/lib/queries.ts listPostings (/jobs, home)
    const oldListingFilter = "review_status = 'APPROVED'"; // listing before the WP-001 R8 fix; still used by job pages and organization pages
    const searchFilter = "review_status = 'APPROVED' AND publishing_status IN ('AUTOMATED_VALIDATION_PASS','PUBLISHED') AND is_expired = FALSE"; // src/lib/search-queries.ts
    const beforePromo = {
      listingVisible: await n(`select count(*)::int n from public.postings where ${listingFilter}`),
      searchVisible: await n(`select count(*)::int n from public.postings where ${searchFilter}`),
    };
    const promoApplied = await promotePending(db, { apply: true, now: today });
    const afterPromo = {
      listingVisible: await n(`select count(*)::int n from public.postings where ${listingFilter}`),
      searchVisible: await n(`select count(*)::int n from public.postings where ${searchFilter}`),
      sitemapTierA: await n(`select count(*)::int n from public.postings where review_status='APPROVED' and index_tier='A'`),
      organizationsWithPublicPosting: await n(`select count(distinct organization_id)::int n from public.postings where ${listingFilter}`),
      promotedWithPastLastDate: await n(`select count(*)::int n from public.postings where review_status='APPROVED' and valid_through < now()::date`),
    };
    // SEO-001 freeze (G1, G3): how many promoted/public pages are JobPosting eligible, and why not.
    const pubRows = await db.select({ p: postings, o: organizations }).from(postings).innerJoin(organizations, eq(postings.organizationId, organizations.id)).where(eq(postings.reviewStatus, "APPROVED"));
    const reasonCounts: Record<string, number> = {};
    let eligible = 0;
    for (const { p, o } of pubRows) {
      const r = evaluateJobPostingEligibility(p as never, o);
      if (r.eligible) eligible++;
      for (const why of r.reasons) reasonCounts[why] = (reasonCounts[why] ?? 0) + 1;
    }
    const jobPostingEligibility = { publicPages: pubRows.length, jobPostingEligible: eligible, ineligibleReasons: reasonCounts };
    const lifecycle = (await db.execute(sql.raw("select * from refresh_recruitment_lifecycle()")))[0];
    const afterLifecycle = {
      expiredPostings: await n(`select count(*)::int n from public.postings where is_expired = true`),
      listingVisible: await n(`select count(*)::int n from public.postings where ${listingFilter}`),
      listingVisibleButExpiredBeforeFix: await n(`select count(*)::int n from public.postings where ${oldListingFilter} and is_expired = true`),
      searchVisible: await n(`select count(*)::int n from public.postings where ${searchFilter}`),
      recruitmentsWithApplicationEndDate: await n(`select count(*)::int n from public.recruitments where application_end_date is not null`),
      recruitmentsTotal: await n(`select count(*)::int n from public.recruitments`),
    };
    // Time travel (scratch): move every promoted last date 60 days into the past and run the lifecycle job.
    await db.execute(sql.raw("update public.postings set valid_through = valid_through - interval '60 days' where review_status = 'APPROVED'"));
    const lifecycle2 = (await db.execute(sql.raw("select * from refresh_recruitment_lifecycle()")))[0];
    const afterTimeTravel = {
      lifecycleFunctionResult: lifecycle2,
      expiredPostings: await n(`select count(*)::int n from public.postings where is_expired = true`),
      listingVisible: await n(`select count(*)::int n from public.postings where ${listingFilter}`),
      listingVisibleButExpiredBeforeFix: await n(`select count(*)::int n from public.postings where ${oldListingFilter} and is_expired = true`),
      searchVisible: await n(`select count(*)::int n from public.postings where ${searchFilter}`),
    };
    probe = {
      afterTimeTravel,
      simulatedResolvedOrganizations: Number((await db.execute(sql.raw("select count(*)::int n from public.organization_aliases where source = 'simulation'")))[0].n),
      listingPageSize: 50,
      beforePromo,
      promoted: promoApplied.promoted,
      afterPromo,
      jobPostingEligibility,
      lifecycleFunctionResult: lifecycle,
      afterLifecycle,
    };
  }

  const report = {
    generatedAt: today.toISOString(),
    input: { file: file.split("/").pop(), ...stats, processed: raw.length, openOnly: flag("open-only"), open: raw.filter(isOpen).length },
    coverage: {
      loadedAsPending: loaded.length,
      inserted: w.inserted,
      updatedExisting: w.updated,
      flaggedExistingReviewed: w.flagged,
      unchangedExisting: w.unchanged,
      heldAsOrganizationCandidates: w.heldCandidates,
      rejected: w.rejected,
      rejectedReasons: tally(w.results.filter((r) => r.action === "rejected"), (r) => r.reason ?? "?"),
      skipped: w.skipped,
      publishedByIngestion,
      publishableUnderPromotionRule: promo.eligible,
    },
    organization: {
      resolution: orgKinds,
      existingAmbiguous: w.results.filter((r) => r.orgAmbiguous).length,
      candidateNotices: w.heldCandidates,
      distinctCandidateNames: candidateRows.length,
      candidateReasons: tally(candidateRows, (c: any) => c.reason),
      candidateCoverage: (() => {
        const counts = candidateRows.map((c: any) => c.observationCount as number).sort((a: number, b: number) => b - a);
        const top = (k: number) => counts.slice(0, k).reduce((a: number, b: number) => a + b, 0);
        return { top10: top(10), top25: top(25), top100: top(100), top200: top(200), namesWithTwoOrMoreNotices: counts.filter((c: number) => c >= 2).length, singletons: counts.filter((c: number) => c === 1).length };
      })(),
      candidatesWithProposedOrg: candidateRows.filter((c: any) => c.proposedOrganizationId != null).length,
      newlyEstablishedCanonicalOrganizations: after.organizations - before.organizations,
      legacyWouldCreateNewOrgRows: legacyNew.length,
      legacyBadNamesPrevented: legacyBad.length,
      legacyBadReasons: tally(legacyBad, (l) => l.reason ?? "?"),
    },
    recruitment: {
      newRecruitmentRows: after.recruitments - before.recruitments,
      identifiedForLoaded: loaded.length,
      unresolved: w.heldCandidates + w.rejected,
      recruitmentOrganizationDiffersFromResolved: w.results.filter((r) => r.recruitmentOrgMismatch).length,
      withAdvertisementNumber: raw.filter((p) => p.advertisementNumber).length,
    },
    postsAndVacancies: {
      noticesWithVacancyCount: raw.filter((p) => p.totalVacancies).length,
      noticesWithPostTable: withTable.length,
      noticesWithMultiplePosts: multiPost.length,
      postsInSourceTablesForLoaded: postsExtracted,
      postRowsCreated: after.posts - before.posts,
      vacancyRowsCreated: after.vacancies - before.vacancies,
      postTableSumDisagreesWithTotal: mismatches.length,
      vacanciesButNoPostTable: raw.filter((p) => p.totalVacancies && !(p.postTable?.length)).length,
      examples,
    },
    dates: {
      withLastDate: dated.length,
      missingLastDate: raw.length - dated.length,
      withStartDate: raw.filter((p) => p.applicationStartDate).length,
      startAfterEnd: startAfterEnd.length,
      openAtRunDate: raw.filter(isOpen).length,
      closedAtRunDate: dated.length - raw.filter(isOpen).length,
      existingPostingsWithChangedMaterialField: w.results.filter((r) => (r.changedFields?.length ?? 0) > 0).length,
      existingReviewedPostingsFlagged: w.flagged,
      filledMissingFieldsOnExisting: w.results.filter((r) => (r.filledFields?.length ?? 0) > 0).length,
    },
    provenance: {
      notificationLink: tally(raw, linkClass),
      noticesWithApplyLink: raw.filter((p) => p.applyUrl).length,
      noticesWithIssuerWebsite: raw.filter((p) => p.websiteUrl).length,
      observationsRecorded: after.source_observations - before.source_observations,
      observationsNew: w.results.filter((r) => r.observationIsNew).length,
    },
    quality: {
      indexTiers: Object.fromEntries((tiers as any[]).map((r) => [r.t, r.n])),
      missingFieldsForIndexing: Object.fromEntries((missingTop as any[]).map((r) => [r.m, r.n])),
      requiringReview: loaded.length,
      heldOrRejected: w.heldCandidates + w.rejected,
      promotionFailReasons: promo.failedReasons,
      promotionConsidered: promo.considered,
    },
    countsBefore: before,
    countsAfter: after,
    secondRun: second,
    probe,
  };
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ coverage: report.coverage, organization: report.organization, secondRun: second, probe }, null, 1));
  console.log(`report: ${out}`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
