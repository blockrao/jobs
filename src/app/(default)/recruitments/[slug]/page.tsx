/**
 * Recruitment hub page — /recruitments/[slug]
 *
 * Universal 5-question structure (JobOye Universal Job Page Structure):
 *   Q1  What is this?              — status, title, org, 8-fact grid, CTAs, provenance
 *   Q2  Can I apply?               — vacancy breakdown table by post & category
 *   Q3  What do I need?            — per-post eligibility, age, fee
 *   Q4  How does it work?          — important dates / process timeline
 *   Q5  What's next?               — official links, per-post CTA strip
 */

import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { recruitments, postings } from "@/db/schema";
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
  Hash,
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

// ── Layout helpers ────────────────────────────────────────────────────────────

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
  label,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-black/8 px-5 py-4">
      {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-neutral-400" />}
      <h2 className="flex-1 text-base font-semibold text-neutral-900">{title}</h2>
      {label && (
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          {label}
        </span>
      )}
    </div>
  );
}

function SubDivider() {
  return <div className="mx-5 border-t border-black/5" />;
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <h3 className="mb-3 text-sm font-semibold text-neutral-700">{title}</h3>
      {children}
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

  // Status pill
  const statusInfo = (): { label: string; color: "green" | "amber" | "red" | "neutral" } => {
    if (daysToClose !== null && daysToClose <= 0) return { label: "Closed", color: "neutral" };
    if (daysToClose !== null && daysToClose <= 3) return { label: `Closing in ${daysToClose}d`, color: "red" };
    const map: Record<string, { label: string; color: "green" | "amber" | "red" | "neutral" }> = {
      ACTIVE:         { label: "Applications Open",  color: "green" },
      UPCOMING:       { label: "Upcoming",            color: "amber" },
      CLOSED:         { label: "Closed",              color: "neutral" },
      RESULT_PENDING: { label: "Result Pending",      color: "amber" },
      COMPLETED:      { label: "Completed",           color: "neutral" },
    };
    return map[hub.status] ?? { label: hub.status, color: "neutral" };
  };
  const status = statusInfo();

  const statusStyles = {
    green:   { pill: "bg-green-100 text-green-800 border-green-200",       dot: "bg-green-500" },
    amber:   { pill: "bg-amber-100 text-amber-800 border-amber-200",       dot: "bg-amber-500" },
    red:     { pill: "bg-red-100 text-red-800 border-red-200",             dot: "bg-red-500" },
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
    APPLICATION_OPEN:    "Applications Open",
    APPLICATION_CLOSED:  "Applications Closed",
    ADMIT_CARD_RELEASED: "Admit Card Released",
    EXAM_SCHEDULED:      "Exam Scheduled",
    RESULT_OUT:          "Result Out",
    FINAL_RESULT_OUT:    "Final Result",
    NOTIFICATION_OUT:    "Notification Out",
  };

  // Important dates list for Q4
  const importantDates = [
    { label: "Notification Released", date: hub.notificationDate,     highlight: false },
    { label: "Application Opens",     date: hub.applicationStartDate, highlight: false },
    { label: "Last Date to Apply",    date: hub.applicationEndDate,   highlight: true  },
    { label: "Exam Date",             date: hub.examDate,             highlight: false },
    { label: "Result",                date: hub.resultDate,           highlight: false },
  ].filter((r) => r.date);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 text-sm">

      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
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

      {/* ── Q1: What is this recruitment? ───────────────────────────────────── */}
      <SectionCard className="mb-4">

        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-black/5 px-5 py-3">
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
          {daysToClose !== null && daysToClose >= 0 && daysToClose <= 30 && (
            <span className={`text-xs font-semibold ${daysToClose <= 7 ? "text-red-600" : "text-amber-600"}`}>
              {daysToClose === 0 ? "Closes today!" : `${daysToClose} day${daysToClose === 1 ? "" : "s"} left`}
            </span>
          )}
          <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            Q1
          </span>
        </div>

        {/* Title + org */}
        <div className="px-5 pt-4 pb-3">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{hub.name}</h1>
          {org && (
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-neutral-500">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              {org.slug
                ? <Link href={`/commissions/${org.slug}`} className="font-medium text-neutral-700 hover:underline">{org.name}</Link>
                : <span className="font-medium text-neutral-700">{org.name}</span>}
              {advNo && <span className="text-neutral-400">· Advt. No. {advNo}</span>}
              {exam?.name && <span className="text-neutral-400">· {exam.name}</span>}
            </p>
          )}
        </div>

        {/* 8-fact grid */}
        <div className="grid grid-cols-2 gap-px border-t border-black/5 bg-black/5 sm:grid-cols-4">
          {/* Total Vacancies — always indigo */}
          <div className="bg-white px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">Total Vacancies</div>
            <div className="mt-1 text-xl font-bold text-indigo-900">
              {totalVacancies > 0 ? totalVacancies.toLocaleString("en-IN") : "—"}
            </div>
            {hubPosts.length > 1 && (
              <div className="mt-0.5 text-xs text-indigo-400">{hubPosts.length} posts</div>
            )}
          </div>

          {/* Last Date — urgency-coloured */}
          <div className={`px-4 py-3 ${
            daysToClose !== null && daysToClose >= 0 && daysToClose <= 7
              ? "bg-red-50"
              : daysToClose !== null && daysToClose >= 0 && daysToClose <= 30
                ? "bg-amber-50"
                : "bg-white"
          }`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${
              daysToClose !== null && daysToClose >= 0 && daysToClose <= 7
                ? "text-red-500"
                : daysToClose !== null && daysToClose >= 0 && daysToClose <= 30
                  ? "text-amber-600"
                  : "text-neutral-400"
            }`}>Last Date</div>
            <div className={`mt-1 text-base font-bold ${
              daysToClose !== null && daysToClose >= 0 && daysToClose <= 7
                ? "text-red-900"
                : daysToClose !== null && daysToClose >= 0 && daysToClose <= 30
                  ? "text-amber-900"
                  : "text-neutral-900"
            }`}>
              {hub.applicationEndDate ? fmtDateShort(hub.applicationEndDate) : "—"}
            </div>
            {daysToClose !== null && daysToClose >= 0 && daysToClose <= 30 && (
              <div className={`mt-0.5 text-xs font-medium ${daysToClose <= 7 ? "text-red-600" : "text-amber-600"}`}>
                {daysToClose === 0 ? "Today!" : `${daysToClose}d left`}
              </div>
            )}
          </div>

          {/* Exam Date */}
          <div className={`px-4 py-3 ${hub.examDate ? "bg-blue-50" : "bg-white"}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${hub.examDate ? "text-blue-500" : "text-neutral-400"}`}>
              Exam Date
            </div>
            <div className={`mt-1 text-base font-bold ${hub.examDate ? "text-blue-900" : "text-neutral-400"}`}>
              {hub.examDate ? fmtDateShort(hub.examDate) : "—"}
            </div>
          </div>

          {/* Notification No. */}
          <div className="bg-white px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Notification No.</div>
            <div className="mt-1 text-base font-bold text-neutral-900">
              {advNo ?? "—"}
            </div>
          </div>

          {/* Notification Date */}
          <div className="bg-white px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Notification Date</div>
            <div className="mt-1 text-base font-bold text-neutral-900">
              {hub.notificationDate ? fmtDateShort(hub.notificationDate) : "—"}
            </div>
          </div>

          {/* Application Opens */}
          <div className="bg-white px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Apply From</div>
            <div className="mt-1 text-base font-bold text-neutral-900">
              {hub.applicationStartDate ? fmtDateShort(hub.applicationStartDate) : "—"}
            </div>
          </div>

          {/* Result Date */}
          <div className="bg-white px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Result</div>
            <div className="mt-1 text-base font-bold text-neutral-900">
              {hub.resultDate ? fmtDateShort(hub.resultDate) : "—"}
            </div>
          </div>

          {/* Linked exam / year */}
          <div className="bg-white px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              {exam?.name ? "Exam" : "Year"}
            </div>
            <div className="mt-1 text-base font-bold text-neutral-900">
              {exam?.name ?? hub.year ?? "—"}
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2 border-t border-black/5 px-5 py-4 sm:flex-row sm:flex-wrap">
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
          {!applyUrl && !notificationUrl && (
            <p className="py-1 text-xs italic text-neutral-400">
              Official links not on file — verify against the official notification before applying.
            </p>
          )}
        </div>

        {/* Provenance footer */}
        {lastVerified && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-black/5 bg-neutral-50 px-5 py-3 text-xs text-neutral-400 rounded-b-xl">
            <span>
              Information from official government notification
              {org?.name && <> by {org.name}</>}
              {advNo && <> · Advt. No. {advNo}</>}
            </span>
            <span className="ml-auto">
              Last verified: {lastVerified.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
            </span>
          </div>
        )}
      </SectionCard>

      {/* ── "Part of" pill strip ─────────────────────────────────────────────── */}
      {(exam || org) && (
        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-black/8 bg-white px-5 py-3 text-sm shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Part of</span>
          {org?.slug && (
            <Link href={`/commissions/${org.slug}`} className="flex items-center gap-1.5 text-neutral-700 hover:text-indigo-700 hover:underline">
              <Building2 className="h-3.5 w-3.5 text-neutral-400" />
              {org.name}
              <ChevronRight className="h-3.5 w-3.5 text-neutral-300" />
            </Link>
          )}
          {exam?.name && (
            <span className="flex items-center gap-1.5 text-neutral-600">
              <ClipboardList className="h-3.5 w-3.5 text-neutral-400" />
              {exam.name}
            </span>
          )}
        </div>
      )}

      <div className="space-y-4">

        {/* ── Q2: Can I apply? — Vacancy Breakdown ────────────────────────────── */}
        <SectionCard>
          <SectionHeader icon={Users} title="Can I Apply?" label="Q2" />

          <SubSection title="Vacancy Breakdown by Post">
            <div className="overflow-x-auto -mx-5">
              <table className="w-full min-w-[36rem] border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50">
                    {["Post", "Total", "UR", "EWS", "OBC", "SC", "ST", "PwBD"].map((h, i) => (
                      <th
                        key={h}
                        className={`border-b border-black/8 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 ${i === 0 ? "text-left" : "text-right"}`}
                      >
                        {h}
                      </th>
                    ))}
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
                      <td className="px-4 py-2.5 text-right text-indigo-900">
                        {totalVacancies > 0 ? totalVacancies : "—"}
                      </td>
                      {(["ur", "ews", "obc", "sc", "st"] as const).map((cat) => {
                        const sum = hubPosts.reduce((s: number, p: any) => {
                          const lp = postingMap.get(p.id);
                          const vd: any = p.vacancyDetails ?? lp?.extraContent?.reservationMatrix?.rows?.[0] ?? null;
                          return s + (vd?.[cat] ?? 0);
                        }, 0);
                        return (
                          <td key={cat} className="px-4 py-2.5 text-right text-indigo-900">
                            {sum > 0 ? sum : "—"}
                          </td>
                        );
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
            <p className="mt-3 text-xs text-neutral-400">
              UR = Unreserved · EWS = Economically Weaker Sections · OBC = OBC (Non-Creamy Layer) · PwBD = Persons with Benchmark Disabilities (horizontal reservation)
            </p>
          </SubSection>
        </SectionCard>

        {/* ── Q3: What do I need? — Per-post eligibility ──────────────────────── */}
        {hubPosts.length > 0 && (
          <SectionCard>
            <SectionHeader icon={ClipboardList} title="What Do I Need?" label="Q3" />

            <SubSection title="Eligibility by Post">
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
                    <div key={post.id} className="py-4 first:pt-0">
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
            </SubSection>
          </SectionCard>
        )}

        {/* ── Q4: How does it work? — Important Dates ─────────────────────────── */}
        {importantDates.length > 0 && (
          <SectionCard>
            <SectionHeader icon={Calendar} title="How Does It Work?" label="Q4" />

            <SubSection title="Important Dates">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {importantDates.map(({ label, date, highlight }) => (
                    <tr
                      key={label}
                      className={`border-b border-black/5 last:border-0 ${
                        highlight && daysToClose !== null && daysToClose >= 0 && daysToClose <= 3
                          ? "bg-red-50"
                          : ""
                      }`}
                    >
                      <td className="py-3 pr-4 font-medium text-neutral-700 w-1/2">{label}</td>
                      <td className={`py-3 ${
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
            </SubSection>

            {/* Current stage indicators for each post */}
            {hubPosts.some((p: any) => postingMap.get(p.id)?.currentStage) && (
              <>
                <SubDivider />
                <SubSection title="Current Stage by Post">
                  <div className="space-y-2">
                    {hubPosts.map((post: any) => {
                      const lp = postingMap.get(post.id);
                      if (!lp?.currentStage) return null;
                      return (
                        <div key={post.id} className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-medium text-neutral-700">{post.name}</span>
                          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-neutral-600 font-medium">
                            {stageLabels[lp.currentStage] ?? lp.currentStage}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </SubSection>
              </>
            )}
          </SectionCard>
        )}

        {/* ── Q5: What's next? — Official links + per-post CTAs ───────────────── */}
        <SectionCard>
          <SectionHeader icon={ExternalLink} title="What's Next?" label="Q5" />

          {/* Official document links */}
          <SubSection title="Official Links">
            <div className="space-y-2">
              {notificationUrl && (
                <a
                  href={notificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 hover:bg-neutral-100 transition-colors"
                >
                  <FileText className="h-4 w-4 shrink-0 text-neutral-400" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-neutral-800">Official Notification (PDF)</div>
                    <div className="text-xs text-neutral-500">
                      {advNo ? `Advt. No. ${advNo}` : "Official PDF"} — {org?.name ?? "Issuing authority"}
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                </a>
              )}
              {org?.websiteUrl && (
                <a
                  href={org.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 hover:bg-neutral-100 transition-colors"
                >
                  <Building2 className="h-4 w-4 shrink-0 text-neutral-400" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-neutral-800">Official Website</div>
                    <div className="text-xs text-neutral-500">{org.name}</div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                </a>
              )}
              {!notificationUrl && !org?.websiteUrl && (
                <p className="text-xs italic text-neutral-400">
                  Official links not on file — verify against the official notification before applying.
                </p>
              )}
            </div>
          </SubSection>

          {/* Per-post apply strip */}
          {hubPosts.length > 0 && (
            <>
              <SubDivider />
              <SubSection title="Posts in This Recruitment">
                <div className="divide-y divide-black/5">
                  {hubPosts.map((post: any) => {
                    const lp = postingMap.get(post.id);
                    return (
                      <div key={post.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
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
                          {lp?.currentStage && (
                            <div className="mt-0.5 text-xs text-neutral-500">
                              {stageLabels[lp.currentStage] ?? lp.currentStage}
                              {lp.validThrough && (
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
              </SubSection>
            </>
          )}
        </SectionCard>

      </div>
    </div>
  );
}
