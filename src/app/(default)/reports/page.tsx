'use client';


import { useEffect, useState } from 'react';

interface Post {
  id: number;
  title: string | null;
  name: string | null;
  slug: string;
  organizationName: string | null;
  recruitmentName: string | null;
  recruitmentSlug: string;
  description: string | null;
  isLive: boolean;
  postedAt: string | null;
  updatedAt: string | null;
  officialSourceUrl: string | null;
  applyPortalUrl: string | null;
  locationCity: string | null;
  locationState: string | null;
  vacanciesTotal: number | null;
  vacanciesByCategory: unknown;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNote: string | null;
  payScale: string | null;
  payLevel: string | null;
  applicationClosingDate: string | null;
  examDate: string | null;
  resultDate: string | null;
  appointmentDate: string | null;
  selectionProcess: string | null;
  ageRulesByCategory: unknown;
  ageNote: string | null;
  education: string | null;
  experience: string | null;
  feeNote: string | null;
  sourceVerificationStatus: string | null;
  extractionConfidence: number | null;
  dataGaps: string | null;
}

const ITEMS_PER_PAGE = 50;

interface EnrichmentStats {
  totalPosts: number;
  withSalary: number;
  withVacancies: number;
  withExamDate: number;
  enrichedVerified: number;
  enrichedPending: number;
  notEnriched: number;
  avgConfidence: number;
}

// Format rupee salary — stored as raw rupees (e.g. 67700 → ₹67,700)
function formatSalary(min: number | null, max: number | null, note: string | null): string {
  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');
  if (note) return note;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `up to ${fmt(max)}`;
  return '—';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  } catch {
    return '—';
  }
}

function truncate(s: string | null | undefined, len = 40): string {
  if (!s) return '—';
  return s.length > len ? s.slice(0, len) + '…' : s;
}

