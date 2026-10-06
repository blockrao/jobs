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
import {
  Calendar,
  Users,
  ClipboardList,
  Clock,
  FileText,
  ExternalLink,
  ChevronRight,
  Building2,
  CheckCircle,
  Info,
  AlertTriangle,
} from "lucide-react";

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

function statusInfo(status: string, daysToClose: number | null): {
  label: string;
  color: "green" | "amber" | "red" | "neutral";
} {
  if (daysToClose !== null && daysToClose <= 0)
    return { label: "Closed", color: "red" };
  if (daysToClose !== null && daysToClose <= 3)
    return { label: `Closing in ${daysToClose}d`, color: "red" };
  const map: Record<string, { label: string; color: "green" | "amber" | "red" | "neutral" }> = {
    ACTIVE:         { label: "Applications Open",  color: "green" },
    UPCOMING:       { label: "Upcoming",            color: "amber" },
    CLOSED:         { label: "Closed",              color: "neutral" },
    RESULT_PENDING: { label: "Result Pending",      color: "amber" },
    COMPLETED:      { label: "Completed",           color: "neutral" },
  };
  return map[status] ?? { label: status, color: "neutral" };
}

// ── Section layout helpers ─────────────────────────────────────────────────────

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-black/8 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-black/8 px-5 py-4">
      {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-neutral-400" />}
      <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
    </div>
  );
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
  const status = statusInfo(hub.status, daysToClose);

  const statusStyles = {
    green:   { pill: "bg-green-100 text-green-800 border-green-200",   dot: "bg-green-500" },
    amber:   { pill: "bg-amber-100 text-amber-800 border-amber-200",   dot: "bg-amber-500" },
    red:     { pill: "bg-red-100 text-red-800 border-red-200",         dot: "bg-red-500" },
    neutral: { pill: "bg-neutral-100 text-neutral-700 border-neutral-200", dot: "bg-neutral-400" },
  };

  // Representative URLs from any linked posting when hub itself lacks them
  const anyPosting = postingMap.size > 0 ? [...postingMap.values()][0] : null;
  const notificationUrl = hub.notificationUrl ?? anyPosting?.officialNotificationUrl ?? null;
  const applyUrl = anyPosting?.applyUrl ?? null;

  const lastVerified = [...postingMap.values()]
    .map((p) => p.updatedAt)
    .reduce<Date | null>((best, d) => (!best || d > best ? d : best), null)
    ?? (hub.updatedAt ? new Date(hub.updatedAt) : null);

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
    <div className="mx-auto max-w-5xl px-4 py-8 text-sm">

      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-xs text-neutral-400">
        <Link href="/jobs" className="hover:text-neutral-700 hover:underline">Jobs</Link>
        <ChevronRight className="h-3 w-3" />
        {org?.slug && (
          <>
            <Link href={`/commissions/${org.slug}`} className="hover:text-neutral-700 hover:underline">{org.name}</Link>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <span className="text-neutral-600 truncate">
          {advNo ? `Advt. No. ${advNo}` : hub.name}
        </span>
      </nav>

      {/* ── Q1: What is this? ──────────────────────────────────────────────── */}
      <div className="mb-6">
        {/* Status badge + meta pills */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${statusStyles[status.color].pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusStyles[status.color].dot}`} aria-hidden="true" />
            {status.label}
          </span>
          {hub.year && (
            <span className="rounded-full border border-black/10 px-2.5 py-0.5 text-xs text-neutral-500">
              {hub.year}
            </span>
          )}
          {hubPosts.length > 0 && (
            <span className="rounded-full border border-black/10 px-2.5 py-0.5 text-xs text-neutral-500">
              {hubPosts.length} post{hubPosts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{hub.name}</h1>

        {org && (
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-neutral-500">
            <Building2 className="h-3.5 w-3.5" />
            {org.slug
              ? <Link href={`/commissions/${org.slug}`} className="font-medium text-neutral-700 hover:underline">{org.name}</Link>
              : <span className="font-medium text-neutral-700">{org.name}</span>}
            {advNo && <span className="text-neutral-400">· Advt. No. {advNo}</span>}
          </p>
        )}

        {hub.description && (
          <p className="mt-3 leading-relaxed text-neutral-700">{hub.description}</p>
        )}
      </div>

      {/* ── Hero stat strip ─────────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Vacancies */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-500">
            <Users className="h-3.5 w-3.5" />
            Total Vacancies
          </div>
          <p className="mt-1.5 text-2xl font-bold text-indigo-900">
            {totalVacancies > 0 ? totalVacancies.toLocaleString("en-IN") : "—"}
          </p>
          {hubPosts.length > 1 && (
            <p className="mt-0.5 text-xs text-indigo-600">{hubPosts.length} posts</p>
          )}
        </div>

        {/* Last Date */}
        <div className={`rounded-xl border p-4 ${
          daysToClose !== null && daysToClose >= 0 && daysToClose <= 7
            ? "border-red-200 bg-red-50"
            : daysToClose !== null && daysToClose >= 0 && daysToClose <= 30
              ? "border-amber-100 bg-amber-50"
              : hub.applicationEndDate
                ? "border-green-100 bg-green-50"
                : "border-neutral-100 bg-neutral-50"
        }`}>
          <div className={`flex items-center gap-1.5 text-xs font-medium ${
            daysToClose !== null && daysToClose >= 0 && daysToClose <= 7
              ? "text-red-500"
              : daysToClose !== null && daysToClose >= 0 && daysToClose <= 30
                ? "text-amber-600"
                : hub.applicationEndDate
                  ? "text-green-600"
                  : "text-neutral-500"
          }`}>
            <Calendar className="h-3.5 w-3.5" />
            Last Date
          </div>
          <p className={`mt-1.5 text-base font-bold ${
            daysToClose !== null && daysToClose >= 0 && daysToClose <= 7
              ? "text-red-900"
              : daysToClose !== null && daysToClose >= 0 && daysToClose <= 30
                ? "text-amber-900"
                : hub.applicationEndDate
                  ? "text-green-900"
                  : "text-neutral-700"
          }`}>
            {hub.applicationEndDate ? fmtDateShort(hub.applicationEndDate) : "—"}
          </p>
          {daysToClose !== null && daysToClose >= 0 && (
            <p className={`mt-0.5 text-xs font-medium ${daysToClose <= 7 ? "text-red-600" : "text-amber-600"}`}>
              {daysToClose === 0 ? "Today!" : `${daysToClose} day${daysToClose === 1 ? "" : "s"} left`}
            </p>
          )}
          {daysToClose !== null && daysToClose < 0 && (
            <p className="mt-0.5 text-xs text-neutral-500">Closed</p>
          )}
        </div>

        {/* Exam Date */}
        <div className={`rounded-xl border p-4 ${hub.examDate ? "border-blue-100 bg-blue-50" : "border-neutral-100 bg-neutral-50"}`}>
          <div className={`flex items-center gap-1.5 text-xs font-medium ${hub.examDate ? "text-blue-500" : "text-neutral-400"}`}>
            <ClipboardList className="h-3.5 w-3.5" />
            Exam Date
          </div>
          <p className={`mt-1.5 text-base font-bold ${hub.examDate ? "text-blue-900" : "text-neutral-400"}`}>
            {hub.examDate ? fmtDateShort(hub.examDate) : "—"}
          </p>
        </div>

        {/* Notification Date */}
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-400">
            <FileText className="h-3.5 w-3.5" />
            Notification
          </div>
          <p className="mt-1.5 text-base font-bold text-neutral-700">
            {hub.notificationDate ? fmtDateShort(hub.notificationDate) : "—"}
          </p>
        </div>
      </div>

      {/* CTA row */}
      {(notificationUrl || applyUrl) && (
        <div className="mb-8 flex flex-col gap-2 sm:flex-row">
          {applyUrl && status.color === "green" && (
            <a
              href={applyUrl}
              target="_blank"
              rel="noopener nofollow"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-700 active:scale-[0.98]"
            >
              Apply Now
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {notificationUrl && (
            <a
              href={notificationUrl}
              target="_blank"
              rel="noopener nofollow"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-50 active:scale-[0.98]"
            >
              <FileText className="h-3.5 w-3.5" />
              Official Notification (PDF)
            </a>
          )}
        </div>
      )}

      <div className="space-y-4">

        {/* ── Q2: Vacancy Breakdown ──────────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader icon={Users} title="Vacancy Breakdown" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50">
                  <th className="border-b border-black/8 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Post</th>
                  <th className="border-b border-black/8 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">Total</th>
                  <th className="border-b border-black/8 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">UR</th>
                  <th className="border-b border-black/8 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">EWS</th>
                  <th className="border-b border-black/8 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">OBC</th>
                  <th className="border-b border-black/8 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">SC</th>
                  <th className="border-b border-black/8 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">ST</th>
                  <th className="border-b border-black/8 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">PwBD</th>
                </tr>
              </thead>
              <tbody>
                {hubPosts.map((post: any, ri: number) => {
                  const lp = postingMap.get(post.id);
                  const vd: any =
                    post.vacancyDetails ??
                    lp?.extraContent?.reservationMatrix?.rows?.[0] ??
                    null;

                  return (
                    <tr
                      key={post.id}
                      className={`border-b border-black/5 last:border-0 hover:bg-neutral-50 ${ri % 2 !== 0 ? "bg-neutral-50/50" : ""}`}
                    >
                      <td className="px-4 py-2.5">
                        {lp ? (
                          <Link href={`/jobs/${lp.slug}`} className="font-medium text-indigo-700 hover:underline">
                            {post.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-neutral-800">{post.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-neutral-900">
                        {post.vacancyTotal ?? vd?.total ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-neutral-600">{vd?.ur ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right text-neutral-600">{vd?.ews ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right text-neutral-600">{vd?.obc ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right text-neutral-600">{vd?.sc ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right text-neutral-600">{vd?.st ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right text-neutral-600">{vd?.pwbdHorizontal ?? "—"}</td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                {hubPosts.length > 1 && (
                  <tr className="border-t-2 border-black/10 bg-indigo-50 font-semibold">
                    <td className="px-4 py-2.5 text-indigo-900">Total</td>
                    <td className="px-4 py-2.5 text-right text-indigo-900">{totalVacancies > 0 ? totalVacancies : "—"}</td>
                    {(["ur","ews","obc","sc","st"] as const).map((cat) => {
                      const sum = hubPosts.reduce((s: number, p: any) => {
                        const lp = postingMap.get(p.id);
                        const vd: any = p.vacancyDetails ?? lp?.extraContent?.reservationMatrix?.rows?.[0] ?? null;
                        return s + (vd?.[cat] ?? 0);
                      }, 0);
                      return <td key={cat} className="px-4 py-2.5 text-right text-indigo-900">{sum > 0 ? sum : "—"}</td>;
                    })}
                    <td className="px-4 py-2.5 text-right text-indigo-900">
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
          <p className="px-4 py-2.5 text-xs text-neutral-400">
            UR = Unreserved · EWS = Economically Weaker Sections · OBC = OBC (Non-Creamy Layer) · PwBD = Persons with Benchmark Disabilities (horizontal)
          </p>
        </SectionCard>

        {/* ── Q3: Eligibility at a Glance ───────────────────────────────────── */}
        {hubPosts.length > 0 && (
          <SectionCard>
            <SectionHeader icon={CheckCircle} title="Eligibility at a Glance" />
            <div className="divide-y divide-black/5">
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
                          <Link href={`/jobs/${lp.slug}`} className="font-semibold text-indigo-700 hover:underline">
                            {post.name}
                          </Link>
                        ) : (
                          <span className="font-semibold text-neutral-900">{post.name}</span>
                        )}
                        {(post as any).position?.name && (
                          <span className="ml-2 text-xs text-neutral-400">
                            · {(post as any).position.name}
                          </span>
                        )}
                      </div>
                      {post.vacancyTotal && (
                        <div className="shrink-0 text-right">
                          <div className="text-xl font-bold text-indigo-700">{post.vacancyTotal}</div>
                          <div className="text-xs text-neutral-400">vacancies</div>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                      {lp?.eligibility && (
                        <div>
                          <span className="font-medium text-neutral-600">Eligibility: </span>
                          <span className="text-neutral-500">{lp.eligibility}</span>
                        </div>
                      )}
                      {ageStr && (
                        <div>
                          <span className="font-medium text-neutral-600">Age: </span>
                          <span className="text-neutral-500">
                            {ageStr}
                            {lp?.ageRelaxationNotes && (
                              <span className="text-neutral-400"> (relaxation applies)</span>
                            )}
                          </span>
                        </div>
                      )}
                      {pl && (
                        <div>
                          <span className="font-medium text-neutral-600">Pay: </span>
                          <span className="text-neutral-500">{pl}</span>
                        </div>
                      )}
                      {lp?.applicationFeeGeneral != null && (
                        <div>
                          <span className="font-medium text-neutral-600">Fee: </span>
                          <span className="text-neutral-500">
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
                          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                        >
                          Full eligibility, age table &amp; interactive checker
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* ── Q4: Important Dates ───────────────────────────────────────────── */}
        {(hub.notificationDate || hub.applicationStartDate || hub.applicationEndDate || hub.examDate || hub.resultDate) && (
          <SectionCard>
            <SectionHeader icon={Clock} title="Important Dates" />
            <table className="w-full border-collapse text-sm">
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
                      className={`border-b border-black/5 last:border-0 ${
                        highlight && daysToClose !== null && daysToClose >= 0 && daysToClose <= 3
                          ? "bg-red-50"
                          : ""
                      }`}
                    >
                      <td className="px-5 py-3 font-medium text-neutral-700">{label}</td>
                      <td className={`px-5 py-3 ${
                        highlight && daysToClose !== null && daysToClose >= 0 && daysToClose <= 7
                          ? "font-semibold text-red-700"
                          : "text-neutral-800"
                      }`}>
                        {fmtDate(date)}
                        {highlight && daysToClose !== null && daysToClose >= 0 && daysToClose <= 30 && (
                          <span className={`ml-2 text-xs font-medium ${daysToClose <= 7 ? "text-red-600" : "text-amber-600"}`}>
                            ({daysToClose === 0 ? "Today!" : `${daysToClose}d left`})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </SectionCard>
        )}

        {/* ── Q5: Official Links ─────────────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader icon={ExternalLink} title="Official Links" />
          <div className="p-4 space-y-2">
            {notificationUrl && (
              <a
                href={notificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 hover:bg-neutral-100 transition-colors"
              >
                <FileText className="h-4 w-4 flex-shrink-0 text-neutral-400" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-800">Official Notification</div>
                  <div className="text-xs text-neutral-500">
                    {advNo ? `Advt. No. ${advNo}` : "Official PDF"} — {org?.name ?? "Issuing authority"}
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
              </a>
            )}
            {org?.websiteUrl && (
              <a
                href={org.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 hover:bg-neutral-100 transition-colors"
              >
                <Building2 className="h-4 w-4 flex-shrink-0 text-neutral-400" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-800">Official Website</div>
                  <div className="text-xs text-neutral-500">{org.name}</div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
              </a>
            )}
            {!notificationUrl && !org?.websiteUrl && (
              <p className="py-2 text-xs italic text-neutral-400">
                Official links not on file — verify against the official notification before applying.
              </p>
            )}

            {/* Per-post apply links */}
            {hubPosts.some((p: any) => postingMap.get(p.id)?.applyUrl) && (
              <div className="pt-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Apply per post</p>
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
                        className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 hover:bg-indigo-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-indigo-900">Apply — {post.name}</div>
                          <div className="text-xs text-indigo-600">Official portal</div>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-indigo-400" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Posts in this Recruitment ─────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader icon={ClipboardList} title="Posts in This Recruitment" />
          <div className="divide-y divide-black/5">
            {hubPosts.map((post: any) => {
              const lp = postingMap.get(post.id);
              const stage = lp?.currentStage;

              return (
                <div key={post.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-neutral-900">
                      {lp ? (
                        <Link href={`/jobs/${lp.slug}`} className="text-indigo-700 hover:underline">
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
                      <span className="text-xs font-semibold text-indigo-700">
                        {post.vacancyTotal} vacancies
                      </span>
                    )}
                    {lp && (
                      <Link
                        href={`/jobs/${lp.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                      >
                        View details
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

      </div>

      {/* ── Source & trust footer ──────────────────────────────────────────── */}
      <div className="mt-6 rounded-xl border border-black/8 bg-neutral-50 p-5 text-sm">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          <CheckCircle className="h-3.5 w-3.5" />
          Source &amp; Verification
        </p>
        <p className="text-xs text-neutral-600">
          All information is drawn from the official government notification published by{" "}
          {org?.name ?? "the issuing authority"}.
          {advNo && ` Advertisement No. ${advNo}.`}
          {" "}Verify details in the official notification before applying.
        </p>
        {lastVerified && (
          <p className="mt-2 text-xs text-neutral-400">
            Last verified: {lastVerified.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}
      </div>

    </div>
  );
}
