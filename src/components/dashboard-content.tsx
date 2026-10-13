'use client';

import { useState, useMemo } from "react";
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

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 100000) return (n / 100000).toFixed(1) + "L";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString("en-IN");
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function DeadlineBadge({ lastDate }: { lastDate: string | null }) {
  const days = daysLeft(lastDate);
  if (days === null) return <span className="text-gray-400 text-xs">—</span>;
  if (days < 0) return <span className="text-xs text-gray-400 line-through">{fmtDate(lastDate)}</span>;
  const label = fmtDate(lastDate);
  if (days === 0) return (
    <span>
      <span className="inline-block text-xs font-bold text-white bg-red-500 px-1.5 py-0.5 rounded mr-1">Today!</span>
      <span className="text-xs text-red-600">{label}</span>
    </span>
  );
  if (days <= 3) return (
    <span>
      <span className="inline-block text-xs font-semibold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded mr-1">{days}d left</span>
      <span className="text-xs text-gray-600">{label}</span>
    </span>
  );
  if (days <= 7) return (
    <span>
      <span className="inline-block text-xs text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded mr-1">{days}d</span>
      <span className="text-xs text-gray-600">{label}</span>
    </span>
  );
  return <span className="text-xs text-gray-700">{label}</span>;
}

type SortKey = "vacancies" | "lastDate" | "org";
type SortDir = "asc" | "desc";