function statusBadge(status: string | null) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>;
  const colors: Record<string, string> = {
    VERIFIED: 'bg-emerald-100 text-emerald-700',
    PENDING: 'bg-amber-100 text-amber-700',
    REJECTED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function confidence(val: number | null) {
  if (val === null) return <span className="text-gray-300 text-xs">—</span>;
  const color = val >= 80 ? 'text-emerald-600' : val >= 50 ? 'text-amber-600' : 'text-red-500';
  return <span className={`font-semibold text-xs ${color}`}>{val}%</span>;
}

const MetricCard = ({
  label, value, percentage, color, icon,
}: {
  label: string; value: number; percentage: number; color: string; icon: string;
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-4">
      <div>
        <p className="text-gray-600 text-sm font-medium">{label}</p>
        <p className={`text-3xl font-bold mt-2 ${color}`}>{value.toLocaleString()}</p>
      </div>
      <div className={`text-3xl ${color} opacity-20`}>{icon}</div>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${color.replace('text-', 'bg-')}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600">{percentage}%</span>
    </div>
  </div>
);

const TH = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <th className={`px-3 py-3 text-left font-semibold text-gray-700 whitespace-nowrap text-xs uppercase tracking-wide ${className}`}>
    {children}
  </th>
);

const TD = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-3 py-3 text-xs text-gray-700 align-top ${className}`}>
    {children}
  </td>
);

export default function ReportsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [stats, setStats] = useState<EnrichmentStats>({
    totalPosts: 0,
    withSalary: 0,
    withVacancies: 0,
    withExamDate: 0,
    enrichedVerified: 0,
    enrichedPending: 0,
    notEnriched: 0,
    avgConfidence: 0,
  });

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const offset = (currentPage - 1) * ITEMS_PER_PAGE;
        const response = await fetch(`/api/reports/posts?limit=${ITEMS_PER_PAGE}&offset=${offset}`);
        if (!response.ok) throw new Error('Failed to fetch posts');
        const data = await response.json();
        setPosts(data.posts || []);
        setTotalPosts(data.totalCount || 0);
        setStats(data.stats || { totalPosts: 0, withSalary: 0, withVacancies: 0, withExamDate: 0 });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [currentPage]);

  const totalPages = Math.ceil(totalPosts / ITEMS_PER_PAGE);
  const pct = (v: number, t: number) => t === 0 ? 0 : Math.round((v / t) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-full mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Job Postings Report</h1>
          <p className="text-gray-500 text-sm">All live posts — sorted by enrichment completeness. Data is sourced directly from the database.</p>
          <div className="h-1 w-16 bg-gradient-to-r from-indigo-600 to-blue-500 rounded-full mt-4"></div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <MetricCard label="Total Live Posts" value={stats.totalPosts} percentage={100} color="text-indigo-600" icon="📊" />
          <MetricCard label="With Salary" value={stats.withSalary} percentage={pct(stats.withSalary, stats.totalPosts)} color="text-emerald-600" icon="💰" />
          <MetricCard label="With Vacancies" value={stats.withVacancies} percentage={pct(stats.withVacancies, stats.totalPosts)} color="text-blue-600" icon="👥" />
          <MetricCard label="With Exam Date" value={stats.withExamDate} percentage={pct(stats.withExamDate, stats.totalPosts)} color="text-purple-600" icon="📅" />
        </div>

        {/* Enrichment Status Metrics */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Enrichment Pipeline Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <MetricCard label="Verified (Published)" value={stats.enrichedVerified} percentage={pct(stats.enrichedVerified, stats.totalPosts)} color="text-emerald-600" icon="✓" />
            <MetricCard label="Pending Review" value={stats.enrichedPending} percentage={pct(stats.enrichedPending, stats.totalPosts)} color="text-amber-600" icon="⏳" />
            <MetricCard label="Not Yet Enriched" value={stats.notEnriched} percentage={pct(stats.notEnriched, stats.totalPosts)} color="text-gray-600" icon="○" />
            <MetricCard label="Avg Confidence" value={stats.avgConfidence} percentage={stats.avgConfidence} color={stats.avgConfidence >= 80 ? "text-emerald-600" : stats.avgConfidence >= 50 ? "text-amber-600" : "text-red-600"} icon="🎯" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-gray-400">Loading posts…</div>
          ) : error ? (
            <div className="p-16 text-center text-red-500">Error: {error}</div>
          ) : posts.length === 0 ? (
            <div className="p-16 text-center text-gray-400">No posts found</div>
          ) : (
            <>
              {/* Column count indicator */}
              <div className="px-4 py-2 bg-slate-50 border-b border-gray-100 text-xs text-gray-500">
                Scroll right to see all columns → &nbsp;
                <span className="font-medium text-gray-700">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalPosts)} of {totalPosts.toLocaleString()} posts
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: '2800px' }}>
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      {/* Identity */}
                      <TH className="min-w-[220px]">Title / Post</TH>
                      <TH className="min-w-[180px]">Organization</TH>
                      <TH className="min-w-[160px]">Recruitment</TH>
                      <TH className="min-w-[120px]">Location</TH>
                      {/* Vacancies */}
                      <TH className="min-w-[80px]">Vacancies</TH>
                      <TH className="min-w-[180px]">Vacancy Detail</TH>
                      {/* Salary */}
                      <TH className="min-w-[180px]">Salary</TH>
                      <TH className="min-w-[100px]">Pay Level</TH>
                      <TH className="min-w-[140px]">Pay Scale</TH>
                      {/* Dates */}
                      <TH className="min-w-[110px]">Apply By</TH>
                      <TH className="min-w-[100px]">Exam Date</TH>
                      <TH className="min-w-[100px]">Result Date</TH>
                      <TH className="min-w-[110px]">Appointment</TH>
                      {/* Eligibility */}
                      <TH className="min-w-[180px]">Education</TH>
                      <TH className="min-w-[150px]">Experience</TH>
                      <TH className="min-w-[150px]">Age Limit</TH>
                      {/* Application */}
                      <TH className="min-w-[100px]">Fee</TH>
                      <TH className="min-w-[160px]">Selection Process</TH>
                      {/* Source */}
                      <TH className="min-w-[90px]">Verification</TH>
                      <TH className="min-w-[80px]">Confidence</TH>
                      <TH className="min-w-[180px]">Data Gaps</TH>
                      <TH className="min-w-[80px]">Official Src</TH>
                      <TH className="min-w-[80px]">Apply Link</TH>
                      {/* Meta */}
                      <TH className="min-w-[90px]">Posted</TH>
                      <TH className="min-w-[70px]">Status</TH>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {posts.map((post) => {
                      const displayTitle = post.title || post.name || post.slug;
                      const vacDetail = post.vacanciesByCategory
                        ? (typeof post.vacanciesByCategory === 'object'
                            ? Object.entries(post.vacanciesByCategory)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ')
                            : String(post.vacanciesByCategory))
                        : null;
                      const ageDetail = post.ageNote ||
                        (post.ageRulesByCategory && typeof post.ageRulesByCategory === 'object'
                          ? Object.entries(post.ageRulesByCategory)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join('; ')
                          : null);
                      return (
                        <tr key={post.id} className="hover:bg-blue-50 transition-colors">
                          {/* Title */}
                          <TD className="min-w-[220px]">
                            <a
                              href={`/jobs/${post.recruitmentSlug}/${post.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 hover:underline font-semibold leading-snug"
                              title={displayTitle}
                            >
                              {truncate(displayTitle, 50)}
                            </a>
                          </TD>
                          {/* Organization */}
                          <TD className="min-w-[180px]">
                            <span title={post.organizationName ?? undefined}>{truncate(post.organizationName, 35)}</span>
                          </TD>
                          {/* Recruitment */}
                          <TD className="min-w-[160px]">
                            <span title={post.recruitmentName ?? undefined}>{truncate(post.recruitmentName, 30)}</span>
                          </TD>
                          {/* Location */}
                          <TD className="min-w-[120px]">
                            {[post.locationCity, post.locationState].filter(Boolean).join(', ') || '—'}
                          </TD>
                          {/* Vacancies */}
                          <TD className="min-w-[80px]">
                            {post.vacanciesTotal != null ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">
                                {post.vacanciesTotal.toLocaleString('en-IN')}
                              </span>
                            ) : '—'}
                          </TD>
                          {/* Vacancy Detail */}
                          <TD className="min-w-[180px]">
                            <span className="text-gray-500" title={vacDetail ?? undefined}>{truncate(vacDetail, 50)}</span>
                          </TD>
                          {/* Salary */}
                          <TD className="min-w-[180px] font-medium">
                            {formatSalary(post.salaryMin, post.salaryMax, post.salaryNote)}
                          </TD>
                          {/* Pay Level */}
                          <TD className="min-w-[100px]">
                            {post.payLevel ? (
                              <span className="inline-flex px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs font-semibold">
                                {post.payLevel}
                              </span>
                            ) : '—'}
                          </TD>
                          {/* Pay Scale */}
                          <TD className="min-w-[140px]">
                            <span title={post.payScale ?? undefined}>{truncate(post.payScale, 30)}</span>
                          </TD>
                          {/* Dates */}
                          <TD className="min-w-[110px] whitespace-nowrap">{formatDate(post.applicationClosingDate)}</TD>
                          <TD className="min-w-[100px] whitespace-nowrap">{formatDate(post.examDate)}</TD>
                          <TD className="min-w-[100px] whitespace-nowrap">{formatDate(post.resultDate)}</TD>
                          <TD className="min-w-[110px] whitespace-nowrap">{formatDate(post.appointmentDate)}</TD>
                          {/* Eligibility */}
                          <TD className="min-w-[180px]">
                            <span title={post.education ?? undefined}>{truncate(post.education, 50)}</span>
                          </TD>
                          <TD className="min-w-[150px]">
                            <span title={post.experience ?? undefined}>{truncate(post.experience, 40)}</span>
                          </TD>
                          <TD className="min-w-[150px]">
                            <span title={ageDetail ?? undefined}>{truncate(ageDetail, 40)}</span>
                          </TD>
                          {/* Application */}
                          <TD className="min-w-[100px]">
                            <span title={post.feeNote ?? undefined}>{truncate(post.feeNote, 25)}</span>
                          </TD>
                          <TD className="min-w-[160px]">
                            <span title={post.selectionProcess ?? undefined}>{truncate(post.selectionProcess, 40)}</span>
                          </TD>
                          {/* Source quality */}
                          <TD className="min-w-[90px]">{statusBadge(post.sourceVerificationStatus)}</TD>
                          <TD className="min-w-[80px]">{confidence(post.extractionConfidence)}</TD>
                          <TD className="min-w-[180px]">
                            <span className="text-gray-400 text-xs" title={post.dataGaps ?? undefined}>{truncate(post.dataGaps, 50)}</span>
                          </TD>
                          {/* Links */}
                          <TD className="min-w-[80px]">
                            {post.officialSourceUrl ? (
                              <a href={post.officialSourceUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200">
                                ✓ Link
                              </a>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </TD>
                          <TD className="min-w-[80px]">
                            {post.applyPortalUrl ? (
                              <a href={post.applyPortalUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200">
                                Apply
                              </a>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </TD>
                          {/* Meta */}
                          <TD className="min-w-[90px] whitespace-nowrap text-gray-400">{formatDate(post.postedAt)}</TD>
                          <TD className="min-w-[70px]">
                            {post.isLive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-semibold">
                                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full inline-block"></span> Live
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">Off</span>
                            )}
                          </TD>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-5 border-t border-gray-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page <span className="font-semibold text-gray-900">{currentPage}</span> of{' '}
                  <span className="font-semibold text-gray-900">{totalPages}</span>
                  {' '}·{' '}
                  <span className="font-semibold text-gray-900">{totalPosts.toLocaleString()}</span> total posts
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
