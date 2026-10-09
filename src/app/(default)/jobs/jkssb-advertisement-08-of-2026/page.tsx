import type { Metadata } from "next";
import Link from "next/link";

const recruitmentSlug = "jkssb-advertisement-08-of-2026";
const postSlug = "horticulture-technician-grade-iv";

export const metadata: Metadata = {
  title: "JKSSB Advertisement No. 08 of 2026 — Recruitment | JobOye",
  description: "Review preview for JKSSB Advertisement No. 08 of 2026. Official notification and recruitment details are not yet verified.",
  robots: { index: false, follow: false, noarchive: true },
  alternates: { canonical: `/jobs/${recruitmentSlug}` },
};

const departments = [
  { name: "Agriculture Production", vacancies: 46 },
  { name: "Health & Medical Education", vacancies: 421 },
  { name: "Higher Education", vacancies: 48 },
  { name: "Labour & Employment", vacancies: 3 },
];

export default function JkssbRecruitmentHubPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <nav aria-label="Breadcrumb" className="mb-5 text-sm text-slate-600">
          <Link href="/jobs" className="underline underline-offset-4">Jobs</Link>
          <span className="mx-2">/</span><span>JKSSB</span>
        </nav>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-900">UNVERIFIED PREVIEW</span>
          <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700">Noindex · Not an official application page</span>
        </div>
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Jammu and Kashmir Services Selection Board (JKSSB)</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">JKSSB Advertisement Notification No. 08 of 2026</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">This recruitment hub is wired into JobOye’s standard recruitment URL structure for testing. The official notification, corrigenda, vacancy figures, eligibility, and application status have not yet been verified. Do not rely on these figures as official guidance.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Notification date" value="4 August 2026" note="Unverified" />
            <Info label="Reported vacancies" value="518" note="Unverified research figure" />
            <Info label="Reported application window" value="10 Sep – 9 Oct 2026" note="Not confirmed as current" />
            <Info label="Application status" value="Not verified" note="No apply link" />
          </div>
        </header>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold">Posts under this recruitment</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">The post below is a sample leaf page for route and layout testing. Post-level facts remain unverified.</p>
          <Link href={`/jobs/${recruitmentSlug}/${postSlug}`} className="mt-5 block rounded-xl border border-slate-200 p-5 transition hover:border-slate-400">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">Horticulture Technician Grade-IV</h3>
                <p className="mt-1 text-sm text-slate-600">Item 105 · Srinagar · Details pending verification</p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">Preview</span>
            </div>
            <span className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">View post details →</span>
          </Link>
        </section>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold">Reported department-wise vacancies</h2>
          <p className="mt-2 text-sm text-slate-600">These fixture figures are shown only for layout review and must be checked against the official notification.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse text-left text-sm">
              <thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-3 pr-4 font-medium">Department</th><th className="py-3 text-right font-medium">Reported vacancies</th></tr></thead>
              <tbody>{departments.map((d) => <tr key={d.name} className="border-b border-slate-100"><td className="py-3 pr-4">{d.name}</td><td className="py-3 text-right font-semibold">{d.vacancies}</td></tr>)}
                <tr className="bg-slate-50"><td className="py-3 pr-4 font-bold">Reported total</td><td className="py-3 text-right font-bold">518</td></tr>
              </tbody>
            </table>
          </div>
        </section>
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><strong>Review note:</strong> This route is intentionally non-indexable. Figures and dates are unverified; no official application action is provided.</p>
      </div>
    </main>
  );
}

function Info({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p><p className="mt-1 text-xs text-amber-800">{note}</p></div>;
}
