import type { Metadata } from "next";
import Link from "next/link";
import { pageSeo } from "@/lib/seo";

const recruitmentSlug = "jkssb-advertisement-08-of-2026";
const postSlug = "horticulture-technician-grade-iv";

export const metadata: Metadata = {
  title: "Horticulture Technician Grade-IV — JKSSB | JobOye",
  description: "Preview of Horticulture Technician Grade-IV under JKSSB Advertisement No. 08 of 2026. Post details await official verification.",
  ...pageSeo(`/jobs/${recruitmentSlug}/${postSlug}`, { index: false, noarchive: true }),
};

export default function JkssbHorticultureTechnicianPostPage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <nav aria-label="Breadcrumb" className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3 text-sm text-gray-600">
          <Link href="/jobs" className="font-medium text-blue-600 hover:text-blue-700">Jobs</Link>
          <span className="text-gray-400">›</span>
          <Link href={`/jobs/${recruitmentSlug}`} className="font-medium text-blue-600 hover:text-blue-700">JKSSB Advertisement No. 08 of 2026</Link>
          <span className="text-gray-400">›</span>
          <span className="font-medium text-gray-900">Horticulture Technician Grade-IV</span>
        </nav>
      </div>

      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">UNVERIFIED POST PREVIEW</span>
          <span className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-600">Noindex · No apply action</span>
        </div>

        <article className="rounded-xl border border-gray-200 bg-white px-5 py-6 shadow-sm md:px-8 md:py-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Jammu and Kashmir Services Selection Board (JKSSB)</p>
          <h1 className="mb-2 text-2xl font-bold leading-tight text-gray-900 md:text-3xl">Horticulture Technician Grade-IV</h1>
          <p className="mb-5 text-sm text-gray-600">JKSSB Advertisement No. 08 of 2026 · Post identity and item number awaiting verification</p>

          <div className="mb-6 flex flex-wrap gap-3">
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3"><div className="text-base font-bold text-gray-900">Not verified</div><div className="mt-0.5 text-xs text-gray-500">Vacancy count</div></div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3"><div className="text-base font-bold text-gray-900">Pending review</div><div className="mt-0.5 text-xs text-gray-500">Qualification and age</div></div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3"><div className="text-base font-bold text-gray-900">Not confirmed</div><div className="mt-0.5 text-xs text-gray-500">Application status</div></div>
          </div>

          <p className="text-sm leading-relaxed text-gray-700">This post page is connected to the recruitment hub using JobOye’s standard recruitment/post URL pattern. It is a layout and route preview, not a verified vacancy announcement.</p>
        </article>

        <section className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm md:px-8">
          <h2 className="mb-3 text-base font-bold text-gray-900">Post Details</h2>
          <dl className="divide-y divide-gray-100">
            <div className="flex gap-4 py-3"><dt className="w-40 shrink-0 text-sm text-gray-500">Recruitment</dt><dd className="text-sm text-gray-900"><Link className="font-medium text-blue-600 hover:text-blue-700" href={`/jobs/${recruitmentSlug}`}>JKSSB Advertisement No. 08 of 2026</Link></dd></div>
            <div className="flex gap-4 py-3"><dt className="w-40 shrink-0 text-sm text-gray-500">Post / item number</dt><dd className="text-sm text-gray-900">Horticulture Technician Grade-IV · reported Item 105, unverified</dd></div>
            <div className="flex gap-4 py-3"><dt className="w-40 shrink-0 text-sm text-gray-500">Location</dt><dd className="text-sm text-gray-900">Srinagar · unverified</dd></div>
            <div className="flex gap-4 py-3"><dt className="w-40 shrink-0 text-sm text-gray-500">Vacancies</dt><dd className="text-sm text-gray-500">Not verified</dd></div>
            <div className="flex gap-4 py-3"><dt className="w-40 shrink-0 text-sm text-gray-500">Qualification</dt><dd className="text-sm text-gray-500">Awaiting official notification review</dd></div>
            <div className="flex gap-4 py-3"><dt className="w-40 shrink-0 text-sm text-gray-500">Age limit and pay</dt><dd className="text-sm text-gray-500">Awaiting official notification review</dd></div>
            <div className="flex gap-4 py-3"><dt className="w-40 shrink-0 text-sm text-gray-500">Application status</dt><dd className="text-sm text-gray-500">Not verified</dd></div>
          </dl>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm md:px-8">
          <h2 className="mb-2 text-base font-bold text-gray-900">Eligibility and Application</h2>
          <p className="text-sm leading-relaxed text-gray-600">Qualification, age limits, pay, category-wise vacancies, important dates and application instructions must be checked against the official JKSSB notification. No eligibility conclusion or application link is provided until those details are verified.</p>
        </section>

        <p className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-950"><strong>Verification notice:</strong> This page is intentionally non-indexable. Do not use this preview to make eligibility or application decisions. Official source documents and post-specific facts remain unverified.</p>
        <div><Link href={`/jobs/${recruitmentSlug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">← Back to recruitment hub</Link></div>
      </div>
    </main>
  );
}
