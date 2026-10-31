import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";
import { pageSeo } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = pageSeo("/admin/source-review", { index: false });

const PAGE_SIZE = 50;

type QueueRow = {
  queue_rank: number;
  total_queue_rows: number;
  recruitment_id: number;
  recruitment_slug: string;
  recruitment_name: string;
  organization_name: string | null;
  institution_name: string | null;
  lifecycle_status: string;
  verification_status: string;
  official_link_source: string | null;
  official_notification_url: string | null;
  official_application_url: string | null;
  source_url: string | null;
  notification_date: string | null;
  application_start_date: string | null;
  application_end_date: string | null;
  enrichment_source: string | null;
  ingest_batch: string | null;
  valid_post_count: number;
  has_legacy_mapping: boolean;
  review_action: string;
  post_source_evidence: Array<Record<string, unknown>>;
  legacy_posting_evidence: Array<Record<string, unknown>>;
};

function displayDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
}

async function loadQueue(pageNumber: number): Promise<QueueRow[]> {
  const offset = (pageNumber - 1) * PAGE_SIZE;
  const query = sql.raw(`
    WITH domains(domain) AS (
      VALUES
        ('freejobalert.com'),('sarkariresult.com'),('sarkarinaukri.com'),
        ('indiasarkarinaukri.com'),('sahisarkarijobs.com'),('sarkariexam.com'),
        ('t.me'),('telegram.me'),('whatsapp.com'),('arattai.in'),('wa.me'),
        ('telegram.org'),('facebook.com'),('twitter.com'),('x.com'),
        ('instagram.com'),('youtube.com'),('marugujarat.co.in'),
        ('pdfjobsjankari.com'),('onlineupcar.com'),('rojgarresult.com'),
        ('freshersworld.com')
    ),
    source_labels(label) AS (
      VALUES
        ('fja'),('freejobalert'),('ext-1'),('ext-2'),('ext-3'),('ext-4'),('ext-5'),
        ('aggregator'),('aggregator_extracted'),('pilot_preliminary'),
        ('institutional_aggregation'),('institution_aggregation'),('fja_html'),
        ('aggregator_discovered'),('fja_official_link_extracted'),('official_link_extracted'),
        ('sarkariresult'),('sarkarinaukri'),('indiasarkarinaukri'),('sahisarkarijobs'),
        ('sarkariexam'),('marugujarat'),('marugujarat.co.in'),('pdfjobsjankari'),
        ('pdfjobsjankari.com'),('onlineupcar'),('onlineupcar.com'),('rojgarresult'),
        ('rojgarresult.com'),('freshersworld'),('freshersworld.com'),('telegram'),
        ('telegram.me'),('telegram.org'),('t.me'),('whatsapp'),('whatsapp.com'),
        ('wa.me'),('arattai'),('arattai.in'),('facebook'),('facebook.com'),
        ('twitter'),('twitter.com'),('x.com'),('instagram'),('instagram.com'),
        ('youtube'),('youtube.com')
    ),
    url_values AS (
      SELECT r.id AS recruitment_id, r.source_url AS value
      FROM public.recruitments r WHERE r.source_url IS NOT NULL
      UNION ALL SELECT r.id, r.official_notification_url
      FROM public.recruitments r WHERE r.official_notification_url IS NOT NULL
      UNION ALL SELECT r.id, r.official_application_url
      FROM public.recruitments r WHERE r.official_application_url IS NOT NULL
      UNION ALL SELECT p.recruitment_id, p."sourceReference"
      FROM public.posts p WHERE p."sourceReference" IS NOT NULL
      UNION ALL SELECT p.recruitment_id, p.original_recruitment_url
      FROM public.posts p WHERE p.original_recruitment_url IS NOT NULL
      UNION ALL SELECT p.recruitment_id, p."originalRecruitmentUrl"
      FROM public.posts p WHERE p."originalRecruitmentUrl" IS NOT NULL
      UNION ALL SELECT p.recruitment_id, p."officialSourceUrl"
      FROM public.posts p WHERE p."officialSourceUrl" IS NOT NULL
      UNION ALL SELECT p.recruitment_id, p."applyPortalUrl"
      FROM public.posts p WHERE p."applyPortalUrl" IS NOT NULL
      UNION ALL SELECT p.recruitment_id, p.application_url
      FROM public.posts p WHERE p.application_url IS NOT NULL
      UNION ALL SELECT p.recruitment_id, p."officialNotificationUrl"
      FROM public.posts p WHERE p."officialNotificationUrl" IS NOT NULL
      UNION ALL SELECT coalesce(sp.inferred_recruitment_id, cp.recruitment_id), sp.source_url
      FROM public.postings sp
      LEFT JOIN public.posts cp ON cp.id = sp.inferred_post_id
      WHERE sp.source_url IS NOT NULL
    ),
    aggregator_url_recruitments AS (
      SELECT DISTINCT u.recruitment_id
      FROM url_values u
      CROSS JOIN LATERAL (
        SELECT regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                split_part(split_part(split_part(
                  regexp_replace(btrim(u.value), '^(https?:)?//', '', 'i'),
                  '/', 1), '?', 1), '#', 1),
                '^.*@', ''),
              ':[0-9]+$', ''),
            '[.]$', ''),
          '^www[.]', '') AS host
      ) h
      JOIN domains d ON lower(h.host) = d.domain OR lower(h.host) LIKE '%.' || d.domain
      WHERE u.recruitment_id IS NOT NULL
    ),
    legacy_origin AS (
      SELECT DISTINCT coalesce(sp.inferred_recruitment_id, cp.recruitment_id) AS recruitment_id
      FROM public.postings sp
      LEFT JOIN public.posts cp ON cp.id = sp.inferred_post_id
      WHERE (sp.inferred_recruitment_id IS NOT NULL OR cp.recruitment_id IS NOT NULL)
        AND (
          lower(btrim(coalesce(sp.source,''))) IN (SELECT label FROM source_labels)
          OR lower(btrim(coalesce(sp.enrichment_source,''))) IN (SELECT label FROM source_labels)
          OR upper(btrim(coalesce(sp.source_type,''))) = 'AGGREGATOR'
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(
              CASE WHEN jsonb_typeof(coalesce(sp.source_portals,'[]'::jsonb)) = 'array'
                THEN sp.source_portals ELSE '[]'::jsonb END
            ) portal(value)
            WHERE lower(btrim(portal.value)) IN (SELECT label FROM source_labels)
          )
        )
    ),
    candidates AS (
      SELECT DISTINCT r.id
      FROM public.recruitments r
      WHERE lower(btrim(coalesce(r.enrichment_data -> 'meta' ->> 'source',''))) IN
            ('institutional_aggregation','institution_aggregation','fja_html')
         OR lower(btrim(coalesce(r.metadata -> 'source_provenance' ->> 'discovery_origin',''))) = 'aggregator_discovered'
         OR lower(btrim(coalesce(r.official_link_source,''))) IN (SELECT label FROM source_labels)
         OR EXISTS (SELECT 1 FROM aggregator_url_recruitments u WHERE u.recruitment_id = r.id)
         OR EXISTS (
           SELECT 1 FROM public.posts p
           WHERE p.recruitment_id = r.id
             AND lower(btrim(coalesce(p."sourceName",''))) IN (SELECT label FROM source_labels)
         )
         OR EXISTS (SELECT 1 FROM legacy_origin lo WHERE lo.recruitment_id = r.id)
    ),
    post_source_refs AS (
      SELECT p.recruitment_id,
             jsonb_agg(jsonb_build_object(
               'post_id', p.id, 'post_slug', p.slug, 'posting_status', p.posting_status,
               'source_name', p."sourceName", 'source_reference', p."sourceReference",
               'official_source_url', p."officialSourceUrl",
               'official_notification_url', p."officialNotificationUrl",
               'application_url', p.application_url
             ) ORDER BY p.id) AS post_source_evidence
      FROM public.posts p GROUP BY p.recruitment_id
    ),
    legacy_posting_refs AS (
      SELECT coalesce(sp.inferred_recruitment_id, cp.recruitment_id) AS recruitment_id,
             jsonb_agg(jsonb_build_object(
               'legacy_posting_id', sp.id, 'external_id', sp.external_id, 'title', sp.title,
               'source', sp.source, 'source_type', sp.source_type,
               'enrichment_source', sp.enrichment_source, 'source_portals', sp.source_portals,
               'source_url', sp.source_url, 'official_notification_url', sp.official_notification_url,
               'apply_url', sp.apply_url, 'review_status', sp.review_status,
               'source_document_id', sp.source_document_id,
               'source_document', (
                 SELECT jsonb_build_object('id', sd.id, 'source_url', sd.source_url,
                   'document_type', sd.document_type, 'external_id', sd.external_id,
                   'published_at', sd.published_at, 'extracted_at', sd.extracted_at,
                   'extraction_method', sd.extraction_method)
                 FROM public.source_documents sd WHERE sd.id = sp.source_document_id
               ),
               'source_observations', (
                 SELECT coalesce(jsonb_agg(jsonb_build_object(
                   'id', so.id, 'source', so.source, 'external_id', so.external_id,
                   'source_url', so.source_url, 'observed_at', so.observed_at,
                   'outcome', so.outcome, 'outcome_reason', so.outcome_reason,
                   'facts', so.facts, 'links', so.links
                 ) ORDER BY so.observed_at DESC), '[]'::jsonb)
                 FROM public.source_observations so WHERE so.posting_id = sp.id
               ),
               'inferred_recruitment_id', sp.inferred_recruitment_id,
               'inferred_post_id', sp.inferred_post_id
             ) ORDER BY sp.id) AS legacy_posting_evidence
      FROM public.postings sp
      LEFT JOIN public.posts cp ON cp.id = sp.inferred_post_id
      WHERE sp.inferred_recruitment_id IS NOT NULL OR cp.recruitment_id IS NOT NULL
      GROUP BY coalesce(sp.inferred_recruitment_id, cp.recruitment_id)
    ),
    manifest AS (
      SELECT r.id, r.slug, r.name, o.name AS organization_name,
             r.status::text AS lifecycle_status, r.verification_status,
             r.official_link_source, r.official_notification_url,
             r.official_application_url, r.source_url, r.notification_date,
             r.application_start_date, r.application_end_date,
             r.metadata ->> 'ingest_batch' AS ingest_batch,
             r.enrichment_data -> 'meta' ->> 'source' AS enrichment_source,
             r.enrichment_data -> 'institution' ->> 'name' AS institution_name,
             (SELECT count(*) FROM public.posts p
              WHERE p.recruitment_id = r.id
                AND p.posting_status IS DISTINCT FROM 'DUPLICATE'
                AND p.slug IS NOT NULL AND btrim(p.slug) <> '') AS valid_post_count,
             EXISTS (
               SELECT 1 FROM public.postings sp
               LEFT JOIN public.posts cp ON cp.id = sp.inferred_post_id
               WHERE sp.inferred_recruitment_id = r.id OR cp.recruitment_id = r.id
             ) AS has_legacy_mapping,
             coalesce(ps.post_source_evidence, '[]'::jsonb) AS post_source_evidence,
             coalesce(lp.legacy_posting_evidence, '[]'::jsonb) AS legacy_posting_evidence,
             EXISTS (
               SELECT 1 FROM public.official_digest_promote d
               WHERE d.batch = r.metadata ->> 'ingest_batch'
                 AND d.hub ->> 'official_url' = r.official_notification_url
             ) AS has_staging_match
      FROM public.recruitments r
      LEFT JOIN public.organizations o ON o.id = r.organization_id
      LEFT JOIN post_source_refs ps ON ps.recruitment_id = r.id
      LEFT JOIN legacy_posting_refs lp ON lp.recruitment_id = r.id
      JOIN candidates c ON c.id = r.id
    ),
    unmatched AS (
      SELECT *,
        CASE
          WHEN valid_post_count = 0 AND has_legacy_mapping THEN 0
          WHEN valid_post_count = 0 THEN 1
          WHEN ingest_batch IS NULL THEN 2
          ELSE 3
        END AS queue_priority,
        CASE
          WHEN valid_post_count = 0 AND has_legacy_mapping THEN 'LEGACY_POST_MAPPING_REVIEW_REQUIRED'
          WHEN valid_post_count = 0 THEN 'SOURCE_TO_POST_DECOMPOSITION_REVIEW_REQUIRED'
          WHEN ingest_batch IS NULL THEN 'MANUAL_SOURCE_RECONSTRUCTION_REQUIRED'
          ELSE 'STAGING_LINK_RECONCILIATION_REQUIRED'
        END AS review_action
      FROM manifest
      WHERE NOT has_staging_match
    ),
    ranked AS (
      SELECT row_number() OVER (ORDER BY queue_priority, id) AS queue_rank,
             count(*) OVER () AS total_queue_rows,
             *
      FROM unmatched
    )
    SELECT queue_rank,total_queue_rows,id AS recruitment_id,slug AS recruitment_slug,
           name AS recruitment_name,organization_name,institution_name,
           lifecycle_status,verification_status,official_link_source,
           official_notification_url,official_application_url,source_url,
           notification_date::text,application_start_date::text,application_end_date::text,
           enrichment_source,ingest_batch,valid_post_count,has_legacy_mapping,review_action,
           post_source_evidence,legacy_posting_evidence
    FROM ranked
    ORDER BY queue_rank
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `);
  const result = await getDb().execute(query);
  const rows = (result as unknown as { rows?: QueueRow[] }).rows ?? result as unknown as QueueRow[];
  return rows;
}

