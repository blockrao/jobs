'use client';

/**
 * Recruitment Hub Component - Single Page Design
 * Modern, competitive recruitment information display
 * Similar to: freejobalert.com, jobone.in, yuvaresult.in, sarkarinaukri.com
 */

import React from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  MapPin,
  Briefcase,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Award,
  FileText,
  Globe,
  Phone,
  Eye,
  Share2,
  Bookmark
} from 'lucide-react';

interface RecruitmentHubProps {
  recruitment: any;
  posts: any[];
  /** Resolved total vacancies from resolveRecruitmentVacancy() — null when unverified */
  resolvedTotalVacancies?: number | null;
}

const RecruitmentHub: React.FC<RecruitmentHubProps> = ({ recruitment, posts, resolvedTotalVacancies }) => {
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

  // Resolved total comes from resolveRecruitmentVacancy() server-side.
  // Null means unverified — display a dash rather than a misleading zero.
  const displayTotalVacancies = resolvedTotalVacancies != null
    ? String(resolvedTotalVacancies)
    : '—';

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/jobs" className="text-blue-600 hover:text-blue-700 font-medium">
              Jobs
            </Link>
            <ChevronRight size={16} />
            <span className="text-gray-900 font-medium truncate">{recruitment.name}</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto">
        {/* Hero Section with Key Info */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-200 px-4 py-8 md:py-12">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">
                {recruitment.name}
              </h1>
              <p className="text-gray-600">View all open positions, eligibility criteria, and apply now</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button className="p-2 hover:bg-gray-200 rounded-lg transition">
                <Share2 size={20} className="text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-200 rounded-lg transition">
                <Bookmark size={20} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Urgent Alert */}
          {isUrgent && (
            <div className="bg-red-50 border-l-4 border-red-600 px-4 py-3 rounded-r-lg mb-6 flex gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-bold text-red-900">⚠️ Deadline Urgent!</p>
                <p className="text-red-700 text-sm">Only <strong>{daysLeft}</strong> days left to apply</p>
              </div>
            </div>
          )}

          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{posts.length}</div>
              <div className="text-sm text-gray-600">Total Positions</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{displayTotalVacancies}</div>
              <div className="text-sm text-gray-600">Total Vacancies</div>
            </div>
            <div className={`rounded-lg p-4 border ${isUrgent ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
              <div className={`text-2xl font-bold ${isUrgent ? 'text-red-700' : 'text-gray-900'}`}>
                {formatDate(recruitment.applicationEndDate)}
              </div>
              <div className={`text-sm ${isUrgent ? 'text-red-600' : 'text-gray-600'}`}>Deadline</div>
            </div>
            <div className={`rounded-lg p-4 border ${isUrgent ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
              <div className={`text-2xl font-bold ${isUrgent ? 'text-red-700' : 'text-green-700'}`}>
                {daysLeft !== null ? daysLeft : '—'}
              </div>
              <div className={`text-sm ${isUrgent ? 'text-red-600' : 'text-green-600'}`}>Days Left</div>
            </div>
          </div>
        </div>

        {/* Content Sections - Single Page - 10-Section Architecture */}
        <div className="px-4 py-8 md:py-12 space-y-12">

          {/* ========== P0/CRITICAL SECTIONS ========== */}

          {/* P0-2: Important Dates Timeline (RIGHT AFTER HERO) */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Calendar size={24} className="text-blue-600" />
              Important Dates
            </h2>
            <div className="space-y-4">
              {recruitment.notificationDate && (
                <div className="flex gap-4 items-start bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                      1
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900">{formatDate(recruitment.notificationDate)}</div>
                    <div className="text-sm text-gray-600">Notification Published</div>
                  </div>
                </div>
              )}
              {recruitment.applicationStartDate && (
                <div className="flex gap-4 items-start bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                      2
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900">{formatDate(recruitment.applicationStartDate)}</div>
                    <div className="text-sm text-gray-600">Application Window Opens</div>
                  </div>
                </div>
              )}
              {recruitment.applicationEndDate && (
                <div className={`flex gap-4 items-start rounded-lg p-4 border-2 ${
                  isUrgent
                    ? 'bg-red-50 border-red-300'
                    : 'bg-white border-gray-200'
                }`}>
                  <div className="flex-shrink-0">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
                      isUrgent
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      3
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold ${isUrgent ? 'text-red-900' : 'text-gray-900'}`}>
                      {formatDate(recruitment.applicationEndDate)}
                      {daysLeft !== null && <span className="text-sm ml-2 font-normal">({daysLeft} days left)</span>}
                    </div>
                    <div className={`text-sm ${isUrgent ? 'text-red-700' : 'text-gray-600'}`}>
                      Application Deadline {isUrgent && '⚠️ CLOSING SOON'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ========== P1/HIGH PRIORITY SECTIONS ========== */}

          {/* P1-1: About Section (Overview) */}
          {recruitment.description && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Eye size={24} className="text-blue-600" />
                About This Recruitment
              </h2>
              <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-lg p-6">
                <p className="text-gray-700 leading-relaxed">{recruitment.description}</p>
              </div>
            </section>
          )}

          {/* P1-2: Position Details & Qualifications */}
          {recruitment.metadata && recruitment.metadata.positions && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Award size={24} className="text-blue-600" />
                Position Details & Qualifications
              </h2>
              <div className="space-y-4">
                {(recruitment.metadata.positions as any[]).map((position: any, index: number) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{position.position_name}</h3>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1">
                            <Users size={16} className="text-blue-600" />
                            <strong>{position.vacancies}</strong> Vacancy{position.vacancies !== 1 ? 'ies' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign size={16} className="text-green-600" />
                            {position.pay_level}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Essential Qualifications */}
                    <div className="mb-4">
                      <p className="font-semibold text-gray-900 mb-2">Essential Qualifications:</p>
                      <ul className="space-y-1">
                        {(position.essential_qualifications || []).map((qual: string, idx: number) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                            {qual}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Desirable Qualifications */}
                    {position.desirable_qualifications && position.desirable_qualifications.length > 0 && (
                      <div>
                        <p className="font-semibold text-gray-900 mb-2">Desirable Qualifications:</p>
                        <ul className="space-y-1">
                          {(position.desirable_qualifications || []).map((qual: string, idx: number) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-blue-600 mt-0.5 flex-shrink-0">◆</span>
                              {qual}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Fallback: Available Positions - Card Layout */}
          {!recruitment.metadata?.positions && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Briefcase size={24} className="text-blue-600" />
                Available Positions ({posts.length})
              </h2>
              <div className="space-y-3">
                {posts.map((post: any, index: number) => {
                  // resolvedVacancyCount is set by the page via resolvePostVacancy()
                  const postVacancies = post.resolvedVacancyCount ?? null;
                  return (
                    <Link
                      key={post.id}
                      href={`/jobs/${recruitment.slug}/${post.slug}`}
                      className="block bg-white border border-gray-300 rounded-lg p-4 md:p-5 hover:border-blue-400 hover:shadow-lg transition-all group"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-bold flex-shrink-0">
                              {index + 1}
                            </span>
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition truncate">
                              {post.name}
                            </h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 ml-11">
                            <span className="flex items-center gap-1">
                              <Users size={16} className="text-blue-600" />
                              {postVacancies != null
                                ? <><strong>{postVacancies}</strong>&nbsp;Post{postVacancies !== 1 ? 's' : ''}</>
                                : <span className="text-gray-400">See position details</span>
                              }
                            </span>
                            {post.position?.name && (
                              <span className="flex items-center gap-1">
                                <Award size={16} className="text-blue-600" />
                                {post.position.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                            Open
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* P1-3: General Eligibility Criteria */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Award size={24} className="text-blue-600" />
              {recruitment.metadata?.eligibility ? 'General Eligibility Criteria' : 'Eligibility Criteria'}
            </h2>

            {/* Metadata-based Eligibility */}
            {recruitment.metadata?.eligibility && (
              <div className="space-y-4 mb-8">
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="space-y-4">
                    {recruitment.metadata.eligibility.age_limit && (
                      <div>
                        <p className="font-semibold text-gray-900 mb-1">Age Limit:</p>
                        <p className="text-gray-700">{recruitment.metadata.eligibility.age_limit}</p>
                        {recruitment.metadata.eligibility.age_relaxation && (
                          <p className="text-sm text-gray-600 mt-1">{recruitment.metadata.eligibility.age_relaxation}</p>
                        )}
                      </div>
                    )}

                    {recruitment.metadata.eligibility.language_requirements && (
                      <div>
                        <p className="font-semibold text-gray-900 mb-2">Language Requirements:</p>
                        <ul className="space-y-1">
                          {(recruitment.metadata.eligibility.language_requirements || []).map((lang: string, idx: number) => (
                            <li key={idx} className="text-gray-700 flex items-center gap-2">
                              <CheckCircle size={16} className="text-blue-600" />
                              {lang}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {recruitment.metadata.eligibility.domicile && (
                      <div>
                        <p className="font-semibold text-gray-900 mb-1">Domicile/Residence:</p>
                        <p className="text-gray-700">{recruitment.metadata.eligibility.domicile}</p>
                      </div>
                    )}

                    {recruitment.metadata.eligibility.category_provisions && (
                      <div>
                        <p className="font-semibold text-gray-900 mb-1">Category Provisions:</p>
                        <p className="text-gray-700">{recruitment.metadata.eligibility.category_provisions}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Simple Position Table */}
            <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-3 text-left font-bold text-gray-900 text-sm">Position</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-900 text-sm">Education</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-900 text-sm">Vacancies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post: any, idx: number) => {
                      // resolvedVacancyCount is set by the page via resolvePostVacancy()
                      const postVacancies = post.resolvedVacancyCount ?? null;
                      return (
                        <tr key={post.id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-4 py-3 font-semibold text-gray-900 text-sm">{post.name}</td>
                          <td className="px-4 py-3 text-gray-600 text-sm">{post.qualification_text || 'See position details'}</td>
                          <td className="px-4 py-3 text-gray-900 font-bold text-sm">
                            {postVacancies != null ? postVacancies : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* P1-4: How to Apply */}
          {recruitment.metadata?.application_process && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FileText size={24} className="text-blue-600" />
                How to Apply
              </h2>
              <div className="space-y-4">
                {recruitment.metadata.application_process.application_method && (
                  <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <p className="font-semibold text-gray-900 mb-2">Application Method:</p>
                    <p className="text-gray-700">{recruitment.metadata.application_process.application_method}</p>
                  </div>
                )}

                {recruitment.metadata.application_process.submission_address && (
                  <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <p className="font-semibold text-gray-900 mb-3">Submit Application To:</p>
                    <div className="text-gray-700 space-y-1">
                      <p><strong>{recruitment.metadata.application_process.submission_address.organization}</strong></p>
                      <p>{recruitment.metadata.application_process.submission_address.building}</p>
                      <p>{recruitment.metadata.application_process.submission_address.location}</p>
                    </div>
                  </div>
                )}

                {(recruitment.metadata.application_process.application_deadline || recruitment.metadata.application_process.deadline_time) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-5">
                    <p className="font-semibold text-red-900 mb-2">📅 Application Deadline:</p>
                    <p className="text-red-900">
                      <strong>{recruitment.metadata.application_process.application_deadline}</strong>
                    </p>
                    {recruitment.metadata.application_process.deadline_time && (
                      <p className="text-red-800 text-sm mt-1">{recruitment.metadata.application_process.deadline_time}</p>
                    )}
                    {recruitment.metadata.application_process.lunch_break && (
                      <p className="text-red-800 text-sm mt-1">Lunch Break: {recruitment.metadata.application_process.lunch_break}</p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ========== P2/MEDIUM PRIORITY SECTIONS ========== */}

          {/* P2-1: Selection Process & Stages */}
          {recruitment.metadata?.selection_process_details && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Clock size={24} className="text-blue-600" />
                Selection Process & Stages
              </h2>
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                {recruitment.metadata.selection_process_details.method && (
                  <div className="mb-4">
                    <p className="font-semibold text-gray-900 mb-2">Selection Method:</p>
                    <p className="text-gray-700">{recruitment.metadata.selection_process_details.method}</p>
                  </div>
                )}

                {recruitment.metadata.selection_process_details.stages && (
                  <div className="mb-4">
                    <p className="font-semibold text-gray-900 mb-3">Selection Stages:</p>
                    <ol className="space-y-2">
                      {(recruitment.metadata.selection_process_details.stages || []).map((stage: string, idx: number) => (
                        <li key={idx} className="text-gray-700 flex items-start gap-2">
                          <span className="font-bold text-blue-600 flex-shrink-0">{idx + 1}.</span>
                          {stage}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {recruitment.metadata.selection_process_details.no_TA_DA && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                    <p className="text-sm text-yellow-800">⚠️ {recruitment.metadata.selection_process_details.no_TA_DA}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* P2-2: Required Documents (NEW SECTION) */}
          {recruitment.metadata?.required_documents && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FileText size={24} className="text-blue-600" />
                Required Documents
              </h2>
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <ul className="space-y-2">
                  {(recruitment.metadata.required_documents || []).map((doc: string, idx: number) => (
                    <li key={idx} className="text-gray-700 flex items-start gap-2">
                      <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* P2-3: General Guidelines & T&Cs */}
          {recruitment.metadata?.general_guidelines && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <AlertCircle size={24} className="text-blue-600" />
                General Guidelines & Terms & Conditions
              </h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                <ul className="space-y-2">
                  {(recruitment.metadata.general_guidelines || []).map((guideline: string, idx: number) => (
                    <li key={idx} className="text-gray-700 flex items-start gap-2">
                      <CheckCircle size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>{guideline}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Fallback: How to Apply Section (when no metadata) */}
          {!recruitment.metadata?.application_process && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FileText size={24} className="text-blue-600" />
                How to Apply
              </h2>
              <div className="space-y-3">
                {[
                  { step: '1', title: 'Check Eligibility', desc: 'Verify you meet all requirements for your desired position' },
                  { step: '2', title: 'Prepare Documents', desc: 'Gather educational certificates, ID proof, resume, and passport photos' },
                  { step: '3', title: 'Visit Official Website', desc: 'Go to the official recruitment portal and create an account' },
                  { step: '4', title: 'Fill Application', desc: 'Complete all required fields with accurate information and upload documents' },
                  { step: '5', title: 'Submit & Confirm', desc: 'Review your application carefully and submit. Save your confirmation email' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4 bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold">
                        {item.step}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">{item.title}</div>
                      <div className="text-sm text-gray-600 mt-1">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-600 rounded-r-lg p-4">
                <p className="font-bold text-yellow-900 mb-1">⚠️ Important Reminders:</p>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Apply before the deadline; late applications are rejected</li>
                  <li>• Provide correct and complete information</li>
                  <li>• Keep your confirmation email for reference</li>
                  <li>• Check the official website regularly for updates</li>
                </ul>
              </div>
            </section>
          )}

          {/* ========== P3/LOW PRIORITY SECTIONS ========== */}

          {/* P3-1: Contact & Support */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Phone size={24} className="text-blue-600" />
              Contact & Support
            </h2>
            <div className="space-y-4">
              {recruitment.metadata?.contact_details && (
                <>
                  {recruitment.metadata.contact_details.email && (
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <p className="font-semibold text-gray-900 mb-2">Email Address:</p>
                      <p className="text-blue-600 font-mono">{recruitment.metadata.contact_details.email}</p>
                    </div>
                  )}
                  {recruitment.metadata.contact_details.phone && (
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <p className="font-semibold text-gray-900 mb-2">Phone:</p>
                      <p className="text-gray-700">{recruitment.metadata.contact_details.phone}</p>
                    </div>
                  )}
                  {recruitment.metadata.contact_details.website && (
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <p className="font-semibold text-gray-900 mb-2">Official Website:</p>
                      <a href={recruitment.metadata.contact_details.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 break-all">
                        {recruitment.metadata.contact_details.website}
                      </a>
                    </div>
                  )}
                </>
              )}
              {recruitment.metadata?.contact_details?.office_address && (
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <p className="font-semibold text-gray-900 mb-2">Office Address:</p>
                  <p className="text-gray-700 whitespace-pre-line">{recruitment.metadata.contact_details.office_address}</p>
                </div>
              )}

              {/* Fallback contact section */}
              {!recruitment.metadata?.contact_details && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                  <p className="text-gray-700 mb-3">
                    For further information and clarifications, visit the official recruitment website or contact the recruiting organization directly.
                  </p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>💡 <strong>Tip:</strong> Most organizations provide support through their official website portal.</p>
                    <p>📧 <strong>Email:</strong> Check the official notification for contact email</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Action Buttons - Call to Action */}
          <section className="flex gap-3 flex-col md:flex-row">
            <button className="flex-1 bg-blue-600 text-white font-bold py-3 md:py-4 rounded-lg hover:bg-blue-700 transition text-center">
              📝 Read Full Notification
            </button>
            <button className="flex-1 bg-green-600 text-white font-bold py-3 md:py-4 rounded-lg hover:bg-green-700 transition text-center">
              🌐 Apply on Official Website
            </button>
          </section>

          {/* P3-2: FAQs & Resources */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Globe size={24} className="text-blue-600" />
              Frequently Asked Questions & Resources
            </h2>
            <div className="space-y-4">
              {[
                { q: 'Can I apply for multiple positions?', a: 'Yes, if you meet the eligibility for each position, submit separate applications.' },
                { q: 'What is the selection process?', a: 'Typically: merit-based shortlisting → written exam/interview → final selection' },
                { q: 'How will I be notified?', a: 'Updates sent via email and SMS to your registered contact details.' },
                { q: 'Is the application fee refundable?', a: 'Fee refund varies by category. Check the official notification for details.' },
                { q: 'Age relaxation available?', a: 'Yes, as per government norms. Details in the official notification.' },
              ].map((faq, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="font-bold text-blue-600 mb-2">Q{idx + 1}: {faq.q}</p>
                  <p className="text-gray-700">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ========== VERIFICATION & CLOSURE ========== */}

          {/* Footer Verification Banner */}
          <section className="bg-green-50 border-l-4 border-green-600 rounded-r-lg p-6">
            <div className="flex gap-3">
              <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
              <div>
                <p className="font-bold text-green-900 mb-1">✓ Officially Verified Information</p>
                <p className="text-sm text-green-800">
                  This recruitment hub displays information from official notifications. Always verify details with the official website before applying.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom Spacing */}
        <div className="h-8"></div>
      </div>
    </div>
  );
};

export default RecruitmentHub;
