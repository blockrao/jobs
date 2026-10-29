import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { SITE_URL } from "@/lib/site";
import { pageSeo } from "@/lib/seo";
import { buildBreadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";
import { formatDate } from "@/lib/labels";
import { recruitmentHref, postHref } from "@/lib/recruitment-href";

export const revalidate = 3600;

type ReportJob = {
  recruitment_id: number;
  recruitment_name: string;
  recruitment_slug: string;
  post_name: string | null;
  post_title: string | null;
  post_slug: string;
  organization_name: string | null;
  state_code: string | null;
  vacancies: number | null;
  recruitment_status: string;
  notification_date: Date | string | null;
  application_end_date: Date | string | null;
  post_updated_at: Date | string | null;
};

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function displayDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? formatDate(date) : null;
}

export const metadata: Metadata = {
  title: "Latest Government Jobs in India 2026 — New Notifications & Vacancies",
  description:
    "Explore newly announced government jobs across India. Compare departments, post names, vacancies, application deadlines and official recruitment details, with direct links to each job page and recruitment hub.",
  ...pageSeo("/latest-government-jobs", { index: true }),
  openGraph: {
    title: "Latest Government Jobs in India 2026",
    description:
      "A regularly refreshed report of new government job notifications, posts, vacancies and application deadlines across India.",
    url: `${SITE_URL}/latest-government-jobs`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Latest Government Jobs in India 2026",
    description:
      "New government recruitment notifications with post-wise details, deadlines and links to official recruitment information.",
  },
};

