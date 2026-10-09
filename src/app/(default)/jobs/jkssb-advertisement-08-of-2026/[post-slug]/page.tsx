import type { Metadata } from "next";
import Link from "next/link";

const recruitmentSlug = "jkssb-advertisement-08-of-2026";

export const metadata: Metadata = {
  title: "Horticulture Technician Grade-IV — JKSSB | JobOye",
  description: "Unverified review preview for Horticulture Technician Grade-IV under JKSSB Advertisement No. 08 of 2026.",
  robots: { index: false, follow: false, noarchive: true },
  alternates: { canonical: `/jobs/${recruitmentSlug}/horticulture-technician-grade-iv` },
};

export default function JkssbHorticultureTechnicianPostPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <nav aria-label="Breadcrumb" className="mb-5 text-sm text-slate-600">
          <Link href="/jobs" className="underline underline-offset-4">Jobs</Link><span className="mx-2">/</span>
          <Link href={`/jobs/${recruitmentSlug}`} className="underline underline-offset-4">JKSSB Advertisement No. 08 of 2026</Link><span className="mx-2">/</span><span>Horticulture Technician Grade-IV</span>
        </nav>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-900">UNVERIFIED POST PREVIEW</span>
          <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700">Noindex · No apply action</span>
        </div>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Jammu and Kashmir Services Selection Board (JKSSB)</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Horticulture Technician Grade-IV</h1>
          <p className="mt-2 text-slate-600">Item 105 · Srinagar</p>
          <p className="mt-5 leading-7 text-slate-700">This leaf route is connected to the JKSSB recruitment hub for route and template testing. The post identity and all post-specific details must be verified against the official notification before this page is treated as a real vacancy.</p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <Fact label="Recruitment" value="JKSSB Advertisement No. 08 of 2026" />
            <Fact label="Vacancies" value="Not verified" />
            <Fact label="Qualification / age / pay" value="Pending official review" />
            <Fact label="Application status" value="Not verified" />
          </dl>
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><strong>Verification required:</strong> Do not use this preview to make eligibility or application decisions. Official notification, post number, vacancy count, qualifications, age limits, pay, dates, and application link have not been confirmed.</div>
          <Link href={`/jobs/${recruitmentSlug}`} className="mt-6 inline-block text-sm font-semibold underline underline-offset-4">← Back to JKSSB recruitment hub</Link>
        </article>
      </div>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>;
}
