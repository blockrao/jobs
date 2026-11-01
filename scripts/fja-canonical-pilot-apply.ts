import { readFile, writeFile } from "node:fs/promises";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../src/db";
import { fjaJobInventory, fjaSourceCaptures, notificationUrlChecks, posts, recruitments, sourceObservations } from "../src/db/schema";
import { resolvePostLines, resolveRecruitment, type RecruitmentIdentity } from "../src/ingest/resolve";
import { normalizePostName } from "../src/ingest/post-lines";
import { checkOfficialNotificationUrl } from "../src/ingest/fja/notification-url-check";

type JsonRecord = Record<string, unknown>;
type ReadyRecord = {
  externalId: string;
  sourceUrl: string;
  title: string;
  contentHash: string;
  organization: string;
  organizationId: number;
  recruitmentName: string;
  postLines: Array<{ name: string; vacancies: number | null }>;
  advertisementNumber: string | null;
  notificationUrl: string;
  notificationAnchorText: string;
  approvedHosts: string[];
  hostEvidence: JsonRecord;
  lifecycleCandidate: string;
};
const db = getDb();
const runId = process.env.FJA_SOURCE_RUN_ID ?? "";
const baseUrl = (process.env.JOBOYE_BASE_URL ?? "https://www.joboye.com").replace(/\\/$/, "");
const confirmWrite = process.env.FJA_CANONICAL_CONFIRM_LIVE_WRITE === "1";
const reportPath = "fja-canonical-pilot-dry-run.json";
const outputPath = "fja-canonical-pilot-live.json";

