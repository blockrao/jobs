import { writeFile } from "node:fs/promises";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../src/db";
import { fjaJobInventory, fjaSourceCaptures } from "../src/db/schema";
import { loadOrgIndex, normalizeOrgName, resolveOrganization } from "../src/ingest/organization-resolution";
import { normalizeAdvertisementNumber } from "../src/ingest/resolve";
import { classifyPostLine, normalizePostName } from "../src/ingest/post-lines";
import { checkOfficialNotificationUrl } from "../src/ingest/fja/notification-url-check";

type Detail = {
  detail_url?: string;
  page_title?: string | null;
  detail_text?: string;
  facts?: Record<string, string | null>;
  official_link_candidates?: Array<{ text: string; url: string }>;
  post_table_candidates?: Array<{ rows: Array<{ values: Record<string, string> }> }>;
  open_status?: string;
  [key: string]: unknown;
};
type Line = { name: string; vacancies: number | null };
const db = getDb();
const ids = [...new Set((process.env.FJA_CANONICAL_EXTERNAL_IDS ?? "").split(/[\\s,;]+/).map((v) => v.trim()).filter(Boolean))];
const runId = process.env.FJA_SOURCE_RUN_ID ?? "";
const parseCount = (v: unknown): number | null => {
  const raw = typeof v === "string" ? v.replace(/,/g, "").trim() : "";
  if (!/^\\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};
const hostOf = (v: string): string | null => {
  try { return new URL(v.includes("://") ? v : "https://" + v).hostname.toLowerCase().replace(/^www\\./, ""); }
  catch { return null; }
};
function findOrg(index: Awaited<ReturnType<typeof loadOrgIndex>>, text: string): string | null {
  const normalized = normalizeOrgName(text);
  const ids = new Set<number>();
  const forms: Array<[string, number]> = [...index.aliases.entries()];
  for (const [form, orgIds] of index.existing.entries()) for (const id of orgIds) forms.push([form, id]);
  for (const [form, id] of forms) if (form.length >= 8 && form.split(" ").length > 1 && normalized.includes(form)) ids.add(id);
  return ids.size === 1 ? index.byId.get([...ids][0])?.name ?? null : null;
}
function getLines(detail: Detail): Line[] {
  const facts = detail.facts ?? {};
  const unnumbered = /does not print a number|not stated|not specified/i.test(String(facts.vacancies ?? ""));
  const lines: Line[] = [];
  for (const table of detail.post_table_candidates ?? []) for (const row of table.rows ?? []) {
    const values = row.values ?? {};
    const postKey = Object.keys(values).find((k) => /^(post|post name|name of post|designation|position|trade|discipline)$/i.test(k.trim()));
    if (!postKey || !values[postKey]?.trim()) continue;
    const countKey = Object.keys(values).find((k) => /vacanc|no\\.? of posts|number of posts|total posts/i.test(k));
    lines.push({ name: values[postKey].trim(), vacancies: unnumbered ? null : parseCount(countKey ? values[countKey] : null) });
  }
  if (!lines.length && facts.post_name) lines.push({ name: facts.post_name, vacancies: unnumbered ? null : parseCount(facts.vacancies) });
  const unique = new Map<string, Line>();
  for (const line of lines) {
    const key = normalizePostName(line.name);
    if (!unique.has(key) || (unique.get(key)?.vacancies === null && line.vacancies !== null)) unique.set(key, line);
  }
  const result = [...unique.values()];
  if (result.length === 1 && result[0].vacancies === null && !unnumbered) result[0].vacancies = parseCount(facts.vacancies);
  return result;
}
function getNotification(detail: Detail): { text: string; url: string; host: string } | null {
  const matches = (detail.official_link_candidates ?? []).filter((link) => {
    if (!/(official\\s*(notification|advertisement)|notification\\s*(pdf|download)|download.*notification|notification.*(pdf|download)|advertisement.*pdf)/i.test(link.text)) return false;
    try {
      const u = new URL(link.url);
      return ["https:", "http:"].includes(u.protocol)
        && !u.hostname.endsWith("freejobalert.com")
        && !/instruction/i.test(u.pathname)
        && !/instruction/i.test(link.text);
    } catch { return false; }
  });
  if (matches.length !== 1) return null;
  const u = new URL(matches[0].url);
  return { text: matches[0].text, url: u.toString(), host: u.hostname.toLowerCase().replace(/^www\\./, "") };
}
async function main() {
  if (!runId || ids.length < 1 || ids.length > 10) throw new Error("Supply source run ID and 1–10 explicit external IDs.");
  const rows = await db.query.fjaJobInventory.findMany({
    where: and(eq(fjaJobInventory.sourceSlug, "freejobalert"), inArray(fjaJobInventory.externalId, ids)),
  });
  const found = new Set(rows.map((r) => r.externalId));
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length) throw new Error("Private FJA inventory rows missing: " + missing.join(", "));
  const captures = await db.query.fjaSourceCaptures.findMany({
    where: and(eq(fjaSourceCaptures.sourceSlug, "freejobalert"), inArray(fjaSourceCaptures.externalId, ids)),
  });
  const captured = new Set(captures.map((r) => r.externalId));
  const orgIndex = await loadOrgIndex(db);
  const records = [];
  for (const row of rows) {
    const details = row.details as Record<string, unknown>;
    const detail = details.detail as Detail | null;
    const listing = details.listing as Record<string, unknown> | undefined;
    const sourceUrl = detail?.detail_url || String(listing?.listing_url ?? row.sourceUrl);
    const base = { externalId: row.externalId, sourceUrl, title: row.title };
    if (!captured.has(row.externalId)) { records.push({ ...base, verdict: "REVIEW", reason: "PRIVATE_HTML_CAPTURE_MISSING" }); continue; }
    if (!detail) { records.push({ ...base, verdict: "REVIEW", reason: "DETAIL_NOT_CAPTURED" }); continue; }
    if (detail.open_status === "CLOSED_BY_CUTOFF") { records.push({ ...base, verdict: "SKIP", reason: "CLOSED_BY_CUTOFF" }); continue; }
    if (!["OPEN_AS_OF_CUTOFF", "REVIEW_WALKIN_DATE_UNCLEAR"].includes(detail.open_status ?? "")) { records.push({ ...base, verdict: "REVIEW", reason: "LIFECYCLE_UNCLEAR" }); continue; }
    const facts = detail.facts ?? {};
    const orgRaw = String(facts.organization ?? row.organizationName ?? "").trim()
      || findOrg(orgIndex, String(detail.page_title ?? "") + " " + String(detail.detail_text ?? ""));
    const orgResult = resolveOrganization(orgIndex, orgRaw);
    if (!("organization" in orgResult) || (orgResult.kind === "EXISTING" && orgResult.ambiguous)) {
      records.push({ ...base, verdict: "REVIEW", reason: "ORGANIZATION_UNRESOLVED", orgCandidate: orgRaw || null }); continue;
    }
    const org = orgResult.organization;
    const lines = getLines(detail);
    if (!lines.length) { records.push({ ...base, verdict: "REVIEW", reason: "POST_LEAF_NAME_MISSING", organization: org.name }); continue; }
    const rejectedLine = lines.find((line) => classifyPostLine(line.name, line.vacancies ?? 1) !== "OK");
    if (rejectedLine) {
      records.push({ ...base, verdict: "REVIEW", reason: "POST_LEAF_CLASSIFIER_REJECTED", organization: org.name, postName: rejectedLine.name, classifierVerdict: classifyPostLine(rejectedLine.name, rejectedLine.vacancies ?? 1) });
      continue;
    }
    const yearMatch = (String(detail.page_title ?? "") + " " + row.title).match(/\\b(20\\d{2})\\b/);
    if (!yearMatch) { records.push({ ...base, verdict: "REVIEW", reason: "YEAR_NOT_EXPLICIT", organization: org.name }); continue; }
    const notification = getNotification(detail);
    if (!notification) { records.push({ ...base, verdict: "REVIEW", reason: "NOTIFICATION_LINK_MISSING_OR_AMBIGUOUS", organization: org.name, postNames: lines.map((l) => l.name) }); continue; }
    const orgHost = hostOf(String(org.websiteUrl ?? ""));
    if (!orgHost || !(notification.host === orgHost || notification.host.endsWith("." + orgHost))) {
      records.push({ ...base, verdict: "REVIEW", reason: "NOTIFICATION_HOST_NOT_MATCHED_TO_ORG_WEBSITE", organization: org.name, organizationWebsite: org.websiteUrl, notificationHost: notification.host }); continue;
    }
    const approvedHosts = [...new Set([notification.host, orgHost])];
    const check = await checkOfficialNotificationUrl(notification.url, { approvedHosts });
    if (!check.ok) {
      records.push({ ...base, verdict: "REVIEW", reason: check.reason, organization: org.name, notificationUrl: notification.url, httpStatus: check.httpStatus }); continue;
    }
    records.push({
      ...base,
      contentHash: row.contentHash,
      verdict: "READY_FOR_PILOT",
      organization: org.name,
      organizationId: org.id,
      recruitmentName: (org.name + " " + lines.map((l) => l.name).join(" / ") + " Recruitment " + yearMatch[1]).slice(0, 220),
      postLines: lines,
      advertisementNumber: normalizeAdvertisementNumber(facts.advertisement_number ?? null),
      notificationUrl: notification.url,
      notificationAnchorText: notification.text,
      approvedHosts,
      hostEvidence: { organizationWebsite: org.websiteUrl, notificationHost: notification.host },
      headStatus: check.httpStatus,
      headFinalUrl: check.finalUrl,
      lifecycleCandidate: detail.open_status,
    });
  }
  const report = {
    mode: "dry-run-only",
    sourceRunId: runId,
    selectedExternalIds: ids,
    stagedRecords: rows.length,
    capturedRecords: captured.size,
    readyRecords: records.filter((r) => r.verdict === "READY_FOR_PILOT").length,
    records,
    generatedAt: new Date().toISOString(),
  };
  await writeFile("fja-canonical-pilot-dry-run.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ selected: ids.length, ready: report.readyRecords, report: "fja-canonical-pilot-dry-run.json" }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