export default async function LatestGovernmentJobsPage() {
  let jobs: ReportJob[] = [];
  try {
    const db = getDb();
    const result = await db.execute(sql`
      SELECT
        r.id AS recruitment_id,
        r.name AS recruitment_name,
        r.slug AS recruitment_slug,
        p.name AS post_name,
        p.title AS post_title,
        p.slug AS post_slug,
        o.name AS organization_name,
        r.location_state_code AS state_code,
        CASE
          WHEN r.verification_status = 'VERIFIED'
            AND p.vacancy_total BETWEEN 1 AND 100000
          THEN p.vacancy_total
          ELSE NULL
        END AS vacancies,
        r.status::text AS recruitment_status,
        r.notification_date AS notification_date,
        r.application_end_date AS application_end_date,
        p.updated_at AS post_updated_at
      FROM recruitments r
      INNER JOIN posts p ON p.recruitment_id = r.id
      LEFT JOIN organizations o ON o.id = r.organization_id
      WHERE r.verification_status IS DISTINCT FROM 'QUARANTINED'
        AND o.sector IS DISTINCT FROM 'PRIVATE'
        AND r.status IN ('UPCOMING', 'ACTIVE')
        AND (r.application_end_date IS NULL OR r.application_end_date >= now())
        AND COALESCE(r.notification_date, r.created_at) >= now() - interval '30 days'
        AND p.slug IS NOT NULL
        AND btrim(p.slug) <> ''
        -- Exclude known legacy organisation-ID slugs from canonical recruitment URLs.
        AND r.slug !~* '^org[0-9]+-'
        AND r.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        AND p.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*      ORDER BY COALESCE(r.notification_date, r.created_at) DESC, p.updated_at DESC, r.id DESC
      LIMIT 50
    `);
    jobs = rowsOf<ReportJob>(result);
  } catch (error) {
    console.error("[latest-government-jobs] Failed to load report rows", error);
  }

  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Jobs", path: "/jobs" },
      { name: "Latest Government Jobs", path: "/latest-government-jobs" },
    ]),
  );
  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Latest Government Jobs in India",
    description:
      "Recently announced government recruitment opportunities, linked only to canonical job leaves and their parent recruitment hubs.",
    url: `${SITE_URL}/latest-government-jobs`,
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: jobs.length,
      itemListElement: jobs.map((job, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_URL}${postHref({ recruitmentSlug: job.recruitment_slug, slug: job.post_slug })}`,
        name: job.post_title || job.post_name || job.recruitment_name,
      })),
    },
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-neutral-500">
        <Link href="/" className="hover:text-blue-700 hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/jobs" className="hover:text-blue-700 hover:underline">Jobs</Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-800" aria-current="page">Latest Government Jobs</span>
      </nav>

      <header className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-6 py-8 text-white sm:px-9 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">JobOye Recruitment Report</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">Latest Government Jobs in India</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-blue-50 sm:text-lg">
          A regularly refreshed, post-wise report of recent government recruitment notifications. Review the role, department, verified vacancy information and application deadline, then open the canonical job detail page or its parent recruitment hub.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Recent 30-day notifications</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Post-wise details</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Official-source-first links</span>
        </div>
      </header>

      <section aria-labelledby="report-results" className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="report-results" className="text-2xl font-bold tracking-tight text-neutral-900">Recently announced opportunities</h2>
            <p className="mt-1 text-sm text-neutral-600">
              {jobs.length
                ? `Showing ${jobs.length} post-level listings from recent, non-quarantined recruitment records.`
                : "The report could not load current records right now. Browse the main jobs directory instead."}
            </p>
          </div>
          <p className="text-xs text-neutral-500">Updated hourly · canonical URLs only</p>
        </div>

        {jobs.length > 0 ? (
          <ol className="mt-5 space-y-4">
            {jobs.map((job, index) => {
              const title = job.post_title?.trim() || job.post_name?.trim() || job.recruitment_name;
              const hubUrl = recruitmentHref({ slug: job.recruitment_slug });
              const leafUrl = postHref({ recruitmentSlug: job.recruitment_slug, slug: job.post_slug });
              const deadline = displayDate(job.application_end_date);
              const notified = displayDate(job.notification_date);
              return (
                <li key={`${job.recruitment_id}-${job.post_slug}`} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">New notification · #{index + 1}</p>
                      <h3 className="mt-1 text-lg font-semibold leading-snug text-neutral-950">
                        <Link href={leafUrl} className="hover:text-blue-700 hover:underline">{title}</Link>
                      </h3>
                      <p className="mt-1 text-sm text-neutral-600">{job.organization_name || "Recruiting organisation not specified"}</p>
                      <p className="mt-2 text-sm leading-6 text-neutral-700">
                        {job.recruitment_name !== title
                          ? `Part of ${job.recruitment_name} recruitment.`
                          : `Official recruitment details for ${job.recruitment_name}.`}
                        {job.state_code ? ` Location/state code: ${job.state_code}.` : ""}
                        {job.vacancies ? ` ${job.vacancies.toLocaleString("en-IN")} verified vacancies are recorded for this post.` : ""}
                      </p>
                      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                        {job.vacancies ? (
                          <div><dt className="inline text-neutral-500">Vacancies: </dt><dd className="inline font-semibold text-neutral-900">{job.vacancies.toLocaleString("en-IN")}</dd></div>
                        ) : null}
                        {notified ? (
                          <div><dt className="inline text-neutral-500">Notification date: </dt><dd className="inline font-medium text-neutral-800">{notified}</dd></div>
                        ) : null}
                        {deadline ? (
                          <div><dt className="inline text-neutral-500">Application deadline: </dt><dd className="inline font-semibold text-neutral-900">{deadline}</dd></div>
                        ) : (
                          <div><dt className="inline text-neutral-500">Application deadline: </dt><dd className="inline text-neutral-700">Check official notification</dd></div>
                        )}
                      </dl>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                      <Link href={leafUrl} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        View job details
                      </Link>
                      <Link href={hubUrl} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:border-blue-400 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        Recruitment hub
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
            <p className="font-medium text-neutral-900">Latest jobs are temporarily unavailable.</p>
            <p className="mt-1 text-sm text-neutral-600">Use the all-jobs directory to continue browsing current recruitment notices.</p>
            <Link href="/jobs" className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Browse all jobs</Link>
          </div>
        )}
      </section>

      <section aria-labelledby="more-reports" className="mt-12 border-t border-neutral-200 pt-8">
        <h2 id="more-reports" className="text-xl font-bold text-neutral-900">Explore more government job reports</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          Use focused reports to narrow opportunities by sector or location. Each report should add a distinct view of the same canonical job data rather than create duplicate job pages.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/categories/psu" className="rounded-xl border border-neutral-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <span className="block font-semibold text-neutral-900">PSU Jobs</span>
            <span className="mt-1 block text-sm text-neutral-600">Public-sector undertakings and their recruitment notifications.</span>
          </Link>
          <Link href="/states" className="rounded-xl border border-neutral-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <span className="block font-semibold text-neutral-900">State Government Jobs</span>
            <span className="mt-1 block text-sm text-neutral-600">Browse government opportunities by state and union territory.</span>
          </Link>
          <Link href="/jobs?filter=open&kind=GOVERNMENT" className="rounded-xl border border-neutral-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <span className="block font-semibold text-neutral-900">Applications Open</span>
            <span className="mt-1 block text-sm text-neutral-600">Find government recruitment where applications are currently open.</span>
          </Link>
        </div>
      </section>

      <section className="mt-10 rounded-xl bg-neutral-50 p-5 text-sm leading-6 text-neutral-600">
        <h2 className="font-semibold text-neutral-900">How to use this report</h2>
        <p className="mt-2">
          The job-detail page contains post-specific information; the recruitment hub provides the broader notification, organisation context and related posts. Always confirm eligibility, dates, fees and application instructions in the official notification before applying. Vacancy totals are shown only when the stored record is marked verified.
        </p>
      </section>
    </main>
  );
}

        AND p.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*
      ORDER BY COALESCE(r.notification_date, r.created_at) DESC, p.updated_at DESC, r.id DESC
      LIMIT 50
    `);
    jobs = rowsOf<ReportJob>(result);
  } catch (error) {
    console.error("[latest-government-jobs] Failed to load report rows", error);
  }

  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Jobs", path: "/jobs" },
      { name: "Latest Government Jobs", path: "/latest-government-jobs" },
    ]),
  );
  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Latest Government Jobs in India",
    description:
      "Recently announced government recruitment opportunities, linked to their canonical job leaves and recruitment hubs.",
    url: `${SITE_URL}/latest-government-jobs`,
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: jobs.length,
      itemListElement: jobs.map((job, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_URL}${postHref({ recruitmentSlug: job.recruitment_slug, slug: job.post_slug })}`,
        name: job.post_title || job.post_name || job.recruitment_name,
      })),
    },
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-neutral-500">
        <Link href="/" className="hover:text-blue-700 hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/jobs" className="hover:text-blue-700 hover:underline">Jobs</Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-800" aria-current="page">Latest Government Jobs</span>
      </nav>

      <header className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-6 py-8 text-white sm:px-9 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">JobOye Recruitment Report</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">Latest Government Jobs in India</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-blue-50 sm:text-lg">
          A regularly refreshed, post-wise report of recent government recruitment notifications. Review the role, department, verified vacancy information and application deadline, then open the job details or the parent recruitment hub.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Recent 30-day notifications</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Post-wise details</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Official-source-first links</span>
        </div>
      </header>

      <section aria-labelledby="report-results" className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="report-results" className="text-2xl font-bold tracking-tight text-neutral-900">Recently announced opportunities</h2>
            <p className="mt-1 text-sm text-neutral-600">
              {jobs.length
                ? `Showing ${jobs.length} post-level listings from recent, non-quarantined recruitment records.`
                : "The report could not load current records right now. Browse the main jobs directory instead."}
            </p>
          </div>
          <p className="text-xs text-neutral-500">Report refreshes hourly</p>
        </div>

        {jobs.length > 0 ? (
          <ol className="mt-5 space-y-4">
            {jobs.map((job, index) => {
              const title = job.post_title?.trim() || job.post_name?.trim() || job.recruitment_name;
              const hubUrl = recruitmentHref({ slug: job.recruitment_slug });
              const leafUrl = postHref({ recruitmentSlug: job.recruitment_slug, slug: job.post_slug });
              const deadline = displayDate(job.application_end_date);
              const notified = displayDate(job.notification_date);
              return (
                <li key={`${job.recruitment_id}-${job.post_slug}`} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">New notification · #{index + 1}</p>
                      <h3 className="mt-1 text-lg font-semibold leading-snug text-neutral-950">
                        <Link href={leafUrl} className="hover:text-blue-700 hover:underline">{title}</Link>
                      </h3>
                      <p className="mt-1 text-sm text-neutral-600">{job.organization_name || "Recruiting organisation not specified"}</p>
                      <p className="mt-2 text-sm leading-6 text-neutral-700">
                        {job.recruitment_name !== title
                          ? `Part of ${job.recruitment_name} recruitment.`
                          : `Official recruitment details for ${job.recruitment_name}.`}
                        {job.state_code ? ` Location/state code: ${job.state_code}.` : ""}
                        {job.vacancies ? ` ${job.vacancies.toLocaleString("en-IN")} verified vacancies are recorded for this post.` : ""}
                      </p>
                      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                        {job.vacancies ? (
                          <div><dt className="inline text-neutral-500">Vacancies: </dt><dd className="inline font-semibold text-neutral-900">{job.vacancies.toLocaleString("en-IN")}</dd></div>
                        ) : null}
                        {notified ? (
                          <div><dt className="inline text-neutral-500">Notification date: </dt><dd className="inline font-medium text-neutral-800">{notified}</dd></div>
                        ) : null}
                        {deadline ? (
                          <div><dt className="inline text-neutral-500">Application deadline: </dt><dd className="inline font-semibold text-neutral-900">{deadline}</dd></div>
                        ) : (
                          <div><dt className="inline text-neutral-500">Application deadline: </dt><dd className="inline text-neutral-700">Check official notification</dd></div>
                        )}
                      </dl>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                      <Link href={leafUrl} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        View job details
                      </Link>
                      <Link href={hubUrl} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:border-blue-400 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        Recruitment hub
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
            <p className="font-medium text-neutral-900">Latest jobs are temporarily unavailable.</p>
            <p className="mt-1 text-sm text-neutral-600">Use the all-jobs directory to continue browsing current recruitment notices.</p>
            <Link href="/jobs" className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Browse all jobs</Link>
          </div>
        )}
      </section>

      <section aria-labelledby="more-reports" className="mt-12 border-t border-neutral-200 pt-8">
        <h2 id="more-reports" className="text-xl font-bold text-neutral-900">Explore more government job reports</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          Use focused reports to narrow opportunities by sector or location. Each report should add a distinct view of the same canonical job data rather than create duplicate job pages.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/categories/psu" className="rounded-xl border border-neutral-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <span className="block font-semibold text-neutral-900">PSU Jobs</span>
            <span className="mt-1 block text-sm text-neutral-600">Public-sector undertakings and their recruitment notifications.</span>
          </Link>
          <Link href="/states" className="rounded-xl border border-neutral-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <span className="block font-semibold text-neutral-900">State Government Jobs</span>
            <span className="mt-1 block text-sm text-neutral-600">Browse government opportunities by state and union territory.</span>
          </Link>
          <Link href="/jobs?filter=open&kind=GOVERNMENT" className="rounded-xl border border-neutral-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <span className="block font-semibold text-neutral-900">Applications Open</span>
            <span className="mt-1 block text-sm text-neutral-600">Find government recruitment where applications are currently open.</span>
          </Link>
        </div>
      </section>

      <section className="mt-10 rounded-xl bg-neutral-50 p-5 text-sm leading-6 text-neutral-600">
        <h2 className="font-semibold text-neutral-900">How to use this report</h2>
        <p className="mt-2">
          The job-detail page contains post-specific information; the recruitment hub provides the broader notification, organisation context and related posts. Always confirm eligibility, dates, fees and application instructions in the official notification before applying. Vacancy totals are shown only when the stored record is marked verified.
        </p>
      </section>
    </main>
  );
}

      ORDER BY COALESCE(r.notification_date, r.created_at) DESC, p.updated_at DESC, r.id DESC
      LIMIT 50
    `);
    jobs = rowsOf<ReportJob>(result);
  } catch (error) {
    console.error("[latest-government-jobs] Failed to load report rows", error);
  }

  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Jobs", path: "/jobs" },
      { name: "Latest Government Jobs", path: "/latest-government-jobs" },
    ]),
  );
  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Latest Government Jobs in India",
    description:
      "Recently announced government recruitment opportunities, linked to their canonical job leaves and recruitment hubs.",
    url: `${SITE_URL}/latest-government-jobs`,
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: jobs.length,
      itemListElement: jobs.map((job, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_URL}${postHref({ recruitmentSlug: job.recruitment_slug, slug: job.post_slug })}`,
        name: job.post_title || job.post_name || job.recruitment_name,
      })),
    },
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-neutral-500">
        <Link href="/" className="hover:text-blue-700 hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/jobs" className="hover:text-blue-700 hover:underline">Jobs</Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-800" aria-current="page">Latest Government Jobs</span>
      </nav>

      <header className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-6 py-8 text-white sm:px-9 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">JobOye Recruitment Report</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">Latest Government Jobs in India</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-blue-50 sm:text-lg">
          A regularly refreshed, post-wise report of recent government recruitment notifications. Review the role, department, verified vacancy information and application deadline, then open the job details or the parent recruitment hub.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Recent 30-day notifications</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Post-wise details</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Official-source-first links</span>
        </div>
      </header>

      <section aria-labelledby="report-results" className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="report-results" className="text-2xl font-bold tracking-tight text-neutral-900">Recently announced opportunities</h2>
            <p className="mt-1 text-sm text-neutral-600">
              {jobs.length
                ? `Showing ${jobs.length} post-level listings from recent, non-quarantined recruitment records.`
                : "The report could not load current records right now. Browse the main jobs directory instead."}
            </p>
          </div>
          <p className="text-xs text-neutral-500">Report refreshes hourly</p>
        </div>

        {jobs.length > 0 ? (
          <ol className="mt-5 space-y-4">
            {jobs.map((job, index) => {
              const title = job.post_title?.trim() || job.post_name?.trim() || job.recruitment_name;
              const hubUrl = recruitmentHref({ slug: job.recruitment_slug });
              const leafUrl = postHref({ recruitmentSlug: job.recruitment_slug, slug: job.post_slug });
              const deadline = displayDate(job.application_end_date);
              const notified = displayDate(job.notification_date);
              return (
                <li key={`${job.recruitment_id}-${job.post_slug}`} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">New notification · #{index + 1}</p>
                      <h3 className="mt-1 text-lg font-semibold leading-snug text-neutral-950">
                        <Link href={leafUrl} className="hover:text-blue-700 hover:underline">{title}</Link>
                      </h3>
                      <p className="mt-1 text-sm text-neutral-600">{job.organization_name || "Recruiting organisation not specified"}</p>
                      <p className="mt-2 text-sm leading-6 text-neutral-700">
                        {job.recruitment_name !== title
                          ? `Part of ${job.recruitment_name} recruitment.`
                          : `Official recruitment details for ${job.recruitment_name}.`}
                        {job.state_code ? ` Location/state code: ${job.state_code}.` : ""}
                        {job.vacancies ? ` ${job.vacancies.toLocaleString("en-IN")} verified vacancies are recorded for this post.` : ""}
                      </p>
                      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                        {job.vacancies ? (
                          <div><dt className="inline text-neutral-500">Vacancies: </dt><dd className="inline font-semibold text-neutral-900">{job.vacancies.toLocaleString("en-IN")}</dd></div>
                        ) : null}
                        {notified ? (
                          <div><dt className="inline text-neutral-500">Notification date: </dt><dd className="inline font-medium text-neutral-800">{notified}</dd></div>
                        ) : null}
                        {deadline ? (
                          <div><dt className="inline text-neutral-500">Application deadline: </dt><dd className="inline font-semibold text-neutral-900">{deadline}</dd></div>
                        ) : (
                          <div><dt className="inline text-neutral-500">Application deadline: </dt><dd className="inline text-neutral-700">Check official notification</dd></div>
                        )}
                      </dl>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                      <Link href={leafUrl} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        View job details
                      </Link>
                      <Link href={hubUrl} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:border-blue-400 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        Recruitment hub
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
            <p className="font-medium text-neutral-900">Latest jobs are temporarily unavailable.</p>
            <p className="mt-1 text-sm text-neutral-600">Use the all-jobs directory to continue browsing current recruitment notices.</p>
            <Link href="/jobs" className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Browse all jobs</Link>
          </div>
        )}
      </section>

      <section aria-labelledby="more-reports" className="mt-12 border-t border-neutral-200 pt-8">
        <h2 id="more-reports" className="text-xl font-bold text-neutral-900">Explore more government job reports</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          Use focused reports to narrow opportunities by sector or location. Each report should add a distinct view of the same canonical job data rather than create duplicate job pages.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/categories/psu" className="rounded-xl border border-neutral-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <span className="block font-semibold text-neutral-900">PSU Jobs</span>
            <span className="mt-1 block text-sm text-neutral-600">Public-sector undertakings and their recruitment notifications.</span>
          </Link>
          <Link href="/states" className="rounded-xl border border-neutral-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <span className="block font-semibold text-neutral-900">State Government Jobs</span>
            <span className="mt-1 block text-sm text-neutral-600">Browse government opportunities by state and union territory.</span>
          </Link>
          <Link href="/jobs?filter=open&kind=GOVERNMENT" className="rounded-xl border border-neutral-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <span className="block font-semibold text-neutral-900">Applications Open</span>
            <span className="mt-1 block text-sm text-neutral-600">Find government recruitment where applications are currently open.</span>
          </Link>
        </div>
      </section>

      <section className="mt-10 rounded-xl bg-neutral-50 p-5 text-sm leading-6 text-neutral-600">
        <h2 className="font-semibold text-neutral-900">How to use this report</h2>
        <p className="mt-2">
          The job-detail page contains post-specific information; the recruitment hub provides the broader notification, organisation context and related posts. Always confirm eligibility, dates, fees and application instructions in the official notification before applying. Vacancy totals are shown only when the stored record is marked verified.
        </p>
      </section>
    </main>
  );
}

        AND NOT EXISTS (
          SELECT 1
          FROM recruitment_slug_redirects rsr
          WHERE rsr.old_slug = r.slug
        )
      ORDER BY COALESCE(r.notification_date, r.created_at) DESC, p.updated_at DESC, r.id DESC
      LIMIT 50
    `);
    jobs = rowsOf<ReportJob>(result);
  } catch (error) {
    console.error("[latest-government-jobs] Failed to load report rows", error);
  }

  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Jobs", path: "/jobs" },
      { name: "Latest Government Jobs", path: "/latest-government-jobs" },
    ]),
  );
  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Latest Government Jobs in India",
    description:
      "Recently announced government recruitment opportunities, linked only to canonical job leaves and their parent recruitment hubs.",
    url: `${SITE_URL}/latest-government-jobs`,
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: jobs.length,
      itemListElement: jobs.map((job, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_URL}${postHref({ recruitmentSlug: job.recruitment_slug, slug: job.post_slug })}`,
        name: job.post_title || job.post_name || job.recruitment_name,
      })),
    },
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-neutral-500">
        <Link href="/" className="hover:text-blue-700 hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/jobs" className="hover:text-blue-700 hover:underline">Jobs</Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-800" aria-current="page">Latest Government Jobs</span>
      </nav>

      <header className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-6 py-8 text-white sm:px-9 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">JobOye Recruitment Report</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">Latest Government Jobs in India</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-blue-50 sm:text-lg">
          A regularly refreshed, post-wise report of recent government recruitment notifications. Review the role, department, verified vacancy information and application deadline, then open the canonical job detail page or its parent recruitment hub.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Recent 30-day notifications</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Post-wise details</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Official-source-first links</span>
        </div>
      </header>

      <section aria-labelledby="report-results" className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="report-results" className="text-2xl font-bold tracking-tight text-neutral-900">Recently announced opportunities</h2>
            <p className="mt-1 text-sm text-neutral-600">
              {jobs.length
                ? `Showing ${jobs.length} post-level listings from recent, non-quarantined recruitment records.`
                : "The report could not load current records right now. Browse the main jobs directory instead."}
            </p>
          </div>
          <p className="text-xs text-neutral-500">Updated hourly · canonical URLs only</p>
        </div>

        {jobs.length > 0 ? (
          <ol className="mt-5 space-y-4">
            {jobs.map((job, index) => {
              const title = job.post_title?.trim() || job.post_name?.trim() || job.recruitment_name;
              const hubUrl = recruitmentHref({ slug: job.recruitment_slug });
              const leafUrl = postHref({ recruitmentSlug: job.recruitment_slug, slug: job.post_slug });
              const deadline = displayDate(job.application_end_date);
              const notified = displayDate(job.notification_date);
              return (
                <li key={`${job.recruitment_id}-${job.post_slug}`} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">New notification · #{index + 1}</p>
                      <h3 className="mt-1 text-lg font-semibold leading-snug text-neutral-950">
                        <Link href={leafUrl} className="hover:text-blue-700 hover:underline">{title}</Link>
                      </h3>
                      <p className="mt-1 text-sm text-neutral-600">{job.organization_name || "Recruiting organisation not specified"}</p>
                      <p className="mt-2 text-sm leading-6 text-neutral-700">
                        {job.recruitment_name !== title
                          ? `Part of ${job.recruitment_name} recruitment.`
                          : `Official recruitment details for ${job.recruitment_name}.`}
                        {job.state_code ? ` Location/state code: ${job.state_code}.` : ""}
                        {job.vacancies ? ` ${job.vacancies.toLocaleString("en-IN")} verified vacancies are recorded for this post.` : ""}
                      </p>
                      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                        {job.vacancies ? (
                          <div><dt className="inline text-neutral-500">Vacancies: </dt><dd className="inline font-semibold text-neutral-900">{job.vacancies.toLocaleString("en-IN")}</dd></div>
                        ) : null}
                        {notified ? (
                          <div><dt className="inline text-neutral-500">Notification date: </dt><dd className="inline font-medium text-neutral-800">{notified}</dd></div>
                        ) : null}
                        {deadline ? (
                          <div><dt className="inline text-neutral-500">Application deadline: </dt><dd className="inline font-semibold text-neutral-900">{deadline}</dd></div>
                        ) : (
                          <div><dt className="inline text-neutral-500">Application deadline: </dt><dd className="inline text-neutral-700">Check official notification</dd></div>
                        )}
                      </dl>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                      <Link href={leafUrl} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        View job details
                      </Link>
                      <Link href={hubUrl} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:border-blue-400 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        Recruitment hub
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
            <p className="font-medium text-neutral-900">Latest jobs are temporarily unavailable.</p>
            <p className="mt-1 text-sm text-neutral-600">Use the all-jobs directory to continue browsing current recruitment notices.</p>
            <Link href="/jobs" className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Browse all jobs</Link>
          </div>
        )}
      </section>

      <section aria-labelledby="more-reports" className="mt-12 border-t border-neutral-200 pt-8">
        <h2 id="more-reports" className="text-xl font-bold text-neutral-900">Explore more government job reports</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          Use focused reports to narrow opportunities by sector or location. Each report should add a distinct view of the same canonical job data rather than create duplicate job pages.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/categories/psu" className="rounded-xl border border-neutral-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <span className="block font-semibold text-neutral-900">PSU Jobs</span>
            <span className="mt-1 block text-sm text-neutral-600">Public-sector undertakings and their recruitment notifications.</span>
          </Link>
          <Link href="/states" className="rounded-xl border border-neutral-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <span className="block font-semibold text-neutral-900">State Government Jobs</span>
            <span className="mt-1 block text-sm text-neutral-600">Browse government opportunities by state and union territory.</span>
          </Link>
          <Link href="/jobs?filter=open&kind=GOVERNMENT" className="rounded-xl border border-neutral-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <span className="block font-semibold text-neutral-900">Applications Open</span>
            <span className="mt-1 block text-sm text-neutral-600">Find government recruitment where applications are currently open.</span>
          </Link>
        </div>
      </section>

      <section className="mt-10 rounded-xl bg-neutral-50 p-5 text-sm leading-6 text-neutral-600">
        <h2 className="font-semibold text-neutral-900">How to use this report</h2>
        <p className="mt-2">
          The job-detail page contains post-specific information; the recruitment hub provides the broader notification, organisation context and related posts. Always confirm eligibility, dates, fees and application instructions in the official notification before applying. Vacancy totals are shown only when the stored record is marked verified.
        </p>
      </section>
    </main>
  );
}

        AND p.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*
      ORDER BY COALESCE(r.notification_date, r.created_at) DESC, p.updated_at DESC, r.id DESC
      LIMIT 50
    `);
    jobs = rowsOf<ReportJob>(result);
  } catch (error) {
    console.error("[latest-government-jobs] Failed to load report rows", error);
  }

  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Jobs", path: "/jobs" },
      { name: "Latest Government Jobs", path: "/latest-government-jobs" },
    ]),
  );
  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Latest Government Jobs in India",
    description:
      "Recently announced government recruitment opportunities, linked to their canonical job leaves and recruitment hubs.",
    url: `${SITE_URL}/latest-government-jobs`,
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: jobs.length,
      itemListElement: jobs.map((job, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_URL}${postHref({ recruitmentSlug: job.recruitment_slug, slug: job.post_slug })}`,
        name: job.post_title || job.post_name || job.recruitment_name,
      })),
    },
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-neutral-500">
        <Link href="/" className="hover:text-blue-700 hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/jobs" className="hover:text-blue-700 hover:underline">Jobs</Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-800" aria-current="page">Latest Government Jobs</span>
      </nav>

      <header className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-6 py-8 text-white sm:px-9 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">JobOye Recruitment Report</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">Latest Government Jobs in India</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-blue-50 sm:text-lg">
          A regularly refreshed, post-wise report of recent government recruitment notifications. Review the role, department, verified vacancy information and application deadline, then open the job details or the parent recruitment hub.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Recent 30-day notifications</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Post-wise details</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Official-source-first links</span>
        </div>
      </header>

      <section aria-labelledby="report-results" className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="report-results" className="text-2xl font-bold tracking-tight text-neutral-900">Recently announced opportunities</h2>
            <p className="mt-1 text-sm text-neutral-600">
              {jobs.length
                ? `Showing ${jobs.length} post-level listings from recent, non-quarantined recruitment records.`
                : "The report could not load current records right now. Browse the main jobs directory instead."}
            </p>
          </div>
          <p className="text-xs text-neutral-500">Report refreshes hourly</p>
        </div>

        {jobs.length > 0 ? (
          <ol className="mt-5 space-y-4">
            {jobs.map((job, index) => {
              const title = job.post_title?.trim() || job.post_name?.trim() || job.recruitment_name;
              const hubUrl = recruitmentHref({ slug: job.recruitment_slug });
              const leafUrl = postHref({ recruitmentSlug: job.recruitment_slug, slug: job.post_slug });
              const deadline = displayDate(job.application_end_date);
              const notified = displayDate(job.notification_date);
              return (
                <li key={`${job.recruitment_id}-${job.post_slug}`} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">New notification · #{index + 1}</p>
                      <h3 className="mt-1 text-lg font-semibold leading-snug text-neutral-950">
                        <Link href={leafUrl} className="hover:text-blue-700 hover:underline">{title}</Link>
                      </h3>
                      <p className="mt-1 text-sm text-neutral-600">{job.organization_name || "Recruiting organisation not specified"}</p>
                      <p className="mt-2 text-sm leading-6 text-neutral-700">
                        {job.recruitment_name !== title
                          ? `Part of ${job.recruitment_name} recruitment.`
                          : `Official recruitment details for ${job.recruitment_name}.`}
                        {job.state_code ? ` Location/state code: ${job.state_code}.` : ""}
                        {job.vacancies ? ` ${job.vacancies.toLocaleString("en-IN")} verified vacancies are recorded for this post.` : ""}
                      </p>
                      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                        {job.vacancies ? (
                          <div><dt className="inline text-neutral-500">Vacancies: </dt><dd className="inline font-semibold text-neutral-900">{job.vacancies.toLocaleString("en-IN")}</dd></div>
                        ) : null}
                        {notified ? (
                          <div><dt className="inline text-neutral-500">Notification date: </dt><dd className="inline font-medium text-neutral-800">{notified}</dd></div>
                        ) : null}
                        {deadline ? (
                          <div><dt className="inline text-neutral-500">Application deadline: </dt><dd className="inline font-semibold text-neutral-900">{deadline}</dd></div>
                        ) : (
                          <div><dt className="inline text-neutral-500">Application deadline: </dt><dd className="inline text-neutral-700">Check official notification</dd></div>
                        )}
                      </dl>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                      <Link href={leafUrl} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        View job details
                      </Link>
                      <Link href={hubUrl} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:border-blue-400 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        Recruitment hub
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
            <p className="font-medium text-neutral-900">Latest jobs are temporarily unavailable.</p>
            <p className="mt-1 text-sm text-neutral-600">Use the all-jobs directory to continue browsing current recruitment notices.</p>
            <Link href="/jobs" className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Browse all jobs</Link>
          </div>
        )}
      </section>

      <section aria-labelledby="more-reports" className="mt-12 border-t border-neutral-200 pt-8">
        <h2 id="more-reports" className="text-xl font-bold text-neutral-900">Explore more government job reports</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          Use focused reports to narrow opportunities by sector or location. Each report should add a distinct view of the same canonical job data rather than create duplicate job pages.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/categories/psu" className="rounded-xl border border-neutral-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <span className="block font-semibold text-neutral-900">PSU Jobs</span>
            <span className="mt-1 block text-sm text-neutral-600">Public-sector undertakings and their recruitment notifications.</span>
          </Link>
          <Link href="/states" className="rounded-xl border border-neutral-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <span className="block font-semibold text-neutral-900">State Government Jobs</span>
            <span className="mt-1 block text-sm text-neutral-600">Browse government opportunities by state and union territory.</span>
          </Link>
          <Link href="/jobs?filter=open&kind=GOVERNMENT" className="rounded-xl border border-neutral-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <span className="block font-semibold text-neutral-900">Applications Open</span>
            <span className="mt-1 block text-sm text-neutral-600">Find government recruitment where applications are currently open.</span>
          </Link>
        </div>
      </section>

      <section className="mt-10 rounded-xl bg-neutral-50 p-5 text-sm leading-6 text-neutral-600">
        <h2 className="font-semibold text-neutral-900">How to use this report</h2>
        <p className="mt-2">
          The job-detail page contains post-specific information; the recruitment hub provides the broader notification, organisation context and related posts. Always confirm eligibility, dates, fees and application instructions in the official notification before applying. Vacancy totals are shown only when the stored record is marked verified.
        </p>
      </section>
    </main>
  );
}

      ORDER BY COALESCE(r.notification_date, r.created_at) DESC, p.updated_at DESC, r.id DESC
      LIMIT 50
    `);
    jobs = rowsOf<ReportJob>(result);
  } catch (error) {
    console.error("[latest-government-jobs] Failed to load report rows", error);
  }

  const schema = jsonLdGraph(
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Jobs", path: "/jobs" },
      { name: "Latest Government Jobs", path: "/latest-government-jobs" },
    ]),
  );
  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Latest Government Jobs in India",
    description:
      "Recently announced government recruitment opportunities, linked to their canonical job leaves and recruitment hubs.",
    url: `${SITE_URL}/latest-government-jobs`,
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: jobs.length,
      itemListElement: jobs.map((job, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_URL}${postHref({ recruitmentSlug: job.recruitment_slug, slug: job.post_slug })}`,
        name: job.post_title || job.post_name || job.recruitment_name,
      })),
    },
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-neutral-500">
        <Link href="/" className="hover:text-blue-700 hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/jobs" className="hover:text-blue-700 hover:underline">Jobs</Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-800" aria-current="page">Latest Government Jobs</span>
      </nav>

      <header className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-6 py-8 text-white sm:px-9 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">JobOye Recruitment Report</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">Latest Government Jobs in India</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-blue-50 sm:text-lg">
          A regularly refreshed, post-wise report of recent government recruitment notifications. Review the role, department, verified vacancy information and application deadline, then open the job details or the parent recruitment hub.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Recent 30-day notifications</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Post-wise details</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Official-source-first links</span>
        </div>
      </header>

      <section aria-labelledby="report-results" className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="report-results" className="text-2xl font-bold tracking-tight text-neutral-900">Recently announced opportunities</h2>
            <p className="mt-1 text-sm text-neutral-600">
              {jobs.length
                ? `Showing ${jobs.length} post-level listings from recent, non-quarantined recruitment records.`
                : "The report could not load current records right now. Browse the main jobs directory instead."}
            </p>
          </div>
          <p className="text-xs text-neutral-500">Report refreshes hourly</p>
        </div>

        {jobs.length > 0 ? (
          <ol className="mt-5 space-y-4">
            {jobs.map((job, index) => {
              const title = job.post_title?.trim() || job.post_name?.trim() || job.recruitment_name;
              const hubUrl = recruitmentHref({ slug: job.recruitment_slug });
              const leafUrl = postHref({ recruitmentSlug: job.recruitment_slug, slug: job.post_slug });
              const deadline = displayDate(job.application_end_date);
              const notified = displayDate(job.notification_date);
              return (
                <li key={`${job.recruitment_id}-${job.post_slug}`} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">New notification · #{index + 1}</p>
                      <h3 className="mt-1 text-lg font-semibold leading-snug text-neutral-950">
                        <Link href={leafUrl} className="hover:text-blue-700 hover:underline">{title}</Link>
                      </h3>
                      <p className="mt-1 text-sm text-neutral-600">{job.organization_name || "Recruiting organisation not specified"}</p>
                      <p className="mt-2 text-sm leading-6 text-neutral-700">
                        {job.recruitment_name !== title
                          ? `Part of ${job.recruitment_name} recruitment.`
                          : `Official recruitment details for ${job.recruitment_name}.`}
                        {job.state_code ? ` Location/state code: ${job.state_code}.` : ""}
                        {job.vacancies ? ` ${job.vacancies.toLocaleString("en-IN")} verified vacancies are recorded for this post.` : ""}
                      </p>
                      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                        {job.vacancies ? (
                          <div><dt className="inline text-neutral-500">Vacancies: </dt><dd className="inline font-semibold text-neutral-900">{job.vacancies.toLocaleString("en-IN")}</dd></div>
                        ) : null}
                        {notified ? (
                          <div><dt className="inline text-neutral-500">Notification date: </dt><dd className="inline font-medium text-neutral-800">{notified}</dd></div>
                        ) : null}
                        {deadline ? (
                          <div><dt className="inline text-neutral-500">Application deadline: </dt><dd className="inline font-semibold text-neutral-900">{deadline}</dd></div>
                        ) : (
                          <div><dt className="inline text-neutral-500">Application deadline: </dt><dd className="inline text-neutral-700">Check official notification</dd></div>
                        )}
                      </dl>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                      <Link href={leafUrl} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        View job details
                      </Link>
                      <Link href={hubUrl} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:border-blue-400 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        Recruitment hub
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
            <p className="font-medium text-neutral-900">Latest jobs are temporarily unavailable.</p>
            <p className="mt-1 text-sm text-neutral-600">Use the all-jobs directory to continue browsing current recruitment notices.</p>
            <Link href="/jobs" className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Browse all jobs</Link>
          </div>
        )}
      </section>

      <section aria-labelledby="more-reports" className="mt-12 border-t border-neutral-200 pt-8">
        <h2 id="more-reports" className="text-xl font-bold text-neutral-900">Explore more government job reports</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          Use focused reports to narrow opportunities by sector or location. Each report should add a distinct view of the same canonical job data rather than create duplicate job pages.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/categories/psu" className="rounded-xl border border-neutral-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <span className="block font-semibold text-neutral-900">PSU Jobs</span>
            <span className="mt-1 block text-sm text-neutral-600">Public-sector undertakings and their recruitment notifications.</span>
          </Link>
          <Link href="/states" className="rounded-xl border border-neutral-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <span className="block font-semibold text-neutral-900">State Government Jobs</span>
            <span className="mt-1 block text-sm text-neutral-600">Browse government opportunities by state and union territory.</span>
          </Link>
          <Link href="/jobs?filter=open&kind=GOVERNMENT" className="rounded-xl border border-neutral-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <span className="block font-semibold text-neutral-900">Applications Open</span>
            <span className="mt-1 block text-sm text-neutral-600">Find government recruitment where applications are currently open.</span>
          </Link>
        </div>
      </section>

      <section className="mt-10 rounded-xl bg-neutral-50 p-5 text-sm leading-6 text-neutral-600">
        <h2 className="font-semibold text-neutral-900">How to use this report</h2>
        <p className="mt-2">
          The job-detail page contains post-specific information; the recruitment hub provides the broader notification, organisation context and related posts. Always confirm eligibility, dates, fees and application instructions in the official notification before applying. Vacancy totals are shown only when the stored record is marked verified.
        </p>
      </section>
    </main>
  );
}