async function verifyPages(paths: string[]) {
  const secret = process.env.REVALIDATION_SECRET;
  if (!secret) throw new Error("REVALIDATION_SECRET is required before live writes.");
  const results: Array<{ path: string; url: string; status: number; verified: boolean; reason: string | null }> = [];
  for (const routePath of paths) {
    const revalidated = await fetch(baseUrl + "/api/revalidate", {
      method: "POST",
      headers: { authorization: "Bearer " + secret, "content-type": "application/json" },
      body: JSON.stringify({ path: routePath }),
    });
    if (!revalidated.ok) {
      results.push({ path: routePath, url: baseUrl + routePath, status: revalidated.status, verified: false, reason: "ON_DEMAND_REVALIDATION_FAILED" });
      continue;
    }
    const url = baseUrl + routePath;
    const response = await fetch(url, { redirect: "follow", headers: { "user-agent": "JobOye-FJA-Pilot-Verification/1.0" } });
    const html = await response.text();
    let reason: string | null = null;
    if (response.status !== 200) reason = "PUBLIC_HTTP_" + response.status;
    else if (/freejobalert\\.com/i.test(html)) reason = "FJA_SOURCE_URL_LEAKED_IN_PUBLIC_HTML";
    else {
      const canonical = html.match(/<link\\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
        ?? html.match(/<link\\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
      if (!canonical || canonical[1] !== url) reason = "CANONICAL_TAG_MISSING_OR_MISMATCHED";
      else if (/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) reason = "PUBLIC_PAGE_IS_NOINDEX";
    }
    results.push({ path: routePath, url, status: response.status, verified: reason === null, reason });
  }
  const sitemapUrl = baseUrl + "/sitemap.xml";
  const sitemapResponse = await fetch(sitemapUrl, { headers: { "user-agent": "JobOye-FJA-Pilot-Verification/1.0" } });
  const sitemapText = await sitemapResponse.text();
  const missingFromSitemap = paths.filter((routePath) => !sitemapText.includes(baseUrl + routePath));
  results.push({
    path: "/sitemap.xml",
    url: sitemapUrl,
    status: sitemapResponse.status,
    verified: sitemapResponse.status === 200 && missingFromSitemap.length === 0,
    reason: sitemapResponse.status !== 200
      ? "SITEMAP_HTTP_" + sitemapResponse.status
      : missingFromSitemap.length ? "CANONICAL_URLS_MISSING_FROM_SITEMAP: " + missingFromSitemap.join(", ") : null,
  });
  return results;
}

async function main() {
  if (!confirmWrite) throw new Error("Refusing production canonical writes without FJA_CANONICAL_CONFIRM_LIVE_WRITE=1.");
  if (!runId) throw new Error("FJA_SOURCE_RUN_ID is required.");
  if (!process.env.REVALIDATION_SECRET) throw new Error("REVALIDATION_SECRET is required before live writes.");

  const report = JSON.parse(await readFile(reportPath, "utf8")) as {
    mode: string;
    sourceRunId: string;
    externalIds: string[];
    records: Array<JsonRecord>;
  };
  if (report.mode !== "dry-run-only" || report.sourceRunId !== runId) throw new Error("Pilot report does not match this source run.");
  const ready = report.records.filter((r) => r.verdict === "READY_FOR_PILOT") as unknown as ReadyRecord[];
  if (ready.length < 5 || ready.length > 10) throw new Error("The live pilot requires 5–10 eligible records; this dry-run produced " + ready.length + ". No canonical writes were made.");

  const written: Array<{ externalId: string; recruitmentSlug: string; recruitmentId: number; hubUrl: string; leafUrls: string[] }> = [];
  const failed: Array<{ externalId: string; reason: string }> = [];

  for (const item of ready) {
    try {
      const inventory = await db.query.fjaJobInventory.findFirst({
        where: and(eq(fjaJobInventory.sourceSlug, "freejobalert"), eq(fjaJobInventory.externalId, item.externalId)),
      });
      if (!inventory || inventory.contentHash !== item.contentHash) throw new Error("STAGED_SOURCE_RECORD_MISSING_OR_CHANGED");
      const capture = await db.query.fjaSourceCaptures.findFirst({
        where: and(eq(fjaSourceCaptures.sourceSlug, "freejobalert"), eq(fjaSourceCaptures.externalId, item.externalId)),
      });
      if (!capture) throw new Error("PRIVATE_HTML_CAPTURE_MISSING");

      const check = await checkOfficialNotificationUrl(item.notificationUrl, { approvedHosts: item.approvedHosts });
      if (!check.ok) throw new Error(check.reason ?? "NOTIFICATION_HEAD_CHECK_FAILED");

      const identity: RecruitmentIdentity = {
        organizationId: item.organizationId,
        examId: null,
        year: Number(item.recruitmentName.match(/\\b(20\\d{2})\\b/)?.[1] ?? 0) || null,
        officialNotificationNumber: item.advertisementNumber,
        title: item.recruitmentName,
        applicationStartDate: null,
        applicationEndDate: null,
      };
      if (!identity.year) throw new Error("RECRUITMENT_YEAR_MISSING");

      const result = await db.transaction(async (tx) => {
        const resolverDb = tx as unknown as Parameters<typeof resolveRecruitment>[0];
        const resolvedRecruitment = await resolveRecruitment(resolverDb, identity);
        const existing = await tx.query.recruitments.findFirst({ where: eq(recruitments.id, resolvedRecruitment.id) });
        if (!existing) throw new Error("RECRUITMENT_RESOLUTION_FAILED");
        if (existing.officialNotificationUrl && existing.officialNotificationUrl !== item.notificationUrl) {
          throw new Error("EXISTING_NOTIFICATION_URL_CONFLICT");
        }

        await resolvePostLines(
          resolverDb,
          resolvedRecruitment.id,
          item.postLines.map((line) => ({ name: line.name, vacancies: line.vacancies })),
          { countOptional: true },
        );
        const allPosts = await tx.query.posts.findMany({ where: eq(posts.recruitmentId, resolvedRecruitment.id) });
        const matchedPosts = item.postLines.flatMap((line) => {
          const match = allPosts.find((post) => normalizePostName(post.name) === normalizePostName(line.name));
          return match ? [match] : [];
        });
        if (matchedPosts.length !== item.postLines.length) throw new Error("RECRUITMENT_MUST_HAVE_EVERY_POST_LEAF");

        const total = item.postLines.every((line) => line.vacancies !== null)
          ? item.postLines.reduce((sum, line) => sum + (line.vacancies ?? 0), 0)
          : null;
        const currentStatus = existing.status;
        const nextStatus = ["CLOSED", "RESULTS", "ARCHIVED"].includes(currentStatus)
          ? currentStatus
          : currentStatus === "ACTIVE" || item.lifecycleCandidate === "OPEN_AS_OF_CUTOFF" ? "ACTIVE" : "UPCOMING";

        await tx.update(recruitments).set({
          status: nextStatus as typeof existing.status,
          officialNotificationUrl: existing.officialNotificationUrl ?? item.notificationUrl,
          officialLinkSource: existing.officialLinkSource ?? "freejobalert",
          totalVacancies: existing.totalVacancies ?? total,
          updatedAt: new Date(),
        }).where(eq(recruitments.id, resolvedRecruitment.id));

        const singlePostId = matchedPosts.length === 1 ? matchedPosts[0].id : null;
        const facts = {
          sourceTitle: item.title,
          organizationName: item.organization,
          postNames: item.postLines.map((line) => line.name),
          vacancyCandidates: item.postLines,
          sourceLifecycleCandidate: item.lifecycleCandidate,
          notificationUrlCandidate: item.notificationUrl,
          factsAreIndependentlyVerified: false,
        };
        const observations = await tx.insert(sourceObservations).values({
          source: "freejobalert",
          externalId: item.externalId,
          sourceUrl: item.sourceUrl,
          observedAt: new Date(),
          contentHash: item.contentHash,
          facts,
          links: [{ type: "notification_candidate", text: item.notificationAnchorText, url: item.notificationUrl }],
          raw: { capturedHtmlAvailable: true, inventoryDetails: inventory.details },
          runId,
          outcome: "RECEIVED",
          outcomeReason: "AGGREGATOR_HTML_CANDIDATE; FACTS_NOT_INDEPENDENTLY_VERIFIED",
          recruitmentId: resolvedRecruitment.id,
          postId: singlePostId,
        }).onConflictDoUpdate({
          target: [sourceObservations.source, sourceObservations.externalId, sourceObservations.contentHash],
          set: {
            observedAt: new Date(),
            outcome: "RECEIVED",
            outcomeReason: "AGGREGATOR_HTML_CANDIDATE; FACTS_NOT_INDEPENDENTLY_VERIFIED",
            recruitmentId: resolvedRecruitment.id,
            postId: singlePostId,
          },
        }).returning({ id: sourceObservations.id });
        const observationId = observations[0]?.id;
        if (!observationId) throw new Error("SOURCE_OBSERVATION_NOT_PERSISTED");

        await tx.insert(notificationUrlChecks).values({
          sourceObservationId: observationId,
          recruitmentId: resolvedRecruitment.id,
          postId: singlePostId,
          requestedUrl: item.notificationUrl,
          approvedHosts: item.approvedHosts,
          approvedHostEvidence: item.hostEvidence,
          finalUrl: check.finalUrl,
          finalHost: check.finalHost,
          redirectChain: check.redirectChain,
          httpStatus: check.httpStatus,
          contentType: check.contentType,
          status: "VALIDATED",
          validatorVersion: "v1.1-dns-pinned",
          checkedAt: new Date(check.checkedAt),
        });
        await tx.update(fjaJobInventory).set({
          officialNotificationUrl: item.notificationUrl,
          updatedAt: new Date(),
        }).where(and(eq(fjaJobInventory.sourceSlug, "freejobalert"), eq(fjaJobInventory.externalId, item.externalId)));

        return {
          recruitmentId: resolvedRecruitment.id,
          recruitmentSlug: existing.slug,
          postIds: matchedPosts.map((post) => post.id),
        };
      });

      const leaves = await db.query.posts.findMany({
        where: and(eq(posts.recruitmentId, result.recruitmentId), inArray(posts.id, result.postIds)),
      });
      written.push({
        externalId: item.externalId,
        recruitmentId: result.recruitmentId,
        recruitmentSlug: result.recruitmentSlug,
        hubUrl: baseUrl + "/jobs/" + result.recruitmentSlug,
        leafUrls: leaves.map((post) => baseUrl + "/jobs/" + result.recruitmentSlug + "/" + post.slug),
      });
    } catch (error) {
      failed.push({ externalId: item.externalId, reason: error instanceof Error ? error.message : "UNKNOWN_WRITE_FAILURE" });
    }
  }

  const routePaths = [...new Set(written.flatMap((item) => [
    "/jobs/" + item.recruitmentSlug,
    ...item.leafUrls.map((url) => url.replace(baseUrl, "")),
  ]))];
  const verification = routePaths.length ? await verifyPages(routePaths) : [];
  const output = {
    sourceRunId: runId,
    writtenCount: written.length,
    failed,
    written,
    verification,
    generatedAt: new Date().toISOString(),
  };
  await writeFile(outputPath, JSON.stringify(output, null, 2));
  console.log(JSON.stringify({
    writtenCount: written.length,
    failedCount: failed.length,
    verifiedCount: verification.filter((item) => item.verified).length,
    outputPath,
  }, null, 2));
  if (failed.length || verification.some((item) => !item.verified)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
