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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Job Postings Report</h1>
          <p className="text-gray-600">
            Comprehensive view of all {totalPosts.toLocaleString()} live job postings with enrichment data
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 font-semibold uppercase">Total Posts</div>
            <div className="text-3xl font-bold text-indigo-600">{stats.totalPosts.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 font-semibold uppercase">With Salary Data</div>
            <div className="text-3xl font-bold text-green-600">
              {stats.withSalary.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 font-semibold uppercase">With Vacancies</div>
            <div className="text-3xl font-bold text-blue-600">
              {stats.withVacancies.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-600 font-semibold uppercase">With Exam Date</div>
            <div className="text-3xl font-bold text-purple-600">
              {stats.withExamDate.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                  <thead className="bg-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left border-b font-semibold text-sm">Position Title</th>
                      <th className="px-4 py-2 text-left border-b font-semibold text-sm">Organization</th>
                      <th className="px-4 py-2 text-left border-b font-semibold text-sm">Vacancies</th>
                      <th className="px-4 py-2 text-left border-b font-semibold text-sm">Salary Range</th>
                      <th className="px-4 py-2 text-left border-b font-semibold text-sm">Application Deadline</th>
                      <th className="px-4 py-2 text-left border-b font-semibold text-sm">Exam Date</th>
                      <th className="px-4 py-2 text-left border-b font-semibold text-sm">Posted Date</th>
                      <th className="px-4 py-2 text-left border-b font-semibold text-sm">Source</th>
                      <th className="px-4 py-2 text-left border-b font-semibold text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr key={post.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                          <a
                            href={`/jobs/${post.recruitmentSlug}/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            {post.title}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                          {post.organizationName}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">
                          {post.vacanciesTotal ? (
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs">
                              {post.vacanciesTotal}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {formatSalary(post.salaryMin, post.salaryMax, post.salaryNote)}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {formatDate2(post.applicationClosingDate)}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {formatDate2(post.examDate)}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs">
                          {formatDate2(post.postedAt)}
                        </td>
                        <td className="px-4 py-3">
                          {post.officialSourceUrl ? (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                              ✓ Verified
                            </span>
                          ) : (
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {post.isLive ? (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                              Live
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-semibold">
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing <strong>{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</strong> to{' '}
                  <strong>{Math.min(currentPage * ITEMS_PER_PAGE, totalPosts)}</strong> of{' '}
                  <strong>{totalPosts.toLocaleString()}</strong> posts
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
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
