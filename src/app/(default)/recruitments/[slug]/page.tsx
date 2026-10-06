/**
 * Recruitment hub page — /recruitments/[slug]
 *
 * Universal 5-question structure for multi-post government recruitments:
 *   Q1  What is this recruitment?         (overview, org, dates, official number)
 *   Q2  Can I apply / am I eligible?      (vacancy comparison table by category)
 *   Q3  What do I need to qualify?        (per-post eligibility, age, fee)
 *   Q4  How does the process work?        (selection stages, exam dates)
 *   Q5  What's next / where do I apply?   (important links, per-post CTA)
 *
 * The hub slug is recruitments.slug (internal DB slug).
 * The advertisementNumber field (e.g. "12/2026") is shown as a breadcrumb
 * label once available; it is also indexed for lookup but does not change
 * the public URL (that stays /recruitments/[internal-slug]).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { recruitments, posts, postings } from "@/db/schema";
import type { ReservationMatrix } from "@/db/schema";
import { absoluteUrl } from "@/lib/site";
import { eq, inArray } from "drizzle-orm";
import { safeQuery } from "@/lib/safe-query";

export const revalidate = 300;

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ slug: string }> };

type PostingSlot = {
  inferredPostId: number | null;
  slug: string;
  title: string;
  eligibility: string | null;
  ageLimitMin: number | null;
  ageLimitMax: number | null;
  ageRelaxationNotes: string | null;
  officialNotificationUrl: string | null;
  applyUrl: string | null;
  applicationFeeGeneral: number | null;
  applicationFeeReserved: number | null;
  currentStage: string;
  validThrough: Date | null;
  extraContent: any;
  datePosted: Date;
  updatedAt: Date;
};

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getHub(slug: string) {
  const db = getDb();
  if (!db) return null;

  const result = await db.query.recruitments.findFirst({
    where: eq(recruitments.slug, slug),
    with: {
      organization: true,
      exam: true,
      posts: {
        with: { position: true },
        orderBy: (p, { asc }) => [asc(p.name)],
      },
    },
  });

  return result ?? null;
}

async function getPostingsForPosts(postIds: number[]): Promise<Map<number, PostingSlot>> {
  if (postIds.length === 0) return new Map();
  const db = getDb();
  if (!db) return new Map();

  const rows = await db
    .select({
      inferredPostId: postings.inferredPostId,
      slug: postings.slug,
      title: postings.title,
      eligibility: postings.eligibility,
      ageLimitMin: postings.ageLimitMin,
      ageLimitMax: postings.ageLimitMax,
      ageRelaxationNotes: postings.ageRelaxationNotes,
      officialNotificationUrl: postings.officialNotificationUrl,
      applyUrl: postings.applyUrl,
      applicationFeeGeneral: postings.applicationFeeGeneral,
      applicationFeeReserved: postings.applicationFeeReserved,
      currentStage: postings.currentStage,
      validThrough: postings.validThrough,
      extraContent: postings.extraContent,
      datePosted: postings.datePosted,
      updatedAt: postings.updatedAt,
    })
    .from(postings)
    .where(inArray(postings.inferredPostId, postIds));

  const map = new Map<number, PostingSlot>();
  for (const row of rows) {
    if (row.inferredPostId != null) {
      map.set(row.inferredPostId, row as PostingSlot);
    }
  }
  return map;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "Not mentioned in notification";
  return new Date(d).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fmtDateShort(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function payLabel(payLevel: Record<string, unknown> | null | undefined): string | null {
  if (!payLevel) return null;
  const level = payLevel.level as string | undefined;
  const scheme = payLevel.scheme as string | undefined;
  const min = payLevel.min as number | undefined;
  const max = payLevel.max as number | undefined;
  if (min && max) {
    const range = `₹${min.toLocaleString("en-IN")} – ₹${max.toLocaleString("en-IN")}`;
    if (level && scheme) return `Level-${level} (${scheme}) · ${range}`;
    return range;
  }
  if (level && scheme) return `Level-${level} (${scheme})`;
  return null;
}

function statusBadge(status: string, daysToClose: number | null) {
  if (daysToClose !== null && daysToClose <= 0)
    return { label: "Closed", cls: "bg-red-100 text-red-800 border-red-200" };
  if (daysToClose !== null && daysToClose <= 3)
    return { label: `Closing in ${daysToClose}d`, cls: "bg-orange-100 text-orange-800 border-orange-200" };
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE:    { label: "Applications Open", cls: "bg-green-100 text-green-800 border-green-200" },
    UPCOMING:  { label: "Upcoming",          cls: "bg-blue-100 text-blue-800 border-blue-200" },
    CLOSED:    { label: "Closed",            cls: "bg-neutral-100 text-neutral-700 border-neutral-200" },
    RESULT_PENDING: { label: "Result Pending", cls: "bg-purple-100 text-purple-800 border-purple-200" },
    COMPLETED: { label: "Completed",         cls: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  };
  return map[status] ?? { label: status, cls: "bg-neutral-100 text-neutral-700 border-neutral-200" };
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const hub = await safeQuery(() => getHub(slug), null);
  if (!hub) return {};

  const org = hub.organization as any;
  const totalVac = (hub.posts || []).reduce((s: number, p: any) => s + (p.vacancyTotal || 0), 0);
  const advNo = hub.advertisementNumber ?? hub.officialNotificationNumber;

  const title = advNo
    ? `${hub.name} — Advt. No. ${advNo} — ${hub.year}`
    : `${hub.name} — ${hub.year} Recruitment`;

  const description =
    hub.description ||
    `${hub.name}${totalVac ? ` · ${totalVac} vacancies` : ""}${hub.applicationEndDate ? ` · Last date ${fmtDateShort(hub.applicationEndDate)}` : ""}. Eligibility, application dates, vacancy breakdown and official links — ${org?.name ?? "official"}.`;

  const canonical = `/recruitments/${hub.slug}`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(canonical) },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonical),
      type: "website",
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function RecruitmentHubPage({ params }: Props) {
  const { slug } = await params;
  const hub = await safeQuery(() => getHub(slug), null);
  if (!hub) notFound();

  const org = hub.organization as any;
  const exam = (hub as any).exam;
  const hubPosts: any[] = hub.posts ?? [];

  const postingMap = await safeQuery(
    () => getPostingsForPosts(hubPosts.map((p: any) => p.id)),
    new Map<number, PostingSlot>(),
  );

  const totalVacancies = hubPosts.reduce((s: number, p: any) => s + (p.vacancyTotal || 0), 0);
  const advNo = hub.advertisementNumber ?? hub.officialNotificationNumber;

  const now = Date.now();
  const daysToClose = hub.applicationEndDate
    ? Math.ceil((hub.applicationEndDate.getTime() - now) / 86_400_000)
    : null;
  const badge = statusBadge(hub.status, daysToClose);

  // Representative URLs from any linked posting when hub itself lacks them
  const anyPosting = postingMap.size > 0 ? [...postingMap.values()][0] : null;
  const notificationUrl = hub.notificationUrl ?? anyPosting?.officialNotificationUrl ?? null;
  const applyUrl = anyPosting?.applyUrl ?? null;

  const lastVerified = [...postingMap.values()]
    .map((p) => p.updatedAt)
    .reduce<Date | null>((best, d) => (!best || d > best ? d : best), null)
    ?? (hub.updatedAt ? new Date(hub.updatedAt) : null);

  // ── Vacancy comparison table ───────────────────────────────────────────────
  // Does any post have category-level breakdown?
  const hasMatrix = hubPosts.some((p: any) => {
    const lp = postingMap.get(p.id);
    return lp?.extraContent?.reservationMatrix?.rows?.length;
  });

  const SECTION = "mb-8 rounded-xl border border-black/8 bg-white dark:border-white/8 dark:bg-neutral-900";
  const SECTION_HEAD = "border-b border-black/8 px-5 py-4 font-semibold dark:border-white/8";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 text-sm">

      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-neutral-500">
        <Link href="/jobs" className="hover:underline">Jobs</Link>
        <span>/</span>
        {org?.slug && (
          <>
            <Link href={`/commissions/${org.slug}`} className="hover:underline">{org.name}</Link>
            <span>/</span>
          </>
        )}
        <span className="truncate text-neutral-700 dark:text-neutral-300">
          {advNo ? `Advt. No. ${advNo}` : hub.name}
        </span>
      </nav>

      {/* ── Q1: What is this? ────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
            {badge.label}
          </span>
          {hub.year && (
            <span className="rounded-full border border-black/10 px-2.5 py-0.5 text-xs text-neutral-600 dark:border-white/10 dark:text-neutral-400">
              {hub.year}
            </span>
          )}
          {hubPosts.length > 0 && (
            <span className="rounded-full border border-black/10 px-2.5 py-0.5 text-xs text-neutral-600 dark:border-white/10 dark:text-neutral-400">
              {hubPosts.length} post{hubPosts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold tracking-tight">{hub.name}</h1>

        {org && (
          <p className="mt-1 text-neutral-500">
            {org.slug
              ? <Link href={`/commissions/${org.slug}`} className="hover:underline">{org.name}</Link>
              : org.name}
            {advNo && <> · Advt. No. {advNo}</>}
          </p>
        )}

        {hub.description && (
          <p className="mt-3 leading-relaxed text-neutral-700 dark:text-neutral-300">{hub.description}</p>
        )}
      </div>

      {/* ── Key stats strip ──────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Total Vacancies",
            value: totalVacancies > 0 ? totalVacancies.toLocaleString("en-IN") : "—",
            highlight: totalVacancies > 0,
          },
          {
            label: "Last Date",
            value: hub.applicationEndDate ? fmtDateShort(hub.applicationEndDate) : "—",
            highlight: daysToClose !== null && daysToClose <= 7 && daysToClose > 0,
          },
          {
            label: "Exam Date",
            value: hub.examDate ? fmtDateShort(hub.examDate) : "—",
            highlight: false,
          },
          {
            label: "Notification",
            value: hub.notificationDate ? fmtDateShort(hub.notificationDate) : "—",
            highlight: false,
          },
        ].map(({ label, value, highlight }) => (
          <div
            key={label}
            className={`rounded-lg border p-3 ${highlight ? "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950" : "border-black/8 dark:border-white/8"}`}
          >
            <div className="text-xs text-neutral-500">{label}</div>
            <div className={`mt-0.5 font-semibold ${highlight ? "text-orange-800 dark:text-orange-300" : ""}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Q2: Can I apply? — Vacancy comparison table ──────────────────── */}
      <div className={SECTION}>
        <div className={SECTION_HEAD}>Vacancy Breakdown</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black/8 bg-neutral-50 text-left dark:border-white/8 dark:bg-neutral-800">
                <th className="px-4 py-2.5 font-medium">Post</th>
                <th className="px-4 py-2.5 font-medium text-right">Total</th>
                <th className="px-4 py-2.5 font-medium text-right">UR</th>
                <th className="px-4 py-2.5 font-medium text-right">EWS</th>
                <th className="px-4 py-2.5 font-medium text-right">OBC</th>
                <th className="px-4 py-2.5 font-medium text-right">SC</th>
                <th className="px-4 py-2.5 font-medium text-right">ST</th>
                <th className="px-4 py-2.5 font-medium text-right">PwBD</th>
              </tr>
            </thead>
            <tbody>
              {hubPosts.map((post: any) => {
                const lp = postingMap.get(post.id);
                // Prefer vacancyDetails on the post row (denormalised),
                // fall back to reservationMatrix first row in extraContent.
                const vd: any =
                  post.vacancyDetails ??
                  lp?.extraContent?.reservationMatrix?.rows?.[0] ??
                  null;

                return (
                  <tr
                    key={post.id}
                    className="border-b border-black/5 last:border-0 hover:bg-neutral-50 dark:border-white/5 dark:hover:bg-neutral-800"
                  >
                    <td className="px-4 py-2.5">
                      {lp ? (
                        <Link href={`/jobs/${lp.slug}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                          {post.name}
                        </Link>
                      ) : (
                        <span className="font-medium">{post.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">
                      {post.vacancyTotal ?? vd?.total ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">{vd?.ur ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right">{vd?.ews ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right">{vd?.obc ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right">{vd?.sc ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right">{vd?.st ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right">{vd?.pwbdHorizontal ?? "—"}</td>
                  </tr>
                );
              })}
              {/* Totals row */}
              {hubPosts.length > 1 && (
                <tr className="border-t-2 border-black/10 bg-neutral-50 font-semibold dark:border-white/10 dark:bg-neutral-800">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="px-4 py-2.5 text-right">{totalVacancies > 0 ? totalVacancies : "—"}</td>
                  {(["ur","ews","obc","sc","st"] as const).map((cat) => {
                    const sum = hubPosts.reduce((s: number, p: any) => {
                      const lp = postingMap.get(p.id);
                      const vd: any = p.vacancyDetails ?? lp?.extraContent?.reservationMatrix?.rows?.[0] ?? null;
                      return s + (vd?.[cat] ?? 0);
                    }, 0);
                    return <td key={cat} className="px-4 py-2.5 text-right">{sum > 0 ? sum : "—"}</td>;
                  })}
                  <td className="px-4 py-2.5 text-right">
                    {(() => {
                      const sum = hubPosts.reduce((s: number, p: any) => {
                        const lp = postingMap.get(p.id);
                        const vd: any = p.vacancyDetails ?? lp?.extraContent?.reservationMatrix?.rows?.[0] ?? null;
                        return s + (vd?.pwbdHorizontal ?? 0);
                      }, 0);
                      return sum > 0 ? sum : "—";
                    })()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2.5 text-xs text-neutral-500">
          UR = Unreserved · EWS = Economically Weaker Sections · OBC = OBC (Non-Creamy Layer) · PwBD = Persons with Benchmark Disabilities (horizontal reservation)
        </p>
      </div>

      {/* ── Q3: What do I need? — Per-post eligibility ───────────────────── */}
      {hubPosts.length > 0 && (
        <div className={SECTION}>
          <div className={SECTION_HEAD}>Eligibility at a Glance</div>
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {hubPosts.map((post: any) => {
              const lp = postingMap.get(post.id);
              const pl = payLabel((post as any).payLevel);
              const ageMin = lp?.ageLimitMin;
              const ageMax = lp?.ageLimitMax;
              const ageStr = ageMin && ageMax
                ? `${ageMin}–${ageMax} years`
                : ageMax
                  ? `Up to ${ageMax} years`
                  : ageMin
                    ? `Min ${ageMin} years`
                    : null;

              return (
                <div key={post.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {lp ? (
                        <Link href={`/jobs/${lp.slug}`} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                          {post.name}
                        </Link>
                      ) : (
                        <span className="font-semibold">{post.name}</span>
                      )}
                      {(post as any).position?.name && (
                        <span className="ml-2 text-xs text-neutral-500">
                          · {(post as any).position.name}
                        </span>
                      )}
                    </div>
                    {post.vacancyTotal && (
                      <div className="shrink-0 text-right">
                        <div className="text-lg font-bold text-green-700 dark:text-green-400">{post.vacancyTotal}</div>
                        <div className="text-xs text-neutral-500">vacancies</div>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                    {lp?.eligibility && (
                      <div>
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">Eligibility: </span>
                        <span className="text-neutral-600 dark:text-neutral-400">{lp.eligibility}</span>
                      </div>
                    )}
                    {ageStr && (
                      <div>
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">Age: </span>
                        <span className="text-neutral-600 dark:text-neutral-400">
                          {ageStr}
                          {lp?.ageRelaxationNotes && (
                            <span className="text-neutral-400"> (relaxation applies)</span>
                          )}
                        </span>
                      </div>
                    )}
                    {pl && (
                      <div>
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">Pay: </span>
                        <span className="text-neutral-600 dark:text-neutral-400">{pl}</span>
                      </div>
                    )}
                    {lp?.applicationFeeGeneral != null && (
                      <div>
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">Fee: </span>
                        <span className="text-neutral-600 dark:text-neutral-400">
                          {lp.applicationFeeGeneral === 0
                            ? "No fee"
                            : `₹${lp.applicationFeeGeneral} (General)`}
                          {lp.applicationFeeReserved != null && lp.applicationFeeReserved !== lp.applicationFeeGeneral
                            ? lp.applicationFeeReserved === 0
                              ? " · Nil (SC/ST/PwBD)"
                              : ` · ₹${lp.applicationFeeReserved} (SC/ST/PwBD)`
                            : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {lp && (
                    <div className="mt-3">
                      <Link
                        href={`/jobs/${lp.slug}`}
                        className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Full eligibility, age table &amp; interactive checker →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Q4: How does the process work? — Dates ───────────────────────── */}
      {(hub.notificationDate || hub.applicationStartDate || hub.applicationEndDate || hub.examDate || hub.resultDate) && (
        <div className={SECTION}>
          <div className={SECTION_HEAD}>Important Dates</div>
          <table className="w-full text-sm">
            <tbody>
              {[
                { label: "Notification Released", date: hub.notificationDate },
                { label: "Application Opens",     date: hub.applicationStartDate },
                { label: "Last Date to Apply",    date: hub.applicationEndDate, highlight: true },
                { label: "Exam Date",             date: hub.examDate },
                { label: "Result",                date: hub.resultDate },
              ]
                .filter((r) => r.date)
                .map(({ label, date, highlight }) => (
                  <tr
                    key={label}
                    className={`border-b border-black/5 last:border-0 dark:border-white/5 ${highlight && daysToClose !== null && daysToClose <= 3 ? "bg-orange-50 dark:bg-orange-950" : ""}`}
                  >
                    <td className="px-5 py-3 font-medium text-neutral-700 dark:text-neutral-300">{label}</td>
                    <td className="px-5 py-3">{fmtDate(date)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Q5: What's next? — Official links + per-post apply CTAs ─────── */}
      <div className={SECTION}>
        <div className={SECTION_HEAD}>Official Links</div>
        <div className="divide-y divide-black/5 p-4 dark:divide-white/5">

          {/* Hub-level links */}
          <div className="space-y-2 pb-4">
            {notificationUrl && (
              <a
                href={notificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                <span>📄</span>
                <div className="flex-1">
                  <div className="font-medium">Official Notification</div>
                  <div className="text-xs text-neutral-500">
                    {advNo ? `Advt. No. ${advNo}` : "Official PDF"} — {org?.name ?? "Issuing authority"}
                  </div>
                </div>
                <span className="text-neutral-400">→</span>
              </a>
            )}
            {org?.websiteUrl && (
              <a
                href={org.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                <span>🌐</span>
                <div className="flex-1">
                  <div className="font-medium">Official Website</div>
                  <div className="text-xs text-neutral-500">{org.name}</div>
                </div>
                <span className="text-neutral-400">→</span>
              </a>
            )}
            {!notificationUrl && !org?.websiteUrl && (
              <p className="py-2 text-xs text-neutral-500">
                Official links — verify against the official notification before applying.
              </p>
            )}
          </div>

          {/* Per-post apply links */}
          {hubPosts.some((p: any) => postingMap.get(p.id)?.applyUrl) && (
            <div className="pt-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Apply per post</div>
              <div className="space-y-2">
                {hubPosts.map((post: any) => {
                  const lp = postingMap.get(post.id);
                  if (!lp?.applyUrl) return null;
                  return (
                    <a
                      key={post.id}
                      href={lp.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:hover:bg-blue-900"
                    >
                      <span>✏️</span>
                      <div className="flex-1">
                        <div className="font-medium text-blue-900 dark:text-blue-100">Apply — {post.name}</div>
                        <div className="text-xs text-blue-700 dark:text-blue-400">Official portal</div>
                      </div>
                      <span className="text-blue-400">→</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Per-post detail cards (deep link to 5-question pages) ────────── */}
      <div className={SECTION}>
        <div className={SECTION_HEAD}>Posts in This Recruitment</div>
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {hubPosts.map((post: any) => {
            const lp = postingMap.get(post.id);
            const stage = lp?.currentStage;
            const stageLabels: Record<string, string> = {
              APPLICATION_OPEN: "Applications Open",
              APPLICATION_CLOSED: "Applications Closed",
              ADMIT_CARD_RELEASED: "Admit Card Released",
              EXAM_SCHEDULED: "Exam Scheduled",
              RESULT_OUT: "Result Out",
              FINAL_RESULT_OUT: "Final Result",
              NOTIFICATION_OUT: "Notification Out",
            };

            return (
              <div key={post.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div>
                  <div className="font-medium">
                    {lp ? (
                      <Link href={`/jobs/${lp.slug}`} className="text-blue-600 hover:underline dark:text-blue-400">
                        {post.name}
                      </Link>
                    ) : (
                      post.name
                    )}
                  </div>
                  {stage && (
                    <div className="mt-0.5 text-xs text-neutral-500">
                      {stageLabels[stage] ?? stage}
                      {lp?.validThrough && (
                        <> · Last date {fmtDateShort(lp.validThrough)}</>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {post.vacancyTotal && (
                    <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                      {post.vacancyTotal} vacancies
                    </span>
                  )}
                  {lp && (
                    <Link
                      href={`/jobs/${lp.slug}`}
                      className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                      View details
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Source & trust footer ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-900 dark:bg-green-950">
        <p className="font-semibold text-green-900 dark:text-green-200">Source &amp; Verification</p>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          All information is drawn from the official government notification published by {org?.name ?? "the issuing authority"}.
          {advNo && ` Advertisement No. ${advNo}.`}
          {" "}Verify details in the official notification before applying.
        </p>
        {lastVerified && (
          <p className="mt-2 text-xs text-neutral-500">
            Last verified: {lastVerified.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}
      </div>

    </div>
  );
}
