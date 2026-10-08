'use client';

/**
 * Enhanced Recruitment Hub Component
 * Displays comprehensive recruitment details with tabbed interface and rich information
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface RecruitmentHubProps {
  recruitment: any;
  posts: any[];
}

type TabType = 'overview' | 'eligibility' | 'positions' | 'apply' | 'dates' | 'faq';

const RecruitmentHub: React.FC<RecruitmentHubProps> = ({ recruitment, posts }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const calculateDaysLeft = (endDate: any): number | null => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const today = new Date();
    const diff = end.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days > 0 ? days : 0;
  };

  const daysLeft = calculateDaysLeft(recruitment.applicationEndDate);
  const isUrgent = daysLeft && daysLeft <= 7;

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTotalVacancies = () => {
    return posts.reduce((sum: number, post: any) => {
      const postVacancies = post.vacancies?.reduce((pSum: number, v: any) => pSum + (v.count || 0), 0) || 0;
      return sum + postVacancies;
    }, 0);
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'eligibility', label: 'Eligibility' },
    { id: 'positions', label: 'Positions' },
    { id: 'apply', label: 'How to Apply' },
    { id: 'dates', label: 'Important Dates' },
    { id: 'faq', label: 'FAQ' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full opacity-10 -mr-48 -mt-48"></div>

        <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm opacity-90 flex items-center gap-2">
            <Link href="/jobs" className="hover:opacity-100 border-b border-blue-300 hover:border-white transition">
              Jobs
            </Link>
            <ChevronRight size={16} />
            <span className="opacity-75">{recruitment.name}</span>
          </nav>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {recruitment.name}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-6 mb-6 text-base opacity-95">
            {recruitment.name && <div className="flex items-center gap-2"><strong>Organization:</strong> {recruitment.name}</div>}
            <div className="flex items-center gap-2"><strong>Posts:</strong> {posts.length} Position{posts.length !== 1 ? 's' : ''}</div>
            <div className="flex items-center gap-2"><strong>Vacancies:</strong> {getTotalVacancies()} Total</div>
          </div>

          {/* Status Badge */}
          <div>
            <span className="inline-block bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">
              ✓ Applications Open
            </span>
          </div>
        </div>
      </div>

      {/* Quick Info Panel */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-600 shadow-sm">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Total Vacancies</div>
            <div className="text-2xl font-bold text-gray-900">{getTotalVacancies()}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-600 shadow-sm">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Deadline</div>
            <div className={`text-2xl font-bold ${isUrgent ? 'text-red-600' : 'text-gray-900'}`}>
              {formatDate(recruitment.applicationEndDate)}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-600 shadow-sm">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Days Left</div>
            <div className={`text-2xl font-bold ${isUrgent ? 'text-red-600' : 'text-gray-900'}`}>
              {daysLeft !== null ? daysLeft : 'N/A'}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-600 shadow-sm">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Status</div>
            <div className="text-2xl font-bold text-gray-900">{recruitment.status ? recruitment.status.replace(/_/g, ' ') : 'Open'}</div>
          </div>
        </div>

        {/* Tabbed Interface */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-6 py-4 font-semibold text-sm transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-blue-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-blue-600 inline-block">
                  Recruitment Overview
                </h3>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full">
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-semibold text-gray-700">Organization</td>
                        <td className="py-3 px-4 text-gray-600">{recruitment.name}</td>
                      </tr>
                      <tr className="border-b bg-gray-50">
                        <td className="py-3 px-4 font-semibold text-gray-700">Total Vacancies</td>
                        <td className="py-3 px-4 text-gray-600">{getTotalVacancies()}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-semibold text-gray-700">Application Mode</td>
                        <td className="py-3 px-4 text-gray-600">Online</td>
                      </tr>
                      <tr className="border-b bg-gray-50">
                        <td className="py-3 px-4 font-semibold text-gray-700">Status</td>
                        <td className="py-3 px-4 text-gray-600">{recruitment.status ? recruitment.status.replace(/_/g, ' ') : 'Open'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {recruitment.description && (
                  <div className="mt-8 p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
                    <p className="text-gray-700">{recruitment.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* Eligibility Tab */}
            {activeTab === 'eligibility' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-blue-600 inline-block">
                  Eligibility Criteria
                </h3>
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Position-Specific Requirements</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="py-3 px-4 text-left font-semibold text-gray-700">Position</th>
                          <th className="py-3 px-4 text-left font-semibold text-gray-700">Education</th>
                          <th className="py-3 px-4 text-left font-semibold text-gray-700">Experience</th>
                          <th className="py-3 px-4 text-left font-semibold text-gray-700">Vacancies</th>
                        </tr>
                      </thead>
                      <tbody>
                        {posts.map((post: any, idx: number) => {
                          const postVacancies = post.vacancies?.reduce((sum: number, v: any) => sum + (v.count || 0), 0) || 0;
                          return (
                            <tr key={post.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                              <td className="py-3 px-4 font-semibold text-gray-700">{post.name}</td>
                              <td className="py-3 px-4 text-gray-600">Degree</td>
                              <td className="py-3 px-4 text-gray-600">Varies</td>
                              <td className="py-3 px-4 text-gray-600">{postVacancies}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Positions Tab */}
            {activeTab === 'positions' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-blue-600 inline-block">
                  Available Positions
                </h3>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-3 px-4 text-left font-semibold text-gray-700">Position</th>
                        <th className="py-3 px-4 text-left font-semibold text-gray-700">Vacancies</th>
                        <th className="py-3 px-4 text-left font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((post: any, idx: number) => {
                        const postVacancies = post.vacancies?.reduce((sum: number, v: any) => sum + (v.count || 0), 0) || 0;
                        return (
                          <tr key={post.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                            <td className="py-3 px-4">
                              <Link href={`/jobs/${recruitment.slug}/${post.slug}`} className="font-semibold text-blue-600 hover:underline">
                                {post.name}
                              </Link>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{postVacancies}</td>
                            <td className="py-3 px-4">
                              <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded text-sm font-semibold">Open</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* How to Apply Tab */}
            {activeTab === 'apply' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-blue-600 inline-block">
                  How to Apply
                </h3>
                <ol className="mt-6 space-y-4">
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-sm">1</span>
                    <div>
                      <strong className="text-gray-900">Check Eligibility:</strong>
                      <p className="text-gray-600">Verify that you meet all eligibility criteria for your desired position.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-sm">2</span>
                    <div>
                      <strong className="text-gray-900">Gather Documents:</strong>
                      <p className="text-gray-600">Prepare scans of educational certificates, ID proof, and resume.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-sm">3</span>
                    <div>
                      <strong className="text-gray-900">Visit Official Website:</strong>
                      <p className="text-gray-600">Go to the official recruitment website and create an account.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-sm">4</span>
                    <div>
                      <strong className="text-gray-900">Fill Application Form:</strong>
                      <p className="text-gray-600">Complete all required fields with accurate information and upload documents.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-sm">5</span>
                    <div>
                      <strong className="text-gray-900">Submit Application:</strong>
                      <p className="text-gray-600">Review your application and click Submit. Save the confirmation email.</p>
                    </div>
                  </li>
                </ol>
                <div className="mt-8 p-4 bg-yellow-50 border-l-4 border-yellow-600 rounded">
                  <p className="text-gray-700 font-semibold">⚠️ Important:</p>
                  <p className="text-gray-600 mt-2">Submit your application well before the deadline to avoid last-minute technical issues.</p>
                </div>
              </div>
            )}

            {/* Important Dates Tab */}
            {activeTab === 'dates' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-blue-600 inline-block">
                  Important Dates
                </h3>
                <div className="mt-6 space-y-6">
                  {recruitment.notificationDate && (
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 border-2 border-blue-600 text-blue-600 font-bold">1</div>
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="font-semibold text-gray-900">{formatDate(recruitment.notificationDate)}</p>
                        <p className="text-sm text-gray-600">Notification Published</p>
                      </div>
                    </div>
                  )}
                  {recruitment.applicationStartDate && (
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 border-2 border-blue-600 text-blue-600 font-bold">2</div>
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="font-semibold text-gray-900">{formatDate(recruitment.applicationStartDate)}</p>
                        <p className="text-sm text-gray-600">Application Window Opens</p>
                      </div>
                    </div>
                  )}
                  {recruitment.applicationEndDate && (
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className={`flex items-center justify-center h-10 w-10 rounded-full border-2 font-bold ${
                          isUrgent ? 'bg-red-100 border-red-600 text-red-600' : 'bg-blue-100 border-blue-600 text-blue-600'
                        }`}>
                          3
                        </div>
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={`font-semibold ${isUrgent ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatDate(recruitment.applicationEndDate)}
                          {daysLeft !== null && <span className="text-sm ml-2">({daysLeft} days left)</span>}
                        </p>
                        <p className="text-sm text-gray-600">Application Deadline</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FAQ Tab */}
            {activeTab === 'faq' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-blue-600 inline-block">
                  Frequently Asked Questions
                </h3>
                <div className="mt-6 space-y-6">
                  {[
                    {
                      q: 'What is the selection process?',
                      a: 'The selection process typically involves shortlisting based on educational qualifications and experience, followed by an interview round.'
                    },
                    {
                      q: 'Can I apply for multiple positions?',
                      a: 'Yes, you can apply for multiple positions if you meet the eligibility criteria for each. Submit separate applications for each position.'
                    },
                    {
                      q: 'Is there an age limit?',
                      a: 'Age relaxation may be applicable as per government norms. Check the official notification for detailed information.'
                    },
                    {
                      q: 'How will I receive interview calls?',
                      a: 'Interview calls will be sent via email and SMS to the registered contact details. Ensure you provide correct contact information.'
                    },
                    {
                      q: 'What if I miss the deadline?',
                      a: 'Late applications are not accepted. Apply well before the deadline as there is usually no extension.'
                    },
                    {
                      q: 'Is the application fee refundable?',
                      a: 'The application fee is refundable for SC/ST/PwD candidates. For others, it is non-refundable.'
                    }
                  ].map((faq, idx) => (
                    <div key={idx} className="pb-6 border-b last:border-b-0">
                      <p className="font-semibold text-blue-600 mb-2">Q{idx + 1}: {faq.q}</p>
                      <p className="text-gray-600">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Important Links Section */}
        <div className="mt-8 bg-white rounded-lg p-8 shadow-md">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-blue-600 inline-block">
            Important Links
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <a href="#" className="block bg-blue-600 text-white px-4 py-3 rounded-lg text-center font-semibold hover:bg-blue-700 transition">
              📄 Notification PDF
            </a>
            <a href="#" className="block bg-blue-600 text-white px-4 py-3 rounded-lg text-center font-semibold hover:bg-blue-700 transition">
              🌐 Official Website
            </a>
            <a href="#" className="block bg-blue-600 text-white px-4 py-3 rounded-lg text-center font-semibold hover:bg-blue-700 transition">
              📝 Apply Online
            </a>
            <a href="#" className="block bg-white text-blue-600 border-2 border-blue-600 px-4 py-3 rounded-lg text-center font-semibold hover:bg-blue-50 transition">
              📧 Contact
            </a>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 p-6 bg-green-50 border-l-4 border-green-600 rounded-lg">
          <p className="font-semibold text-green-900">✓ Officially Verified:</p>
          <p className="text-gray-700 mt-2 text-sm">
            This information is sourced from official recruitment notifications. Please verify all details with the official website before applying.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecruitmentHub;
