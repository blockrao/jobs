/**
 * Salary Guides Layout
 *
 * Parent layout for all salary guide pages
 * Provides shared structure with navigation to qualifications, comparisons
 */

import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    template: `%s | Government Job Salary Guide | ${SITE_NAME}`,
    default: `Government Job Salary Guide | ${SITE_NAME}`,
  },
  description:
    "Complete government job salary guide. Learn salary by grade, salary progression, highest paying jobs, and government vs private comparison.",
};

export default function SalaryGuidesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header with Navigation */}
      <header className="sticky top-0 z-40 border-b bg-white">
        <nav className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-blue-600">JobOye</div>
            <ul className="flex gap-8 text-sm font-medium">
              <li><a href="/jobs" className="hover:text-blue-600">Jobs</a></li>
              <li><a href="/qualifications" className="hover:text-blue-600">Qualifications</a></li>
              <li><a href="/salary-guides" className="text-blue-600 font-bold">Salary Guides</a></li>
              <li><a href="/comparisons" className="hover:text-blue-600">Comparisons</a></li>
              <li><a href="/exams" className="hover:text-blue-600">Exams</a></li>
            </ul>
          </div>
          {/* Breadcrumb */}
          <div className="text-xs text-gray-600 mt-2">
            <a href="/">Home</a> / <a href="/salary-guides">Salary Guides</a>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold mb-4">Government Jobs by Qualification</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/qualifications/b-tech" className="hover:text-blue-600">B.Tech Jobs</a></li>
                <li><a href="/qualifications/mba" className="hover:text-blue-600">MBA Jobs</a></li>
                <li><a href="/qualifications/b-com" className="hover:text-blue-600">B.Com Jobs</a></li>
                <li><a href="/qualifications" className="hover:text-blue-600">View All</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Salary Guides</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/salary-guides/government-job-salary-by-grade" className="hover:text-blue-600">By Grade</a></li>
                <li><a href="/salary-guides/highest-paying-jobs" className="hover:text-blue-600">Highest Paying</a></li>
                <li><a href="/salary-guides/salary-progression" className="hover:text-blue-600">Salary Growth</a></li>
                <li><a href="/salary-guides" className="hover:text-blue-600">View All</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Compare Exams</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/comparisons/upsc-vs-ssc" className="hover:text-blue-600">UPSC vs SSC</a></li>
                <li><a href="/comparisons/ibps-vs-sbi" className="hover:text-blue-600">IBPS vs SBI</a></li>
                <li><a href="/comparisons" className="hover:text-blue-600">View All</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/jobs" className="hover:text-blue-600">Latest Jobs</a></li>
                <li><a href="/exams" className="hover:text-blue-600">Exam Calendar</a></li>
                <li><a href="/" className="hover:text-blue-600">Home</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-8 flex justify-between items-center text-sm text-gray-600">
            <p>&copy; 2026 {SITE_NAME}. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="/" className="hover:text-blue-600">Privacy</a>
              <a href="/" className="hover:text-blue-600">Terms</a>
              <a href="/" className="hover:text-blue-600">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
