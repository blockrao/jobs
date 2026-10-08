'use client';

import { useEffect, useState } from 'react';

interface Post {
  id: number;
  title: string;
  slug: string;
  organizationName: string;
  recruitmentName: string;
  recruitmentSlug: string;
  description: string;
  isLive: boolean;
  postedAt: string;
  updatedAt: string;
  officialSourceUrl: string | null;
  applyPortalUrl: string | null;
  vacanciesTotal: number | null;
  vacanciesByCategory: any;
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
  ageRulesByCategory: any;
  ageNote: string | null;
  education: string | null;
  experience: string | null;
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
}

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
  });

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const offset = (currentPage - 1) * ITEMS_PER_PAGE;
        const response = await fetch(
          `/api/reports/posts?limit=${ITEMS_PER_PAGE}&offset=${offset}`
        );
        if (!response.ok) throw new Error('Failed to fetch posts');
        const data = await response.json();
        setPosts(data.posts || []);
        setTotalPosts(data.totalCount || 0);
        setStats(data.stats || {
          totalPosts: 0,
          withSalary: 0,
          withVacancies: 0,
          withExamDate: 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [currentPage]);

  const totalPages = Math.ceil(totalPosts / ITEMS_PER_PAGE);

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const formatSalary = (min: number | null, max: number | null, note: string | null) => {
    if (note) return note;
    if (min && max) return `₹${(min / 100000).toFixed(2)}L - ₹${(max / 100000).toFixed(2)}L`;
    if (min) return `₹${(min / 100000).toFixed(2)}L+`;
    return '—';
  };

  const formatDate2 = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN');
  };

  const MetricCard = ({
    label,
    value,
    percentage,
    color,
    icon,
  }: {
    label: string;
    value: number;
    percentage: number;
    color: string;
    icon: string;
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-5xl font-bold text-gray-900 mb-3">Job Postings Dashboard</h1>
              <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
                Real-time analytics of all live job postings across platforms with enrichment coverage tracking
              </p>
            </div>
          </div>
          <div className="h-1 w-20 bg-gradient-to-r from-indigo-600 to-blue-500 rounded-full"></div>
        </div>

        {/* Key Metrics Section */}
        <div className="mb-12">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-6">Data Completeness Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              label="Total Live Postings"
              value={stats.totalPosts}
              percentage={100}
              color="text-indigo-600"
              icon="📊"
            />
            <MetricCard
              label="With Salary Information"
              value={stats.withSalary}
              percentage={calculatePercentage(stats.withSalary, stats.totalPosts)}
              color="text-emerald-600"
              icon="💰"
            />
            <MetricCard
              label="With Vacancy Details"
              value={stats.withVacancies}
              percentage={calculatePercentage(stats.withVacancies, stats.totalPosts)}
              color="text-blue-600"
              icon="👥"
            />
            <MetricCard
              label="With Exam Date"
              value={stats.withExamDate}
              percentage={calculatePercentage(stats.withExamDate, stats.totalPosts)}
              color="text-purple-600"
              icon="📅"
            />
          </div>
        </div>

        {/* Data Table Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-6">Live Job Postings</h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              Loading posts...
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-500">
              Error: {error}
            </div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No posts found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">Position Title</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">Organization</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">Vacancies</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">Salary Range</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">Application Deadline</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">Exam Date</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">Posted Date</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">Source</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {posts.map((post) => (
                      <tr key={post.id} className="hover:bg-blue-50 transition-colors duration-150">
                        <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate">
                          <a
                            href={`/jobs/${post.recruitmentSlug}/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-700 hover:underline font-semibold"
                          >
                            {post.title}
                          </a>
                        </td>
                        <td className="px-6 py-4 text-gray-700 max-w-xs truncate">
                          {post.organizationName}
                        </td>
                        <td className="px-6 py-4">
                          {post.vacanciesTotal ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold">
                              {post.vacanciesTotal}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-700 font-medium">
                          {formatSalary(post.salaryMin, post.salaryMax, post.salaryNote)}
                        </td>
                        <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                          {formatDate2(post.applicationClosingDate)}
                        </td>
                        <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                          {formatDate2(post.examDate)}
                        </td>
                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap text-xs">
                          {formatDate2(post.postedAt)}
                        </td>
                        <td className="px-6 py-4">
                          {post.officialSourceUrl ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold">
                              <span>✓</span> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-semibold">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {post.isLive ? (
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold">
                              <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>
                              Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold">
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="px-6 py-6 border-t border-gray-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to{' '}
                  <span className="font-semibold text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, totalPosts)}</span> of{' '}
                  <span className="font-semibold text-gray-900">{totalPosts.toLocaleString()}</span> posts
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 transition-colors"
                  >
                    ← Previous
                  </button>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg">
                    <span className="text-sm text-gray-600">Page</span>
                    <span className="font-semibold text-gray-900">{currentPage}</span>
                    <span className="text-gray-400">of</span>
                    <span className="font-semibold text-gray-900">{totalPages}</span>
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 transition-colors"
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