export default async function SourceOriginReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const pageNumber = Number.isFinite(parsedPage) ? Math.min(1000, Math.max(1, parsedPage)) : 1;
  const rows = await loadQueue(pageNumber);
  if (rows.length === 0 && pageNumber > 1) redirect("/admin/source-review");
  const total = rows[0]?.total_queue_rows ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Internal / read-only</p>
          <h1 className="mt-1 text-2xl font-bold">Source-Origin Review Queue</h1>
          <p className="mt-2 max-w-3xl text-sm text-neutral-600">
            Review discovery provenance, canonical Post coverage and source evidence before any promotion or publication decision.
            Origin identifies how a record was discovered; it does not prove that every fact is wrong. This screen is read-only and does not change Recruitment, Post, URL, verification or publication records.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-blue-700 underline">Back to Admin</Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Unmatched source-origin records</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{total.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Page size</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{PAGE_SIZE}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Current page</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{pageNumber} / {totalPages}</p>
        </div>
      </section>

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-600">
            <tr>
              <th className="px-3 py-3">Queue</th>
              <th className="px-3 py-3">Recruitment / employer</th>
              <th className="px-3 py-3">Issuer captured in source</th>
              <th className="px-3 py-3">Provenance / review action</th>
              <th className="px-3 py-3">Dates</th>
              <th className="px-3 py-3">Source links</th>
              <th className="px-3 py-3">Canonical Post coverage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.recruitment_id} className="border-t border-neutral-200 align-top">
                <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">
                  #{row.queue_rank}
                  <div className="mt-1 text-neutral-500">ID {row.recruitment_id}</div>
                </td>
                <td className="max-w-[260px] px-3 py-3">
                  <Link href={`/jobs/${row.recruitment_slug}`} className="font-medium text-blue-700 underline">
                    {row.recruitment_name}
                  </Link>
                  <div className="mt-1 text-xs text-neutral-500">{row.organization_name || "Organisation unresolved"}</div>
                  <div className="mt-1 text-xs text-neutral-500">{row.recruitment_slug}</div>
                  <div className="mt-1 text-xs text-neutral-500">{row.lifecycle_status} · {row.verification_status}</div>
                </td>
                <td className="max-w-[190px] px-3 py-3 text-xs">
                  {row.institution_name || "No captured institution name"}
                </td>
                <td className="max-w-[260px] px-3 py-3 text-xs">
                  <div className="font-medium">{row.enrichment_source || "Origin in URL / legacy fields"}</div>
                  <div className="mt-1 break-words text-neutral-500">{row.review_action}</div>
                  <div className="mt-1 text-neutral-500">Ingest batch: {row.ingest_batch || "missing"}</div>
                  <div className="mt-1 text-neutral-500">Link source: {row.official_link_source || "missing"}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs">
                  <div>Notification: {displayDate(row.notification_date)}</div>
                  <div className="mt-1">Start: {displayDate(row.application_start_date)}</div>
                  <div className="mt-1">Deadline: {displayDate(row.application_end_date)}</div>
                </td>
                <td className="max-w-[230px] px-3 py-3 text-xs">
                  <div>{row.official_notification_url ? <a href={row.official_notification_url} target="_blank" rel="noreferrer" className="break-all text-blue-700 underline">Official notice candidate</a> : "No official notice URL"}</div>
                  <div className="mt-1">{row.official_application_url ? <a href={row.official_application_url} target="_blank" rel="noreferrer" className="break-all text-blue-700 underline">Application URL candidate</a> : "No application URL"}</div>
                  {row.source_url && <div className="mt-1 break-all text-neutral-500">Discovery URL: {row.source_url}</div>}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs">
                  <div className="font-semibold">{row.valid_post_count} valid Post Leaves</div>
                  <div className="mt-1 text-neutral-500">Legacy mapping: {row.has_legacy_mapping ? "yes" : "no"}</div>
                  <details className="mt-2 whitespace-normal">
                    <summary className="cursor-pointer text-blue-700 underline">Inspect source evidence</summary>
                    <div className="mt-2 space-y-3">
                      <div>
                        <p className="font-semibold">Canonical Post source fields</p>
                        <pre className="mt-1 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded bg-neutral-50 p-2 text-[10px]">{JSON.stringify(row.post_source_evidence ?? [], null, 2)}</pre>
                      </div>
                      <div>
                        <p className="font-semibold">Legacy Posting / source document / observations</p>
                        <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded bg-neutral-50 p-2 text-[10px]">{JSON.stringify(row.legacy_posting_evidence ?? [], null, 2)}</pre>
                      </div>
                    </div>
                  </details>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-neutral-500">No rows on this page.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <p className="text-neutral-500">Page {pageNumber} of {totalPages}; stable order by review priority and Recruitment ID.</p>
        <div className="flex gap-3">
          {pageNumber > 1 && <Link href={`?page=${pageNumber - 1}`} className="rounded border border-neutral-300 px-3 py-2">Previous</Link>}
          {pageNumber < totalPages && <Link href={`?page=${pageNumber + 1}`} className="rounded border border-neutral-300 px-3 py-2">Next</Link>}
        </div>
      </div>
    </main>
  );
}
