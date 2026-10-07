import type { Metadata } from "next";
import Link from "next/link";
import { pageSeo } from "@/lib/seo";
import { getJobsControlCenter, type JobRow, type DeadlineBucket, type TopOrg, type RoleRow } from "@/lib/queries";
import { Building2, Calendar, Clock, TrendingUp, Briefcase, MapPin, ChevronRight, AlertTriangle, Users } from "lucide-react";

export const revalidate = 300; // 5-minute ISR — data is live, not static

export async function generateMetadata(): Promise<Metadata> {
  const seo = pageSeo("/posts");
  return {
    title: "Govt Jobs Control Center 2026 — All Active Recruitments & Vacancies",
    description:
      "Live dashboard of all active government job postings in India. 65,000+ vacancies across 767 recruitments. Track deadlines, browse by organisation, and apply before they close.",
    alternates: seo.alternates,
    openGraph: {
      title: "Govt Jobs Control Center 2026 — All Active Recruitments",
      description: "Live dashboard: 65,000+ vacancies, 767 recruitments. Track deadlines and apply.",
      url: "/posts",
      type: "website",
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("en-IN");
}

function fmtDate(d: Date | null) {
  if (!d) return null;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function deadlineChip(daysRemaining: number | null, endDate: Date | null) {
  if (!endDate) return null;
  const d = daysRemaining ?? 0;
  if (d <= 0) return { label: "Today", cls: "bg-red-100 text-red-700 border-red-200" };
  if (d <= 3) return { label: `${d}d left`, cls: "bg-red-100 text-red-700 border-red-200" };
  if (d <= 7) return { label: `${d}d left`, cls: "bg-orange-100 text-orange-700 border-orange-200" };
  if (d <= 15) return { label: `${d}d left`, cls: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: `${d}d left`, cls: "bg-green-100 text-green-700 border-green-200" };
}

const STATE_LABELS: Record<string, string> = {
  "IN-UP": "Uttar Pradesh", "IN-BR": "Bihar", "IN-MH": "Maharashtra",
  "IN-RJ": "Rajasthan", "IN-MP": "Madhya Pradesh", "IN-GJ": "Gujarat",
  "IN-WB": "West Bengal", "IN-TN": "Tamil Nadu", "IN-AP": "Andhra Pradesh",
  "IN-KA": "Karnataka", "IN-KL": "Kerala", "IN-OR": "Odisha",
  "IN-HR": "Haryana", "IN-PB": "Punjab", "IN-AS": "Assam",
  "IN-JH": "Jharkhand", "IN-CG": "Chhattisgarh", "IN-UK": "Uttarakhand",
  "IN-HP": "Himachal Pradesh", "IN-DL": "Delhi", "IN-JK": "J&K",
  "IN-GA": "Goa", "IN-CH": "Chandigarh", "IN-UT": "Uttarakhand",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ value, label, sub, accent }: { value: string; label: string; sub?: string; accent?: string }) {
  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm ${accent ? "border-l-4 " + accent : "border-black/8"}`}>
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
      <div className="mt-0.5 text-sm font-medium text-neutral-700">{label}</div>
      {sub && <div className="mt-1 text-xs text-neutral-400">{sub}</div>}
    </div>
  );
}

function DeadlineHeatmap({ buckets }: { buckets: DeadlineBucket[] }) {
  const maxVacancies = Math.max(...buckets.map((b) => b.vacancies), 1);
  const urgencyBg: Record<string, string> = {
    critical: "bg-red-500",
    high: "bg-orange-400",
    medium: "bg-amber-400",
    low: "bg-emerald-400",
    none: "bg-neutral-300",
  };
  const urgencyText: Record<string, string> = {
    critical: "text-red-700",
    high: "text-orange-700",
    medium: "text-amber-700",
    low: "text-emerald-700",
    none: "text-neutral-500",
  };
  const urgencyBorder: Record<string, string> = {
    critical: "border-red-200 bg-red-50",
    high: "border-orange-200 bg-orange-50",
    medium: "border-amber-200 bg-amber-50",
    low: "border-emerald-200 bg-emerald-50",
    none: "border-neutral-200 bg-neutral-50",
  };

  return (
    <div className="rounded-xl border border-black/8 bg-white shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-neutral-400" />
        <h2 className="font-semibold text-neutral-900">Deadline Urgency</h2>
        <span className="ml-auto text-xs text-neutral-400">vacancies by closing window</span>
      </div>
      <div className="space-y-3">
        {buckets.map((b) => {
          const barW = Math.round((b.vacancies / maxVacancies) * 100);
          return (
            <div key={b.label} className={`rounded-lg border px-4 py-3 ${urgencyBorder[b.urgency]}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-sm font-semibold ${urgencyText[b.urgency]}`}>{b.label}</span>
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  <span>{b.recruitments} notices</span>
                  <span className="font-semibold text-neutral-800">{fmt(b.vacancies)} vacancies</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-black/5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${urgencyBg[b.urgency]} transition-all`}
                  style={{ width: `${barW}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopOrgsTable({ orgs }: { orgs: TopOrg[] }) {
  const max = Math.max(...orgs.map((o) => o.vacancies ?? 0), 1);
  return (
    <div className="rounded-xl border border-black/8 bg-white shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-4 w-4 text-neutral-400" />
        <h2 className="font-semibold text-neutral-900">Top Hiring Organisations</h2>
        <span className="ml-auto text-xs text-neutral-400">by vacancy count</span>
      </div>
      <div className="space-y-2">
        {orgs.map((org, i) => {
          const barW = Math.round(((org.vacancies ?? 0) / max) * 100);
          return (
            <div key={org.orgSlug} className="group">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 text-xs text-neutral-400 tabular-nums">{i + 1}</span>
                <span className="flex-1 text-sm text-neutral-800 truncate group-hover:text-indigo-700 font-medium">
                  {org.orgName}
                </span>
                <span className="text-xs font-semibold text-neutral-700 tabular-nums">
                  {fmt(org.vacancies)}
                </span>
              </div>
              <div className="ml-7 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-400 transition-all"
                  style={{ width: `${barW}%` }}
                />
              </div>
              {org.earliestDeadline && (
                <div className="ml-7 mt-0.5 text-[10px] text-neutral-400">
                  deadline {fmtDate(org.earliestDeadline)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function JobTable({ jobs }: { jobs: JobRow[] }) {
  return (
    <div className="rounded-xl border border-black/8 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-black/5">
        <Briefcase className="h-4 w-4 text-neutral-400" />
        <h2 className="font-semibold text-neutral-900">All Active Recruitments</h2>
        <span className="ml-auto text-xs text-neutral-400">{jobs.length} notices · sorted by deadline</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/5 bg-neutral-50 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide min-w-[260px]">Recruitment</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Organisation</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide text-right">Vacancies</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Last Date</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Closes</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Posts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/4">
            {jobs.map((job) => {
              const chip = deadlineChip(job.daysRemaining, job.applicationEndDate);
              const postNamesPreview = job.postNames.split(" · ").slice(0, 2).join(", ");
              const hasMorePosts = job.postCount > 2;
              return (
                <tr key={job.recruitmentId} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/jobs/${job.recruitmentSlug}`}
                      className="font-medium text-neutral-900 hover:text-indigo-700 line-clamp-2 leading-snug block"
                    >
                      {job.recruitmentName}
                    </Link>
                    {job.locationStateCode && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-neutral-400">
                        <MapPin className="h-3 w-3" />
                        {STATE_LABELS[job.locationStateCode] ?? job.locationStateCode}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 max-w-[200px]">
                    <span className="line-clamp-2 leading-snug">{job.orgName}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-neutral-800 tabular-nums">
                    {fmt(job.totalVacancies)}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 whitespace-nowrap text-xs">
                    {fmtDate(job.applicationEndDate) ?? <span className="text-neutral-400">Open-ended</span>}
                  </td>
                  <td className="px-4 py-3">
                    {chip ? (
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${chip.cls}`}>
                        {job.daysRemaining != null && job.daysRemaining <= 3 && (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {chip.label}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500 max-w-[180px]">
                    <span className="line-clamp-2">{postNamesPreview}</span>
                    {hasMorePosts && (
                      <span className="text-indigo-500 font-medium">+{job.postCount - 2} more</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoleHeatmap({ roles }: { roles: RoleRow[] }) {
  const max = roles[0]?.totalVacancies ?? 1;
  return (
    <div className="rounded-xl border border-black/8 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-black/5">
        <Users className="h-4 w-4 text-neutral-400" />
        <h2 className="font-semibold text-neutral-900">Top Hiring Roles</h2>
        <span className="ml-auto text-xs text-neutral-400">by total vacancies</span>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
        {roles.map((role) => {
          const pct = Math.max(4, Math.round((role.totalVacancies / max) * 100));
          const isUrgent = role.earliestDeadline &&
            (role.earliestDeadline.getTime() - Date.now()) < 7 * 86_400_000;
          const barColor = isUrgent
            ? "bg-red-400"
            : role.totalVacancies > 2000
              ? "bg-indigo-500"
              : role.totalVacancies > 500
                ? "bg-indigo-400"
                : "bg-indigo-300";
          return (
            <div key={role.name} className="py-2 border-b border-black/4 last:border-0">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-xs font-medium text-neutral-700 truncate max-w-[200px]" title={role.name}>
                  {role.name}
                </span>
                <span className="text-xs font-semibold tabular-nums text-neutral-800 shrink-0">
                  {role.totalVacancies.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-neutral-100">
                <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
              </div>
              {isUrgent && role.earliestDeadline && (
                <div className="text-[10px] text-red-500 mt-0.5">
                  closes {fmtDate(role.earliestDeadline)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PostsControlCenterPage() {
  const data = await getJobsControlCenter().catch(() => null);

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-neutral-500">
        Could not load job data. Try refreshing.
      </div>
    );
  }

  const { stats, deadlineBuckets, topOrgs, jobs, roles } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Live</span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 leading-tight">
            Govt Jobs Control Center
          </h1>
          <p className="mt-1.5 text-neutral-500 text-sm max-w-xl">
            Every active government recruitment in India — vacancies, deadlines, and official links in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Search Jobs
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/jobs?kind=GOVERNMENT"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Browse All
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Headline Stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          value={fmt(stats.totalVacancies)}
          label="Total Vacancies"
          sub="across active notices"
          accent="border-l-indigo-400"
        />
        <StatCard
          value={fmt(stats.activeRecruitments)}
          label="Active Recruitments"
          sub={`${stats.upcomingCount} upcoming`}
        />
        <StatCard
          value={fmt(stats.totalPosts)}
          label="Individual Posts"
          sub="roles with own pages"
        />
        <StatCard
          value={fmt(stats.orgsHiring)}
          label="Organisations Hiring"
          sub="central + state bodies"
        />
      </div>

      {/* ── Urgency row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{stats.closingThisWeek}</div>
          <div className="text-xs font-semibold text-red-600 mt-0.5">Closing This Week</div>
          <div className="text-[10px] text-red-400 mt-1">Apply immediately</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
          <div className="text-2xl font-bold text-amber-700">{stats.closingThisMonth}</div>
          <div className="text-xs font-semibold text-amber-600 mt-0.5">Closing This Month</div>
          <div className="text-[10px] text-amber-400 mt-1">Start preparing now</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-700">{stats.upcomingCount}</div>
          <div className="text-xs font-semibold text-emerald-600 mt-0.5">Upcoming Notices</div>
          <div className="text-[10px] text-emerald-400 mt-1">Registration opening soon</div>
        </div>
      </div>

      {/* ── Heatmap + Top Orgs ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeadlineHeatmap buckets={deadlineBuckets} />
        <TopOrgsTable orgs={topOrgs} />
      </div>

      {/* ── Role Heatmap ────────────────────────────────────────────────── */}
      {roles.length > 0 && <RoleHeatmap roles={roles} />}

      {/* ── Full Job Table ──────────────────────────────────────────────── */}
      <JobTable jobs={jobs} />

      {/* ── Footer nav ─────────────────────────────────────────────────── */}
      <div className="pt-4 border-t border-black/5 flex items-center gap-3 text-sm text-neutral-500">
        <Link href="/" className="hover:text-neutral-800 hover:underline">Home</Link>
        <span>/</span>
        <span className="text-neutral-800">Govt Jobs Control Center</span>
        <span className="ml-auto text-xs text-neutral-400">
          Data refreshes every 5 minutes. Verify details from official notifications before applying.
        </span>
      </div>
    </div>
  );
}
