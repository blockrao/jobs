import type { Metadata } from "next";
import Link from "next/link";
import { pageSeo } from "@/lib/seo";

const recruitmentSlug = "jkssb-advertisement-08-of-2026";
const postSlug = "horticulture-technician-grade-iv";

export const metadata: Metadata = {
  title: "JKSSB Advertisement No. 08 of 2026 — Recruitment | JobOye",
  description: "Preview of JKSSB Advertisement No. 08 of 2026. Recruitment information is awaiting official verification.",
  ...pageSeo(`/jobs/${recruitmentSlug}`, { index: false, noarchive: true }),
};

const departments = [
  { name: "Agriculture Production", vacancies: 46 },
  { name: "Health & Medical Education", vacancies: 421 },
  { name: "Higher Education", vacancies: 48 },
  { name: "Labour & Employment", vacancies: 3 },
];

export default function JkssbRecruitmentHubPage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <nav aria-label="Breadcrumb" className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 text-sm text-gray-600">
          <Link href="/jobs" className="font-medium text-blue-600 hover:text-blue-700">Jobs</Link>
          <span className="text-gray-400">›</span>
          <span className="truncate font-medium text-gray-900">JKSSB Advertisement No. 08 of 2026</span>
        </nav>
      </div>

      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">UNVERIFIED PREVIEW</span>
          <span className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-600">Noindex · Not an official application page</span>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white px-5 py-6 shadow-sm md:px-8 md:py-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Jammu and Kashmir Services Selection Board (JKSSB)</p>
          <h1 className="mb-2 text-2xl font-bold leading-tight text-gray-900 md:text-3xl">Advertisement Notification No. 08 of 2026</h1>
          <p className="mb-5 text-sm leading-relaxed text-gray-600">Recruitment details are being reviewed against the official notification. The figures and dates below are research placeholders and must not be used to make application decisions.</p>

          <div className="mb-5 flex flex-wrap gap-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="text-xl font-bold text-amber-900">518*</div>
              <div className="mt-0.5 text-xs text-amber-800">Reported vacancies · unverified</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div className="text-base font-bold text-gray-900">Not confirmed</div>
              <div className="mt-0.5 text-xs text-gray-500">Application status</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div className="text-base font-bold text-gray-900">4 Aug 2026*</div>
              <div className="mt-0.5 text-xs text-gray-500">Reported notification date · unverified</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href="#available-posts" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">View available post <span aria-hidden="true">→</span></a>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm md:px-8">
          <h2 className="mb-3 text-base font-bold text-gray-900">Recruitment Details</h2>
          <dl className="divide-y divide-gray-100">
            <div className="flex gap-4 py-3"><dt className="w-36 shrink-0 text-sm text-gray-500">Organization</dt><dd className="text-sm font-medium text-gray-900">Jammu and Kashmir Services Selection Board</dd></div>
            <div className="flex gap-4 py-3"><dt className="w-36 shrink-0 text-sm text-gray-500">Notification</dt><dd className="text-sm text-gray-900">Advertisement No. 08 of 2026 · not independently verified</dd></div>
            <div className="flex gap-4 py-3"><dt className="w-36 shrink-0 text-sm text-gray-500">Application dates</dt><dd className="text-sm text-gray-900">Reported 10 Sep – 9 Oct 2026 · unverified</dd></div>
            <div className="flex gap-4 py-3"><dt className="w-36 shrink-0 text-sm text-gray-500">Official source</dt><dd className="text-sm text-gray-500">Not yet verified — no official PDF or apply link is provided here.</dd></div>
          </dl>
        </section>

        <section id="available-posts" className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm md:px-8">
          <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-gray-900"><span className="text-blue-600" aria-hidden="true">▣</span> Available Post</h2>
          <p className="mb-4 text-sm text-gray-500">Post-specific information is awaiting verification.</p>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
            <Link href={`/jobs/${recruitmentSlug}/${postSlug}`} className="group block">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="mb-2 text-lg font-bold text-gray-900 group-hover:text-blue-600">Horticulture Technician Grade-IV</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600"><span>Item 105 · reported, unverified</span><span>•</span><span>Srinagar · unverified</span></div>
                </div>
                <span className="shrink-0 text-blue-600" aria-hidden="true">→</span>
              </div>
            </Link>
            <div className="mt-4 border-t border-blue-200 pt-4">
              <Link href={`/jobs/${recruitmentSlug}/${postSlug}`} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">View Post Details <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm md:px-8">
          <h2 className="mb-1 text-base font-bold text-gray-900">Reported Department-wise Vacancies</h2>
          <p className="mb-4 text-sm text-gray-500">Research placeholders only; not verified against the official notification.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse text-left text-sm">
              <thead><tr className="border-b border-gray-200 text-gray-500"><th className="py-3 pr-4 font-medium">Department</th><th className="py-3 text-right font-medium">Reported vacancies</th></tr></thead>
              <tbody>{departments.map((department) => <tr key={department.name} className="border-b border-gray-100"><td className="py-3 pr-4 text-gray-800">{department.name}</td><td className="py-3 text-right font-semibold text-gray-900">{department.vacancies}</td></tr>)}<tr className="bg-gray-50"><td className="py-3 pr-4 font-bold">Reported total</td><td className="py-3 text-right font-bold">518*</td></tr></tbody>
            </table>
          </div>
        </section>

        <p className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-950"><strong>Verification notice:</strong> This preview is intentionally non-indexable. Vacancy counts, dates, department allocation and post details are unverified. Confirm all information from JKSSB before relying on it. No official application action is available on this page.</p>
      </div>
    </main>
  );
}
