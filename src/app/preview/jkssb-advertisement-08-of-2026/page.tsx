import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JKSSB Advertisement No. 08 of 2026 — Preview",
  description: "Non-indexed review preview of an unverified JKSSB recruitment listing.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

const departments = [
  { name: "Agriculture Production", vacancies: 46 },
  { name: "Health & Medical Education", vacancies: 421 },
  { name: "Higher Education", vacancies: 48 },
  { name: "Labour & Employment", vacancies: 3 },
];

export default function JkssbUnverifiedPreviewPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-900">
            UNVERIFIED PREVIEW
          </span>
          <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700">
            Noindex · Not a live application page
          </span>
        </div>

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Jammu and Kashmir Services Selection Board (JKSSB)
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            JKSSB Advertisement Notification No. 08 of 2026
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            This is a review-only preview built from an unverified research fixture.
            The official notification, any corrigenda, vacancy figures, eligibility,
            and application status have not yet been checked for publication.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Notification date</p>
              <p className="mt-1 font-semibold">4 August 2026</p>
              <p className="mt-1 text-xs text-amber-800">Needs official confirmation</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Reported vacancies</p>
              <p className="mt-1 text-2xl font-bold">518</p>
              <p className="mt-1 text-xs text-amber-800">Unverified research figure</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Application window</p>
              <p className="mt-1 font-semibold">10 Sep – 9 Oct 2026</p>
              <p className="mt-1 text-xs text-amber-800">Not confirmed as current</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Application status</p>
              <p className="mt-1 font-semibold">Not verified</p>
              <p className="mt-1 text-xs text-slate-500">No apply link provided</p>
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold">Reported department-wise vacancies</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            These figures are displayed only to review the proposed listing layout.
            They must be reconciled against the official JKSSB notification before use.
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4 font-medium">Department</th>
                  <th className="py-3 text-right font-medium">Reported vacancies</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((department) => (
                  <tr key={department.name} className="border-b border-slate-100">
                    <td className="py-3 pr-4">{department.name}</td>
                    <td className="py-3 text-right font-semibold">{department.vacancies}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50">
                  <td className="py-3 pr-4 font-bold">Reported total</td>
                  <td className="py-3 text-right font-bold">518</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Example post preview</h2>
              <p className="mt-1 text-sm text-slate-500">Item 105 · Srinagar</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
              Details pending verification
            </span>
          </div>
          <h3 className="mt-4 text-lg font-semibold">Horticulture Technician Grade-IV</h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4">
              <dt className="text-sm text-slate-500">Vacancies</dt>
              <dd className="mt-1 font-semibold">Not yet verified</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <dt className="text-sm text-slate-500">Qualification / age / pay</dt>
              <dd className="mt-1 font-semibold">Pending official review</dd>
            </div>
          </dl>
        </section>

        <footer className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          <strong>Review note:</strong> This page is intentionally non-indexable and
          does not offer an application action. It is a visual preview only; the facts
          shown above are not verified and must not be treated as official recruitment
          guidance.
        </footer>
      </div>
    </main>
  );
}
