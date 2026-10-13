'use client';

import Link from "next/link";
import type { DigestStats, getDailyDigestJobs } from "@/lib/queries";

type DigestJob = Awaited<ReturnType<typeof getDailyDigestJobs>>[number];

const CATEGORY_EMOJI: Record<string, string> = {
  "State PSC & Selection Boards": "⚖️",
  "Other Departments & Local Bodies": "🏛️",
  "Universities, Schools & Teaching": "📚",
  "Anganwadi & Child Welfare": "👶",
  "Railways & Metro": "🚆",
  "Health & Medical": "🏥",
  "Defence & Police": "🪖",
  "PSU": "🏭",
  "Courts & Legal": "⚖️",
  "Research & Science": "🔬",
  "Banking & Insurance": "🏦",
  "Central Govt Departments": "🇮🇳",
  "UPSC / SSC": "📋",
};

function fmtNum(n: number): string {
  if (n >= 100000) return (n / 100000).toFixed(1) + "L";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString("en-IN");
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function UrgencyBadge({ lastDate }: { lastDate: string | null }) {
  const days = daysLeft(lastDate);
  if (days === null) return null;
  if (days < 0) return <span className="text-xs text-gray-400">Expired</span>;
  if (days === 0) return <span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Today!</span>;
  if (days <= 3) return <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{days}d left</span>;
  if (days <= 7) return <span className="text-xs text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded">{days}d left</span>;
  return <span className="text-xs text-gray-500">{fmtDate(lastDate)}</span>;
}

export function DashboardContent({
  digestStats,
  topJobs,
}: {
  digestStats: DigestStats | null;
  topJobs: DigestJob[];
}) {
  if (!digestStats) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
        No digest data available yet.
      </div>
    );
  }

  const { digestDate, total, totalVacancies, withPdf, byCategory, closingToday, closingThreeDays, closingThisWeek } = digestStats;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Govt Jobs Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Daily digest · {new Date(digestDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Link href="/jobs" className="text-sm text-blue-600 hover:underline">
          Browse all jobs →
        </Link>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Vacancies", value: fmtNum(totalVacancies), sub: `${total} notifications`, color: "blue" },
          { label: "With Official PDF", value: fmtNum(withPdf), sub: `${Math.round((withPdf / total) * 100)}% verified`, color: "green" },
          { label: "Closing Today", value: String(closingToday), sub: "apply now", color: closingToday > 0 ? "red" : "gray" },
          { label: "Closing in 7 days", value: String(closingThisWeek), sub: "act this week", color: closingThisWeek > 0 ? "orange" : "gray" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 bg-white shadow-sm border-${s.color}-100`}>
            <div className={`text-2xl font-bold text-${s.color}-700`}>{s.value}</div>
            <div className="text-xs font-medium text-gray-600 mt-0.5">{s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Vacancies by Category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {byCategory.map((cat) => (
            <div key={cat.category} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <span className="text-xl">{CATEGORY_EMOJI[cat.category] ?? "📌"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{cat.category}</div>
                <div className="text-xs text-gray-500">{cat.count} notifications</div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold text-blue-700">{fmtNum(cat.vacancies)}</div>
                <div className="text-xs text-gray-400">vacancies</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top jobs table */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Top Openings Today</h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Organization</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Post</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Vacancies</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Pay</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Deadline</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topJobs.map((job) => {
                  // If promoted, link to canonical; otherwise link to source FJA article
                  const href = job.promotedPostId
                    ? `/jobs/${job.promotedRecruitmentId}/${job.promotedPostId}`
                    : job.sourceUrl ?? job.officialPdfUrl ?? "#";

                  return (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-sm">{job.orgShort ?? job.orgFull ?? "—"}</div>
                        {job.states && job.states.length > 0 && (
                          <div className="text-xs text-gray-400">{job.states.slice(0, 2).join(", ")}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <div className="text-gray-800 truncate">{job.postName ?? "—"}</div>
                        <div className="text-xs text-gray-400">{job.category ?? ""}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-700">
                        {job.vacancies != null ? fmtNum(job.vacancies) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell text-xs max-w-[120px] truncate">
                        {job.salaryText ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <UrgencyBadge lastDate={job.lastDate} />
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={href}
                          target={job.promotedPostId ? undefined : "_blank"}
                          rel={job.promotedPostId ? undefined : "noopener noreferrer"}
                          className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                        >
                          {job.officialPdfUrl ? "📄 PDF" : "View →"}
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Showing top 30 by vacancy count from the daily digest. Once a job is on JobOye&apos;s own canonical page, the link opens there directly.
        </p>
      </div>
    </div>
  );
}