export function DashboardContent({
  digestStats,
  topJobs,
}: {
  digestStats: DigestStats | null;
  topJobs: DigestJob[];
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showOfficialOnly, setShowOfficialOnly] = useState(false);
  const [showClosingSoon, setShowClosingSoon] = useState(false);
  const [showBigOnly, setShowBigOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("vacancies");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let rows = topJobs;
    if (activeCategory) rows = rows.filter((j) => j.category === activeCategory);
    if (showOfficialOnly) rows = rows.filter((j) => !!j.officialPdfUrl);
    if (showClosingSoon) rows = rows.filter((j) => {
      const d = daysLeft(j.lastDate);
      return d !== null && d >= 0 && d <= 3;
    });
    if (showBigOnly) rows = rows.filter((j) => (j.vacancies ?? 0) >= 100);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((j) =>
        (j.orgFull ?? j.orgShort ?? "").toLowerCase().includes(q) ||
        (j.postName ?? "").toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "vacancies") {
        cmp = (a.vacancies ?? -1) - (b.vacancies ?? -1);
      } else if (sortKey === "lastDate") {
        const da = a.lastDate ? new Date(a.lastDate).getTime() : Infinity;
        const db = b.lastDate ? new Date(b.lastDate).getTime() : Infinity;
        cmp = da - db;
      } else if (sortKey === "org") {
        cmp = (a.orgShort ?? a.orgFull ?? "").localeCompare(b.orgShort ?? b.orgFull ?? "");
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [topJobs, activeCategory, showOfficialOnly, showClosingSoon, showBigOnly, sortKey, sortDir, search]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-blue-600 ml-1">{sortDir === "desc" ? "↓" : "↑"}</span>;
  }

  if (!digestStats) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
        No digest data available yet.
      </div>
    );
  }

  const { digestDate, total, totalVacancies, withPdf, byCategory, closingToday, closingThreeDays } = digestStats;

  const bigVacancies = topJobs.filter((j) => (j.vacancies ?? 0) >= 100).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Govt Jobs Daily Digest</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date(digestDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {" · "}{total.toLocaleString("en-IN")} notifications · {fmtNum(totalVacancies)} vacancies
          </p>
        </div>
        <Link href="/jobs" className="text-sm text-blue-600 hover:underline">
          Browse canonical jobs →
        </Link>
      </div>

      {/* Stat chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setShowOfficialOnly(false); setShowClosingSoon(false); setShowBigOnly(false); setActiveCategory(null); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${!showOfficialOnly && !showClosingSoon && !showBigOnly && !activeCategory ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
        >
          📋 Total Open <span className="font-bold">{total.toLocaleString("en-IN")}</span>
        </button>
        <button
          onClick={() => setShowClosingSoon((v) => { if (!v) { setShowBigOnly(false); setShowOfficialOnly(false); } return !v; })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${showClosingSoon ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
        >
          🔴 Closing Today <span className="font-bold">{closingToday}</span>
        </button>
        <button
          onClick={() => setShowClosingSoon((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${showClosingSoon ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
        >
          ⏰ Closing in 3 Days <span className="font-bold">{closingThreeDays}</span>
        </button>
        <button
          onClick={() => setShowBigOnly((v) => { if (!v) { setShowClosingSoon(false); setShowOfficialOnly(false); } return !v; })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${showBigOnly ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
        >
          🔥 100+ Vacancies <span className="font-bold">{bigVacancies}</span>
        </button>
        <button
          onClick={() => setShowOfficialOnly((v) => { if (!v) { setShowClosingSoon(false); setShowBigOnly(false); } return !v; })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${showOfficialOnly ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
        >
          ✅ Has Official Link <span className="font-bold">{withPdf}</span>
        </button>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${!activeCategory ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
        >
          All Categories
        </button>
        {byCategory.map((cat) => (
          <button
            key={cat.category}
            onClick={() => setActiveCategory(cat.category === activeCategory ? null : cat.category)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${activeCategory === cat.category ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
          >
            {CATEGORY_EMOJI[cat.category] ?? "📌"} {cat.category}
            <span className={`ml-1 font-bold ${activeCategory === cat.category ? "text-blue-100" : "text-blue-600"}`}>{cat.count}</span>
          </button>
        ))}
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Search organisation or post…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <span className="text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-800">{filtered.length.toLocaleString("en-IN")}</span> of {total.toLocaleString("en-IN")} notifications
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
              <tr>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none"
                  onClick={() => toggleSort("org")}
                >
                  Organisation / Post <SortIcon k="org" />
                </th>
                <th
                  className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none"
                  onClick={() => toggleSort("vacancies")}
                >
                  Vacancies <SortIcon k="vacancies" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                  Qualification
                </th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none"
                  onClick={() => toggleSort("lastDate")}
                >
                  Last Date <SortIcon k="lastDate" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Links
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">
                    No matching notifications
                  </td>
                </tr>
              ) : (
                filtered.map((job) => {
                  const orgLabel = job.orgFull ?? job.orgShort ?? "—";
                  const stateLabel = job.states && job.states.length > 0 ? job.states.slice(0, 2).join(", ") : null;

                  return (
                    <tr key={job.id} className="hover:bg-blue-50/30 transition-colors">
                      {/* Organisation + Post */}
                      <td className="px-4 py-3 max-w-[240px]">
                        <div className="font-medium text-gray-900 text-sm leading-snug truncate" title={orgLabel}>
                          {orgLabel}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5 truncate" title={job.postName ?? ""}>
                          {job.postName ?? "—"}
                        </div>
                        {stateLabel && (
                          <div className="text-xs text-gray-400 mt-0.5">{stateLabel}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-0.5">
                          {CATEGORY_EMOJI[job.category ?? ""] ?? "📌"} {job.category ?? ""}
                        </div>
                      </td>

                      {/* Vacancies */}
                      <td className="px-4 py-3 text-right">
                        {job.vacancies != null && job.vacancies > 0 ? (
                          <span className={`font-bold text-base ${job.vacancies >= 100 ? "text-purple-700" : "text-blue-700"}`}>
                            {fmtNum(job.vacancies)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Qualification (hidden on small) */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="text-xs text-gray-600 max-w-[200px] line-clamp-2" title={job.qualificationText ?? ""}>
                          {job.qualificationText ?? "—"}
                        </div>
                      </td>

                      {/* Last Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <DeadlineBadge lastDate={job.lastDate} />
                      </td>

                      {/* Links */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {job.officialPdfUrl && (
                            <a
                              href={job.officialPdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2 py-0.5 rounded font-medium transition-colors whitespace-nowrap"
                            >
                              📄 Official notice
                            </a>
                          )}
                          {job.applyUrl && (
                            <a
                              href={job.applyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded font-medium transition-colors whitespace-nowrap"
                            >
                              🔗 Apply
                            </a>
                          )}
                          {job.promotedSlug ? (
                            <Link
                              href={job.promotedSlug}
                              className="inline-flex items-center gap-1 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded font-medium transition-colors whitespace-nowrap"
                            >
                              🔵 View on JobOye
                            </Link>
                          ) : job.sourceUrl ? (
                            <a
                              href={job.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 hover:underline whitespace-nowrap"
                            >
                              Details →
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        {filtered.length.toLocaleString("en-IN")} notifications shown · {withPdf} with official government PDF · {topJobs.filter((j) => j.promotedSlug).length} on JobOye canonical pages
      </p>
    </div>
  );
}
